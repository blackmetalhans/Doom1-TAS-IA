#include <emscripten.h>
#include "doomstat.h"
#include "d_player.h"

EMSCRIPTEN_KEEPALIVE void* _get_ticcmd_pointer() { return (void*)&players[consoleplayer].cmd; }
EMSCRIPTEN_KEEPALIVE void _run_single_tic() { extern void G_Ticker(void); G_Ticker(); }