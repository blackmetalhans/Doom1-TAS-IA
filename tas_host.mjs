import { createRequire } from 'module';
const require = createRequire(import.meta.url);

class TASHost {
    constructor() {
        this.module = null;
        this.wasmMemory = null;
        this.ticcmdPtr = null;
    }

    get dataView() {
        if (!this.wasmMemory || !this.wasmMemory.buffer) {
            throw new Error("ERR_WASM: Heap no inicializado o buffer destruido (Detachment).");
        }
        return new DataView(this.wasmMemory.buffer);
    }

    async boot() {
        return new Promise((resolve, reject) => {
            global.Module = {
                noInitialRun: true,
                print: text => process.stdout.write(`[DOOM] ${text}\n`),
                printErr: text => process.stderr.write(`[DOOM_ERR] ${text}\n`),
                onRuntimeInitialized: () => {
                    this.module = global.Module;
                    this.wasmMemory = this.module.wasmMemory;
                    
                    if (typeof this.module._get_ticcmd_pointer !== 'function') {
                        return reject(new Error("FATAL: _get_ticcmd_pointer FFI hook missing."));
                    }
                    
                    this.ticcmdPtr = this.module._get_ticcmd_pointer();
                    resolve();
                }
            };

            try {
                // Interceptación global síncrona del módulo emitido por emcc
                require('./build/chocolate-doom.js.js');
            } catch (err) {
                reject(err);
            }
        });
    }

    injectTicCmd(inputData) {
        // Zero-Overhead Memory Mapping -> players[consoleplayer].cmd
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
