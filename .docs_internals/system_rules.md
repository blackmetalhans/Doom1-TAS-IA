# System Rules & Pipeline Metadata Artifact

## Topología del Pipeline Multi-Modelo
* **Fase 1 (Ingesta - Perplexity):** Extracción SOTA, CVEs, documentación de APIs (Zero-shot).
* **Fase 2 (Arquitectura - Gemini Pro):** Diseño lógico, estructuras de datos, patrones de diseño, system prompt engineering.
* **Fase 3 (Fuerza Bruta - Google AI Studio):** Context Caching (hasta 2M tokens), análisis de repositorios completos, volcados de memoria, refactorización cruzada.
* **Fase 4 (Ejecución - Gemini Spark):** Hipervisor local, I/O local, parsing AST, CI/CD, inyección de código, control de versiones (Git).
## Resolución de Conflictos (Fase 4 - Runtime)
* **Issue Toolchain (MINGW64):** Requerida inyección explícita del entorno con `source ./emsdk_env.sh` previo a cualquier invocación de `emcmake`.
* **Fix Binding WASM:** El symbol correcto expuesto a Node.js para mutar el `mobj_t` es `_SetPlayerInputs`, la variante `_TAS_SetInputs` es inválida.

## Reglas de Control de Versiones & Almacenamiento
* **Código:** Exclusivo en Git/GitHub.
* **Google Drive:** Únicamente binarios, diagramas de arquitectura, volcados de DB, WADs/ROMs pesadas y assets no versionables.
* **Commits Semánticos:** Estándar Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`).
* **Sincronización:** `git fetch origin -> git rebase origin/main`. En bloqueos `(main|REBASE ...)`, limpiar con `rm -fr .git/rebase-merge`.
* **Protocolo Anti-Alucinación y Verificación de Operaciones:** Antes de responder que un archivo fue guardado en Google Drive, es obligatorio haber llamado a la herramienta correspondiente y verificar el enlace devuelto.

## Trazabilidad de Debugging
* Interceptación de `stderr` / *stack trace* / *core dump*.
* Consulta a Perplexity si involucra dependencias actualizadas en los últimos 3 meses.
* Volcado a Google AI Studio para análisis de dependencias si abarca >3 archivos acoplados.
* Emisión e inyección local del parche por Gemini Spark.

---

# Proyecto: Doom1-TAS-IA

## Metadatos Iniciales
* **Nombre del Proyecto:** Doom1-TAS-IA
* **Stack Tecnológico:**
  * Engine: Doom (Chocolate Doom / PrBoom core) compilado a WebAssembly (WASM) / C.
  * Runtime / Wrapper: JavaScript (ES6+ / WebSockets / Web Workers).
  * Control / Agente IA: Agente de refuerzo / Bot TAS para procesamiento de inputs frame-by-frame (TICs).
* **Estructura de Directorios:**
  * `Doom1-TAS-IA/src/`: Código fuente del motor C y envoltorio WASM.
  * `Doom1-TAS-IA/js/`: Bridge JavaScript y emulador de inputs TIC.
  * `Doom1-TAS-IA/docs/`: Especificaciones de arquitectura y mapas de memoria.
  * `Doom1-TAS-IA/assets/`: Archivos `.wad` y binarios (almacenados en Google Drive, excluidos en `.gitignore`).

