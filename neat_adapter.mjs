/**
 * Adaptador de control para traducir las activaciones continuas de la red neuronal
 * a escrituras directas sobre el struct ticcmd_t en la memoria lineal de WASM.
 * 
 * Struct ticcmd_t (8 bytes en Doom):
 * - offset +0: signed char  forwardmove  (-50 a 50)
 * - offset +1: signed char  sidemove     (-50 a 50)
 * - offset +2: short        angleturn    (Little Endian)
 * - offset +4: short        consistancy  (0 para simulación local)
 * - offset +6: byte         chatchar     (0)
 * - offset +7: byte         buttons      (Bitmask: 1=ATTACK, 2=USE)
 */

export const BT_ATTACK = 1;
export const BT_USE    = 2;

export class NEATAdapter {
    /**
     * Mapea e inyecta las acciones de la IA al buffer de entrada de la memoria de Doom.
     * 
     * @param {Object} Module Instancia de WebAssembly de Emscripten
     * @param {number} ticcmdPtr Dirección física de players[consoleplayer].cmd
     * @param {Array<number>|Float32Array} outputVector Vector de activaciones en rango [-1.0, 1.0]
     */
    injectGenomeActions(Module, ticcmdPtr, outputVector) {
        const dataView = new DataView(Module.wasmMemory ? Module.wasmMemory.buffer : Module.HEAPU8.buffer);
        
        const forwardAct = outputVector[0] || 0.0;
        const sideAct    = outputVector[1] || 0.0;
        const turnAct    = outputVector[2] || 0.0;
        const useAct     = outputVector[3] || 0.0;
        const attackAct  = outputVector.length > 4 ? outputVector[4] : 0.0;

        // 1. Movimiento lineal adelante/atrás (-50 a 50)
        let forwardmove = Math.round(forwardAct * 50);
        if (forwardmove > 50) forwardmove = 50;
        if (forwardmove < -50) forwardmove = -50;

        // 2. Movimiento lateral strafe (-50 a 50)
        let sidemove = Math.round(sideAct * 50);
        if (sidemove > 50) sidemove = 50;
        if (sidemove < -50) sidemove = -50;

        // 3. Giro angular por tick (Escalado a ±4000 BAM para rotación suave pero ágil)
        // 32767 = 180 grados por tick (demasiado errático para control continuo).
        let angleturn = Math.round(turnAct * 4000);
        if (angleturn > 32767) angleturn = 32767;
        if (angleturn < -32768) angleturn = -32768;

        // 4. Bitmask de botones (BT_USE para switches/puertas, BT_ATTACK para disparar)
        let buttons = 0;
        if (useAct > 0.3) {
            buttons |= BT_USE;
        }
        if (attackAct > 0.5) {
            buttons |= BT_ATTACK;
        }

        // --- Inyección física de memoria (Zero-Overhead DataView) ---
        dataView.setInt8(ticcmdPtr + 0, forwardmove);
        dataView.setInt8(ticcmdPtr + 1, sidemove);
        dataView.setInt16(ticcmdPtr + 2, angleturn, true);
        dataView.setInt16(ticcmdPtr + 4, 0, true);  // consistancy = 0
        dataView.setUint8(ticcmdPtr + 6, 0);        // chatchar = 0
        dataView.setUint8(ticcmdPtr + 7, buttons);  // buttons
    }
}
