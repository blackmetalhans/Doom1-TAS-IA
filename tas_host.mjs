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
        if (!this.wasmMemory || !this.wasmMemory.buffer) throw new Error("ERR_WASM: Heap detach.");
        return new DataView(this.wasmMemory.buffer);
    }

    async boot() {
        return new Promise((resolve, reject) => {
            try {
                // Binario parchado físicamente en disco (noInitialRun activado)
                const mod = require('./build/chocolate-doom.js.js');
                this.module = mod;
                this.wasmMemory = mod.wasmMemory;
                
                console.log("[*] VFS: Inyectando doom1.wad a la memoria lineal...");
                const wadData = fs.readFileSync('./assets/doom1.wad');
                mod.FS.writeFile('/doom1.wad', wadData);
                console.log("[+] VFS: IWAD montado exitosamente.");
                
                if (typeof mod._get_ticcmd_pointer === 'function') {
                    this.ticcmdPtr = mod._get_ticcmd_pointer();
                }
                resolve();
            } catch (err) {
                reject(err);
            }
        });
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
