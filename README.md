# Doom1-TAS-IA

Proyecto de Tool-Assisted Speedrun (TAS) y agente IA sobre Doom 1 ejecutándose en WebAssembly (WASM).

## Stack Tecnológico
* **Motor:** C / WASM (Chocolate Doom / PrBoom core)
* **Frontend/Runtime:** JavaScript (WebAssembly JS API, HTML5 Canvas, Web Workers)
* **Control IA:** Inyección de TICs / inputs frame-by-frame mediante agente autómata

## Convención de Commits
Se requiere el uso estricto de **Conventional Commits**:
* `feat:` nuevas características o módulos de TAS
* `fix:` resolución de desincronizaciones de TICs o bugs
* `refactor:` optimizaciones de memoria C/WASM
* `chore:` actualización de scripts de compilación o dependencias
* `docs:` documentación y mapas de memoria

## Reglas de Repositorio
* **Git:** Almacena únicamente código fuente C/JS/HTML/CSS, scripts y documentación.
* **Google Drive:** Almacena volcados de memoria, binarios compilados `.wasm`, grabaciones `.lmp` pesadas y archivos de juego `.wad` (definidos en `.gitignore`).

