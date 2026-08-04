cmake_minimum_required(VERSION 3.10)
project(ChocolateDoomTAS WASM)

# Flags de Emscripten
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -s WASM=1 -s USE_SDL=2 -s ALLOW_MEMORY_GROWTH=1")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -s EXPORTED_FUNCTIONS=['_main','_GetPlayerMobjPointer','_SetPlayerInputs','_GetLevelTime'] -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']")
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O3 -flto")

# Desactivar red y sonido para modo headless/TAS puro si es necesario, 
# pero Chocolate Doom depende de SDL para el loop.
add_definitions(-D_DOOM_ -DCHOCOLATE_DOOM)

# Directorios de inclusión
include_directories(
    src/chocolate-doom/src
    src/chocolate-doom/src/doom
    src/chocolate-doom/textscreen
    src/chocolate-doom/pcsound
    src/chocolate-doom/opl
)

# Fuentes de Chocolate Doom (Simplificado para el binario de Doom)
# Nota: En un entorno de producción se listarían exhaustivamente o se usaría glob
file(GLOB DOOM_SOURCES
    "src/chocolate-doom/src/*.c"
    "src/chocolate-doom/src/doom/*.c"
)

# Eliminar archivos que no son para Doom (Heretic, Hexen, Strife) y archivos de otros SOs
list(FILTER DOOM_SOURCES EXCLUDE REGEX "src/chocolate-doom/src/heretic/.*")
list(FILTER DOOM_SOURCES EXCLUDE REGEX "src/chocolate-doom/src/hexen/.*")
list(FILTER DOOM_SOURCES EXCLUDE REGEX "src/chocolate-doom/src/strife/.*")
list(FILTER DOOM_SOURCES EXCLUDE REGEX ".*_win32\\.c$")
list(FILTER DOOM_SOURCES EXCLUDE REGEX ".*_posix\\.c$")
# Evitar duplicados de i_main si los hay
list(FILTER DOOM_SOURCES EXCLUDE REGEX "src/chocolate-doom/src/setup/.*")

# Agregar nuestros hooks
set(SOURCES
    ${DOOM_SOURCES}
    src/tas_hooks.c
)

add_executable(chocolate-doom.js ${SOURCES})

# Configuración final para generar el binario JS/WASM
set_target_properties(chocolate-doom.js PROPERTIES SUFFIX ".js")
