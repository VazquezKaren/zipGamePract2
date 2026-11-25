# Ajustes respecto a `Practica_ZIP_Game_Alumnos.pdf`

El código de `zip_game_api` (sección 17) y `zip_game` (sección 18) se tomó del PDF.
Solo se hicieron estos ajustes:

| Ajuste | Motivo |
|---|---|
| Comandos de PowerShell adaptados a macOS (`printf ... > .env.test` en vez de `Set-Content`, `cp`/`rm` en vez de `Copy-Item`/`Remove-Item`, `tee` en vez de `Tee-Object`). | El equipo trabaja en macOS. |
| Backend formateado con `eslint --fix` (Prettier de AdonisJS). | El lint del kit marcaba el código del PDF como error de formato. No cambia la lógica. |
| `game_validator_service.ts`: el primer bucle usa `for (const [i, cell] of path.entries())`. | Regla `@unicorn/no-for-loop` del lint. Hace lo mismo. |
| `material_ui` quedó en `^1.11.1` (el PDF dice `^1.1.0`). | Es la versión que instala `flutter pub add` con Flutter 3.50; es compatible con `^1.1.0`. |

No se cambió la arquitectura, ni las reglas del juego, ni la validación, ni el cálculo de puntaje.

## Verificación (macOS)

```bash
# Backend
cd zip_game_api
npx tsc --noEmit && npx eslint .
node ace test 2>&1 | tee evidencias_backend.txt                  # 37 pruebas aprobadas
node ace serve --hmr

# Frontend (con el backend encendido)
cd zip_game
flutter analyze                                                   # No issues found!
flutter test 2>&1 | tee evidencias_flutter.txt                    # 19 aprobadas (+1 omitida: integración)
flutter test test/integration --dart-define=INTEGRATION=true      # integración aprobada
flutter run -d chrome
```

## Observación pendiente

En la pantalla de juego, cuando un indicador del HUD se hace más ancho (por ejemplo, al llegar a 10 errores), la fila de chips
se parte en dos líneas y el tablero baja unos 42 px a mitad de la partida. Es código del PDF y no se modificó.
Se puede corregir en `game_hud.dart` dándole al `Wrap` un ancho fijo o usando una sola fila desplazable.
