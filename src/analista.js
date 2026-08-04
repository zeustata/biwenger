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

/**
 * Evalúa la plantilla inicial asignada al usuario antes de que empiece la liga.
 * Clasifica a los jugadores en: 'mantener' (clave), 'vender' (descartes) y 'duda' (observar).
 */
function evaluarPlantillaInicial(plantilla) {
    const analisis = {
        mantener: [],
        vender: [],
        duda: []
    };

    if (!plantilla || plantilla.length === 0) return analisis;

    plantilla.forEach(jugador => {
        // En pretemporada valoramos: Titularidad (status='ok'), Valor (price), Tendencia (priceIncrement)
        const lesionado = jugador.status === 'injured' || jugador.status === 'doubt' || jugador.status === 'suspended';
        const tendenciaAlcista = jugador.priceIncrement > 20000;
        const tendenciaBajista = jugador.priceIncrement < -20000;
        const jugadorClave = jugador.average > 4.5; // o precio muy alto
        
        let decision = 'duda';
        let motivo = '';

        if (lesionado) {
            decision = 'vender';
            motivo = 'No disponible (lesión/sanción). Mejor hacer caja.';
        } else if (tendenciaBajista && !jugadorClave) {
            decision = 'vender';
            motivo = 'Bajando de valor. Vender antes de perder dinero.';
        } else if (jugadorClave || jugador.price > 6000000) {
            decision = 'mantener';
            motivo = 'Jugador Top o muy caro. Base de tu equipo titular.';
        } else if (tendenciaAlcista) {
            decision = 'mantener';
            motivo = 'Subiendo de valor. Especula con él.';
        } else if (jugador.price < 500000) {
            decision = 'duda';
            motivo = 'Parche de bajo coste. Puedes usarlo para rellenar.';
        } else {
            decision = 'vender';
            motivo = 'Rendimiento mediocre. Vender para reinvertir en el mercado.';
        }

        analisis[decision].push({
            nombre: jugador.name,
            precio: jugador.price,
            incremento: jugador.priceIncrement,
            motivo: motivo
        });
    });

    // Ordenar por precio
    analisis.mantener.sort((a, b) => b.precio - a.precio);
    analisis.vender.sort((a, b) => b.precio - a.precio);
    analisis.duda.sort((a, b) => b.precio - a.precio);

    return analisis;
}

/**
 * Analiza las plantillas de los rivales para el Expediente.
 * Devuelve un array de rivales y sus "urgencias" (posiciones que necesitan fichar urgentemente).
 */
function analizarRivales(standings) {
    const expediente = [];
    if (!standings || !Array.isArray(standings)) return expediente;
    
    standings.forEach(rival => {
        // Si hay array de equipo
        if (rival.team && Array.isArray(rival.team)) {
            const necesidades = detectarNecesidadesPlantilla(rival.team);
            let urgencias = [];
            // Si le falta un PT o DL, es crítico. Si le faltan muchos DF o MC también.
            if (necesidades.PT > 0) urgencias.push('PT');
            if (necesidades.DF > 1) urgencias.push('DF'); 
            if (necesidades.MC > 1) urgencias.push('MC');
            if (necesidades.DL > 0) urgencias.push('DL');
            
            if (urgencias.length > 0) {
                expediente.push({
                    id: rival.id || 'N/A',
                    nombre: rival.name || 'Rival Desconocido',
                    valor: rival.teamValue || 0,
                    urgencias: urgencias,
                    necesidadesRaw: necesidades
                });
            }
        }
    });
    
    // Ordenar por valor de equipo (rivales más fuertes arriba)
    expediente.sort((a, b) => (b.valor || 0) - (a.valor || 0));
    return expediente;
}

/**
 * Analiza el historial de pujas del tablón y actualiza las estadísticas de los rivales.
 */
function calcularPerfilPujador(movimientos, statsAntiguas = {}) {
    const stats = { ...statsAntiguas };
    
    if (!movimientos || !Array.isArray(movimientos)) return stats;
    
    movimientos.forEach(evento => {
        // Buscamos eventos de fichaje
        if (evento.type === 'transfer' && Array.isArray(evento.content)) {
            evento.content.forEach(transfer => {
                const idComprador = transfer.to ? transfer.to.id : null;
                const pagado = transfer.amount;
                
                if (idComprador && pagado) {
                    if (!stats[idComprador]) {
                        stats[idComprador] = {
                            nombre: transfer.to.name || 'Desconocido',
                            pujaMaxima: 0,
                            fichajesAnalizados: 0,
                            sobrepujaAcumulada: 0,
                            sobrepujaMedia: 0
                        };
                    }
                    
                    const perfil = stats[idComprador];
                    
                    if (pagado > perfil.pujaMaxima) {
                        perfil.pujaMaxima = pagado;
                    }
                    
                    const valorMercado = transfer.player && transfer.player.price ? transfer.player.price : null;
                    
                    if (valorMercado && pagado >= valorMercado) {
                        const sobrepuja = (pagado - valorMercado) / valorMercado;
                        perfil.sobrepujaAcumulada += sobrepuja;
                        perfil.fichajesAnalizados += 1;
                        perfil.sobrepujaMedia = perfil.sobrepujaAcumulada / perfil.fichajesAnalizados;
                    }
                }
            });
        }
    });
    
    return stats;
}

/**
 * Busca los mejores jugadores en los equipos rivales para robar mediante pago de cláusula,
 * centrándose solo en las posiciones que urgen al usuario.
 */
function buscarMejoresClausulazos(urgencias, rivales, dbJugadores, saldoDisponible, valorEquipo) {
    const robos = [];
    if (!urgencias || !rivales || !dbJugadores) return robos;

    const limiteGasto = saldoDisponible + (valorEquipo * 0.20); // 20% del valor del equipo como riesgo máximo

    rivales.forEach(rival => {
        if (!rival.team || !Array.isArray(rival.team)) return;

        rival.team.forEach(jugador => {
            const id = typeof jugador === 'object' ? jugador.id : jugador;
            const jDatos = dbJugadores[id];
            
            if (jDatos) {
                let posString = '';
                if (jDatos.position === 1) posString = 'PT';
                else if (jDatos.position === 2) posString = 'DF';
                else if (jDatos.position === 3) posString = 'MC';
                else if (jDatos.position === 4) posString = 'DL';

                // Si esta posición nos urge (urgencias[posString] > 0)
                if (urgencias[posString] > 0) {
                    const lesionado = jDatos.status === 'injured' || jDatos.status === 'doubt' || jDatos.status === 'suspended';
                    const juegaHabitualmente = jDatos.average > 3.0; // Solo titulares o gente que puntúa bien

                    if (!lesionado && juegaHabitualmente && jDatos.price <= limiteGasto) {
                        const rentabilidad = jDatos.average / (jDatos.price / 1000000); // Puntos por millón
                        
                        robos.push({
                            id: jDatos.id,
                            nombre: jDatos.name,
                            posicion: posString,
                            dueño: rival.nombre,
                            precioMercado: jDatos.price,
                            mediaPuntos: jDatos.average,
                            rentabilidad: rentabilidad
                        });
                    }
                }
            }
        });
    });

    // Ordenamos de mayor a menor rentabilidad
    robos.sort((a, b) => b.rentabilidad - a.rentabilidad);
    // Devolvemos el top 5 de opciones recomendadas
    return robos.slice(0, 5);
}

module.exports = {
    detectarNecesidadesPlantilla,
    evaluarJugador,
    evaluarPlantillaInicial,
    analizarRivales,
    calcularPerfilPujador,
    buscarMejoresClausulazos
};
