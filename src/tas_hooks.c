#include <emscripten.h>
#include "doomstat.h"
#include "d_player.h"
#include "d_main.h"
#include "g_game.h"

extern void G_Ticker(void);

EMSCRIPTEN_KEEPALIVE
void* get_ticcmd_pointer(void) {
    return (void*)&players[consoleplayer].cmd;
}

EMSCRIPTEN_KEEPALIVE
void run_single_tic(void) {
    G_Ticker();
}

EMSCRIPTEN_KEEPALIVE
void* get_player_mobj_pointer(void) {
    if (!playeringame[consoleplayer]) return NULL;
    return (void*)players[consoleplayer].mo;
}

EMSCRIPTEN_KEEPALIVE
void start_tas_map(void) {
    G_InitNew(sk_medium, 1, 1);
}