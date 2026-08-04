# Memoria del Proyecto: Biwenger Advisor Dashboard (Superagentes VIP)

**Fecha de la última sesión:** Agosto 2026 (Creación de Superagentes, Modo Liga Premium, Rediseño Glassmorphism y Guardián de Reglas)
**Enlace Público Dashboard:** https://zeustata.github.io/biwenger/

---

## 1. Reglas de la Comunidad y de la Liga del Usuario
- **Rol del Bot:** ASESOR PASIVO EXCLUSIVO. Jamás realiza pujas ni ventas automáticas. Todo se muestra en el Dashboard para decisión del mánager.
- **Liga Premium:** Comunidad Premium en Biwenger. **REGLAS LOCALES ACTUALIZADAS:** NO hay puntos por Capitán (sin x2) ni por Once Inicial/Once Ideal. Sí hay Ariete 🎯 (+3 pts por gol), cambios en jornada activa, etc.
- **Límite de Plantilla:** Máximo 14 jugadores (`MAX_JUGADORES_PLANTILLA=14`). Si la plantilla está en 14/14 y se recomienda fichar, se exige indicar qué suplente vender para hacer hueco.
- **Mecánica de Rivales:** Se puede espiar las plantillas de todos los rivales aunque sus jugadores no estén a la venta.
- **Clausulazos Tácticos:** Búsqueda activa de robos de jugadores en plantillas rivales analizando perfil psicológico y sobreprecio de cláusula.

---

## 2. Arquitectura de Superagentes (Modo Premium)
- **`src/agente.js` (Orquestador Principal):** Coordina los módulos, calcula la Trilogía de Pretemporada y genera el HTML interactivo `docs/index.html`.
- **`src/especulador.js` (Superagente Financiero & Trading):** 
  - Trading de alta frecuencia (>40k€/día de subida).
  - Cálculo del Índice de Inflación de Mercado de La Liga.
  - Radar de Titulares Chollo (< 2.000.000€).
  - Control estricto de la regla de 14 jugadores en plantilla.
- **`src/alineador.js` (Superagente Táctico):** 
  - Cálculo de la mejor formación (4-3-3, 3-4-3, 4-4-2, 3-5-2, 5-3-2).
  - Selección del 11 Titular, Capitán 🌟 (x2) y Ariete 🎯.
- **`src/analista.js` (Superagente Psicológico & Médico):** 
  - Perfilador psicológico de rivales (🔥 *Kamikaze*, 💼 *Especulador*, ⚖️ *Conservador*).
  - **Índice de Viabilidad de Clausulazo:** Puntuación táctica (🟢 Alta, 🟡 Media, 🔴 Arriesgada) evaluando sustitutos en la plantilla rival y riesgo de contraataque.
  - Expediente de urgencias rivales.
  - Parte médico completo (Lesionados, Dudas, Sancionados).
- **`src/guardiaReglas.js` (Superagente Guardián de Reglas Oficiales):**
  - **Escudo de Único Portero:** Bloquea la recomendación de venta del único portero de la plantilla (ej. Pablo Campos) para evitar la penalización oficial de -4 puntos por casilla vacía en el 11.
  - Asegura que el mánager cumpla tanto las reglas comunitarias como las reglas oficiales de Biwenger.
- **`src/directorTecnico.js` (Superagente Mánager General / Director Técnico):**
  - Sintetiza las recomendaciones de todos los superagentes en un **Plan de Acción Diario** unificado al principio del Dashboard (Pujas del día, Ventas del día, Cláusulas del día con su viabilidad táctica y Alineación recomendada).
- **`src/ojeadorFantasy.js` (Superagente Ojeador FútbolFantasy):**
  - Lector táctico ligero de `futbolfantasy.com` con **caché local de 12h** (cero sobrecarga y 100% de protección anti-baneo).
  - Evalúa los porcentajes de titularidad (%), estado real de la portería y lanzadores oficiales de penaltis/faltas.
  - Alerta de salud de portería en el Plan de Acción Diario si tu portero apunta a suplente o baja.

---

## 3. Trilogía de Pretemporada & Interfaz Visual VIP
- **Contador Regresivo Táctico "Jornada 1":** Muestra días y horas restantes hasta el pitido inicial (fijado oficialmente en 14 de agosto de 2026 a las 21:00h).
- **Centro de Analítica Visual (Chart.js v4):** 
  - Gráfico de Barras interactivo comparando el valor de plantilla de todos los rivales de la liga vs el mánager.
  - Gráfico Donut/Anillo con el desglose de la plantilla del usuario por posiciones (PT, DF, MC, DL).
- **Buscador & Filtro en Tiempo Real (Client-Side):** Búsqueda dinámica instantánea por jugador, posición (PT, DF, MC, DL) o equipo sin recargar página.
- **Widget Comparador "Cara a Cara" (Head-to-Head):** Selector interactivo para inspeccionar rival a rival sus urgencias, sobrepuja y clausulazos vulnerables en su plantilla.
- **Índice de Inflación de Mercado:** Analiza el ritmo de subida diaria global del mercado de La Liga (ej. 🔥 Hiper-Alcista).
- **Radar de Titulares Chollo (< 2M€):** Tarjetas de jugadores económicos y rentables para rellenar la plantilla de 14.
- **Diseño Glassmorphism VIP:** 
  - Rejilla de Tarjetas de Acción (`Action Cards Grid`) con insignias neon.
  - Tipografía moderna Google Fonts (`Outfit` & `Inter`).
  - Fondo cósmico azul/púrpura con efectos cristal (`backdrop-filter: blur`).

---

## 4. Regla Inquebrantable de Despliegue Git
- **Auto-Push Obligatorio:** Cualquier modificación de código o ejecución de script que regenere `docs/index.html` DEBE subirse inmediatamente a GitHub ejecutando `git add .`, `git commit` y `git push` para desplegar la última versión en GitHub Pages.

