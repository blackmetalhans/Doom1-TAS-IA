# Doom1-TAS-IA 🚀

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
- [Pipeline de Ingeniería IA Multi-Modelo](#-pipeline-de-ingeniería-ia-multi-modelo)
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
├── doom_tas_context.md      # Contexto del proyecto y estado de la hoja de ruta
├── setup.sh                 # Script de configuración del entorno y descarga de assets
├── system_rules.md          # Reglas del pipeline multi-modelo y guías del repositorio
├── tas_host.mjs             # Hipervisor en Node.js y host WASM
├── temp_build_ninja.bat     # Script de compilación para Windows (CMake/Ninja)
├── test_hooks.mjs           # Script de prueba FFI y verificación de parches
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
# En Linux / MINGW64 / Bash:
source /ruta/a/emsdk/emsdk_env.sh
emcmake cmake -B build -G Ninja
ninja -C build

# En Windows (cmd/bat):
temp_build_ninja.bat
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

## 🧠 Pipeline de Ingeniería IA Multi-Modelo

Este repositorio utiliza un flujo de trabajo optimizado entre múltiples modelos de IA:
- **Fase 1 (Ingesta - Perplexity):** Extracción de estado del arte, CVEs y documentación de APIs.
- **Fase 2 (Arquitectura - Gemini Pro):** Diseño lógico, patrones de arquitectura y prompt engineering.
- **Fase 3 (Fuerza Bruta - Google AI Studio):** Análisis de contexto masivo (hasta 2M tokens) y volcados de memoria.
- **Fase 4 (Ejecución - Gemini Spark / GitHub Copilot):** Parsing AST, inyección local de código, I/O local, CI/CD y Git.

Para más detalles sobre los protocolos del flujo de trabajo, consulta [system_rules.md](system_rules.md).

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
