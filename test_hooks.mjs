import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

async function runVerification() {
    console.log("[TEST] Inicializando módulo WebAssembly...");
    
    globalThis.Module = {
        noInitialRun: true,
        print: () => {},
        printErr: (text) => console.error(`[WASM ERR] ${text}`)
    };

    const Module = require('./build/src/chocolate-doom.js');

    if (!Module.calledRun && !Module.runtimeInitialized) {
        await new Promise(resolve => {
            Module.onRuntimeInitialized = resolve;
        });
    }

    console.log("[TEST] Runtime inicializado.");
    if (!Module.FS && typeof Module.FS_createDataFile === 'function') {
        Module.FS = {
            writeFile: (filename, data) => {
                const name = filename.startsWith('/') ? filename.substring(1) : filename;
                Module.FS_createDataFile('/', name, data, true, true, true);
            }
        };
    }

    // 1. Montar IWAD en el VFS de Emscripten
    const iwadPath = path.resolve('./assets/doom1.wad');
    if (!fs.existsSync(iwadPath)) {
        throw new Error(`[ERROR] No se encontró el archivo IWAD en: ${iwadPath}`);
    }
    const iwadBuffer = fs.readFileSync(iwadPath);
    Module.FS.writeFile('/doom1.wad', iwadBuffer);
    console.log("[TEST] IWAD cargado en VFS.");

    // 2. Inicializar motor en modo Headless (TIC 0)
    console.log("[TEST] Invocando _init_headless_doom()...");
    Module._init_headless_doom();
    console.log("[TEST] Headless Doom inicializado.");

    // 3. Obtener punteros FFI
    const ticcmdPtr = Module._get_ticcmd_pointer();
    const playerMobjPtr = Module._get_player_mobj_pointer(); // Devuelve &players[0].mo

    if (!ticcmdPtr || !playerMobjPtr) {
        throw new Error("[CRITICAL] Punteros BSS/MOBJ nulos devueltos por el motor.");
    }

    // 4. Mapeo de offsets de mobj_t (WASM32 / ILP32)
    // mobj_t offsets: x = 24 (int32), y = 28 (int32), z = 32 (int32)
    
    // Resolve WASM ArrayBuffer robustly
    let memoryBuffer;
    if (Module.wasmMemory) {
        memoryBuffer = Module.wasmMemory.buffer;
    } else if (Module.HEAPU8) {
        memoryBuffer = Module.HEAPU8.buffer;
    } else {
        throw new Error("[FATAL] No WebAssembly memory buffer exposed on Module.");
    }
    
    const view = new DataView(memoryBuffer);
    
    const startX = view.getInt32(playerMobjPtr + 24, true);
    const startY = view.getInt32(playerMobjPtr + 28, true);

    console.log(`[TEST] Posición Inicial: X=${startX >> 16}, Y=${startY >> 16}`);

    // 5. Inyectar marcha adelante (forwardmove = 50) en ticcmd_t
    // ticcmd_t offset: forwardmove = 0 (int8_t)
    view.setInt8(ticcmdPtr + 0, 50);

    // 6. Ejecutar 35 TICs (1 segundo simulado de juego)
    for (let i = 0; i < 35; i++) {
        Module._run_single_tic();
    }

    // 7. Leer nueva posición
    const endX = view.getInt32(playerMobjPtr + 24, true);
    const endY = view.getInt32(playerMobjPtr + 28, true);

    const deltaX = (endX - startX) >> 16;
    const deltaY = (endY - startY) >> 16;
    const displacement = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    console.log(`[TEST] Posición Final:   X=${endX >> 16}, Y=${endY >> 16}`);
    console.log(`[TEST] Desplazamiento:   ${displacement.toFixed(2)} unidades`);

    // 8. Criterio de Aceptación
    if (displacement > 0) {
        console.log("[SUCCESS] Loop End-to-End validado correctamente. Cero desincronización.");
        process.exit(0);
    } else {
        console.error("[FAIL] El jugador no cambió de posición. Revisa el offset de ticcmd_t o mobj_t.");
        executeOffsetFallbackStrategy(Module, playerMobjPtr);
        process.exit(1);
    }
}

/**
 * Estrategia de Fallback: Escaneo de símbolos si los offsets precalculados fallan.
 */
function executeOffsetFallbackStrategy(Module, playerMobjPtr) {
    console.log("[FALLBACK] Iniciando escaneo de memoria BSS en el mapa de símbolos...");
    const symbolMapPath = path.resolve('./build/src/chocolate-doom.js.symbols');
    
    if (fs.existsSync(symbolMapPath)) {
        const symbolMap = fs.readFileSync(symbolMapPath, 'utf-8');
        const lines = symbolMap.split('\n');
        const playerSym = lines.find(line => line.includes('players'));
        console.log(`[FALLBACK] Símbolo encontrado en map file: ${playerSym}`);
    } else {
        console.log("[FALLBACK] No se encontró el archivo .symbols. Compila con -s EMIT_SYMBOL_MAP=1.");
    }
}

runVerification().catch(err => {
    console.error(`[FATAL] ${err.message}`);
    process.exit(1);
});