cmake_minimum_required(VERSION 3.20)
project(Doom1-TAS-IA C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "Este proyecto debe ser compilado usando Emscripten (emcmake cmake ...)")
endif()

# Flags globales de optimización y símbolos
add_compile_options(-O3 -flto -fno-strict-aliasing -s USE_SDL=2 "-sUSE_SDL_MIXER=2" "-sUSE_SDL_NET=2")
add_link_options(-O3 -flto -s USE_SDL=2 "-sUSE_SDL_MIXER=2" "-sUSE_SDL_NET=2")

add_subdirectory(src)
