import factory from './build/chocolate-doom.js';

class HeadlessDoomEnv {
    constructor() {
        this.module = null;
        this.memoryView = null;
    }

    async init() {
        // Inicializar módulo WASM con argumentos headless
        this.module = await factory({
            arguments: ['-iwad', 'DOOM1.WAD', '-nogui'],
            print: (text) => {}, // Suprimir logs estándar si es necesario
            printErr: (text) => console.error(`[WASM-ERR] ${text}`)
        });
        
        this.updateMemoryView();
        console.log("[TAS] Motor WASM cargado y mapeado.");
    }

    updateMemoryView() {
        // Puente de Memoria (Zero Overhead) usando DataView sobre el buffer de WASM
        this.memoryView = new DataView(this.module.HEAP8.buffer);
    }

    step(forward, side, angle, buttons) {
        // Inyectar inputs (debe coincidir con los hooks definidos en tas_hooks.c)
        if (this.module._SetPlayerInputs) {
            this.module._SetPlayerInputs(forward, side, angle, buttons);
        }
        
        // Avanzar un tick del motor
        if (this.module._TAS_Tick) {
            this.module._TAS_Tick();
        } else if (this.module._doomgeneric_tick) {
            this.module._doomgeneric_tick();
        }
        
        // Actualizar referencia si la memoria lineal de WASM creció
        if (this.memoryView.buffer !== this.module.HEAP8.buffer) {
            this.updateMemoryView();
        }

        return this.getTelemetry();
    }

    getTelemetry() {
        // Aritmética de Punteros (ILP32)
        const playerPtr = this.module._GetPlayerMobjPointer();
        if (!playerPtr || playerPtr === 0) return { valid: false };

        // Offsets estrictos según requerimiento
        const OFFSETS = {
            MOBJ_X: 24,       // fixed_t 16.16
            MOBJ_Y: 28,       // fixed_t 16.16
            MOBJ_Z: 32,       // fixed_t 16.16
            MOBJ_ANGLE: 48,   // uint32_t
            MOBJ_HEALTH: 112  // int32_t
        };

        // Decodificación: fixed_t a float (dividir por 65536.0)
        const fixedToFloat = (val) => val / 65536.0;

        const rawX = this.memoryView.getInt32(playerPtr + OFFSETS.MOBJ_X, true);
        const rawY = this.memoryView.getInt32(playerPtr + OFFSETS.MOBJ_Y, true);
        const rawZ = this.memoryView.getInt32(playerPtr + OFFSETS.MOBJ_Z, true);
        const rawAngle = this.memoryView.getUint32(playerPtr + OFFSETS.MOBJ_ANGLE, true);
        const rawHealth = this.memoryView.getInt32(playerPtr + OFFSETS.MOBJ_HEALTH, true);
        
        const tic = this.module._GetLevelTime ? this.module._GetLevelTime() : 0;

        return {
            valid: true,
            tic: tic,
            x: fixedToFloat(rawX),
            y: fixedToFloat(rawY),
            z: fixedToFloat(rawZ),
            angle: rawAngle,
            health: rawHealth
        };
    }
}

async function runTAS() {
    const env = new HeadlessDoomEnv();
    try {
        await env.init();

        console.log("Iniciando bucle de simulación discreta (350 frames)...");
        
        for (let i = 0; i < 350; i++) {
            // Inyectar input dummy (ej: caminar adelante) y avanzar tick
            const state = env.step(50, 0, 0, 0);
            
            // Imprimir telemetría cada 35 frames (1 segundo de juego aprox)
            if (state.valid && i % 35 === 0) {
                console.log(`[TIC ${state.tic}] POS: (${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)}) | HP: ${state.health} | ANGLE: ${state.angle}`);
            }
        }
        
        console.log("Simulación finalizada con éxito.");
    } catch (error) {
        console.error("Error durante la ejecución del hipervisor:", error);
    }
}

runTAS();
