import { checkpointMap, neighbors, type BoardDefinition } from '#utils/board'

export interface SolveOptions {
  // Máximo de nodos a explorar
  maxNodes?: number

  // Número máximo de soluciones a encontrar
  maxSolutions?: number

  // Heurística de Warnsdorff
  heuristic?: boolean
}

export interface SolveResult {
  solutions: number[][]
  nodes: number
  exhausted: boolean
}

/*
|--------------------------------------------------------------------------
| PathSolverService
|--------------------------------------------------------------------------
| Busca soluciones usando DFS y backtracking.
|
| Optimiza la búsqueda mediante:
| - Orden de checkpoints
| - Prohibición de terminar antes de tiempo
| - Detección de callejones sin salida
| - Comprobación de conectividad
*/

export default class PathSolverService {
  solve(board: BoardDefinition, prefix: number[] = [], options: SolveOptions = {}): SolveResult {
    const maxNodes = options.maxNodes ?? 500_000
    const maxSolutions = options.maxSolutions ?? 1
    const heuristic = options.heuristic ?? true

    const size = board.size
    const total = size * size

    const cps = checkpointMap(board)
    const lastNumber = board.checkpoints.length
    const lastCell = board.checkpoints[lastNumber - 1]

    const adj = Array.from({ length: total }, (_, c) => neighbors(c, size))

    // Preparar camino inicial
    const start = prefix.length > 0 ? prefix : [board.checkpoints[0]]

    const visited = new Array<boolean>(total).fill(false)
    const path: number[] = []

    let next = 1

    for (const cell of start) {
      visited[cell] = true
      path.push(cell)

      if (cps.get(cell) === next) {
        next++
      }
    }

    const solutions: number[][] = []
    let nodes = 0
    let aborted = false

    // Contar vecinos disponibles
    const freeDegree = (cell: number, head: number) => {
      let d = 0

      for (const n of adj[cell]) {
        if (!visited[n] || n === head) {
          d++
        }
      }

      return d
    }

    // Comprobar si vale la pena seguir explorando
    const isPromising = (head: number) => {
      const remaining = total - path.length

      if (remaining === 0) {
        return true
      }

      // Detectar callejones sin salida
      for (let c = 0; c < total; c++) {
        if (visited[c]) {
          continue
        }

        const d = freeDegree(c, head)

        if (d === 0) {
          return false
        }

        if (d === 1 && c !== lastCell) {
          return false
        }
      }

      // Comprobar conectividad usando flood fill
      const stack = [head]
      const seen = new Set<number>([head])

      let reached = 0

      while (stack.length) {
        const cur = stack.pop()!

        for (const n of adj[cur]) {
          if (!visited[n] && !seen.has(n)) {
            seen.add(n)
            reached++
            stack.push(n)
          }
        }
      }

      return reached === remaining
    }

    // Búsqueda en profundidad con retroceso
    const dfs = () => {
      if (aborted || solutions.length >= maxSolutions) {
        return
      }

      nodes++

      if (nodes > maxNodes) {
        aborted = true
        return
      }

      const head = path[path.length - 1]

      // Comprobar si se completó el tablero
      if (path.length === total) {
        if (head === lastCell) {
          solutions.push([...path])
        }

        return
      }

      // Buscar movimientos candidatos
      let candidates = adj[head].filter((n) => {
        if (visited[n]) {
          return false
        }

        const number = cps.get(n)

        if (number !== undefined && number !== next) {
          return false
        }

        if (number === lastNumber && path.length + 1 !== total) {
          return false
        }

        return true
      })

      // Heurística de Warnsdorff
      if (heuristic && candidates.length > 1) {
        candidates = candidates
          .map((n) => ({
            n,
            d: adj[n].filter((m) => !visited[m]).length,
          }))
          .sort((a, b) => a.d - b.d)
          .map((x) => x.n)
      }

      // Explorar cada candidato
      for (const n of candidates) {
        const number = cps.get(n)

        visited[n] = true
        path.push(n)

        if (number !== undefined) {
          next++
        }

        if (isPromising(n)) {
          dfs()
        }

        // Backtracking: deshacer el movimiento
        if (number !== undefined) {
          next--
        }

        path.pop()
        visited[n] = false

        if (aborted || solutions.length >= maxSolutions) {
          return
        }
      }
    }

    if (isPromising(path[path.length - 1])) {
      dfs()
    }

    return {
      solutions,
      nodes,
      exhausted: !aborted,
    }
  }

  // Buscar una solución que complete el camino actual
  hasSolution(board: BoardDefinition, prefix: number[] = [], maxNodes = 500_000) {
    const result = this.solve(board, prefix, {
      maxNodes,
      maxSolutions: 1,
    })

    return result.solutions[0] ?? null
  }
}
