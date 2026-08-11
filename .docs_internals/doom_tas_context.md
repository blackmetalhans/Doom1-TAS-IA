# DOOM TAS WASM - PROJECT CONTEXT & STATE

## OVERVIEW
This project aims to build a neuro-evolutionary Tool-Assisted Speedrun (TAS) bot for Doom. The architecture relies on a headless, WebAssembly-compiled C engine (doomgeneric/Chocolate Doom) controlled by a Node.js hypervisor.

## TECH STACK
- **Engine:** C (doomgeneric port)
- **Compiler:** Emscripten (emcc) targeting WebAssembly (WASM)
- **Hypervisor:** Node.js (ES Modules)
- **AI/Evolution:** NEAT (NeuroEvolution of Augmenting Topologies) - Pending implementation.

## CURRENT PROJECT STATE
**FASE 8: NEAT Integration & VFS Mounting.**

## CURRENT PROGRESS (As of Aug 10, 2026)
1. **Environment Setup:** doom1.wad acquired and ready for VFS bundling.
2. **Compilation Topology:** CMakeLists.txt / Ninja build pipeline configured targeting WASM. Utilizes `emcc` with flags for LTO (-flto), memory growth, and specific function exports.
3. **Hypervisor Structure:** tas_host.mjs updated. Instantiation hook "CommonJS Global Intercept" successfully implemented; utilizes `DataView` for decoupled tick loops.
4. **Memory Mapping & Pointer Extraction:**
   - Direct pointer binding via _get_ticcmd_pointer() to players[consoleplayer].cmd.
   - **BSS Pointer Extraction [COMPLETED]:** ticcmd_t physical offset successfully extracted at 0x13bd28 via AST physical binary patching, bypassing Emscripten hoisting.
   - **Fixed Offsets (wasm32 ILP32):** MOBJ_X: 24, MOBJ_Y: 28, MOBJ_Z: 32, MOBJ_ANGLE: 48 (uint32_t), MOBJ_HEALTH: 112 (int32_t).
5. **FFI Physics Loop Validation [COMPLETED]:** 
   - Successfully bypassed the network ring buffer (`netcmds` array in `g_game.c`) to isolate the input pipeline. This guarantees deterministic zero-overhead injections from Node.js directly into WASM `ticcmd_t`.
   - Engine initialization skips title screens by forced level allocation via `G_InitNew()`.
   - **Empirical Validation Data:** Spawn settled in E1M1 at X: 1056, Y: -3616. Sustained FFI injection via DataView (`forwardmove = 50`) for 35 TICs yielded Final Coords X: 1055.83, Y: -3186.49 (Delta Y +429.5 units), confirming robust collision resolution and vector thrust handling inside the tick loop.

## IMMEDIATE NEXT STEPS (ACTION ITEMS)
1. **C-Level FFI Hooks [COMPLETED]:** Injected EMSCRIPTEN_KEEPALIVE functions in src/tas_hooks.c. _get_ticcmd_pointer() exposes direct memory address of players[consoleplayer].cmd for zero-overhead V8 mutation. _run_single_tic() calls G_Ticker().
2. **BSS Pointer Extraction [COMPLETED]:** ticcmd_t physical offset successfully extracted at 0x13bd28.
3. **NEAT Topology Structuring [PENDING]:** Map genomes output natively to FFI struct injections (`forwardmove`, `sidemove`, `angleturn`, `buttons`) for the AI agent.
4. **Environment Sensing (Raycasting/BSP) [PENDING]:** Extract pointers from the BSP tree and raycasting routines to inject precise environment distances as sensor nodes (input nodes) for the NEAT agent.
- [ ] Phase 9: Visual Client UI Development (Framebuffer extraction via DataView and HTML5 Canvas mapping).

## WORKFLOW INTEGRATION
This context file synchronizes the multi-model pipeline. Gemini Spark (Execution) uses this state to inform local I/O operations, while Gemini Pro (Architecture) and AI Studio (Brute Force) use it as foundation for complex logic generation.