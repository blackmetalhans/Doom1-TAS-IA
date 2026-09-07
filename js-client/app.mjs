import createDoomModule from '../build/src/chocolate-doom.js';

async function initVisualClient() {
    const statusLabel = document.getElementById('status');
    const canvas = document.getElementById('doomCanvas');
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(320, 200);
    
    // 1. Descargar IWAD desde el servidor local HTTP (Vite/Node)
    statusLabel.innerText = "Descargando doom1.wad...";
    const response = await fetch('../doom1.wad');
    if (!response.ok) {
        statusLabel.innerText = "Error: No se encontró doom1.wad en la ruta raíz.";
        statusLabel.style.color = "red";
        return;
    }
    const arrayBuffer = await response.arrayBuffer();

    // 2. Inicializar el motor WASM
    statusLabel.innerText = "Iniciando WASM Engine...";
    const Module = await createDoomModule({
        noInitialRun: true,
        print: (msg) => console.log(msg),
        printErr: (msg) => console.error(msg),
    });

    // 3. Montar el WAD en el VFS de Emscripten
    Module.FS.writeFile('doom1.wad', new Uint8Array(arrayBuffer));

    // 4. Iniciar Engine y el Mapa E1M1
    Module._init_headless_doom();
    Module._start_tas_map();

    statusLabel.innerText = "Online. Corriendo en Memoria Lineal.";

    const memory = Module.HEAPU8;

    // 5. Bucle de Renderizado y Tick Manual
    function renderFrame() {
        // Avanzar la simulación 1 TIC físico
        Module._run_single_tic();

        // Obtener punteros
        const screenPtr = Module._get_screen_buffer();
        const playpalPtr = Module._get_playpal_pointer();

        if (screenPtr && playpalPtr) {
            // Mapeo crudo 8-bit a RGBA (32-bit)
            for (let i = 0; i < 64000; i++) { // 320 * 200
                const colorIndex = memory[screenPtr + i];
                const palOffset = playpalPtr + (colorIndex * 3);
                
                const r = memory[palOffset + 0];
                const g = memory[palOffset + 1];
                const b = memory[palOffset + 2];

                const pixelOut = i * 4;
                imgData.data[pixelOut + 0] = r;
                imgData.data[pixelOut + 1] = g;
                imgData.data[pixelOut + 2] = b;
                imgData.data[pixelOut + 3] = 255; // Alpha
            }
            
            // Pinta en el canvas
            ctx.putImageData(imgData, 0, 0);
        }

        requestAnimationFrame(renderFrame);
    }

    renderFrame();
}

// Arrancar App
initVisualClient().catch(err => {
    console.error(err);
    document.getElementById('status').innerText = "Error crítico. Revisa la consola.";
});
