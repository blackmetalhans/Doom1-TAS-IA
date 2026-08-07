# Doom1-TAS-IA 🚀

Proyecto de **Tool-Assisted Speedrun (TAS)** y agente de **Inteligencia Artificial** neuro-evolutiva sobre Doom 1, ejecutándose mediante WebAssembly (WASM).

## 📋 Tabla de Contenidos
- [Descripción](#descripción)
- [Arquitectura del Proyecto](#arquitectura-del-proyecto)
- [Stack Tecnológico](#stack-tecnológico)
- [Pipeline Multi-Modelo](#pipeline-multi-modelo)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Convención de Commits](#convención-de-commits)
- [Reglas de Repositorio](#reglas-de-repositorio)

## 📖 Descripción
Doom1-TAS-IA es una plataforma experimental diseñada para el desarrollo de bots de speedrun autónomos. Utiliza un motor de Doom (Chocolate Doom/PrBoom) portado a C/WASM, permitiendo un control preciso de los inputs frame-by-frame (TICs) a través de un hipervisor en Node.js.

El objetivo final es integrar algoritmos de neuro-evolución (como NEAT) para entrenar agentes que optimicen rutas y tiempos de completado de niveles.

## 🏗️ Arquitectura del Proyecto
El sistema se divide en tres capas principales:
1. **Engine Layer (C/WASM):** Motor de Doom compilado con Emscripten, con hooks para inyección de inputs.
2. **Bridge Layer (DataView):** Inspección de telemetría directamente desde la memoria lineal de WASM sin overhead de serialización.
3. **Hypervisor Layer (Node.js):** Lazo de control determinista que ejecuta la simulación tick-por-tick.

Para más detalles, consulta [ARCHITECTURE.MD](ARCHITECTURE.MD).

## 🛠️ Stack Tecnológico
*   **Motor:** C (Chocolate Doom / PrBoom core)
*   **Compilador:** Emscripten (WASM)
*   **Runtime:** Node.js (Hypervisor / AI Control)
*   **Build System:** CMake + Ninja
*   **AI:** NEAT (NeuroEvolution of Augmenting Topologies) - *En desarrollo*

## 🧠 Pipeline Multi-Modelo
Este proyecto utiliza un flujo de trabajo optimizado con múltiples modelos de IA:
*   **Fase 1 (Ingesta - Perplexity):** Extracción de documentación y APIs.
*   **Fase 2 (Arquitectura - Gemini Pro):** Diseño lógico y patrones.
*   **Fase 3 (Fuerza Bruta - AI Studio):** Análisis de contexto masivo.
*   **Fase 4 (Ejecución - Gemini Spark):** I/O local e inyección de código.

## 📂 Estructura del Repositorio
*   `src/`: Código fuente C del motor y hooks de TAS.
*   `js-client/`: Lógica del cliente y bridge WASM.
*   `scripts/`: Utilidades de automatización y compilación.
*   `build/`: Artefactos de compilación (generados localmente).
*   `docs/`: Documentación técnica detallada.

## 🤝 Convención de Commits
Se requiere el uso estricto de **Conventional Commits**:
* `feat:` nuevas características o módulos de TAS.
* `fix:` resolución de desincronizaciones de TICs o bugs.
* `refactor:` optimizaciones de memoria C/WASM.
* `chore:` actualización de scripts de compilación o dependencias.
* `docs:` documentación y mapas de memoria.

## 📜 Reglas de Repositorio
* **Git:** Almacena únicamente código fuente C/JS/HTML/CSS, scripts y documentación.
* **Google Drive:** Almacena volcados de memoria, binarios `.wasm`, grabaciones `.lmp` y archivos `.wad` (excluidos por `.gitignore`).

