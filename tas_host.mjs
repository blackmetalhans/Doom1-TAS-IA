import fs from 'fs';
import path from 'path';
import createDoomModule from './build/src/chocolate-doom.js';
import { NEATAdapter } from './neat_adapter.mjs';
import { getEnvironmentSensors } from './sensor_extractor.mjs';

/**
 * TASHost: Hipervisor determinista para Doom 1 sobre WebAssembly.
 * Expone una API desacoplada estilo entorno Gym para agentes autónomos y TAS.
 */
export class TASHost {
    constructor(options = {}) {
        this.iwadPath = options.iwadPath || path.resolve('./assets/doom1.wad');
        this.maxTicksPerEpisode = options.maxTicksPerEpisode || 35 * 30; // 30 segundos (1050 TICs)
        this.module = null;
        this.playerMobjPtr = 0;
        this.ticcmdPtr = 0;
        this.adapter = new NEATAdapter();

        // Métricas de estado de simulación
        this.currentTick = 0;
        this.initialDistance = null;
        this.bestDistance = null;
        this.replayLog = [];
        this.isInitialized = false;

        // Waypoints para resolver el local minima de E1M1 (Ruta óptima)
        this.waypoints = [
            { x: 1056, y: -3616 }, // Salir del cuarto inicial (Door 1)
            { x: 2880, y: -3328 }, // Pasillo del acido zig-zag
            { x: 3168, y: -3328 }, // Entrar puerta hacia oscuridad
            { x: 2816, y: -3840 }  // Exit Switch final!
        ];
        this.currentWaypointIndex = 0;
    }

    get dataView() {
        if (!this.module || !this.module.HEAPU8 || !this.module.HEAPU8.buffer) {
            throw new Error("ERR_WASM: Heap no disponible o buffer desprendido.");
        }
        return new DataView(this.module.HEAPU8.buffer);
    }

    /**
     * Inicializa el runtime WebAssembly, monta el IWAD en el VFS y corre el init decapitado.
     */
    async boot() {
        if (this.isInitialized) return;

        this.module = await createDoomModule({
            noInitialRun: true,
            print: () => {},
            printErr: (msg) => {
                // Silenciar o loggear errores del engine según necesidad
                if (process.env.DEBUG_DOOM) console.error(`[DOOM-ENGINE] ${msg}`);
            }
        });

        // Montar IWAD en el sistema de archivos virtual de Emscripten
        if (!fs.existsSync(this.iwadPath)) {
            throw new Error(`[ERR_VFS] IWAD no encontrado en ruta: ${this.iwadPath}`);
        }
        const wadBuffer = fs.readFileSync(this.iwadPath);
        this.module.FS.writeFile('/doom1.wad', new Uint8Array(wadBuffer));

        // Inicialización de subsistemas C sin UI ni sonido
        if (typeof this.module._init_headless_doom === 'function') {
            this.module._init_headless_doom();
        } else {
            throw new Error("[ERR_WASM] Símbolo _init_headless_doom no encontrado en módulo.");
        }

        this.isInitialized = true;
    }

    /**
     * Reinicia el mapa a E1M1, sincroniza el spawn del jugador y retorna la observación inicial.
     */
    reset() {
        if (!this.isInitialized) {
            throw new Error("ERR_HOST: Debes invocar await host.boot() antes de reset().");
        }

        // Forzar arranque limpio en E1M1 (habilidad medium = sk_medium)
        this.module._start_tas_map();

        // Ciclo de sincronización para asentar spawn en memoria física
        this.playerMobjPtr = 0;
        for (let i = 0; i < 200; i++) {
            this.module._run_single_tic();
            this.playerMobjPtr = this.module._get_player_mobj_pointer();
            if (this.playerMobjPtr !== 0) {
                this.module._run_single_tic(); // TIC de gracia para cálculo de floorz y vectores
                break;
            }
        }

        if (this.playerMobjPtr === 0) {
            throw new Error("ERR_SPAWN: El motor no alocó el puntero de mobj_t del jugador.");
        }

        this.ticcmdPtr = this.module._get_ticcmd_pointer();
        this.currentTick = 0;
        this.replayLog = [];
        this.currentWaypointIndex = 0;

        const sensors = getEnvironmentSensors(this.module, this.playerMobjPtr, this.waypoints[0]);
        this.initialDistance = sensors.distanceToTarget;
        this.bestDistance = this.initialDistance;

        return sensors.rawVector;
    }

    /**
     * Inyecta comando estructurado en ticcmd_t.
     */
    injectTicCmd(inputData) {
        const ptr = this.ticcmdPtr;
        const dv = this.dataView;
        dv.setInt8(ptr + 0, inputData.forwardmove || 0);
        dv.setInt8(ptr + 1, inputData.sidemove || 0);
        dv.setInt16(ptr + 2, inputData.angleturn || 0, true);
        dv.setInt16(ptr + 4, inputData.consistancy || 0, true);
        dv.setUint8(ptr + 6, inputData.chatchar || 0);
        dv.setUint8(ptr + 7, inputData.buttons || 0);
    }

    /**
     * Ejecuta exactamente 1 frame/TIC de simulación física del motor.
     */
    runSingleTic() {
        this.module._run_single_tic();
        this.currentTick++;
    }

    /**
     * Avanza un paso en el entorno inyectando el vector de acción del agente.
     * @param {Array<number>} actionVector [forward, side, angle, buttons] en rango [-1.0, 1.0]
     * @returns {{ observation: Float32Array, reward: number, done: boolean, info: Object }}
     */
    step(actionVector) {
        // 1. Inyección FFI de acciones del genoma en memoria lineal
        this.adapter.injectGenomeActions(this.module, this.ticcmdPtr, actionVector);

        // Guardar snapshot de input para telemetría / replay TAS
        this.replayLog.push(Array.from(actionVector));

        // 2. Ejecutar TIC de simulación
        this.runSingleTic();

        // 3. Extraer telemetría sensorial hacia el WAYPOINT actual
        const currentTarget = this.waypoints[this.currentWaypointIndex];
        const sensors = getEnvironmentSensors(this.module, this.playerMobjPtr, currentTarget);
        const observation = sensors.rawVector;

        // 4. Cálculo de Fitness / Recompensa
        const currentDistance = sensors.distanceToTarget;
        let reward = 0;

        // Transición de Waypoint
        if (currentDistance <= 80.0) {
            reward += 200.0; // Bono por alcanzar el waypoint
            if (this.currentWaypointIndex < this.waypoints.length - 1) {
                this.currentWaypointIndex++;
                this.bestDistance = 999999; // Resetear para el nuevo waypoint
            }
        }

        // Recompensa diferencial
        if (currentDistance < this.bestDistance) {
            reward += (this.bestDistance - currentDistance);
            this.bestDistance = currentDistance;
        }

        // Pequeña penalización por paso de tiempo para incentivar velocidad (speedrun)
        reward -= 0.05;

        // 5. Criterios de finalización (done)
        let done = false;
        let reason = "running";

        // Muerte del marine
        if (sensors.health <= 0) {
            done = true;
            reason = "dead";
            reward -= 50.0;
        }

        // Llegada a la zona del exit switch (último waypoint)
        if (currentDistance <= 80.0 && this.currentWaypointIndex === this.waypoints.length - 1) {
            done = true;
            reason = "exit_reached";
            reward += 1000.0; // Gran bonificación por completar el nivel
        }

        // Timeout por límite de frames
        if (this.currentTick >= this.maxTicksPerEpisode) {
            done = true;
            reason = "timeout";
        }

        const info = {
            tick: this.currentTick,
            distance: currentDistance,
            bestDistance: this.bestDistance,
            health: sensors.health,
            speed: sensors.speed,
            reason: reason
        };

        return { observation, reward, done, info };
    }

    /**
     * Retorna la telemetría actual sin avanzar el frame.
     */
    getSensors() {
        return getEnvironmentSensors(this.module, this.playerMobjPtr);
    }

    /**
     * Retorna el historial completo de inputs del episodio.
     */
    getReplay() {
        return this.replayLog;
    }

    /**
     * Captura un Snapshot completo de la memoria lineal (Save State TAS).
     */
    saveState() {
        if (!this.module || !this.module.HEAPU8) return null;
        return new Uint8Array(this.module.HEAPU8);
    }

    /**
     * Restaura la simulación física a un Snapshot previo (Rewind).
     */
    loadState(snapshot) {
        if (!this.module || !this.module.HEAPU8 || !snapshot) return false;
        this.module.HEAPU8.set(snapshot);
        return true;
    }
}

export default TASHost;
