# ARCHITECTURE.md - Doom1-TAS-IA Architecture & C-WASM-JS Bridge

## Overview
This document specifies the zero-overhead C-WASM-JS bridge and execution pipeline for the Doom1-TAS-IA autonomous speedrun bot.

## Core Layers
1. **Engine Layer (C/WASM):** Headless compilation of Chocolate Doom/PrBoom core using Emscripten (`emcc`). Intercepts `ticcmd_t` before physical frame processing via `EMSCRIPTEN_KEEPALIVE` hooks (`SetPlayerInputs`).
2. **Bridge & Telemetry Layer (DataView):** Direct memory inspection over the WebAssembly Linear Memory buffer using fixed structure pointer offsets:
   - `MOBJ_X` (24), `MOBJ_Y` (28), `MOBJ_Z` (32) [fixed_t 16.16]
   - `MOBJ_ANGLE` (48) [uint32_t / BAM]
   - `MOBJ_HEALTH` (112) [int32_t]
3. **Hypervisor Layer (Node.js / ES Modules):** Decoupled tick-by-tick simulation loop (`env.step()`) executed independently from real-time display constraints.

## Zero-Overhead Principles
- **No Serialization:** Telemetry reads directly from WASM Shared Array / DataView memory pointers without JSON parsing.
- **Atomic Ticks:** Discrete frame stepping ensures deterministic simulation for neural network training and TAS reproduction.

