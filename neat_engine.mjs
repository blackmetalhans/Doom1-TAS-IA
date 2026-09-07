/**
 * NEAT Engine (NeuroEvolution of Augmenting Topologies)
 * Implementación nativa en JavaScript ES Modules, Zero-Dependencies, de alto rendimiento.
 * 
 * Basado en el paper original de Kenneth O. Stanley y Risto Miikkulainen (2002).
 */

function tanh(x) {
    return Math.tanh(x);
}

function randomClamped() {
    return Math.random() * 2 - 1; // [-1.0, 1.0]
}

export class InnovationTracker {
    constructor() {
        this.currentInnovation = 1;
        this.currentNodeId = 1;
        this.history = new Map(); // "inNode:outNode" -> innovationId
    }

    getInnovation(inNode, outNode) {
        const key = `${inNode}:${outNode}`;
        if (this.history.has(key)) {
            return this.history.get(key);
        }
        const id = this.currentInnovation++;
        this.history.set(key, id);
        return id;
    }

    getNextNodeId() {
        return this.currentNodeId++;
    }
}

export class ConnectionGene {
    constructor(inNode, outNode, weight, enabled, innovation) {
        this.inNode = inNode;
        this.outNode = outNode;
        this.weight = weight;
        this.enabled = enabled;
        this.innovation = innovation;
    }

    clone() {
        return new ConnectionGene(this.inNode, this.outNode, this.weight, this.enabled, this.innovation);
    }
}

export class NodeGene {
    constructor(id, type) {
        this.id = id;
        this.type = type; // 'input' | 'hidden' | 'output'
    }

    clone() {
        return new NodeGene(this.id, this.type);
    }
}

export class Genome {
    constructor() {
        this.nodes = new Map(); // id -> NodeGene
        this.connections = [];  // Array<ConnectionGene>
        this.fitness = 0;
        this.adjustedFitness = 0;
    }

    clone() {
        const copy = new Genome();
        for (const [id, node] of this.nodes) {
            copy.nodes.set(id, node.clone());
        }
        copy.connections = this.connections.map(c => c.clone());
        copy.fitness = this.fitness;
        return copy;
    }

    /**
     * Mutación de pesos de conexiones existentes.
     */
    mutateWeights(perturbRate = 0.8, replaceRate = 0.1, step = 0.2) {
        for (const conn of this.connections) {
            const r = Math.random();
            if (r < replaceRate) {
                conn.weight = randomClamped() * 2.0; // Asignación de nuevo peso aleatorio [-2, 2]
            } else if (r < perturbRate) {
                conn.weight += randomClamped() * step; // Perturbación
                conn.weight = Math.max(-4.0, Math.min(4.0, conn.weight));
            }
        }
    }

    /**
     * Mutación estructural: Añadir una nueva conexión entre dos nodos no conectados.
     */
    mutateAddConnection(tracker) {
        const nodeList = Array.from(this.nodes.values());
        if (nodeList.length < 2) return;

        for (let tries = 0; tries < 20; tries++) {
            const nodeA = nodeList[Math.floor(Math.random() * nodeList.length)];
            const nodeB = nodeList[Math.floor(Math.random() * nodeList.length)];

            // Evitar auto-conexiones o conexiones inválidas (ej. output -> input)
            if (nodeA.id === nodeB.id) continue;
            if (nodeA.type === 'output' && nodeB.type === 'input') continue;
            if (nodeA.type === 'output' && nodeB.type === 'output') continue;
            if (nodeA.type === 'input' && nodeB.type === 'input') continue;

            const inNode = nodeA.type === 'output' ? nodeB.id : nodeA.id;
            const outNode = nodeA.type === 'output' ? nodeA.id : nodeB.id;

            // Verificar si la conexión ya existe
            const exists = this.connections.some(c => c.inNode === inNode && c.outNode === outNode);
            if (!exists) {
                const innov = tracker.getInnovation(inNode, outNode);
                const weight = randomClamped();
                this.connections.push(new ConnectionGene(inNode, outNode, weight, true, innov));
                return;
            }
        }
    }

    /**
     * Mutación estructural: Dividir una conexión activa e intercalar un nuevo nodo oculto.
     */
    mutateAddNode(tracker) {
        const activeConns = this.connections.filter(c => c.enabled);
        if (activeConns.length === 0) return;

        const conn = activeConns[Math.floor(Math.random() * activeConns.length)];
        conn.enabled = false; // Deshabilitar conexión anterior

        const newNodeId = tracker.getNextNodeId();
        this.nodes.set(newNodeId, new NodeGene(newNodeId, 'hidden'));

        // Conexión inNode -> newNode (peso 1.0)
        const innov1 = tracker.getInnovation(conn.inNode, newNodeId);
        this.connections.push(new ConnectionGene(conn.inNode, newNodeId, 1.0, true, innov1));

        // Conexión newNode -> outNode (peso original)
        const innov2 = tracker.getInnovation(newNodeId, conn.outNode);
        this.connections.push(new ConnectionGene(newNodeId, conn.outNode, conn.weight, true, innov2));
    }

    /**
     * Calcula la distancia de compatibilidad genética con otro genoma para especiación.
     */
    static compatibilityDistance(g1, g2, c1 = 1.0, c2 = 1.0, c3 = 0.4) {
        let matching = 0;
        let disjoint = 0;
        let excess = 0;
        let weightDiffSum = 0;

        const maxInnov1 = g1.connections.length > 0 ? Math.max(...g1.connections.map(c => c.innovation)) : 0;
        const maxInnov2 = g2.connections.length > 0 ? Math.max(...g2.connections.map(c => c.innovation)) : 0;
        const maxThreshold = Math.min(maxInnov1, maxInnov2);

        const map1 = new Map(g1.connections.map(c => [c.innovation, c]));
        const map2 = new Map(g2.connections.map(c => [c.innovation, c]));

        const allInnovations = new Set([...map1.keys(), ...map2.keys()]);

        for (const innov of allInnovations) {
            const has1 = map1.has(innov);
            const has2 = map2.has(innov);

            if (has1 && has2) {
                matching++;
                weightDiffSum += Math.abs(map1.get(innov).weight - map2.get(innov).weight);
            } else if (innov > maxThreshold) {
                excess++;
            } else {
                disjoint++;
            }
        }

        const N = Math.max(1, Math.max(g1.connections.length, g2.connections.length));
        const avgWeightDiff = matching > 0 ? weightDiffSum / matching : 0;

        return (c1 * excess / N) + (c2 * disjoint / N) + (c3 * avgWeightDiff);
    }

    /**
     * Crossover / Recombinación sexual entre dos padres.
     */
    static crossover(parentA, parentB) {
        // Asegurar que parentA sea el más apto (mayor fitness)
        const [fitParent, weakParent] = parentA.fitness >= parentB.fitness ? [parentA, parentB] : [parentB, parentA];

        const child = new Genome();

        // Heredar todos los nodos del padre más apto
        for (const [id, node] of fitParent.nodes) {
            child.nodes.set(id, node.clone());
        }

        const weakMap = new Map(weakParent.connections.map(c => [c.innovation, c]));

        for (const fitConn of fitParent.connections) {
            if (weakMap.has(fitConn.innovation)) {
                // Gen coincidente: elegir aleatoriamente el peso de cualquiera de los dos
                const chosen = Math.random() < 0.5 ? fitConn : weakMap.get(fitConn.innovation);
                child.connections.push(chosen.clone());
            } else {
                // Gen disjunto/exceso: heredar del padre más apto
                child.connections.push(fitConn.clone());
            }
        }

        return child;
    }
}

/**
 * Red Neuronal Feed-Forward construida a partir de un Genome.
 */
export class NeuralNetwork {
    constructor(genome) {
        this.nodes = new Map(); // id -> { id, type, value, bias, inputs: [] }
        this.inputIds = [];
        this.outputIds = [];

        for (const [id, gene] of genome.nodes) {
            const node = { id, type: gene.type, value: 0, inputs: [] };
            this.nodes.set(id, node);
            if (gene.type === 'input') this.inputIds.push(id);
            if (gene.type === 'output') this.outputIds.push(id);
        }

        this.inputIds.sort((a, b) => a - b);
        this.outputIds.sort((a, b) => a - b);

        for (const conn of genome.connections) {
            if (!conn.enabled) continue;
            if (this.nodes.has(conn.outNode)) {
                this.nodes.get(conn.outNode).inputs.push({
                    fromId: conn.inNode,
                    weight: conn.weight
                });
            }
        }
    }

    activate(inputValues) {
        // Cargar inputs
        for (let i = 0; i < this.inputIds.length; i++) {
            const id = this.inputIds[i];
            this.nodes.get(id).value = inputValues[i] || 0;
        }

        // Activación de nodos ocultos y de salida
        for (const [id, node] of this.nodes) {
            if (node.type === 'input') continue;

            let sum = 0;
            for (const inConn of node.inputs) {
                const sourceNode = this.nodes.get(inConn.fromId);
                if (sourceNode) {
                    sum += sourceNode.value * inConn.weight;
                }
            }
            node.value = tanh(sum);
        }

        return this.outputIds.map(id => this.nodes.get(id).value);
    }
}

export class Species {
    constructor(representative) {
        this.representative = representative.clone();
        this.members = [representative];
        this.bestFitness = 0;
        this.staleness = 0;
    }

    add(genome) {
        this.members.push(genome);
    }

    sort() {
        this.members.sort((a, b) => b.fitness - a.fitness);
        if (this.members.length > 0) {
            if (this.members[0].fitness > this.bestFitness) {
                this.bestFitness = this.members[0].fitness;
                this.staleness = 0;
            } else {
                this.staleness++;
            }
            this.representative = this.members[0].clone();
        }
    }
}

export class Population {
    constructor(size, inputCount, outputCount) {
        this.size = size;
        this.inputCount = inputCount;
        this.outputCount = outputCount;
        this.tracker = new InnovationTracker();
        this.generation = 1;
        this.genomes = [];
        this.species = [];
        this.compatibilityThreshold = 1.8;
        this.bestGenome = null;
        this.bestFitness = -Infinity;

        this.initBaseGenomes();
    }

    initBaseGenomes() {
        // Configurar IDs iniciales en el tracker
        for (let i = 0; i < this.inputCount + this.outputCount; i++) {
            this.tracker.getNextNodeId();
        }

        for (let g = 0; g < this.size; g++) {
            const genome = new Genome();

            // Nodos de entrada
            for (let i = 1; i <= this.inputCount; i++) {
                genome.nodes.set(i, new NodeGene(i, 'input'));
            }

            // Nodos de salida
            for (let o = 1; o <= this.outputCount; o++) {
                const outId = this.inputCount + o;
                genome.nodes.set(outId, new NodeGene(outId, 'output'));
            }

            // Conexiones iniciales densas con pesos aleatorios
            for (let i = 1; i <= this.inputCount; i++) {
                for (let o = 1; o <= this.outputCount; o++) {
                    const outId = this.inputCount + o;
                    const innov = this.tracker.getInnovation(i, outId);
                    genome.connections.push(new ConnectionGene(i, outId, randomClamped(), true, innov));
                }
            }

            this.genomes.push(genome);
        }
    }

    speciate() {
        for (const s of this.species) {
            s.members = [];
        }

        for (const genome of this.genomes) {
            let placed = false;
            for (const s of this.species) {
                if (Genome.compatibilityDistance(genome, s.representative) < this.compatibilityThreshold) {
                    s.add(genome);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                this.species.push(new Species(genome));
            }
        }

        // Eliminar especies vacías
        this.species = this.species.filter(s => s.members.length > 0);
    }

    epoch() {
        this.speciate();

        // 1. Calcular adjusted fitness para compartir nicho biológico (fitness sharing)
        for (const s of this.species) {
            s.sort();
            for (const g of s.members) {
                g.adjustedFitness = Math.max(0.0001, g.fitness / s.members.length);
            }
        }

        // 2. Localizar al mejor de la generación
        for (const g of this.genomes) {
            if (g.fitness > this.bestFitness) {
                this.bestFitness = g.fitness;
                this.bestGenome = g.clone();
            }
        }

        // 3. Reproducción y reemplazo generacional
        const newGenomes = [];

        // Elitismo: El mejor genoma global pasa intacto
        if (this.bestGenome) {
            newGenomes.push(this.bestGenome.clone());
        }

        // Reparto de hijos proporcional al fitness ajustado de cada especie
        const totalSpeciesFitness = this.species.reduce((sum, s) => {
            return sum + s.members.reduce((subSum, m) => subSum + m.adjustedFitness, 0);
        }, 0);

        for (const s of this.species) {
            if (s.staleness > 15 && this.species.length > 2) {
                continue; // Poda de especies estancadas
            }

            const speciesFitness = s.members.reduce((sum, m) => sum + m.adjustedFitness, 0);
            let offspringCount = Math.floor((speciesFitness / totalSpeciesFitness) * (this.size - newGenomes.length));

            for (let i = 0; i < offspringCount; i++) {
                if (newGenomes.length >= this.size) break;

                // Selección por torneo de padres dentro de la especie
                const parentA = this.selectParent(s.members);
                let child;

                if (Math.random() < 0.75 && s.members.length > 1) {
                    const parentB = this.selectParent(s.members);
                    child = Genome.crossover(parentA, parentB);
                } else {
                    child = parentA.clone();
                }

                // Mutaciones estocásticas
                child.mutateWeights(0.8, 0.1, 0.25);
                if (Math.random() < 0.05) child.mutateAddConnection(this.tracker);
                if (Math.random() < 0.03) child.mutateAddNode(this.tracker);

                newGenomes.push(child);
            }
        }

        // Rellenar vacantes si quedaron por redondeo
        while (newGenomes.length < this.size) {
            const randomParent = this.genomes[Math.floor(Math.random() * this.genomes.length)];
            const clone = randomParent.clone();
            clone.mutateWeights(0.8, 0.2, 0.3);
            newGenomes.push(clone);
        }

        this.genomes = newGenomes;
        this.generation++;
    }

    selectParent(members) {
        // Torneo de tamaño 2
        const a = members[Math.floor(Math.random() * members.length)];
        const b = members[Math.floor(Math.random() * members.length)];
        return a.fitness >= b.fitness ? a : b;
    }

    toJSON() {
        return {
            generation: this.generation,
            bestFitness: this.bestFitness,
            bestGenome: this.bestGenome ? {
                nodes: Array.from(this.bestGenome.nodes.entries()),
                connections: this.bestGenome.connections
            } : null
        };
    }
}
