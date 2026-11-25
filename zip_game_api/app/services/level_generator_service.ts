import { BOARD_SIZE, TOTAL_CELLS, countTurns, neighbors, type Difficulty } from '#utils/board'

import { createRng, pick, randomInt, shuffle, type Rng } from '#utils/random'

import PathSolverService from '#services/path_solver_service'
import GameValidatorService from '#services/game_validator_service'

// Métricas utilizadas para medir la dificultad
export interface DifficultyMetrics {
  checkpointCount: number
  averageGap: number
  solutionCount: number
  searchEffort: number
  turns: number
  score: number
}

// Estructura de un nivel generado
export interface GeneratedLevel {
  name: string
  difficulty: Difficulty
  size: number
  checkpoints: number[]
  solution: number[]
  checkpointCount: number
  difficultyScore: number
  metrics: DifficultyMetrics
}

// Cantidad de checkpoints según la dificultad
export const CHECKPOINT_RANGE: Record<Difficulty, [number, number]> = {
  easy: [10, 13],
  medium: [7, 9],
  hard: [4, 6],
}

// Límites para clasificar la dificultad
export const SCORE_THRESHOLDS = {
  medium: 45,
  hard: 68,
}

const SOLUTION_CAP = 50

/*
|--------------------------------------------------------------------------
| LevelGeneratorService
|--------------------------------------------------------------------------
| Genera niveles 6x6 con una solución garantizada.
| Utiliza caminos hamiltonianos y movimientos backbite.
*/
export default class LevelGeneratorService {
  constructor(
    private solver = new PathSolverService(),
    private validator = new GameValidatorService()
  ) {}

  // Generar un nivel según la dificultad solicitada
  generate(difficulty: Difficulty, seed?: number, name?: string): GeneratedLevel {
    const rng = createRng(seed ?? Date.now() ^ Math.floor(Math.random() * 1e9))

    let best: GeneratedLevel | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    // Intentar hasta 40 tableros diferentes
    for (let attempt = 0; attempt < 40; attempt++) {
      const solution = this.randomHamiltonianPath(rng)

      const [min, max] = CHECKPOINT_RANGE[difficulty]
      const count = randomInt(rng, min, max)

      const checkpoints = this.placeCheckpoints(rng, solution, count, difficulty)

      const board = {
        size: BOARD_SIZE,
        checkpoints,
      }

      // Comprobar que la solución generada sea válida
      if (!this.validator.validateSolution(board, solution).valid) {
        continue
      }

      // Medir objetivamente la dificultad
      const metrics = this.measure(checkpoints, solution)

      const level: GeneratedLevel = {
        name: name ?? this.defaultName(difficulty, rng),
        difficulty,
        size: BOARD_SIZE,
        checkpoints,
        solution,
        checkpointCount: checkpoints.length,
        difficultyScore: metrics.score,
        metrics,
      }

      const distance = this.distanceToBand(metrics.score, difficulty)

      if (distance === 0) {
        return level
      }

      if (distance < bestDistance) {
        best = level
        bestDistance = distance
      }
    }

    return best!
  }

  /*
  |--------------------------------------------------------------------------
  | Generar un camino hamiltoniano aleatorio
  |--------------------------------------------------------------------------
  | Comienza con una serpiente y aplica movimientos backbite.
  */
  randomHamiltonianPath(rng: Rng, size = BOARD_SIZE): number[] {
    let path: number[] = []

    // Crear recorrido inicial en serpiente
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        path.push(r * size + (r % 2 === 0 ? c : size - 1 - c))
      }
    }

    const iterations = size * size * 60

    for (let i = 0; i < iterations; i++) {
      if (rng() < 0.5) {
        path.reverse()
      }

      const end = path[path.length - 1]
      const before = path[path.length - 2]

      const options = neighbors(end, size).filter((n) => n !== before)

      if (options.length === 0) {
        continue
      }

      const target = pick(rng, options)
      const idx = path.indexOf(target)

      // Cambiar el recorrido invirtiendo un segmento
      path = [...path.slice(0, idx + 1), ...path.slice(idx + 1).reverse()]
    }

    return path
  }

  /*
  |--------------------------------------------------------------------------
  | Colocar los checkpoints
  |--------------------------------------------------------------------------
  */
  placeCheckpoints(rng: Rng, solution: number[], count: number, difficulty: Difficulty) {
    const last = solution.length - 1
    const positions = new Set<number>([0, last])

    if (difficulty === 'easy') {
      // Fácil: checkpoints distribuidos uniformemente
      for (let i = 1; i < count - 1; i++) {
        positions.add(Math.round((i * last) / (count - 1)))
      }
    } else if (difficulty === 'medium') {
      // Medio: separación con variación
      for (let i = 1; i < count - 1; i++) {
        const base = Math.round((i * last) / (count - 1))

        positions.add(Math.min(last - 1, Math.max(1, base + randomInt(rng, -2, 2))))
      }
    } else {
      // Difícil: priorizar giros del camino
      const turnPositions: number[] = []

      for (let i = 1; i < last; i++) {
        if (solution[i] - solution[i - 1] !== solution[i + 1] - solution[i]) {
          turnPositions.push(i)
        }
      }

      for (const p of shuffle(rng, turnPositions)) {
        if (positions.size >= count) {
          break
        }

        positions.add(p)
      }
    }

    // Completar posiciones si hubo coincidencias
    while (positions.size < count) {
      positions.add(randomInt(rng, 1, last - 1))
    }

    return [...positions].sort((a, b) => a - b).map((p) => solution[p])
  }

  /*
  |--------------------------------------------------------------------------
  | Calcular métricas de dificultad
  |--------------------------------------------------------------------------
  */
  measure(checkpoints: number[], solution: number[]): DifficultyMetrics {
    const board = {
      size: BOARD_SIZE,
      checkpoints,
    }

    // Contar soluciones (hasta un máximo de 50)
    const count = this.solver.solve(board, [], {
      maxSolutions: SOLUTION_CAP,
      maxNodes: 150_000,
    })

    // Medir esfuerzo de búsqueda sin heurística
    const effort = this.solver.solve(board, [], {
      maxSolutions: 1,
      maxNodes: 150_000,
      heuristic: false,
    })

    const averageGap = (TOTAL_CELLS - 1) / (checkpoints.length - 1)

    const solutionCount = count.solutions.length
    const searchEffort = effort.nodes
    const turns = countTurns(solution)

    const gapPart = Math.min(35, (averageGap / 9) * 35)

    const decisionPart = (Math.log2(solutionCount) / Math.log2(SOLUTION_CAP)) * 25

    const effortPart = Math.min(25, (Math.log10(searchEffort + 1) / 5) * 25)

    const turnPart = Math.min(15, (turns / 30) * 15)

    return {
      checkpointCount: checkpoints.length,
      averageGap: Number(averageGap.toFixed(2)),
      solutionCount,
      searchEffort,
      turns,
      score: Math.round(gapPart + decisionPart + effortPart + turnPart),
    }
  }

  // Clasificar el puntaje obtenido
  classify(score: number): Difficulty {
    if (score >= SCORE_THRESHOLDS.hard) {
      return 'hard'
    }

    if (score >= SCORE_THRESHOLDS.medium) {
      return 'medium'
    }

    return 'easy'
  }

  // Calcular distancia a la banda solicitada
  private distanceToBand(score: number, difficulty: Difficulty) {
    const bands: Record<Difficulty, [number, number]> = {
      easy: [0, SCORE_THRESHOLDS.medium - 1],
      medium: [SCORE_THRESHOLDS.medium, SCORE_THRESHOLDS.hard - 1],
      hard: [SCORE_THRESHOLDS.hard, 100],
    }

    const [lo, hi] = bands[difficulty]

    if (score < lo) {
      return lo - score
    }

    if (score > hi) {
      return score - hi
    }

    return 0
  }

  // Generar nombres automáticos para los niveles
  private defaultName(difficulty: Difficulty, rng: Rng) {
    const words: Record<Difficulty, string[]> = {
      easy: ['Sunrise', 'Meadow', 'Breeze', 'Pebble', 'Ripple'],
      medium: ['Canyon', 'Labyrinth', 'Circuit', 'Orbit', 'Delta'],
      hard: ['Vortex', 'Eclipse', 'Inferno', 'Abyss', 'Titan'],
    }

    return `${pick(rng, words[difficulty])} #${randomInt(rng, 100, 999)}`
  }
}
