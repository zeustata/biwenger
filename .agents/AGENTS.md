# Memoria del Proyecto: Biwenger Optimizer Bot

**Fecha de la última sesión:** Julio 2026
**Próximo hito:** Inicio de La Liga en Agosto (Reseteo de liga y asignación de presupuesto/plantilla aleatoria).

## Estado Actual de la Arquitectura
1. **Infraestructura:** El bot corre en GitHub Actions (`.github/workflows/biwenger.yml`) todos los días a las 08:00 AM.
2. **Despliegue Web:** Integrado con Vercel para visualizar un reporte HTML (`docs/index.html`) generado automáticamente al finalizar la ejecución diaria. El repositorio se mantiene privado para no revelar la estrategia.
3. **Control de Flujo (`index.js`):** El script principal ahora solo ejecuta la tarea asíncrona una vez y hace un `process.exit(0)`. La programación (cron) se delegó por completo a GitHub Actions para evitar cuelgues (se eliminó `node-cron`).
4. **Prevención de Errores:** Si el token falla o no hay conexión, el bot siempre genera el reporte HTML (`docs/index.html`) con un mensaje de error y sale limpiamente, garantizando que Vercel siempre tenga un archivo que mostrar.

## Lógica y Reglas de Negocio Implementadas
* **Especulación Diaria:** Cada día, el bot pone a TODOS los jugadores de la plantilla a la venta por su valor de mercado. El objetivo es recibir ofertas del *computer* al día siguiente y generar plusvalías.
* **Cuadrar Cuentas:** Si el saldo es negativo, el bot vende automáticamente a los peores jugadores (basado en una puntuación calculada) a los que el *computer* haya hecho una oferta, hasta volver a estar en positivo.
* **Pujas Agresivas (Biwenger Optimizer 3.0):** Cuando detecta un jugador interesante en el mercado libre, realiza una sobrepuja dinámica:
  - Base: +15% de su valor.
  - Jugador en racha (valor subiendo): +25%.
  - Jugador TOP (titular indiscutible / estrella): +20%.
  - Límite máximo de sobrepuja: 60%.
* **Riesgo de Jornada (Modo Relajado temporal):** A menos de 48 horas de empezar la jornada, el bot tiene prohibido entrar en un saldo negativo masivo. Actualmente está en "Modo Relajado", permitiendo un endeudamiento del 10% del valor del equipo asumiendo que al día siguiente la rutina de "Cuadrar Cuentas" lo arreglará vendiendo suplentes. (Esta regla se ajustará en agosto cuando el usuario tenga las reglas definitivas de su grupo).

## Tareas Pendientes para Agosto
1. **Configurar Credenciales:** El usuario proporcionará el token de Biwenger y el ID de su liga (`BIWENGER_TOKEN` y `BIWENGER_LEAGUE_ID`) en los Secrets de GitHub.
2. **Reglas de la Liga:** El usuario pasará las reglas definitivas (dinero por punto, límite de jugadores, etc.) para ajustar la lógica de pujas y el "Riesgo de Jornada".
3. **Reseteo:** El bot está preparado para el reseteo. Ese día verá los 15 nuevos jugadores aleatorios, el presupuesto compensatorio, los pondrá a todos en venta y empezará a buscar chollos en el mercado automáticamente.
