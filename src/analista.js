// Módulo Analista: Evalúa jugadores y detecta necesidades del equipo

/**
 * Analiza la plantilla actual para detectar qué posiciones urgen reforzar.
 * Por ejemplo: Si nos han robado el portero, devuelve que la máxima prioridad es fichar un PT.
 * @param {Array} plantilla Lista de jugadores de nuestro equipo
 * @returns {Object} Un objeto con las necesidades, ej: { PT: 1, DF: 0, MC: 0, DL: 1 }
 */
function detectarNecesidadesPlantilla(plantilla) {
    const objetivos = {
        PT: 2, // 1 Titular + 1 Reserva/Parche para evitar casillas vacías o rotaciones
        DF: 4, // Mínimo 4 defensas
        MC: 5, // Mínimo 5 medios
        DL: 3  // Mínimo 3 delanteros
    };

    let conteo = { PT: 0, DF: 0, MC: 0, DL: 0 };

    if (plantilla && Array.isArray(plantilla)) {
        plantilla.forEach(jugador => {
            const pos = jugador.position || jugador.posicion;
            const esValido = jugador.status !== 'injured';
            if (esValido) {
                if (pos === 1) conteo.PT++;
                else if (pos === 2) conteo.DF++;
                else if (pos === 3) conteo.MC++;
                else if (pos === 4) conteo.DL++;
            }
        });
    }

    let necesidades = {
        conteo,
        objetivos,
        PT: Math.max(0, objetivos.PT - conteo.PT),
        DF: Math.max(0, objetivos.DF - conteo.DF),
        MC: Math.max(0, objetivos.MC - conteo.MC),
        DL: Math.max(0, objetivos.DL - conteo.DL),
        saturadas: {
            PT: conteo.PT >= 3,
            DF: conteo.DF >= 5,
            MC: conteo.MC >= 6,
            DL: conteo.DL >= 4
        }
    };

    necesidades.tieneDeficitUrgente = necesidades.PT > 0 || necesidades.DF > 0 || necesidades.MC > 0 || necesidades.DL > 0;

    return necesidades;
}

/**
 * Evalúa si un jugador es apto para fichar basándose en las necesidades, el saldo y la RENTABILIDAD.
 * Sigue la doctrina de priorización táctica de líneas desguarnecidas.
 */
function evaluarJugador(jugador, esClausula = false, necesidades = {}, saldoDisponible = 0, valorEquipo = 0) {
    const nombreJugador = jugador.name || jugador.nombre || (jugador.id ? `Jugador #${jugador.id}` : 'Jugador');
    const posNum = jugador.position || jugador.posicion || 2;
    const posKey = posNum === 1 ? 'PT' : posNum === 2 ? 'DF' : posNum === 3 ? 'MC' : 'DL';
    
    console.log(`\n<analisis_financiero> Evaluando a ${nombreJugador} (${posKey})...`);
    
    // 1. Comprobar Liquidez Estricta (Garantizar Saldo >= 0)
    const precioCompra = esClausula ? (jugador.clause || jugador.price) : (jugador.price || 0);
    if (precioCompra > saldoDisponible) {
        console.log(`- ❌ Rechazado: Falta de liquidez. Precio: ${precioCompra}€, Saldo: ${saldoDisponible}€.`);
        console.log(`</analisis_financiero>`);
        return false;
    }

    // 2. Control de Saturación por Línea
    const estaSaturado = necesidades.saturadas && necesidades.saturadas[posKey];
    if (estaSaturado) {
        console.log(`- ❌ Rechazado: Línea de ${posKey} ya saturada. Se reserva capital para cubrir necesidades reales.`);
        console.log(`</analisis_financiero>`);
        return false;
    }

    // 3. Evaluar Necesidad de Línea vs Especulación
    const necesidadEnPosicion = necesidades[posKey] && necesidades[posKey] > 0;
    const tendenciaAlcista = jugador.priceIncrement > 30000;
    const rachaPuntos = jugador.average > 4.0;

    console.log(`- Necesidad de Línea (${posKey}): ${necesidadEnPosicion ? 'SÍ (Prioritario)' : 'NO'}`);
    console.log(`- Tendencia Alcista: ${tendenciaAlcista ? 'SÍ' : 'NO'}`);

    if (necesidadEnPosicion) {
        console.log(`- ✅ Aprobado: Fichaje prioritario para cubrir déficit en línea ${posKey}.`);
        console.log(`</analisis_financiero>`);
        return true;
    }

    if (!esClausula && tendenciaAlcista && !necesidades.tieneDeficitUrgente) {
        console.log(`- ✅ Aprobado: Operación de especulación (Líneas cubiertas y activo en subida).`);
        console.log(`</analisis_financiero>`);
        return true;
    }

    if (esClausula && rachaPuntos && tendenciaAlcista && !necesidades.tieneDeficitUrgente) {
        console.log(`- ✅ Aprobado: Clausulazo de alto rendimiento (Líneas cubiertas).`);
        console.log(`</analisis_financiero>`);
        return true;
    }

    console.log(`- ❌ Rechazado: No cumple las prioridades del equipo ni los criterios de trading.`);
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

    const porterosCount = plantilla.filter(j => j.position === 1).length;

    plantilla.forEach(jugador => {
        const esPorteroUnico = jugador.position === 1 && porterosCount <= 1;
        const lesionado = jugador.status === 'injured' || jugador.status === 'doubt' || jugador.status === 'suspended';
        const tendenciaAlcista = jugador.priceIncrement > 20000;
        const tendenciaBajista = jugador.priceIncrement < -20000;
        const jugadorClave = jugador.average > 4.5;
        
        let decision = 'duda';
        let motivo = '';

        if (esPorteroUnico) {
            decision = 'mantener';
            motivo = '🛡️ ÚNICO PORTERO. Protegido para evitar penalización de -4 pts por casilla vacía.';
        } else if (lesionado) {
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
function analizarRivales(standings, dbJugadores = null, miUserId = null) {
    const expediente = [];
    if (!standings || !Array.isArray(standings)) return expediente;
    
    const idUsuarioActual = miUserId ? parseInt(miUserId) : (process.env.BIWENGER_USER_ID ? parseInt(process.env.BIWENGER_USER_ID) : null);

    standings.forEach(rival => {
        // Excluir a nosotros mismos de la lista de rivales si coincide ID
        if (idUsuarioActual && rival.id === idUsuarioActual) return;

        let equipoRival = [];
        let valorCalculado = rival.teamValue || 0;

        if (rival.team && Array.isArray(rival.team)) {
            equipoRival = rival.team.map(j => {
                const idJ = typeof j === 'object' ? j.id : j;
                const dJ = dbJugadores && dbJugadores[idJ] ? dbJugadores[idJ] : null;
                return dJ || { id: idJ, position: 2, status: 'ok', average: 3.0 };
            });

            if (valorCalculado === 0 && dbJugadores) {
                valorCalculado = equipoRival.reduce((sum, p) => sum + (p.price || 0), 0);
            }
        }

        const necesidades = detectarNecesidadesPlantilla(equipoRival);
        let urgencias = [];
        if (necesidades.PT > 0) urgencias.push('PT');
        if (necesidades.DF > 1) urgencias.push('DF'); 
        if (necesidades.MC > 1) urgencias.push('MC');
        if (necesidades.DL > 0) urgencias.push('DL');

        expediente.push({
            id: rival.id || 'N/A',
            nombre: rival.name || 'Rival Desconocido',
            valor: valorCalculado,
            urgencias: urgencias,
            team: equipoRival,
            necesidadesRaw: necesidades
        });
    });
    
    // Ordenar por valor de equipo (rivales más fuertes arriba)
    expediente.sort((a, b) => (b.valor || 0) - (a.valor || 0));
    return expediente;
}

/**
 * Analiza el historial de pujas del tablón y actualiza las estadísticas de los rivales.
 */
function calcularPerfilPujador(ultimosMovimientos, statsPoderPujador = {}) {
    const rivalesStats = statsPoderPujador || {};

    if (!ultimosMovimientos || !Array.isArray(ultimosMovimientos)) return rivalesStats;

    ultimosMovimientos.forEach(mov => {
        if (mov.type === 'transfer' && Array.isArray(mov.content)) {
            mov.content.forEach(f => {
                if (f.to && f.to.id) {
                    const rivalId = f.to.id;
                    if (!rivalesStats[rivalId]) {
                        rivalesStats[rivalId] = {
                            nombre: f.to.name,
                            fichajesAnalizados: 0,
                            sumaSobrepujaRatio: 0,
                            pujaMaxima: 0,
                            perfilPsicologico: '⚖️ Conservador / Calculador'
                        };
                    }

                    const stat = rivalesStats[rivalId];
                    stat.fichajesAnalizados += 1;
                    
                    if (f.amount > stat.pujaMaxima) {
                        stat.pujaMaxima = f.amount;
                    }

                    if (f.player && typeof f.player === 'object' && f.player.price) {
                        const sobrepuja = (f.amount - f.player.price) / f.player.price;
                        if (sobrepuja > 0) {
                            stat.sumaSobrepujaRatio += sobrepuja;
                        }
                    }

                    const sobrepujaPromedio = stat.fichajesAnalizados > 0 ? (stat.sumaSobrepujaRatio / stat.fichajesAnalizados) : 0;
                    stat.sobrepujaMedia = sobrepujaPromedio;

                    if (sobrepujaPromedio >= 0.20) {
                        stat.perfilPsicologico = '🔥 Kamikaze (Sobrepuja Agresiva)';
                    } else if (stat.fichajesAnalizados >= 5 && sobrepujaPromedio < 0.05) {
                        stat.perfilPsicologico = '💼 Especulador / Tacaño';
                    } else {
                        stat.perfilPsicologico = '⚖️ Conservador / Calculador';
                    }
                }
            });
        }
    });

    return rivalesStats;
}

/**
 * Busca los mejores jugadores en los equipos rivales para robar mediante pago de cláusula,
 * centrándose solo en las posiciones que urgen al usuario.
 */
function buscarMejoresClausulazos(urgencias, rivales, dbJugadores, saldoDisponible, valorEquipo) {
    const robos = [];
    if (!urgencias || !rivales || !dbJugadores) return robos;

    const limiteGasto = saldoDisponible + (valorEquipo * 0.25); // 25% del valor del equipo como riesgo máximo

    rivales.forEach(rival => {
        if (!rival.team || !Array.isArray(rival.team)) return;

        // Mapear plantilla del rival para contar sustitutos por posición
        const jugRivalSustitutos = { PT: 0, DF: 0, MC: 0, DL: 0 };
        rival.team.forEach(j => {
            const idJ = typeof j === 'object' ? j.id : j;
            const dJ = dbJugadores[idJ];
            if (dJ && dJ.status === 'ok') {
                if (dJ.position === 1) jugRivalSustitutos.PT++;
                else if (dJ.position === 2) jugRivalSustitutos.DF++;
                else if (dJ.position === 3) jugRivalSustitutos.MC++;
                else if (dJ.position === 4) jugRivalSustitutos.DL++;
            }
        });

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
                    const lesionado = jDatos.status === 'injured' || jDatos.status === 'suspended';
                    // En pretemporada average es 0/undefined, evaluamos por valor o estado
                    const juegaHabitualmente = (jDatos.average && jDatos.average > 3.0) || (jDatos.average === undefined || jDatos.average === 0 ? jDatos.price > 1500000 : false);
                    const precioClausula = jDatos.clause || (jugador.clause) || Math.round((jDatos.price || 0) * 1.5);

                    if (!lesionado && juegaHabitualmente) {
                        const rentabilidad = jDatos.average > 0 ? (jDatos.average / (precioClausula / 1000000)) : (jDatos.price / (precioClausula || 1));
                        const sustitutosEnRival = jugRivalSustitutos[posString] - 1;

                        // Determinar Viabilidad Táctica y Financiera (Garantizando Saldo >= 0)
                        let viabilidadLabel = '🟡 MEDIA';
                        let viabilidadBadge = 'badge-warning';
                        let motivoViabilidad = 'Rentabilidad estándar al contado.';

                        const esPagableAlContado = precioClausula <= saldoDisponible;

                        if (!esPagableAlContado) {
                            viabilidadLabel = '🔴 ARRIESGADA';
                            viabilidadBadge = 'badge-danger';
                            motivoViabilidad = `⚠️ Saldo insuficiente al contado (${(precioClausula/1000000).toFixed(2)}M€). Requiere venta previa para no entrar en rojos.`;
                        } else if (sustitutosEnRival <= 0) {
                            viabilidadLabel = '🟢 ALTA (ROBO CRÍTICO)';
                            viabilidadBadge = 'badge-success';
                            motivoViabilidad = `🔥 Rival sin recambio en ${posString}. Golpe táctico directo y pagable al contado.`;
                        } else if ((jDatos.average >= 5.0 || jDatos.price > 5000000)) {
                            viabilidadLabel = '🟢 ALTA';
                            viabilidadBadge = 'badge-success';
                            motivoViabilidad = '⭐ Jugador Top de la línea pagable al contado.';
                        }

                        robos.push({
                            id: jDatos.id,
                            nombre: jDatos.name || `Jugador #${jDatos.id}`,
                            posicion: posString,
                            dueño: rival.nombre,
                            equipoRival: rival.nombre,
                            precioMercado: jDatos.price || 0,
                            clausula: precioClausula,
                            mediaPuntos: jDatos.average || 0,
                            rentabilidad: rentabilidad,
                            sustitutosRival: sustitutosEnRival,
                            esPagableAlContado,
                            viabilidadLabel: viabilidadLabel,
                            viabilidadBadge: viabilidadBadge,
                            motivoViabilidad: motivoViabilidad
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

/**
 * Evalúa la salud de TODA la plantilla (Biwenger & FútbolFantasy) y genera un reporte clínico completo.
 */
function generarParteMedico(plantilla, dbJugadores, datosFF = null) {
    const reportes = [];
    if (!plantilla || !dbJugadores) return reportes;

    plantilla.forEach(jugador => {
        const id = typeof jugador === 'object' ? jugador.id : jugador;
        const jDatos = dbJugadores[id];
        const nombre = (jDatos && jDatos.name) || (typeof jugador === 'object' && jugador.name) || `ID: ${id}`;
        
        let estado = 'Apto / Disponible';
        let tipo = 'ok'; // 'ok', 'doubt', 'injured', 'suspended'
        let mensaje = '🟢 Disponible al 100% para la jornada.';
        let badge = 'badge-emerald';

        // 1. Estado según API Biwenger
        if (jDatos) {
            if (jDatos.status === 'injured') {
                tipo = 'injured';
                estado = 'Lesionado';
                mensaje = '🏥 Lesión confirmada en Biwenger. Se recomienda buscar recambio.';
                badge = 'badge-danger';
            } else if (jDatos.status === 'doubt') {
                tipo = 'doubt';
                estado = 'Duda / Molestias';
                mensaje = '🤔 Marcado como duda. Evolución pendiente.';
                badge = 'badge-warning';
            } else if (jDatos.status === 'suspended') {
                tipo = 'suspended';
                estado = 'Sancionado';
                mensaje = '🟥 Sancionado por tarjetas o expulsión. Puntuaría 0.';
                badge = 'badge-danger';
            }
        }

        // 2. Cruce con datos reales de FútbolFantasy
        if (datosFF) {
            const ffNombre = Object.keys(datosFF).find(k => k.toLowerCase().includes(nombre.toLowerCase()) || nombre.toLowerCase().includes(k.toLowerCase()));
            if (ffNombre && datosFF[ffNombre]) {
                const ffData = datosFF[ffNombre];
                if (ffData.estado && ffData.estado.toLowerCase().includes('lesion')) {
                    tipo = 'injured';
                    estado = 'Lesionado (FF)';
                    mensaje = `🏥 FútbolFantasy: ${ffData.motivo || 'Lesionado'}`;
                    badge = 'badge-danger';
                } else if (ffData.estado && ffData.estado.toLowerCase().includes('duda')) {
                    if (tipo !== 'injured') {
                        tipo = 'doubt';
                        estado = 'Duda (FF)';
                        mensaje = `🤔 FútbolFantasy: ${ffData.motivo || 'Duda / Molestias'}`;
                        badge = 'badge-warning';
                    }
                } else if (ffData.probabilidad !== undefined && ffData.probabilidad < 40 && tipo === 'ok') {
                    tipo = 'doubt';
                    estado = 'Baja Titularidad FF';
                    mensaje = `⚠️ Suplente o descarte en FF (${ffData.probabilidad}% prob).`;
                    badge = 'badge-warning';
                }
            }
        }

        reportes.push({
            id,
            nombre,
            posicion: (jDatos && jDatos.position) || (jugador && jugador.position) || 0,
            estado,
            tipo,
            mensaje,
            badge
        });
    });

    return reportes;
}

module.exports = {
    detectarNecesidadesPlantilla,
    evaluarJugador,
    evaluarPlantillaInicial,
    analizarRivales,
    calcularPerfilPujador,
    buscarMejoresClausulazos,
    generarParteMedico
};
