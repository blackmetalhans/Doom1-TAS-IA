#include <emscripten.h>
#include "chocolate-doom/src/doom/doomstat.h"
#include "chocolate-doom/src/doom/p_local.h"
#include "chocolate-doom/src/d_ticcmd.h"

// Mantener un ticcmd global inyectado por JS para evitar corrupción de pila
static ticcmd_t tas_cmd;

// Forzamos la exportación para evitar que el optimizador -O3/-flto elimine los símbolos
EMSCRIPTEN_KEEPALIVE
mobj_t* GetPlayerMobjPointer(void) {
    // consoleplayer es la variable global que indica el jugador local (0)
    if (players[consoleplayer].mo == NULL) return NULL;
    return players[consoleplayer].mo;
}

EMSCRIPTEN_KEEPALIVE
void SetPlayerInputs(char forwardmove, char sidemove, short angleturn, short buttons) {
    // Actualizamos el struct estático con el genoma actual
    tas_cmd.forwardmove = forwardmove;
    tas_cmd.sidemove = sidemove;
    tas_cmd.angleturn = angleturn;
    tas_cmd.buttons = buttons;
    
    // Sobrescribimos la estructura de comandos del tick actual antes del procesamiento físico
    players[consoleplayer].cmd = tas_cmd;
}

EMSCRIPTEN_KEEPALIVE
int GetLevelTime(void) {
    return leveltime;
}