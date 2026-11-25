/*
|--------------------------------------------------------------------------
| Utilidades del tablero
|--------------------------------------------------------------------------
| Las celdas se identifican con un índice lineal 0..35:
| index = fila * 6 + columna
|
|  0  1  2  3  4  5
|  6  7  8  9 10 11
| ...
| 30 31 32 33 34 35
*/

export const BOARD_SIZE = 6
export const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE

export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
/**
 * Definición pública de un tablero.
 * checkpoints[i] = índice de la celda
 * que contiene el número (i + 1).
 */
export interface BoardDefinition {
  size: number
  checkpoints: number[]
}

// Obtener la fila de una celda
export function rowOf(cell: number, size = BOARD_SIZE) {
  return Math.floor(cell / size)
}

// Obtener la columna de una celda
export function colOf(cell: number, size = BOARD_SIZE) {
  return cell % size
}

// Comprobar si dos celdas son vecinas
// horizontales o verticales (sin diagonales)
export function areAdjacent(a: number, b: number, size = BOARD_SIZE) {
  const dr = Math.abs(rowOf(a, size) - rowOf(b, size))
  const dc = Math.abs(colOf(a, size) - colOf(b, size))

  return dr + dc === 1
}

// Obtener los vecinos ortogonales de una celda
export function neighbors(cell: number, size = BOARD_SIZE): number[] {
  const r = rowOf(cell, size)
  const c = colOf(cell, size)
  const result: number[] = []

  if (r > 0) result.push(cell - size)
  if (r < size - 1) result.push(cell + size)
  if (c > 0) result.push(cell - 1)
  if (c < size - 1) result.push(cell + 1)

  return result
}

// Contar los cambios de dirección de un camino
export function countTurns(path: number[]) {
  let turns = 0

  for (let i = 2; i < path.length; i++) {
    const d1 = path[i - 1] - path[i - 2]
    const d2 = path[i] - path[i - 1]

    if (d1 !== d2) turns++
  }

  return turns
}

// Crear mapa de posiciones y números
export function checkpointMap(board: BoardDefinition) {
  const map = new Map<number, number>()

  board.checkpoints.forEach((cell, i) => {
    map.set(cell, i + 1)
  })

  return map
}
