/**
 * Módulo Guardián de Reglas Oficiales de Biwenger
 * Protege contra penalizaciones de -4 puntos por huecos vacíos en la alineación.
 */

function aplicarGuardiaReglas(plantilla, ventasRecomendadas, recomMercado = []) {
    if (!plantilla || !Array.isArray(plantilla)) return ventasRecomendadas;

    const porteros = plantilla.filter(j => (j.position === 1 || j.posicion === 1));
    const porterosEnMercado = recomMercado.filter(m => m.posicion === 1 || (m.jugadorObj && m.jugadorObj.position === 1));

    const ventasFiltradas = [];

    ventasRecomendadas.forEach(v => {
        const idVenta = v.id || v.nombre;
        const esPortero = porteros.some(p => p.name === v.nombre || p.id === v.id);

        if (esPortero && porteros.length <= 1 && porterosEnMercado.length === 0) {
            // BLOQUEO POR REGLA DE BIWENGER: No vender al único portero sin recambio
            console.log(`🛡️ Guardián de Reglas: Bloqueada la venta de ${v.nombre} (Es tu único portero. Venderlo causaría -4 pts de penalización en la jornada).`);
        } else {
            ventasFiltradas.push(v);
        }
    });

    return ventasFiltradas;
}

function verificarUnicoPortero(plantilla, dbJugadores = {}) {
    if (!plantilla || !Array.isArray(plantilla)) return null;

    const porteros = plantilla.map(j => {
        const id = typeof j === 'object' ? j.id : j;
        return dbJugadores[id] || (typeof j === 'object' ? j : null);
    }).filter(j => j && (j.position === 1 || j.posicion === 1));

    if (porteros.length === 1) {
        return {
            nombre: porteros[0].name || 'Tu portero',
            mensaje: `🧤 <strong>${porteros[0].name || 'Tu portero'}</strong> es tu ÚNICO portero. Está protegido por la regla anti-penalización (-4 pts por hueco vacío).`
        };
    }

    if (porteros.length === 0) {
        return {
            nombre: 'Ninguno',
            mensaje: `🚨 <strong>¡ALERTA CRÍTICA!</strong> No tienes NINGÚN portero en plantilla. Sufrirás -4 PUNTOS DE PENALIZACIÓN si no fichas un portero urgente.`
        };
    }

    return null;
}

module.exports = {
    aplicarGuardiaReglas,
    verificarUnicoPortero
};
