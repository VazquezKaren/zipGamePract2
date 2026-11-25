# ZIP Game

Juego de lógica multiplataforma con **frontend en Flutter**, **API REST en AdonisJS 6** y **base de datos MySQL 8**.
El jugador traza un camino que conecta los números en orden y cubre las 36 celdas de un tablero de 6 × 6.
El servidor vuelve a validar cada solución antes de otorgar puntos.

> Práctica I · Desarrollo para Dispositivos Inteligentes · Universidad Tecnológica de Durango (UTD)

---

## Tabla de contenido

1. [Descripción](#descripción)
2. [Arquitectura](#arquitectura)
3. [Requisitos previos](#requisitos-previos)
4. [Instalación](#instalación)
   - [1. Base de datos](#1-base-de-datos)
   - [2. Backend (AdonisJS)](#2-backend-adonisjs)
   - [3. Frontend (Flutter)](#3-frontend-flutter)
5. [Ejecución](#ejecución)
6. [Pruebas](#pruebas)
7. [API REST](#api-rest)
8. [Reglas de negocio](#reglas-de-negocio)
9. [Seguridad](#seguridad)
10. [Solución de problemas](#solución-de-problemas)
11. [Comandos de referencia](#comandos-de-referencia)

---

## Descripción

### Reglas del juego

1. El camino empieza en la celda con el número **1**.
2. Conecta los números en **orden ascendente**, sin saltarse ninguno.
3. Solo se mueve en **horizontal o vertical**; no hay diagonales.
4. **No repite** celdas.
5. Pasa por las **36 celdas**.
6. Termina en el **número más alto**, al que no se puede llegar antes de llenar el tablero.

### Funcionalidades

| Módulo | Funcionalidad |
|---|---|
| Autenticación | Registro e inicio de sesión con tokens Bearer y rutas protegidas |
| Niveles | Lista desde el backend con filtro por dificultad, estado de completado y mejor puntaje |
| Juego | Tablero interactivo con mouse y táctil, cronómetro, progreso, deshacer, reiniciar y pistas |
| Generador | Crea niveles 6 × 6 que siempre tienen solución y los guarda en MySQL |
| Puntaje | Se calcula solo en el servidor a partir del tiempo, los errores y las pistas |
| Dificultad adaptativa | Ajusta la dificultad recomendada según el desempeño reciente |
| Ranking | Clasificación global con reglas de orden documentadas |
| Perfil | Estadísticas, niveles completados e historial de partidas |

---

## Arquitectura

```
zip_game_practica/
├── zip_game_api/        Backend · AdonisJS 6 + TypeScript + Lucid ORM
│   ├── app/
│   │   ├── controllers/   Reciben la petición, validan y delegan
│   │   ├── services/      Lógica del juego (validación, solver, generador, puntaje…)
│   │   ├── repositories/  Acceso a datos (consultas a MySQL)
│   │   ├── validators/    Esquemas VineJS
│   │   ├── models/        user, level, game_session, game_move, score
│   │   ├── middleware/    Autenticación
│   │   ├── exceptions/    Manejo centralizado de errores
│   │   └── utils/         Utilidades del tablero, RNG con semilla, presentadores JSON
│   ├── database/          migrations/ · seeders/ · sql/
│   └── tests/             unit/ · functional/
│
└── zip_game/            Frontend · Flutter (web y Android)
    ├── lib/
    │   ├── app/           Tema, rutas e inyección de dependencias
    │   ├── core/          Cliente HTTP, errores, constantes y utilidades
    │   ├── features/      auth · home · levels · game · leaderboard · profile
    │   │   └── <feature>/ presentation/ · domain/ · data/
    │   └── shared/        Widgets reutilizables
    └── test/              domain/ · controllers/ · widgets/ · integration/
```

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Presentación | Flutter + Material | Pantallas, widgets y controladores de estado (`ChangeNotifier`) |
| API | AdonisJS 6 | Endpoints REST, validación, autenticación y lógica de negocio |
| Persistencia | MySQL 8 + Lucid ORM | Usuarios, niveles, partidas, movimientos y puntajes |

---

## Requisitos previos

| Herramienta | Versión | Verificación |
|---|---|---|
| Node.js | 20.6 o superior | `node -v` |
| MySQL Server | 8.x | `mysql --version` |
| Flutter | Canal estable | `flutter --version` · `flutter doctor` |
| Google Chrome | Reciente | Para ejecutar la versión web |
| Git | Reciente | `git --version` |

> Las instrucciones están escritas para **macOS**. En Windows, los comandos equivalentes están en la sección 3 del documento de la práctica.

---

## Instalación

### 1. Base de datos

Conéctate a MySQL como `root` y ejecuta el script incluido. Antes, cambia la contraseña de ejemplo dentro del archivo:

```bash
mysql -u root -p < zip_game_api/database/sql/01_create_database.sql
```

El script crea:

- `zip_game`: la base de datos de la aplicación.
- `zip_game_test`: una base aislada para las pruebas automáticas.
- El usuario `zip_user`, con permisos sobre ambas bases.

> Las tablas **no** se crean a mano; las crean las migraciones de AdonisJS en el paso siguiente.

### 2. Backend (AdonisJS)

```bash
cd zip_game_api
npm install
cp .env.example .env
node ace generate:key
```

Edita `.env` y completa la contraseña del usuario de MySQL:

```dotenv
PORT=3333
HOST=localhost
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=zip_user
DB_PASSWORD=<tu_contraseña>
DB_DATABASE=zip_game
```

Crea el archivo de entorno de pruebas. Apunta a la base aislada y no contiene secretos:

```bash
printf 'NODE_ENV=test\nDB_DATABASE=zip_game_test\n' > .env.test
```

Ejecuta las migraciones y carga los datos de demostración:

```bash
node ace migration:run
node ace db:seed
```

Los seeders crean 10 niveles (fácil, media y difícil) y el usuario de demostración.

### 3. Frontend (Flutter)

```bash
cd zip_game
flutter pub get
```

---

## Ejecución

Abre **dos terminales**, con MySQL encendido.

**Terminal 1: backend**

```bash
cd zip_game_api
node ace serve --hmr
```

La API queda disponible en `http://localhost:3333`. Puedes comprobarlo abriendo esa dirección en el navegador.

**Terminal 2: frontend**

```bash
cd zip_game
flutter run -d chrome
```

### Usuario de demostración

| Correo | Contraseña |
|---|---|
| `demo@zipgame.test` | `demo12345` |

### Ejecutar en Android

El emulador de Android ve tu computadora como `10.0.2.2`, no como `localhost`:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:3333/api
```

En un celular físico, usa la IP local de tu computadora; por ejemplo, `http://192.168.1.50:3333/api`.

---

## Pruebas

### Backend (Japa)

Se ejecutan contra `zip_game_test`, que se limpia y se migra automáticamente. La base `zip_game` no se toca.

```bash
cd zip_game_api
node ace test              # suite completa
node ace test unit         # solo unitarias
node ace test functional   # solo funcionales
```

**Resultado esperado:** 37 pruebas aprobadas (25 unitarias y 12 funcionales).

| Suite | Cobertura |
|---|---|
| `unit/game_validator.spec.ts` | Caminos válidos e inválidos (diagonal, repetido, orden, final prematuro, límites) |
| `unit/level_generator.spec.ts` | Niveles con solución y dificultad medida |
| `unit/scoring_hint_adaptive.spec.ts` | Cálculo de puntaje, pistas y dificultad adaptativa |
| `functional/api.spec.ts` | Autenticación, endpoints, soluciones válidas e inválidas, doble finalización y persistencia |

### Frontend (Flutter)

```bash
cd zip_game
flutter analyze            # Debe responder: No issues found!
flutter test               # 19 pruebas aprobadas
```

### Integración (Flutter ↔ API)

Requiere el backend encendido. La prueba registra un usuario, juega un nivel completo y valida el resultado del servidor:

```bash
flutter test test/integration --dart-define=INTEGRATION=true
```

### Guardar evidencia

```bash
node ace test 2>&1 | tee evidencias_backend.txt     # desde zip_game_api
flutter test 2>&1 | tee evidencias_flutter.txt      # desde zip_game
```

---

## API REST

URL base: `http://localhost:3333/api`. Las rutas marcadas con 🔒 requieren el header `Authorization: Bearer <token>`.

### Endpoints

| Método | Ruta | Auth | Descripción | Cuerpo / parámetros |
|---|---|:-:|---|---|
| `POST` | `/auth/register` | | Registrar jugador | `{ username, email, password }` |
| `POST` | `/auth/login` | | Iniciar sesión | `{ email, password }` |
| `POST` | `/auth/logout` | 🔒 | Cerrar sesión | — |
| `GET` | `/users/me` | 🔒 | Perfil y estadísticas | — |
| `GET` | `/levels` | 🔒 | Niveles con progreso del usuario | `?difficulty=easy\|medium\|hard` |
| `GET` | `/levels/:id` | 🔒 | Un nivel, sin la solución | — |
| `POST` | `/levels/generate` | 🔒 | Generar y guardar un nivel | `{ difficulty, name? }` |
| `POST` | `/games` | 🔒 | Iniciar partida | `{ level_id? }` (sin él, se usa la dificultad adaptativa) |
| `GET` | `/games/history` | 🔒 | Historial propio, paginado | `?page=&per_page=` |
| `GET` | `/games/:id` | 🔒 | Detalle de una partida propia | — |
| `POST` | `/games/:id/hint` | 🔒 | Pedir una pista | `{ path: number[] }` |
| `POST` | `/games/:id/finish` | 🔒 | Validar y terminar la partida | `{ path: number[], moves: Move[] }` |
| `GET` | `/leaderboard` | | Ranking global | `?limit=1..100` |

Las celdas se numeran de `0` a `35`, con `índice = fila × 6 + columna`.

Cada movimiento (`Move`) tiene esta forma:

```json
{ "type": "add | undo | invalid | restart", "cell": 7, "elapsed_ms": 1500 }
```

### Códigos de respuesta

| Código | Significado |
|---|---|
| `200` / `201` | Éxito / recurso creado |
| `400` | Credenciales inválidas |
| `401` | Sin token o token inválido |
| `404` | El recurso no existe o pertenece a otro usuario |
| `409` | La partida ya fue terminada |
| `422` | Error de validación o solución inválida |

### Formato de error

```json
{ "message": "This game session is already finished", "code": "E_ALREADY_FINISHED" }
```

---

## Reglas de negocio

### Puntaje (calculado solo en el servidor)

| Concepto | Fácil | Media | Difícil |
|---|---|---|---|
| Puntos base | 1000 | 2000 | 3000 |
| Tiempo objetivo | 120 s | 180 s | 300 s |

```
total = base
      + 3 × segundos por debajo del objetivo
      − 2 × segundos por encima del objetivo
      − 25  × errores
      − 150 × pistas
mínimo garantizado = 10 % de la base
```

La duración se mide con la hora del servidor, desde que inicia la partida hasta que se valida. El cliente no puede enviar puntos.

### Dificultad adaptativa

Se evalúan las **3 partidas más recientes** de la dificultad actual:

| Calificación | Condición |
|---|---|
| Excelente | Tiempo ≤ objetivo, sin pistas y como máximo 2 errores |
| Mala | Tiempo > 2 × objetivo, 3 o más pistas, o 10 o más errores |

| Resultado | Regla |
|---|---|
| **Sube** | 2 o más partidas excelentes |
| **Baja** | 2 o más partidas malas |
| **Se mantiene** | En cualquier otro caso |

El cambio solo afecta las partidas futuras; nunca modifica una partida en curso.

### Ranking

1. Por cada par usuario-nivel se toma **solo el mejor puntaje**, para que repetir un nivel no acumule puntos.
2. Se suman los mejores puntajes de cada usuario.
3. En caso de empate gana quien tenga **más niveles completados**, y después **menor tiempo total**.

---

## Seguridad

- Contraseñas guardadas con hash **scrypt**; nunca se incluyen en las respuestas JSON.
- Tokens de acceso opacos; en la base de datos se guarda solo su hash.
- Validación de todas las peticiones con **VineJS**.
- Cada jugador solo puede ver y terminar sus propias partidas; una partida ajena responde `404`.
- La solución de los niveles **nunca** se envía al cliente.
- La partida se finaliza dentro de una **transacción con bloqueo de fila** (`SELECT … FOR UPDATE`) para evitar la doble finalización. La restricción `UNIQUE` en `scores.game_session_id` garantiza un solo puntaje por partida.
- Los errores no exponen trazas ni SQL.
- CORS permite cualquier puerto de `localhost` solo en desarrollo; en producción se usan los orígenes de `CORS_ORIGINS`.
- Los archivos `.env` están excluidos de Git.

---

## Solución de problemas

| Síntoma | Solución |
|---|---|
| `ER_ACCESS_DENIED_ERROR` | Revisa `DB_USER` y `DB_PASSWORD` en `.env` |
| `ER_BAD_DB_ERROR` | Crea las bases de datos (paso 1 de la instalación) |
| `ECONNREFUSED 127.0.0.1:3306` | MySQL no está encendido: `brew services start mysql` |
| Error de CORS en Chrome | Comprueba que el backend esté corriendo en el puerto 3333 |
| `401` en todas las rutas | Cierra sesión y vuelve a iniciarla para obtener un token nuevo |
| "No hay niveles" | Ejecuta `node ace db:seed` o usa el botón **Generar** |
| Android no conecta | Usa `10.0.2.2` en el emulador o la IP de tu computadora en un celular |
| Puerto 3333 ocupado | `lsof -ti tcp:3333 \| xargs kill` |

---

## Comandos de referencia

| Comando | Descripción |
|---|---|
| `node ace serve --hmr` | Inicia la API con recarga en caliente |
| `node ace list:routes` | Lista todas las rutas |
| `node ace migration:run` | Aplica las migraciones pendientes |
| `node ace migration:status` | Muestra el estado de las migraciones |
| `node ace db:seed` | Carga niveles y el usuario de demostración |
| `node ace migration:fresh --seed` | ⚠️ **Borra todos los datos** y recrea la base desde cero |
| `node ace test` | Ejecuta las pruebas del backend |
| `flutter run -d chrome` | Ejecuta la app en Chrome |
| `flutter analyze` | Análisis estático de Dart |
| `flutter test` | Ejecuta las pruebas de Flutter |

---

<sub>Los ajustes realizados respecto al documento de la práctica están en [`AJUSTES_IMPLEMENTACION.md`](AJUSTES_IMPLEMENTACION.md).</sub>
