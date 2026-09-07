#include <emscripten.h>
#include <stddef.h>
#include "doomstat.h"
#include "d_player.h"
#include "d_main.h"
#include "g_game.h"
#include "p_local.h"
#include "i_video.h"
#include "w_wad.h"

extern void G_Ticker(void);

// -----------------------------------------------------
// FASE 8: GESTIÓN DE ESTADO Y TICCMD_T FFI
// -----------------------------------------------------

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

// -----------------------------------------------------
// FASE 9: VISUAL CANVAS BRIDGE (EXTRACCIÓN DE FRAMEBUFFER)
// -----------------------------------------------------

// Retorna el puntero al buffer interno de píxeles (320x200 bytes)
EMSCRIPTEN_KEEPALIVE
void* get_screen_buffer(void) {
    return (void*)I_VideoBuffer;
}

// Retorna la paleta de colores activa (PLAYPAL).
// El lump PLAYPAL tiene 14 paletas (cada una 256 colores x 3 bytes = 768 bytes).
EMSCRIPTEN_KEEPALIVE
void* get_playpal_pointer(void) {
    return W_CacheLumpName("PLAYPAL", PU_CACHE);
}

// -----------------------------------------------------
// FASE 9: ENTORNO SENSORIAL / RAYCASTING (LIDAR C->JS)
// -----------------------------------------------------

// Variable global para capturar la fracción de impacto del rayo
static fixed_t raycast_fraction = FRACUNIT;

// Función interceptora que se detiene en la primera pared sólida
boolean PTR_LidarTraverse(intercept_t* in) {
    if (in->isaline) {
        line_t* li = in->d.line;
        // Si el muro es de 1 solo lado (sólido total) o tiene bloqueador de línea de visión/movimiento
        if (!(li->flags & ML_TWOSIDED) || (li->flags & ML_BLOCKING)) {
            raycast_fraction = in->frac;
            return false; // Interrumpir trazado (hit)
        }
    }
    return true; // Continuar rayo a través del aire/obstáculos menores
}

// Emite un rayo láser desde el jugador en un ángulo relativo (grados).
// Retorna la distancia física a la pared más cercana.
EMSCRIPTEN_KEEPALIVE
float get_ray_distance(float angle_offset_deg) {
    if (!playeringame[consoleplayer]) return 0.0f;
    mobj_t* mo = players[consoleplayer].mo;
    if (!mo) return 0.0f;

    // Convertir offset en grados a BAM y sumarlo a la orientación actual del marine
    angle_t angle_offset_bam = (angle_t)((angle_offset_deg / 360.0f) * 4294967296.0);
    angle_t aim_angle = mo->angle + angle_offset_bam;
    
    // Rango máximo del Lidar: 2048 unidades de mapa
    fixed_t max_dist = 2048 * FRACUNIT;
    
    // Proyección del vector usando las tablas trigonométricas precomputadas de Doom
    int aim_fineangle = aim_angle >> ANGLETOFINESHIFT;
    fixed_t x2 = mo->x + FixedMul(max_dist, finecosine[aim_fineangle]);
    fixed_t y2 = mo->y + FixedMul(max_dist, finesine[aim_fineangle]);

    raycast_fraction = FRACUNIT; // Resetear fracción
    
    // Invocar el Blockmap ray-tracer nativo de Doom
    P_PathTraverse(mo->x, mo->y, x2, y2, PT_ADDLINES, PTR_LidarTraverse);
    
    // Calcular la distancia real en base a la fracción interceptada
    fixed_t hit_dist = FixedMul(max_dist, raycast_fraction);
    
    // Convertir de fixed_t (16.16) a float para el hipervisor JS
    return (float)hit_dist / 65536.0f;
}