#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DOOM_SRC="$REPO_ROOT/src/chocolate-doom"

echo "[+] Creando estructura de directorios..."
mkdir -p "$REPO_ROOT"/{src,build,scripts,js-client}

echo "[+] Clonando Chocolate Doom (rama limpia, sin submodulos pesados)..."
git clone --depth=1 --branch chocolate-doom-3.0.0 \
  https://github.com/chocolate-doom/chocolate-doom.git "$DOOM_SRC"

# NOTA: Comentamos la sección de parches porque la inyección de los hooks en C 
# la harás manualmente guiando a Copilot con tu archivo ARCHITECTURE.md.
# echo "[+] Aplicando parches headless..."
# cp "$REPO_ROOT/scripts/patches/"*.patch "$DOOM_SRC/"
# cd "$DOOM_SRC"
# for p in *.patch; do git apply "$p" || echo "[WARN] patch $p requiere revisión manual"; done

echo "[+] Descargando DOOM1.WAD shareware (para testing)..."
wget -q -O "$REPO_ROOT/build/doom1.wad" \
  "https://distro.ibiblio.org/pub/linux/distributions/slitaz/sources/packages/d/doom1.wad"

echo "[+] Verificando emsdk en PATH..."
if ! command -v emcc &>/dev/null; then
  echo "[ERROR] emcc no encontrado. Instala emsdk: https://emscripten.org/docs/getting_started/downloads.html"
  exit 1
fi
emcc --version

echo "[✓] Scaffold listo. Siguiente paso: inyectar código C y armar el CMakeLists."