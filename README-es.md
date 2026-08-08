# Doom1-TAS-IA 🚀

[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg)](LICENSE.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)
[![Status](https://img.shields.io/badge/Status-WIP-orange.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#)

![Demo](assets/demo.gif)

**Español** | [English](README.md)

Plataforma neuro-evolutiva de **Tool-Assisted Speedrun (TAS)** e **Inteligencia Artificial** de alto rendimiento para Doom 1, ejecutada sobre WebAssembly (WASM) mediante un motor decapitado en C controlado por un hipervisor en Node.js.

---

## 📋 Tabla de Contenidos
- [Visión General](#-visión-general)
- [Arquitectura y Puente C-WASM-JS](#-arquitectura-y-puente-c-wasm-js)
- [Stack Tecnológico](#-stack-tecnológico)
- [Estructura del Repositorio](#-estructura-del-repositorio)
- [Instalación y Compilación](#-instalación-y-compilación)
- [Uso del Hipervisor y FFI](#-uso-del-hipervisor-y-ffi)
- [Roadmap del Proyecto](#-roadmap-del-proyecto)
- [Metodología de Desarrollo](#-metodología-de-desarrollo)
- [Por qué es complejo](#-por-qué-es-complejo)
- [Convención de Commits y Reglas](#-convención-de-commits-y-reglas)
- [Licencia](#-licencia)

---

## 📖 Visión General
Doom1-TAS-IA es un entorno experimental diseñado para el desarrollo de bots autónomos de speedrun sobre Doom 1. Al reducir el núcleo de Chocolate Doom a un motor ejecutable sin interfaz gráfica (headless) compilado a WebAssembly, el sistema permite un control determinista tick-por-tick (TIC) e inyección directa en memoria a través de un hipervisor en Node.js.

El objetivo final es aplicar algoritmos de NeuroEvolución de Topologías Aumentadas (NEAT) y aprendizaje por refuerzo para optimizar tiempos de completado, navegación de rutas y mecánicas de movimiento en Doom.

---

## 🏗️ Arquitectura y Puente C-WASM-JS

La arquitectura consta de tres capas desacopladas optimizadas para cero overhead:

1. **Capa del Motor (C/WASM Decapitado):**
   - Motor Chocolate Doom depurado y compilado a WASM con Emscripten sin renderizado gráfico ni subsistemas de sonido.
   - Entry point: `init_headless_doom()` inicializa memoria, configuraciones, carga de IWAD (`D_FindIWAD`), identificación de versión (`D_IdentifyVersion`) y subsistemas lógicos (`M_Init`, `R_Init`, `P_Init`).
   - Hooks de FFI en C ([src/tas_hooks.c](src/tas_hooks.c)):
     - `_get_ticcmd_pointer()`: Expone la dirección física exacta de `players[consoleplayer].cmd` en el segmento BSS (`0x13bd28`).
     - `_run_single_tic()`: Invoca `G_Ticker()` para la simulación determinista de un solo frame.

2. **Capa del Puente (DataView en Memoria Lineal):**
   - Lectura y escritura directa sobre el heap lineal de WebAssembly (`mod.HEAPU8.buffer`) mediante JavaScript `DataView`.
   - Elimina la sobrecarga de serialización/deserialización JSON/FFI.
   - Compatible con el modelo de datos ILP32 de 32 bits para estructuras C de Doom (`mobj_t`, `ticcmd_t`).

3. **Capa del Hipervisor (Node.js / ES Modules):**
   - Implementado en [tas_host.mjs](tas_host.mjs).
   - Inicializa asíncronamente el runtime de WASM con `onRuntimeInitialized`, monta el IWAD en el VFS de Emscripten (`/doom1.wad`) y gestiona el ciclo de control determinista.

Para la especificación técnica completa, consulta [ARCHITECTURE.MD](ARCHITECTURE.MD).

---

## 🛠️ Stack Tecnológico

- **Motor Principal:** C (Chocolate Doom / Doomgeneric core)
- **Compilador:** Emscripten (`emcc`) con destino a WebAssembly (WASM)
- **Sistema de Compilación:** CMake + Ninja
- **Hipervisor / Host:** Node.js (ES Modules, `DataView`, VFS Emscripten)
- **Motor de IA:** NEAT (NeuroEvolution of Augmenting Topologies)

---

## 📂 Estructura del Repositorio

```
.
├── ARCHITECTURE.MD          # Especificación de arquitectura y mapas de memoria
├── CMakeLists.txt           # Configuración de CMake y banderas de Emscripten
├── LICENSE.md               # Licencia GNU General Public License v2.0
├── README.md                # Documentación del proyecto (Inglés)
├── README-es.md             # Documentación del proyecto (Español)
├── setup.sh                 # Script de configuración del entorno y descarga de assets
├── tas_host.mjs             # Hipervisor en Node.js y host WASM
├── test_hooks.mjs           # Script de prueba FFI y verificación de parches
├── .docs_internals/         # Contexto interno aislado y reglas de ingeniería
│   ├── doom_tas_context.md  # Contexto del proyecto y estado de la hoja de ruta
│   └── system_rules.md      # Reglas del flujo de trabajo y guías del repositorio
├── assets/                  # Assets del juego (IWAD doom1.wad)
├── build/                   # Artefactos de compilación (chocolate-doom.js, wasm)
├── js-client/               # Cliente web y componentes del bridge visual
└── src/                     # Código fuente C del motor y hooks FFI
    ├── tas_hooks.c          # Hooks expuestos (_get_ticcmd_pointer, _run_single_tic)
    └── chocolate-doom/      # Código fuente del motor Chocolate Doom
```

---

## ⚙️ Instalación y Compilación

### Requisitos Previos
- Node.js (v18+)
- Emscripten SDK (`emsdk`) configurado en el PATH
- CMake (v3.20+) y Ninja

### 1. Inicialización del Entorno
Ejecuta [setup.sh](setup.sh) para clonar dependencias y descargar el IWAD shareware de Doom 1:
```bash
./setup.sh
```

### 2. Compilación a WebAssembly
Inicializa las variables de entorno de `emsdk` y ejecuta CMake con Ninja:
```bash
# En Linux / MINGW64 / Bash / Windows:
source /ruta/a/emsdk/emsdk_env.sh
emcmake cmake -B build -G Ninja
ninja -C build
```

El proceso de compilación generará `chocolate-doom.js` y `chocolate-doom.wasm` en la carpeta `build/`.

---

## 🎮 Uso del Hipervisor y FFI

Para iniciar el motor WASM y probar el puente FFI en memoria, ejecuta [tas_host.mjs](tas_host.mjs):

```bash
node tas_host.mjs
```

### Uso Programático en JS:
```javascript
import TASHost from './tas_host.mjs';

const host = new TASHost();
await host.boot();

// Inyectar comando de frame (forwardmove, sidemove, angleturn, buttons, etc.)
host.injectTicCmd({
    forwardmove: 50,
    sidemove: 0,
    angleturn: 0,
    consistancy: 0,
    chatchar: 0,
    buttons: 1 // BT_ATTACK
});

// Avanzar el motor 1 frame (TIC)
host.runSingleTic();

// Inspeccionar telemetría directamente desde la memoria lineal WASM
const playerX = host.dataView.getInt32(0x13bd28 + 24, true);
```

---

## 🗺️ Roadmap del Proyecto

- **Fase 8: Integración NEAT y Montaje VFS**
  - Montaje de IWAD en VFS de Emscripten y mapeo de memoria FFI para `ticcmd`.
  - Evaluación de fitness de redes neuronales basada en telemetría de salud y distancia.
- **Fase 9: Cliente Visual & Canvas Bridge (Modern Alternative to DSDA-Runner)**
  - Extracción de framebuffer crudo (`screens[0]`) mediante `DataView` y renderizado dinámico en Canvas HTML5 / Electron para creación de TAS sin depender de herramientas legacy en C.

---

## 🛠️ Metodología de Desarrollo

Los modelos de Inteligencia Artificial en este repositorio se utilizan estrictamente como asistentes de herramientas de software y parsers de AST (por ejemplo, automatizando la generación de código base, transformaciones sintácticas y ediciones estructuradas de archivos). Los asistentes de IA no reemplazan la ingeniería de C de bajo nivel, el diseño de alineación de memoria ni el juicio heurístico humano requeridos para hipervisores deterministas de motores de juego.

Para más detalles sobre los protocolos de ingeniería, consulta [.docs_internals/system_rules.md](.docs_internals/system_rules.md).

---

## ⚡ Por qué es complejo

Ejecutar NeuroEvolución de Topologías Aumentadas (NEAT) directamente sobre un motor monolítico en C de los años 90 compilado a WebAssembly es fundamentalmente superior y exponencialmente más complejo que operar sobre emuladores externos o wrappers de transmisión de video tradicionales. Los entornos de RL convencionales sufren de alta latencia de IPC, planificación no determinista del sistema operativo y capturas pesadas del framebuffer. En contraste, esta arquitectura reduce el motor a un núcleo de ejecución en C sin entorno gráfico, expone las direcciones físicas del segmento BSS (`0x13bd28` para estructuras `ticcmd_t`) y gestiona la simulación de forma determinista mediante mutaciones de memoria `DataView` con cero sobrecarga a 35 TIC/s (o velocidades de evaluación sin límite que superan miles de frames por segundo). Lograr esto requiere una meticulosa refactorización de C de bajo nivel, mantener la alineación exacta de memoria de estructuras ILP32 a través de las fronteras de WASM, resolver salvedades de sincronización de archivos en el VFS de Emscripten y garantizar un determinismo perfecto estado por frame a lo largo de millones de iteraciones evolutivas.

---

## 🤝 Convención de Commits y Reglas

Se exige el uso estricto de **Conventional Commits**:
- `feat:` Nuevas características de TAS, módulos de IA o hooks del hipervisor.
- `fix:` Corrección de errores, desincronizaciones de TICs o del pipeline de build.
- `refactor:` Optimizaciones de memoria o purga gráfica del motor.
- `chore:` Actualizaciones de scripts de compilación o dependencias.
- `docs:` Actualización de documentación y mapas de memoria.

---

## 📜 Licencia

Este proyecto está bajo la licencia **GNU General Public License v2.0** — consulta [LICENSE.md](LICENSE.md) para más información.
