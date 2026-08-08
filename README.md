# Doom1-TAS-IA 🚀

[Español](README-es.md) | **English**

High-performance, neuro-evolutionary **Tool-Assisted Speedrun (TAS)** and **Artificial Intelligence** framework for Doom 1, powered by WebAssembly (WASM) and a headless C engine controlled via a Node.js hypervisor.

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Architecture & C-WASM-JS Bridge](#-architecture--c-wasm-js-bridge)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Setup & Build Instructions](#-setup--build-instructions)
- [Hypervisor & FFI Usage](#-hypervisor--ffi-usage)
- [Project Roadmap](#-project-roadmap)
- [Multi-Model AI Engineering Pipeline](#-multi-model-ai-engineering-pipeline)
- [Commit Convention & Guidelines](#-commit-convention--guidelines)
- [License](#-license)

---

## 📖 Overview
Doom1-TAS-IA is an experimental platform designed for building autonomous speedrun bots and AI agents for Doom 1. By stripping the Chocolate Doom core into a headless WebAssembly engine, the system enables deterministic, frame-by-frame (TIC) tick-loop execution and direct memory mutation via a high-performance Node.js hypervisor.

The primary goal is applying NeuroEvolution of Augmenting Topologies (NEAT) and reinforcement learning models to optimize completion times, route navigation, and movement mechanics in Doom.

---

## 🏗️ Architecture & C-WASM-JS Bridge

The architecture consists of three decoupled layers designed for zero-overhead performance:

1. **Headless Engine Layer (C/WASM):** 
   - Modified Chocolate Doom core compiled to WASM via Emscripten without graphics or sound output.
   - Entry point: `init_headless_doom()` initializes memory, configuration, IWAD loading (`D_FindIWAD`), version identification (`D_IdentifyVersion`), and logic subsystems (`M_Init`, `R_Init`, `P_Init`).
   - C Hooks ([src/tas_hooks.c](src/tas_hooks.c)):
     - `_get_ticcmd_pointer()`: Exposes the exact memory address of `players[consoleplayer].cmd` in BSS segment (`0x13bd28`).
     - `_run_single_tic()`: Executes `G_Ticker()` for deterministic single-frame stepping.

2. **Bridge Layer (Linear DataView Memory):**
   - Direct memory read/write inspection over WebAssembly linear heap (`mod.HEAPU8.buffer`) using JavaScript `DataView`.
   - Bypasses JSON/FFI serialization overhead.
   - Uses ILP32 32-bit layout for Doom C structures (`mobj_t`, `ticcmd_t`).

3. **Hypervisor Layer (Node.js / ES Modules):**
   - Implemented in [tas_host.mjs](tas_host.mjs).
   - Asynchronously initializes WASM runtime via `onRuntimeInitialized`, mounts IWAD into Emscripten VFS (`/doom1.wad`), and drives the tick-by-tick simulation loop.

For full architectural specifications, see [ARCHITECTURE.MD](ARCHITECTURE.MD).

---

## 🛠️ Technology Stack

- **Core Engine:** C (Chocolate Doom / Doomgeneric core)
- **Compiler:** Emscripten (`emcc`) targeting WebAssembly (WASM)
- **Build System:** CMake + Ninja
- **Hypervisor / Host:** Node.js (ES Modules, `DataView`, Emscripten VFS)
- **AI Engine:** NEAT (NeuroEvolution of Augmenting Topologies)

---

## 📂 Project Structure

```
.
├── ARCHITECTURE.MD          # Technical architectural specification and memory maps
├── CMakeLists.txt           # Build configuration with Emscripten linker flags
├── LICENSE.md               # GNU General Public License v2.0
├── README.md                # Project documentation (English)
├── README-es.md             # Documentación del proyecto (Español)
├── doom_tas_context.md      # Context and current roadmap status
├── setup.sh                 # Environment setup and dependency fetching script
├── system_rules.md          # Multi-model workflow rules and repository guidelines
├── tas_host.mjs             # Node.js hypervisor and WASM host bridge
├── temp_build_ninja.bat     # Windows build script for CMake/Ninja
├── test_hooks.mjs           # FFI probe and binary patch verification script
├── assets/                  # Game assets (doom1.wad IWAD)
├── build/                   # Compilation artifacts (chocolate-doom.js, wasm)
├── js-client/               # Web client and visual canvas bridge components
└── src/                     # C engine source code and custom FFI hooks
    ├── tas_hooks.c          # FFI export hooks (_get_ticcmd_pointer, _run_single_tic)
    └── chocolate-doom/      # Chocolate Doom engine codebase
```

---

## ⚙️ Setup & Build Instructions

### Prerequisites
- Node.js (v18+)
- Emscripten SDK (`emsdk`) configured in PATH
- CMake (v3.20+) and Ninja build tool

### 1. Environment Initialization
Run [setup.sh](setup.sh) to clone dependencies and fetch the Doom 1 shareware IWAD:
```bash
./setup.sh
```

### 2. Compiling to WebAssembly
Initialize `emsdk` environment variables and run CMake with Ninja:
```bash
# On Linux / MINGW64 / Bash:
source /path/to/emsdk/emsdk_env.sh
emcmake cmake -B build -G Ninja
ninja -C build

# On Windows (cmd/bat):
temp_build_ninja.bat
```

The build process generates `chocolate-doom.js` and `chocolate-doom.wasm` inside the `build/` directory.

---

## 🎮 Hypervisor & FFI Usage

To boot the WASM engine and test the FFI memory bridge, run [tas_host.mjs](tas_host.mjs):

```bash
node tas_host.mjs
```

### Programmatic Usage in JS:
```javascript
import TASHost from './tas_host.mjs';

const host = new TASHost();
await host.boot();

// Inject input frame (forwardmove, sidemove, angleturn, buttons, etc.)
host.injectTicCmd({
    forwardmove: 50,
    sidemove: 0,
    angleturn: 0,
    consistancy: 0,
    chatchar: 0,
    buttons: 1 // BT_ATTACK
});

// Step engine forward by 1 frame
host.runSingleTic();

// Inspect telemetry directly from WASM memory
const playerX = host.dataView.getInt32(0x13bd28 + 24, true);
```

---

## 🗺️ Project Roadmap

- **Phase 8: NEAT Integration & VFS Mounting**
  - IWAD mounting in Emscripten VFS and tick-cmd FFI memory mapping.
  - Neural network fitness evaluations based on health and distance telemetry.
- **Phase 9: Visual Client & Canvas Bridge (Modern Alternative to DSDA-Runner)**
  - Raw framebuffer extraction (`screens[0]`) via `DataView` and dynamic rendering on HTML5 Canvas / Electron for TAS creation without depending on legacy C tools.

---

## 🧠 Multi-Model AI Engineering Pipeline

This repository utilizes a structured multi-model AI development pipeline:
- **Phase 1 (Ingestion - Perplexity):** Cutting-edge research, CVEs, and API documentation extraction.
- **Phase 2 (Architecture - Gemini Pro):** System prompt engineering, data structures, and architectural patterns.
- **Phase 3 (Brute Force - Google AI Studio):** Deep repository analysis, context caching (up to 2M tokens), memory dump inspection.
- **Phase 4 (Execution - Gemini Spark / GitHub Copilot):** AST parsing, code injection, local I/O, CI/CD, and Git operations.

For details on workflow protocols, see [system_rules.md](system_rules.md).

---

## 🤝 Commit Convention & Guidelines

Strict adherence to **Conventional Commits** is required:
- `feat:` New TAS features, AI modules, or hypervisor hooks.
- `fix:` Bug fixes, desync resolutions, or build pipeline corrections.
- `refactor:` Memory layout optimizations or engine headless purges.
- `chore:` Build script or dependency updates.
- `docs:` Documentation and memory map updates.

---

## 📜 License

This project is licensed under the **GNU General Public License v2.0** — see [LICENSE.md](LICENSE.md) for details.

