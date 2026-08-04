/**
 * Módulo Alineador Óptimo y Selección de Capitán / Ariete (Liga Premium)
 */

const FORMACIONES = [
    { nombre: '4-3-3', def: 4, mid: 3, fw: 3 },
    { nombre: '3-4-3', def: 3, mid: 4, fw: 3 },
    { nombre: '4-4-2', def: 4, mid: 4, fw: 2 },
    { nombre: '3-5-2', def: 3, mid: 5, fw: 2 },
    { nombre: '5-3-2', def: 5, mid: 3, fw: 2 },
    { nombre: '4-5-1', def: 4, mid: 5, fw: 1 }
];

function seleccionarOnceOptimo(plantilla, dbJugadores = {}) {
    if (!plantilla || !Array.isArray(plantilla) || plantilla.length === 0) {
        return null;
    }

    // 1. Filtrar jugadores disponibles (sanos y en base de datos)
    const disponibles = [];
    plantilla.forEach(j => {
        const id = typeof j === 'object' ? j.id : j;
        const jDatos = dbJugadores[id] || (typeof j === 'object' ? j : null);
        
        if (jDatos) {
            // Ignorar lesionados o sancionados graves
            if (jDatos.status !== 'injured' && jDatos.status !== 'suspended') {
                // Calcular puntos esperados (xP) basados en su media de puntos o valor
                const mediaPuntos = jDatos.points ? (jDatos.points / Math.max(jDatos.playedMatches || 1, 1)) : (jDatos.price / 1000000);
                disponibles.push({
                    id,
                    nombre: jDatos.name || `Jugador #${id}`,
                    posicion: jDatos.position || 2, // 1: PT, 2: DF, 3: MC, 4: DL
                    puntosMedia: parseFloat(mediaPuntos.toFixed(1)),
                    precio: jDatos.price || 0,
                    status: jDatos.status || 'ok'
                });
            }
        }
    });

    // Separar por posición
    const porteros = disponibles.filter(j => j.posicion === 1).sort((a, b) => b.puntosMedia - a.puntosMedia);
    const defensas = disponibles.filter(j => j.posicion === 2).sort((a, b) => b.puntosMedia - a.puntosMedia);
    const medios = disponibles.filter(j => j.posicion === 3).sort((a, b) => b.puntosMedia - a.puntosMedia);
    const delanteros = disponibles.filter(j => j.posicion === 4).sort((a, b) => b.puntosMedia - a.puntosMedia);

    let mejorFormacion = null;
    let mejorOnce = [];
    let mayorPuntuacionTotal = -1;

    // Probar todas las formaciones posibles
    FORMACIONES.forEach(form => {
        if (porteros.length >= 1 && defensas.length >= form.def && medios.length >= form.mid && delanteros.length >= form.fw) {
            const once = [
                porteros[0],
                ...defensas.slice(0, form.def),
                ...medios.slice(0, form.mid),
                ...delanteros.slice(0, form.fw)
            ];
            const sumaPuntos = once.reduce((acc, curr) => acc + curr.puntosMedia, 0);

            if (sumaPuntos > mayorPuntuacionTotal) {
                mayorPuntuacionTotal = sumaPuntos;
                mejorFormacion = form;
                mejorOnce = once;
            }
        }
    });

    // Si ninguna formación encaja perfecto (por falta de jugadores), elegimos los 11 mejores disponibles
    if (!mejorOnce || mejorOnce.length === 0) {
        const todosOrdenados = [...disponibles].sort((a, b) => b.puntosMedia - a.puntosMedia);
        mejorOnce = todosOrdenados.slice(0, 11);
        mejorFormacion = { nombre: 'Adaptada' };
    }

    // 2. Selección de Capitán (🌟) -> El jugador de mayor xP en el 11
    let capitan = null;
    if (mejorOnce.length > 0) {
        capitan = [...mejorOnce].sort((a, b) => b.puntosMedia - a.puntosMedia)[0];
    }

    // 3. Selección de Ariete (🎯) -> El mejor delantero del 11 (o el 2º mejor jugador si no hay DL)
    let ariete = delanteros.length > 0 ? delanteros[0] : null;
    if (ariete && capitan && ariete.id === capitan.id && delanteros.length > 1) {
        ariete = delanteros[1]; // Evitar asignar Capitán y Ariete al mismo si hay opciones
    }

    // 4. Suplentes recomendados
    const idsOnce = new Set(mejorOnce.map(j => j.id));
    const suplentes = disponibles.filter(j => !idsOnce.has(j.id));

    return {
        formacion: mejorFormacion ? mejorFormacion.nombre : 'Flexible',
        onceTitular: mejorOnce,
        capitan,
        ariete,
        suplentes,
        puntosProyectados: parseFloat(mayorPuntuacionTotal.toFixed(1))
    };
}

module.exports = {
    seleccionarOnceOptimo
};
