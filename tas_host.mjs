import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

class TASHost {
    constructor() {
        this.module = null;
        this.wasmMemory = null;
        this.ticcmdPtr = 0x13bd28; // BSS Segment Cache
    }

    get dataView() {
        if (!this.module || !this.module.HEAPU8 || !this.module.HEAPU8.buffer) {
            throw new Error("ERR_WASM: Heap no disponible o desprendido.");
        }
        return new DataView(this.module.HEAPU8.buffer);
    }

    async boot() {
        const mod = require('./build/chocolate-doom.js.js');

        // Esperar la instanciación asíncrona de WASM antes de tocar el VFS
        if (!mod.calledRun && !mod.runtimeInitialized) {
            await new Promise(resolve => { mod.onRuntimeInitialized = resolve; });
        }

        this.module = mod;
        this.wasmMemory = mod.HEAPU8;

        console.log("[*] VFS: Inyectando doom1.wad a la memoria lineal...");
        const wadData = fs.readFileSync('./assets/doom1.wad');
        
        // Convertir Buffer de Node a Uint8Array explícito para el FS de Emscripten
        mod.FS.writeFile('/doom1.wad', new Uint8Array(wadData));
        console.log("[+] VFS: IWAD montado exitosamente.");

        if (typeof mod._init_headless_doom === 'function') {
            console.log("[*] Engine C: Invocando _init_headless_doom()...");
            mod._init_headless_doom();
            console.log("[+] Engine C: Inicializado en modo Headless (TIC 0).");
        } else if (typeof mod.init_headless_doom === 'function') {
            console.log("[*] Engine C: Invocando init_headless_doom()...");
            mod.init_headless_doom();
            console.log("[+] Engine C: Inicializado en modo Headless (TIC 0).");
        } else {
            console.warn("[!] ADVERTENCIA: Hook _init_headless_doom no detectado en WASM.");
        }

        if (typeof mod.__get_ticcmd_pointer === 'function') {
            this.ticcmdPtr = mod.__get_ticcmd_pointer();
        } else if (typeof mod._get_ticcmd_pointer === 'function') {
            this.ticcmdPtr = mod._get_ticcmd_pointer();
        }
    }
    
    injectTicCmd(inputData) {
        const ptr = this.ticcmdPtr;
        this.dataView.setInt8(ptr + 0, inputData.forwardmove);
        this.dataView.setInt8(ptr + 1, inputData.sidemove);
        this.dataView.setInt16(ptr + 2, inputData.angleturn, true);
        this.dataView.setInt16(ptr + 4, inputData.consistancy, true);
        this.dataView.setUint8(ptr + 6, inputData.chatchar);
        this.dataView.setUint8(ptr + 7, inputData.buttons);
    }

    runSingleTic() {
        this.module._run_single_tic();
    }
}
export default TASHost;

const host = new TASHost();
host.boot().then(() => {
    const probeByte = host.dataView.getInt8(0x13bd28);
    console.log(`[FFI PROBE SUCCESS] Byte en 0x13bd28: ${probeByte}`);
}).catch(err => {
    console.error("[!] Error en el Hipervisor:", err);
});
