# Architecture: Doom1-TAS-IA

The core design philosophy is to bypass all IPC (Inter-Process Communication) overhead. We do not use sockets, pipes, or screen-scraping (like OpenCV). We execute the game engine synchronously as a WebAssembly module within the V8 JavaScript thread. 

This enables Reinforcement Learning (NEAT) and TAS generation at unprecedented speeds.

## 1. Memory Offsets (WASM32 / ILP32)

We interact directly with the C engine's linear memory. The structural byte alignment for 32-bit WASM is as follows:

| Component       | Struct / Global            | Pointer Source                      | Offset (Bytes) | Type       | Description |
|-----------------|----------------------------|-------------------------------------|----------------|------------|-------------|
| **Input**       | `ticcmd_t`                 | `_get_ticcmd_pointer()`             | +0             | `int8`     | `forwardmove` |
| **Input**       | `ticcmd_t`                 | `_get_ticcmd_pointer()`             | +1             | `int8`     | `sidemove`    |
| **Input**       | `ticcmd_t`                 | `_get_ticcmd_pointer()`             | +2             | `int16`    | `angleturn`   |
| **Input**       | `ticcmd_t`                 | `_get_ticcmd_pointer()`             | +7             | `uint8`    | `buttons`     |
| **Sensors**     | `mobj_t`                   | `_get_player_mobj_pointer()`        | +12            | `int32`    | `x` (fixed_t) |
| **Sensors**     | `mobj_t`                   | `_get_player_mobj_pointer()`        | +16            | `int32`    | `y` (fixed_t) |
| **Sensors**     | `mobj_t`                   | `_get_player_mobj_pointer()`        | +32            | `uint32`   | `angle` (BAM)|
| **Sensors**     | `mobj_t`                   | `_get_player_mobj_pointer()`        | +108           | `int32`    | `health`   |
| **Visuals**     | `byte* screens[0]`         | `_get_screen_buffer()`              | +0             | `uint8[64k]`| Framebuffer |
| **Visuals**     | `PLAYPAL`                  | `_get_playpal_pointer()`            | +0             | `uint8[768]`| RGB Palette |

## 2. Lidar (Native Raycasting)

To prevent the agent from getting stuck in "local minima" (running blindly into walls), we implemented a native raycasting solution:
1. `_get_ray_distance(angle_offset_deg)` is exposed from C.
2. It uses Doom's internal Blockmap and `P_PathTraverse`.
3. An interception callback (`PTR_LidarTraverse`) stops the ray when hitting a solid `line_t`.
4. Returns the physical distance as a `float`. `sensor_extractor.mjs` triggers 5 rays per frame (-45°, -20°, 0°, +20°, +45°) to feed the neural network.

## 3. Waypoint Navigation

Doom maps are complex and non-linear. The `TASHost` class uses an array of spatial Waypoints (`this.waypoints`).
The Fitness function rewards the AI for reaching the *current* waypoint and transitioning to the next, preventing the agent from hugging a wall that separates it from the final exit switch.

## 4. TAS Memory Snapshots (The "Time Machine")

WASM represents all physical RAM (heap, stack, BSS) as an `ArrayBuffer` attached to `HEAPU8`.
To implement Save States and Frame-Rewind:
1. `saveState()`: Creates a deep clone using `new Uint8Array(Module.HEAPU8)`.
2. `loadState(snapshot)`: Overwrites the linear memory using `Module.HEAPU8.set(snapshot)`.
* This operation costs almost 0ms and provides deterministic rewinds for TAS engineering.
