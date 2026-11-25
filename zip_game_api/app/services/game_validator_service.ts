import { areAdjacent, checkpointMap, type BoardDefinition } from '#utils/board'

export type PathErrorCode =
  | 'EMPTY_PATH'
  | 'OUT_OF_BOUNDS'
  | 'INVALID_START'
  | 'REPEATED_CELL'
  | 'NOT_ADJACENT'
  | 'CHECKPOINT_ORDER'
  | 'PREMATURE_END'
  | 'INCOMPLETE'
  | 'INVALID_END'

export interface PathValidationResult {
  valid: boolean
  code?: PathErrorCode
  message?: string

  // Posición del error dentro del camino
  index?: number

  // Siguiente checkpoint requerido
  nextCheckpoint: number
}

/*
|--------------------------------------------------------------------------
| GameValidatorService
|--------------------------------------------------------------------------
| Valida las reglas de ZIP Game en el servidor.
| Nunca confía en que Flutter indique que una partida terminó.
*/

export default class GameValidatorService {
  // Validar un camino parcial
  validatePrefix(board: BoardDefinition, path: number[]): PathValidationResult {
    const total = board.size * board.size
    const cps = checkpointMap(board)
    const lastNumber = board.checkpoints.length

    if (path.length === 0) {
      return this.fail('EMPTY_PATH', 'The path is empty', 0, 1)
    }

    // Comprobar los límites del tablero
    for (const [i, cell] of path.entries()) {
      if (!Number.isInteger(cell) || cell < 0 || cell >= total) {
        return this.fail('OUT_OF_BOUNDS', `Cell ${cell} is outside the board`, i, 1)
      }
    }

    // El camino debe comenzar en el número 1
    if (path[0] !== board.checkpoints[0]) {
      return this.fail('INVALID_START', 'The path must start on number 1', 0, 1)
    }

    const seen = new Set<number>()
    let next = 1

    for (let i = 0; i < path.length; i++) {
      const cell = path[i]

      // No se permiten celdas repetidas
      if (seen.has(cell)) {
        return this.fail('REPEATED_CELL', `Cell ${cell} is visited twice`, i, next)
      }

      // Solo movimientos horizontales o verticales
      if (i > 0 && !areAdjacent(path[i - 1], cell, board.size)) {
        return this.fail(
          'NOT_ADJACENT',
          `Move ${path[i - 1]} -> ${cell} is not horizontal/vertical`,
          i,
          next
        )
      }

      // Comprobar el orden de los checkpoints
      const number = cps.get(cell)

      if (number !== undefined) {
        if (number !== next) {
          return this.fail(
            'CHECKPOINT_ORDER',
            `Expected checkpoint ${next} but reached ${number}`,
            i,
            next
          )
        }

        // El último número solo se puede alcanzar al final
        if (number === lastNumber && i !== total - 1) {
          return this.fail(
            'PREMATURE_END',
            'The last checkpoint can only be reached after visiting every cell',
            i,
            next
          )
        }

        next++
      }

      seen.add(cell)
    }

    return {
      valid: true,
      nextCheckpoint: next,
    }
  }

  // Validar una solución completa
  validateSolution(board: BoardDefinition, path: number[]): PathValidationResult {
    const total = board.size * board.size

    const prefix = this.validatePrefix(board, path)

    if (!prefix.valid) {
      return prefix
    }

    // Deben recorrerse todas las celdas
    if (path.length !== total) {
      return this.fail(
        'INCOMPLETE',
        `The path covers ${path.length} of ${total} cells`,
        path.length,
        prefix.nextCheckpoint
      )
    }

    // El camino debe terminar en el mayor número
    const lastCheckpointCell = board.checkpoints[board.checkpoints.length - 1]

    if (path[path.length - 1] !== lastCheckpointCell) {
      return this.fail(
        'INVALID_END',
        'The path must end on the highest number',
        path.length - 1,
        prefix.nextCheckpoint
      )
    }

    return {
      valid: true,
      nextCheckpoint: prefix.nextCheckpoint,
    }
  }

  // Construir una respuesta de error
  private fail(
    code: PathErrorCode,
    message: string,
    index: number,
    nextCheckpoint: number
  ): PathValidationResult {
    return {
      valid: false,
      code,
      message,
      index,
      nextCheckpoint,
    }
  }
}
