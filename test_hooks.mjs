import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log("[*] Booteando módulo WebAssembly (CommonJS/Global Intercept)...");

// Inyectamos la topología directamente al scope global antes de que el engine despierte
global.Module = {
    noInitialRun: true,
    onRuntimeInitialized: () => {
        const mod = global.Module;
        
        if (typeof mod._get_ticcmd_pointer !== 'function') {
            console.error("[-] FATAL: _get_ticcmd_pointer no expuesto.");
            process.exit(1);
        }

        const ticcmd_ptr = mod._get_ticcmd_pointer();
        console.log(`[+] Linker OK. ticcmd_t alojado en offset físico: 0x${ticcmd_ptr.toString(16)}`);
        
        // Verificación de V8 Memory Detachment
        const heapSize = mod.wasmMemory.buffer.byteLength / (1024 * 1024);
        console.log(`[+] WASM Heap: ${heapSize} MB inicializados en memoria lineal.`);
        process.exit(0);
    }
};

// Disparamos el cold-boot del motor de forma síncrona
require('./build/chocolate-doom.js.js');