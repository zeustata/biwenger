// Módulo Alineador: Se encarga de hacer el 11 titular antes de la jornada

/**
 * Recibe la plantilla completa y decide el mejor 11 titular y la formación.
 * Al tener la cuenta Premium, podemos usar cualquier formación legal.
 * @param {Array} plantilla Lista de todos nuestros jugadores
 * @returns {Object} El 11 titular y la formación elegida
 */
function hacerAlineacion(plantilla) {
    if (!plantilla || plantilla.length === 0) return null;

    // 1. Separar a los jugadores por su estado (Descartar lesionados graves o no convocados)
    // Guardamos a los buenos aunque estén lesionados (esto evita venderlos luego)
    let disponibles = plantilla.filter(j => 
        j.status === 'ok' || 
        j.status === 'doubt' // Podemos arriesgar con dudas si son muy buenos
    );

    // Separamos por posiciones
    let porteros = disponibles.filter(j => j.position === 1).sort((a,b) => b.average - a.average);
    let defensas = disponibles.filter(j => j.position === 2).sort((a,b) => b.average - a.average);
    let medios = disponibles.filter(j => j.position === 3).sort((a,b) => b.average - a.average);
    let delanteros = disponibles.filter(j => j.position === 4).sort((a,b) => b.average - a.average);

    // 2. Elegir al mejor portero (siempre 1)
    let onceTitular = [];
    if (porteros.length > 0) {
        onceTitular.push(porteros[0]);
    }

    // 3. Lógica para cuenta Premium: Coger a los 10 mejores jugadores de campo
    // Siempre y cuando formen una alineación legal (Mínimo 3 DF, Mínimo 2 MC, Mínimo 1 DL, etc. dependiendo de las reglas Premium exactas).
    // Simplificación para el algoritmo:
    
    // Primero aseguramos los mínimos vitales (ej: 3 defensas, 2 medios, 1 delantero)
    let dfElegidos = defensas.slice(0, 3);
    let mcElegidos = medios.slice(0, 2);
    let dlElegidos = delanteros.slice(0, 1);
    
    // Sumamos todos los elegidos
    let campoElegidos = [...dfElegidos, ...mcElegidos, ...dlElegidos];
    
    // Quitamos de las listas originales los que ya hemos elegido
    defensas = defensas.slice(3);
    medios = medios.slice(2);
    delanteros = delanteros.slice(1);
    
    // Juntamos el resto de jugadores disponibles y los ordenamos por media de puntos
    let restoJugadores = [...defensas, ...medios, ...delanteros].sort((a, b) => b.average - a.average);
    
    // Rellenamos hasta llegar a 10 jugadores de campo (11 con el portero)
    let huecosLibres = 10 - campoElegidos.length;
    let extrasElegidos = restoJugadores.slice(0, huecosLibres);
    
    campoElegidos = [...campoElegidos, ...extrasElegidos];
    onceTitular = [...onceTitular, ...campoElegidos];

    // Calculamos la formación resultante contando cuántos hay de cada
    let formacion = `1-${campoElegidos.filter(j=>j.position===2).length}-${campoElegidos.filter(j=>j.position===3).length}-${campoElegidos.filter(j=>j.position===4).length}`;

    return {
        onceTitular: onceTitular,
        formacion: formacion
    };
}

module.exports = {
    hacerAlineacion
};
