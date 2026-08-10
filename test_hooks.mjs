import fs from 'fs';
import path from 'path';
import createDoomModule from './build/src/chocolate-doom.js';

async function runVerification() {
    const Module = await createDoomModule({
        noInitialRun: true,
        print: () => {}, 
        printErr: (text) => console.error(`[ENGINE] ${text}`)
    });

    // 1. Montaje VFS del IWAD local
    const iwadPath = path.resolve('./assets/doom1.wad');
    Module.FS.writeFile('/doom1.wad', fs.readFileSync(iwadPath));

    // 2. Boot decapitado y alocación forzada de E1M1
    Module._init_headless_doom();
    Module._start_tas_map(); 

    // 3. Tick Loop de sincronización (Esperando asentamiento de P_SpawnPlayer)
    let playerMobjPtr = 0;
    console.log("[TAS] Sincronizando hipervisor con el estado del engine...");
    for (let i = 0; i < 200; i++) {
        Module._run_single_tic();
        playerMobjPtr = Module._get_player_mobj_pointer();
        if (playerMobjPtr !== 0) {
            Module._run_single_tic(); // TIC extra crucial para asentar coordenadas en memoria
            console.log(`[TAS] Spawn asentado en el TIC ${i}. Puntero mobj_t: 0x${playerMobjPtr.toString(16)}`);
            break;
        }
    }

    if (playerMobjPtr === 0) {
        throw new Error("CRITICAL: El motor nunca instanció al jugador. Revisa si start_tas_map() está inyectando G_InitNew correctamente.");
    }

    // 4. Extracción de coordenadas iniciales (WASM32/ILP32: fixed_t en offset 12 y 16)
    const view = new DataView(Module.wasmMemory ? Module.wasmMemory.buffer : Module.HEAPU8.buffer);
    const getX = () => view.getInt32(playerMobjPtr + 12, true) / 65536.0;
    const getY = () => view.getInt32(playerMobjPtr + 16, true) / 65536.0;

    console.log(`[TAS] Coordenadas Iniciales -> X: ${getX()}, Y: ${getY()}`);

    // 5 y 6. Inyección sostenida (1 segundo = 35 TICs)
    const ticcmdPtr = Module._get_ticcmd_pointer();
    console.log(`[TAS] Forzando inyección FFI sostenida en 0x${ticcmdPtr.toString(16)}`);

    for (let i = 0; i < 35; i++) {
        view.setInt8(ticcmdPtr + 0, 50); // Inyección sostenida FFI
        Module._run_single_tic();
    }

    // 7. Verificación del delta físico
    console.log(`[TAS] Coordenadas Finales   -> X: ${getX()}, Y: ${getY()}`);
}

runVerification().catch(console.error);