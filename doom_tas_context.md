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

## CURRENT PROGRESS (As of Aug 7, 2026)
1. **Environment Setup:** doom1.wad acquired and ready for VFS bundling.
2. **Compilation Topology:** CMakeLists.txt / Ninja build pipeline configured targeting WASM. Utilizes `emcc` with flags for LTO (-flto), memory growth, and specific function exports.
3. **Hypervisor Structure:** tas_host.mjs updated. Instantiation hook "CommonJS Global Intercept" successfully implemented; utilizes `DataView` for decoupled tick loops.
4. **Memory Mapping & Pointer Extraction:**
   - Direct pointer binding via _get_ticcmd_pointer() to players[consoleplayer].cmd.
   - **BSS Pointer Extraction [COMPLETED]:** ticcmd_t physical offset successfully extracted at 0x13bd28 via AST physical binary patching, bypassing Emscripten hoisting.
   - **Fixed Offsets (wasm32 ILP32):** MOBJ_X: 24, MOBJ_Y: 28, MOBJ_Z: 32, MOBJ_ANGLE: 48 (uint32_t), MOBJ_HEALTH: 112 (int32_t).

## IMMEDIATE NEXT STEPS (ACTION ITEMS)
1. **C-Level FFI Hooks [COMPLETED]:** Injected EMSCRIPTEN_KEEPALIVE functions in src/tas_hooks.c. _get_ticcmd_pointer() exposes direct memory address of players[consoleplayer].cmd for zero-overhead V8 mutation. _run_single_tic() calls G_Ticker().
2. **BSS Pointer Extraction [COMPLETED]:** ticcmd_t physical offset successfully extracted at 0x13bd28.
3. **IWAD Sandbox Mounting (VFS):** Configure NODEFS inside Module.preRun in tas_host.mjs to mount local assets directory containing doom1.wad.
4. **NEAT Integration:** Begin drafting neural network interface to map genomic outputs to _get_ticcmd_pointer(), using Health and Distance as fitness function.
- [ ] Phase 9: Visual Client UI Development (Framebuffer extraction via DataView and HTML5 Canvas mapping).

## WORKFLOW INTEGRATION
This context file synchronizes the multi-model pipeline. Gemini Spark (Execution) uses this state to inform local I/O operations, while Gemini Pro (Architecture) and AI Studio (Brute Force) use it as foundation for complex logic generation.