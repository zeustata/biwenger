const { normalizarNombre } = require('./src/ojeadorFantasy');

function buscarJugadorEnFF(nombreBiwenger, datosFF) {
    if (!nombreBiwenger || !datosFF) return null;
    const bNorm = normalizarNombre(nombreBiwenger);
    if (!bNorm) return null;

    const dictJugadores = datosFF.jugadores || {};
    const dictLesionados = datosFF.lesionados || {};

    // 1. Coincidencia Exacta en Lesionados o Titulares
    if (dictLesionados[bNorm]) return { ...dictLesionados[bNorm], estado: 'lesionado', titularidad: 0 };
    if (dictJugadores[bNorm]) return dictJugadores[bNorm];

    // 2. Coincidencia Parcial por Tokens (ej: "Camello" -> "Sergio Camello")
    const bTokens = bNorm.split(' ').filter(t => t.length > 2);

    // Buscar en Lesionados por token
    for (let ffKey of Object.keys(dictLesionados)) {
        if (ffKey.includes(bNorm) || bNorm.includes(ffKey) || bTokens.some(t => t.length > 3 && ffKey.includes(t))) {
            return { ...dictLesionados[ffKey], estado: 'lesionado', titularidad: 0 };
        }
    }

    // Buscar en Titulares por token
    for (let ffKey of Object.keys(dictJugadores)) {
        if (ffKey.includes(bNorm) || bNorm.includes(ffKey) || bTokens.some(t => t.length > 3 && ffKey.includes(t))) {
            return dictJugadores[ffKey];
        }
    }

    return null;
}

const sampleFF = {
    jugadores: {
        'sergio camello': { titularidad: 95, estado: 'titular' },
        'aitor paredes': { titularidad: 90, estado: 'titular' },
        'pablo campos': { titularidad: 30, estado: 'suplente' },
        'carlos martin': { titularidad: 85, estado: 'titular' }
    },
    lesionados: {
        'miguel rubio': { titularidad: 0, estado: 'lesionado' }
    }
};

console.log('Camello:', buscarJugadorEnFF('Camello', sampleFF));
console.log('Paredes:', buscarJugadorEnFF('Paredes', sampleFF));
console.log('Pablo Campos:', buscarJugadorEnFF('Pablo Campos', sampleFF));
console.log('Miguel Rubio:', buscarJugadorEnFF('Miguel Rubio', sampleFF));
console.log('Desconocido:', buscarJugadorEnFF('Desconocido', sampleFF));
