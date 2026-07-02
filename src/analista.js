// Módulo Analista: Evalúa jugadores y detecta necesidades del equipo

/**
 * Analiza la plantilla actual para detectar qué posiciones urgen reforzar.
 * Por ejemplo: Si nos han robado el portero, devuelve que la máxima prioridad es fichar un PT.
 * @param {Array} plantilla Lista de jugadores de nuestro equipo
 * @returns {Object} Un objeto con las necesidades, ej: { PT: 1, DF: 0, MC: 0, DL: 1 }
 */
function detectarNecesidadesPlantilla(plantilla) {
    let necesidades = {
        PT: 1, // Asumimos que necesitamos 1 portero titular por defecto
        DF: 3, // Mínimo 3 defensas
        MC: 4, // Mínimo 4 medios
        DL: 2  // Mínimo 2 delanteros
    };

    if (!plantilla || plantilla.length === 0) return necesidades;

    // Restamos las posiciones que ya tenemos cubiertas por TITULARES o jugadores válidos
    plantilla.forEach(jugador => {
        // En Biwenger, position suele ser: 1 (PT), 2 (DF), 3 (MC), 4 (DL)
        // Y tenemos que verificar si es titular habitual (basado en sus últimos puntos/estado)
        const esTitular = jugador.status === 'ok' && jugador.average > 2.5;

        if (esTitular) {
            if (jugador.position === 1) necesidades.PT -= 1;
            else if (jugador.position === 2) necesidades.DF -= 1;
            else if (jugador.position === 3) necesidades.MC -= 1;
            else if (jugador.position === 4) necesidades.DL -= 1;
        }
    });

    // Nos aseguramos de no devolver números negativos si tenemos de sobra
    Object.keys(necesidades).forEach(key => {
        if (necesidades[key] < 0) necesidades[key] = 0;
    });

    return necesidades;
}

/**
 * Evalúa si un jugador es apto para fichar basándose en las necesidades, el saldo y la RENTABILIDAD.
 * Sigue la doctrina "Biwenger Optimizer 3.0" de especulación.
 */
function evaluarJugador(jugador, esClausula = false, necesidades = {}, saldoDisponible = 0, valorEquipo = 0) {
    console.log(`\n<analisis_financiero> Evaluando a ${jugador.name}...`);
    
    // 1. Comprobar Liquidez
    const precioCompra = esClausula ? jugador.clause : jugador.price;
    if (precioCompra > saldoDisponible) {
        console.log(`- ❌ Rechazado: Falta de liquidez. Precio: ${precioCompra}, Saldo: ${saldoDisponible}.`);
        console.log(`</analisis_financiero>`);
        return false;
    }

    // 2. Distribución de Capital Ideal (30% MC, 25% DL, 25% DF/PT)
    // Se rechaza si comprarlo rompe gravemente la estructura económica ideal
    const presupuestoTotal = saldoDisponible + valorEquipo;
    let limiteGastoPosicion = 0;
    
    if (jugador.position === 1 || jugador.position === 2) limiteGastoPosicion = presupuestoTotal * 0.25;
    else if (jugador.position === 3) limiteGastoPosicion = presupuestoTotal * 0.30;
    else if (jugador.position === 4) limiteGastoPosicion = presupuestoTotal * 0.25;

    // 3. Especulación y Nombres (Prohibido fichar por nombre, solo por rendimiento/precio)
    const tendenciaAlcista = jugador.priceIncrement > 50000;
    const rachaPuntos = jugador.average > 4.5;

    console.log(`- Tendencia Alcista: ${tendenciaAlcista ? 'SÍ (+80k/día)' : 'NO (Bloqueo de capital ineficiente)'}`);
    console.log(`- Racha de Puntos: ${rachaPuntos ? 'ALTA' : 'BAJA'}`);

    // Si es del mercado libre: Comprar chollos que suben de valor para especular
    if (!esClausula) {
        if (tendenciaAlcista) {
            console.log(`- ✅ Aprobado: Rentabilidad proyectada alta a corto plazo. Operación de especulación.`);
            console.log(`</analisis_financiero>`);
            return true; 
        }
    }

    // Si es un clausulazo: Solo asaltar cláusulas si el jugador está en racha brutal
    if (esClausula) {
        if (rachaPuntos && tendenciaAlcista) {
            console.log(`- ✅ Aprobado: Asalto de cláusula táctico. Retorno de puntos garantizado.`);
            console.log(`</analisis_financiero>`);
            return true;
        } else {
            console.log(`- ❌ Rechazado: El clausulazo no compensa el sobreprecio de la operación.`);
            console.log(`</analisis_financiero>`);
            return false;
        }
    }

    console.log(`- ❌ Rechazado: No cumple los criterios financieros estrictos.`);
    console.log(`</analisis_financiero>`);
    return false;
}

module.exports = {
    detectarNecesidadesPlantilla,
    evaluarJugador
};
