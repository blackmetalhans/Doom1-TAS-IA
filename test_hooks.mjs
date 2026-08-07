import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const jsPath = './build/chocolate-doom.js.js';
let code = fs.readFileSync(jsPath, 'utf8');

if (!code.includes('TAS_INJECT_OK')) {
    console.log("[*] Parchando binario de Emscripten en disco (Zero-Overhead)...");
    const patch = `
/* TAS_INJECT_OK */
var Module = {
    noInitialRun: true,
    onRuntimeInitialized: function() {
        const get_ptr = Module.__get_ticcmd_pointer || Module._get_ticcmd_pointer;
        if (typeof get_ptr !== 'function') {
            console.error("[-] FATAL: Hook _get_ticcmd_pointer no encontrado en exports.");
            process.exit(1);
        }
        const ptr = get_ptr();
        console.log("\\n[+] LINKER FFI OK!");
        console.log("[+] OFFSET FÍSICO (ticcmd_t): 0x" + ptr.toString(16));
        process.exit(0);
    }
};
`;
    fs.writeFileSync(jsPath, patch + code);
} else {
    console.log("[*] Binario JS ya estaba parchado.");
}

console.log("[*] Cargando motor C/WASM en estado de hibernación...");
require('./build/chocolate-doom.js.js');