/**
 * Módulo Guardián de Reglas Oficiales de Biwenger
 * Protege contra penalizaciones de -4 puntos por huecos vacíos en la alineación.
 */

function aplicarGuardiaReglas(plantilla, ventasRecomendadas, recomMercado = []) {
    if (!plantilla || !Array.isArray(plantilla)) return ventasRecomendadas;

    const conteo = { PT: 0, DF: 0, MC: 0, DL: 0 };
    plantilla.forEach(j => {
        const pos = j.position || j.posicion;
        if (pos === 1) conteo.PT++;
        if (pos === 2) conteo.DF++;
        if (pos === 3) conteo.MC++;
        if (pos === 4) conteo.DL++;
    });

    const ventasFiltradas = [];

    ventasRecomendadas.forEach(v => {
        const pos = v.posicion || (v.jugadorObj ? v.jugadorObj.position : 0);
        // Mínimos para evitar casillas vacías en cualquier formación
        const esUltimoPT = (pos === 1 || v.posicionStr === 'PT') && conteo.PT <= 1;
        const esCriticoDF = (pos === 2 || v.posicionStr === 'DF') && conteo.DF <= 3;
        const esCriticoMC = (pos === 3 || v.posicionStr === 'MC') && conteo.MC <= 3;
        const esCriticoDL = (pos === 4 || v.posicionStr === 'DL') && conteo.DL <= 1;

        if (esUltimoPT || (conteo.PT + conteo.DF + conteo.MC + conteo.DL - 1 < 11)) {
            console.log(`🛡️ Guardián de Reglas: Bloqueada la venta de ${v.nombre} (Protección anti-casilla vacía: venderlo causaría penalización de -4 pts).`);
        } else {
            ventasFiltradas.push(v);
        }
    });

    return ventasFiltradas;
}

function verificarUnicoPortero(plantilla, dbJugadores = {}) {
    return evaluarCoberturaCasillas(plantilla, dbJugadores);
}

/**
 * Evalúa si hay casillas vacías en la alineación que provoquen la penalización de -4 puntos por hueco.
 */
function evaluarCoberturaCasillas(plantilla, dbJugadores = {}) {
    if (!plantilla || !Array.isArray(plantilla)) return null;

    const conteo = { PT: 0, DF: 0, MC: 0, DL: 0 };

    plantilla.forEach(j => {
        const id = typeof j === 'object' ? j.id : j;
        const pObj = dbJugadores[id] || (typeof j === 'object' ? j : null);
        const pos = pObj ? (pObj.position || pObj.posicion) : 0;
        if (pos === 1) conteo.PT++;
        if (pos === 2) conteo.DF++;
        if (pos === 3) conteo.MC++;
        if (pos === 4) conteo.DL++;
    });

    const totalJugadores = conteo.PT + conteo.DF + conteo.MC + conteo.DL;
    let alertas = [];
    let huecosVacios = 0;

    if (conteo.PT === 0) {
        alertas.push("🧤 <strong>Portería (PT):</strong> 0 porteros (1 casilla vacía = -4 pts).");
        huecosVacios++;
    }

    if (totalJugadores < 11) {
        const faltantes = 11 - totalJugadores;
        huecosVacios += faltantes;
        alertas.push(`🚨 <strong>Plantilla Corta:</strong> Tienes solo ${totalJugadores}/11 jugadores. Dejarás ${faltantes} casilla(s) vacía(s) = -${faltantes * 4} pts de penalización.`);
    }

    if (huecosVacios > 0) {
        return {
            estado: '🚨 ALERTA CASILLA VACÍA (-4 PTS)',
            huecosVacios,
            penalizacionTotal: huecosVacios * -4,
            mensaje: `¡Cuidado! Tienes <strong>${huecosVacios} casilla(s) vacía(s)</strong> en tu alineación. Sufrirás una penalización de <strong>${huecosVacios * -4} puntos</strong> si no fichas para rellenar los huecos.`,
            detalles: alertas
        };
    }

    return {
        estado: '✅ 11 COMPLETO SIN CASILLAS VACÍAS',
        huecosVacios: 0,
        penalizacionTotal: 0,
        mensaje: `Tienes suficientes jugadores (${totalJugadores}/11) para cubrir todas las casillas y evitar penalizaciones de -4 pts.`
    };
}

module.exports = {
    aplicarGuardiaReglas,
    verificarUnicoPortero,
    evaluarCoberturaCasillas
};
