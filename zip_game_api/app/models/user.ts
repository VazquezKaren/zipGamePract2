import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'

import GameSession from '#models/game_session'
import Score from '#models/score'
import type { Difficulty } from '#utils/board'

// Permite verificar credenciales y proteger contraseñas
const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare username: string

  @column()
  declare email: string

  // La contraseña nunca se envía en las respuestas JSON
  @column({ serializeAs: null })
  declare password: string

  // Dificultad recomendada al jugador
  @column()
  declare recommendedDifficulty: Difficulty

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  // Un usuario puede tener muchas partidas
  @hasMany(() => GameSession)
  declare gameSessions: HasMany<typeof GameSession>

  // Un usuario puede tener muchos puntajes
  @hasMany(() => Score)
  declare scores: HasMany<typeof Score>

  // Tokens de autenticación
  static accessTokens = DbAccessTokensProvider.forModel(User, {
    expiresIn: '7 days',
    prefix: 'zip_',
    table: 'auth_access_tokens',
  })
}
