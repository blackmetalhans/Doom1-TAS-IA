/**
 * Extractor y normalizador de telemetría sensorial para la red neuronal (NEAT).
 * Inspecciona directamente la memoria lineal de WASM mediante DataView con cero sobrecarga.
 * 
 * Offsets físicos validados para Chocolate Doom (WASM32 / ILP32):
 * - x:      playerPtr + 12  (fixed_t 16.16)
 * - y:      playerPtr + 16  (fixed_t 16.16)
 * - z:      playerPtr + 20  (fixed_t 16.16)
 * - angle:  playerPtr + 32  (uint32 BAM)
 * - momx:   playerPtr + 72  (fixed_t 16.16)
 * - momy:   playerPtr + 76  (fixed_t 16.16)
 * - health: playerPtr + 108 (int32)
 */

// Coordenadas objetivo en el mapa E1M1 (Switch de salida)
export const E1M1_EXIT_TARGET = {
    x: 2816.0,
    y: -3840.0
};

export function getEnvironmentSensors(Module, playerMobjPtr, currentTarget) {
    if (!Module || playerMobjPtr === 0) return null;

    const HEAP32 = Module.HEAP32;
    const ptr32 = playerMobjPtr / 4;

    const x = HEAP32[ptr32 + 3] / 65536.0;
    const y = HEAP32[ptr32 + 4] / 65536.0;
    const z = HEAP32[ptr32 + 5] / 65536.0;

    const angleBam = HEAP32[ptr32 + 8] >>> 0;
    const angleDeg = (angleBam / 4294967296.0) * 360.0;
    const angleRad = angleDeg * (Math.PI / 180.0);

    const momx = HEAP32[ptr32 + 18] / 65536.0;
    const momy = HEAP32[ptr32 + 19] / 65536.0;
    const speed = Math.sqrt(momx * momx + momy * momy);

    const health = HEAP32[ptr32 + 27];

    // 5. Geometría respecto al objetivo dinámico (Waypoint actual)
    const dx = currentTarget.x - x;
    const dy = currentTarget.y - y;
    const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

    const targetAngleRad = Math.atan2(dy, dx);
    const targetAngleDeg = targetAngleRad * (180.0 / Math.PI);

    let relativeAngle = targetAngleDeg - angleDeg;
    while (relativeAngle <= -180.0) relativeAngle += 360.0;
    while (relativeAngle > 180.0) relativeAngle -= 360.0;

    // 6. Raycasting Lidar (5 rayos para detectar muros: -45, -20, 0, +20, +45)
    let lidar = [0, 0, 0, 0, 0];
    if (typeof Module._get_ray_distance === 'function') {
        lidar[0] = Module._get_ray_distance(-45.0) / 2048.0;
        lidar[1] = Module._get_ray_distance(-20.0) / 2048.0;
        lidar[2] = Module._get_ray_distance(0.0)   / 2048.0;
        lidar[3] = Module._get_ray_distance(20.0)  / 2048.0;
        lidar[4] = Module._get_ray_distance(45.0)  / 2048.0;
    }

    // 7. Vector de entrada normalizado (13 dimensiones)
    const rawVector = new Float32Array([
        Math.min(distanceToTarget / 4000.0, 1.5),
        relativeAngle / 180.0,
        Math.min(speed / 30.0, 1.5),
        Math.max(health / 100.0, 0.0),
        Math.cos(angleRad),
        Math.sin(angleRad),
        Math.cos(targetAngleRad),
        Math.sin(targetAngleRad),
        lidar[0], lidar[1], lidar[2], lidar[3], lidar[4]
    ]);

    return {
        x, y, z,
        angleDeg, angleRad,
        momx, momy, speed,
        health, distanceToTarget, relativeAngle,
        lidar,
        rawVector
    };
}
