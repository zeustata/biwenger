# Memoria del Proyecto: Biwenger Advisor Dashboard

**Fecha de la última sesión:** Agosto 2026 (Transformación a Modo Asesor y creación del Modo Pretemporada)
**Próximo hito:** Inicio de La Liga en Agosto (Reseteo de liga y asignación de presupuesto/plantilla aleatoria).

## Estado Actual de la Arquitectura
1. **Infraestructura:** El bot corre en GitHub Actions (`.github/workflows/biwenger.yml`) todos los días a las 08:00 AM.
2. **Despliegue Web:** Integrado con Vercel para visualizar un Dashboard HTML interactivo y premium (`docs/index.html`) generado automáticamente. El repositorio se mantiene privado.
3. **Identidad (NUEVO):** El bot ha pasado de ser un "Bot Automático Activo" a un **"Asesor Pasivo"**. **Bajo ninguna circunstancia** realiza acciones destructivas (ni pujas, ni ventas, ni acepta ofertas) en la cuenta del usuario. Las llamadas `POST/PUT` a la API están capadas y bloqueadas. Esto se mantiene estrictamente incluso una vez que el usuario proporciona sus credenciales (`BIWENGER_TOKEN` y `BIWENGER_LEAGUE_ID`).
4. **Prevención de Errores:** Si el token falla o no hay conexión, el bot genera un Dashboard con un mensaje de error y sale limpiamente.

## Lógica y Reglas de Negocio Implementadas (Como Recomendaciones)
* **Modo Pretemporada (NUEVO):** Antes de la fecha oficial de inicio (`FECHA_INICIO_PUJAS`), el bot se conecta y genera un análisis exclusivo de la plantilla inicial. Clasifica a los jugadores aleatorios asignados en: 'Mantener' (estrellas o especulación al alza), 'Vender' (bajando de valor, sin potencial, lesionados) o 'Dudas' (parches baratos).
* **Reglas Específicas 26-27:**
  - **Límite de Plantilla:** Configurable por el usuario en las variables (MAX_JUGADORES_PLANTILLA).
  - **Sistema de Puntuación (Ingresos):** 10.000€ por punto + Bonus Posicional compensatorio (100k al 12º hasta 900k al 20º).
  - **Goles (+3 Extra):** Los goleadores valen oro.
  - **Cláusulas (Robos):** Máximo 2 hechos y 2 recibidos cada 7 días.
  - **Mercado:** Exclusivo Computer. No hay cesiones, préstamos ni traspasos entre mánagers.
  - **Alineaciones:** NO hay Capitán ni Once Ideal. SÍ hay Reservas y se permite 1 cambio manual en jornada activa.
* **Cuadrar Cuentas:** Si el saldo es negativo, el bot analiza la plantilla y las ofertas recibidas por el *computer*, y genera una lista visual recomendando qué suplentes o peores jugadores vender para salir del negativo.
* **Pujas Agresivas (Adaptadas a Economía Pobre):** 
  - Base: +5% a 10% de su valor (antes 15%).
  - Delanteros / Top: hasta +20%.
* **Riesgo de Jornada:** A menos de 48 horas de empezar la jornada, si la puja recomendada deja al usuario en negativo, el Dashboard arroja una **Alerta de Riesgo** ⚠️.
* **Modo Detective (ACTIVO):** Cruza las urgencias de las plantillas rivales con sus historiales de sobrepuja (`stats.json`) para recomendar pujas exactas.

## Tareas Pendientes para Agosto
1. **Configurar Credenciales:** El usuario proporcionará el token de Biwenger y el ID de su liga (`BIWENGER_TOKEN` y `BIWENGER_LEAGUE_ID`) en el `.env` local o secrets de GitHub.
2. **Operativa Manual:** El usuario usará el Dashboard diariamente a partir del reseteo para tomar decisiones financieras informadas, aplicando manualmente las ventas y fichajes sugeridos.
