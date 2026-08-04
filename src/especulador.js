/**
 * Módulo Especulador / Trading de Alta Frecuencia para Biwenger
 * Analiza activos en subida libre para obtener liquidez rápida.
 */

function detectarOportunidadesTrading(sales, dbJugadores = {}) {
    const oportunidades = [];
    if (!sales || !Array.isArray(sales)) return oportunidades;

    sales.forEach(sale => {
        const idJugador = typeof sale.player === 'object' ? sale.player.id : sale.player;
        const jDatos = dbJugadores[idJugador] || (sale.player && typeof sale.player === 'object' ? sale.player : null);

        if (!jDatos) return;

        const precioActual = jDatos.price || sale.price || 0;
        const incrementoPrecio = jDatos.priceIncrement || jDatos.fitness || 0; 

        // Evaluamos si el jugador está subiendo más de 40.000€ diarios o tiene una tendencia alcista clara
        const esChollo = incrementoPrecio >= 40000 || (precioActual > 0 && (incrementoPrecio / precioActual) >= 0.02);

        if (esChollo) {
            const gananciaEstimada3Dias = Math.round((incrementoPrecio > 0 ? incrementoPrecio : 50000) * 3);
            oportunidades.push({
                id: idJugador,
                nombre: jDatos.name || `Jugador #${idJugador}`,
                precio: precioActual,
                subidaDiaria: incrementoPrecio,
                gananciaEstimada3Dias,
                vendedor: sale.user ? sale.user.name : 'Computer',
                recomendacion: `🚀 Subiendo +${(incrementoPrecio / 1000).toFixed(0)}k€/día. Comprar hoy para vender en 3 días con ~+${(gananciaEstimada3Dias / 1000).toFixed(0)}k€ de beneficio.`
            });
        }
    });

    // Ordenar de mayor a menor subida diaria
    return oportunidades.sort((a, b) => b.subidaDiaria - a.subidaDiaria).slice(0, 5);
}

function evaluarActivosToxicos(plantilla, dbJugadores = {}) {
    const toxicos = [];
    if (!plantilla || !Array.isArray(plantilla)) return toxicos;

    plantilla.forEach(jugador => {
        const id = typeof jugador === 'object' ? jugador.id : jugador;
        const jDatos = dbJugadores[id];

        if (jDatos && jDatos.priceIncrement && jDatos.priceIncrement <= -30000) {
            toxicos.push({
                id,
                nombre: jDatos.name,
                precio: jDatos.price,
                caidaDiaria: jDatos.priceIncrement,
                mensaje: `📉 Perdiendo ${(jDatos.priceIncrement / 1000).toFixed(0)}k€ al día. Recomienda vender cuanto antes para frenar pérdidas.`
            });
        }
    });

    return toxicos;
}

module.exports = {
    detectarOportunidadesTrading,
    evaluarActivosToxicos
};
