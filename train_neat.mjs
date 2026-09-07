import fs from 'fs';
import path from 'path';
import { TASHost } from './tas_host.mjs';
import { Population, NeuralNetwork } from './neat_engine.mjs';

/**
 * Runner principal de NeuroEvolución (NEAT) para Doom 1 (E1M1).
 * Ejecuta evaluaciones paralelas/secuenciales deterministas sobre Chocolate Doom WASM.
 */
async function runTraining() {
    console.log("==========================================================");
    console.log("       Doom1-TAS-IA :: Motor Evolutivo NEAT v1.0         ");
    console.log("==========================================================\n");

    const POPULATION_SIZE = 20;
    const INPUT_COUNT = 13;    // Distancia, ángulo rel, velocidad, salud, cos/sin orientación, cos/sin meta + 5 rayos Lidar
    const OUTPUT_COUNT = 4;    // [forward, side, angleturn, use_button]
    const MAX_TICKS = 35 * 20; // 20 segundos de simulación por intento (700 TICs)
    const GENERATIONS = 50;

    console.log(`[*] Parámetros: Población: ${POPULATION_SIZE} | Entradas: ${INPUT_COUNT} | Salidas: ${OUTPUT_COUNT}`);
    console.log(`[*] Ticks máximos por genoma: ${MAX_TICKS} (20s a 35 TIC/s)\n`);

    const host = new TASHost({ maxTicksPerEpisode: MAX_TICKS });
    
    console.log("[*] Inicializando hipervisor WASM y cargando IWAD...");
    await host.boot();
    console.log("[+] Motor C (Chocolate Doom Headless) inicializado con éxito.\n");

    const population = new Population(POPULATION_SIZE, INPUT_COUNT, OUTPUT_COUNT);

    let globalBestFitness = -Infinity;
    let globalBestDistance = Infinity;

    for (let gen = 1; gen <= GENERATIONS; gen++) {
        console.log(`--- [ GENERACIÓN ${gen} / ${GENERATIONS} ] ---`);
        const startTime = Date.now();
        let genFitnessSum = 0;
        let genBestDistance = Infinity;
        let genBestGenome = null;
        let genBestReplay = null;

        for (let i = 0; i < population.genomes.length; i++) {
            const genome = population.genomes[i];
            const net = new NeuralNetwork(genome);

            // Reiniciar mapa a E1M1 limpio
            let obs = host.reset();
            let totalReward = 0;
            let stuckCounter = 0;
            let lastDist = host.initialDistance;

            for (let t = 0; t < MAX_TICKS; t++) {
                // Inferencia feed-forward
                const actions = net.activate(obs);

                // Ejecutar TIC en el hipervisor
                const stepResult = host.step(actions);
                obs = stepResult.observation;
                totalReward += stepResult.reward;

                // Detección de atasco temprano (si no avanza en 70 TICs / 2 segundos)
                if (Math.abs(stepResult.info.distance - lastDist) < 1.0) {
                    stuckCounter++;
                } else {
                    stuckCounter = 0;
                    lastDist = stepResult.info.distance;
                }

                if (stuckCounter > 70) {
                    // Penalización por estancarse contra una pared
                    totalReward -= 10.0;
                    break;
                }

                if (stepResult.done) {
                    break;
                }
            }

            // Normalización de fitness positivo para compatibilidad NEAT
            const finalFitness = Math.max(0.01, totalReward + 200.0);
            genome.fitness = finalFitness;
            genFitnessSum += finalFitness;

            const finalDist = host.bestDistance;
            if (finalDist < genBestDistance) {
                genBestDistance = finalDist;
                genBestGenome = genome;
                genBestReplay = host.getReplay();
            }

            if (finalFitness > globalBestFitness) {
                globalBestFitness = finalFitness;
                globalBestDistance = finalDist;

                console.log(`    ⭐ [NUEVO RÉCORD] Genoma #${i + 1}: Fitness=${finalFitness.toFixed(2)} | Distancia=${finalDist.toFixed(1)}u`);

                // Persistir mejor corrida y genoma
                fs.writeFileSync('./best_run.json', JSON.stringify({
                    generation: gen,
                    genomeIndex: i + 1,
                    fitness: finalFitness,
                    minDistance: finalDist,
                    inputs: genBestReplay
                }, null, 2));
            }
        }

        const avgFitness = genFitnessSum / population.genomes.length;
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`[+] Resumen Gen ${gen}: Promedio Fitness: ${avgFitness.toFixed(2)} | Mejor Distancia: ${genBestDistance.toFixed(1)}u | Especies: ${population.species.length} | Tiempo: ${elapsedSec}s\n`);

        // Evolución: Especiación, selección, crossover y mutación
        population.epoch();

        // Checkpoint cada 5 generaciones
        if (gen % 5 === 0) {
            fs.writeFileSync('./checkpoint_neat.json', JSON.stringify(population.toJSON(), null, 2));
        }
    }

    console.log("==========================================================");
    console.log("           ¡Entrenamiento Finalizado con Éxito!           ");
    console.log(` Mejor Fitness Global: ${globalBestFitness.toFixed(2)}`);
    console.log(` Mejor Acercamiento a la Salida: ${globalBestDistance.toFixed(1)} unidades`);
    console.log(" Corridas y replay TAS exportados a best_run.json");
    console.log("==========================================================");
}

runTraining().catch(err => {
    console.error("[!] Error fatal en bucle evolutivo:", err);
    process.exit(1);
});
