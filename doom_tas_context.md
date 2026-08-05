# DOOM TAS WASM - PROJECT CONTEXT & STATE

## OVERVIEW
This project aims to build a neuro-evolutionary Tool-Assisted Speedrun (TAS) bot for Doom. The architecture relies on a headless, WebAssembly-compiled C engine (doomgeneric/Chocolate Doom) controlled by a Node.js hypervisor.

## TECH STACK
- **Engine:** C (doomgeneric port)
- **Compiler:** Emscripten (emcc) targeting WebAssembly (WASM)
- **Hypervisor:** Node.js (ES Modules)
- **AI/Evolution:** NEAT (NeuroEvolution of Augmenting Topologies) - Pending implementation.

## CURRENT PROGRESS (As of Aug 4, 2026)
1.  **Environment Setup:** `doom1.wad` acquired and ready for VFS bundling.
2.  **Compilation Topology:** `build.sh` drafted. It utilizes `emcc` with flags for LTO (`-flto`), memory export (`ALLOW_MEMORY_GROWTH`), and specific function exports (`_main`, `_doomgeneric_tick`, etc.).
3.  **Hypervisor Structure:** `tas_host.mjs` drafted. It successfully instantiates the WASM module, maps the memory buffer via `DataView`, and establishes a discrete tick loop (`env.step()`) decoupled from real-time execution.
4.  **Memory Mapping:** Fixed offsets for the `mobj_t` struct have been identified for wasm32 (ILP32): MOBJ_X = 24, MOBJ_Y = 28, MOBJ_Z = 32, MOBJ_ANGLE = 48 (uint32_t), MOBJ_HEALTH = 112 (int32_t), assuming fixed-point (16.16) arithmetic.

## IMMEDIATE NEXT STEPS (ACTION ITEMS)
1.  **C-Level FFI Hooks:** We need to inject `EMSCRIPTEN_KEEPALIVE` functions into the C source (e.g., in `doomgeneric.c` or a new `tas_hooks.c`). Specifically:
    *   `GetPlayerMobjPointer()`: To return the memory address of the local player's `mobj_t`.
    *   `SetPlayerInputs(forward, side, angle, buttons)`: To intercept and override the `ticcmd_t` before the physical frame processing.
    *   `GetLevelTime()`: To track simulation progression.
2.  **Compilation & Linking:** Execute `build.sh` and resolve any missing symbols or VFS packaging issues.
3.  **Telemetry Verification:** Run `node tas_host.mjs` and confirm the `DataView` extracts valid coordinates, not null pointers.
4.  **NEAT Integration:** Begin drafting the neural network interface to map genomic outputs to the `SetPlayerInputs` hook, using Health and Distance as the fitness function.

## WORKFLOW INTEGRATION
This context file synchronizes the multi-model pipeline. Gemini Spark (Execution) must use this state to inform local I/O operations, while Gemini Pro (Architecture) and AI Studio (Brute Force) use it as the foundation for complex logic generation.

