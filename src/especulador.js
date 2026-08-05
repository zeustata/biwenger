/**
 * Módulo Especulador / Trading de Alta Frecuencia para Biwenger
 * Analiza activos en subida libre para obtener liquidez rápida.
 */

function detectarOportunidadesTrading(sales, dbJugadores = {}, jugadoresEnPlantilla = 0, maxJugadores = 14) {
    const oportunidades = [];
    if (!sales || !Array.isArray(sales)) return oportunidades;

    const tieneHueco = jugadoresEnPlantilla < maxJugadores;

    sales.forEach(sale => {
        // REGLA LOCAL: Prohibido pujar a rivales. Solo se permite pujar al Mercado Libre (Computer).
        if (sale.user !== null && sale.user !== undefined) return;

        const idJugador = typeof sale.player === 'object' ? sale.player.id : sale.player;
        const jDatos = dbJugadores[idJugador] || (sale.player && typeof sale.player === 'object' ? sale.player : null);

        if (!jDatos) return;

        const precioActual = jDatos.price || sale.price || 0;
        const incrementoPrecio = jDatos.priceIncrement || jDatos.fitness || 0; 

        // Evaluamos si el jugador está subiendo más de 40.000€ diarios o tiene una tendencia alcista clara
        const esChollo = incrementoPrecio >= 40000 || (precioActual > 0 && (incrementoPrecio / precioActual) >= 0.02);

        if (esChollo) {
            const gananciaEstimada3Dias = Math.round((incrementoPrecio > 0 ? incrementoPrecio : 50000) * 3);
            const pujaSugerida = precioActual + Math.min(Math.round((incrementoPrecio > 0 ? incrementoPrecio : 50000) * 0.4), 50000);
            const limiteMaximo = precioActual + Math.min(Math.round((incrementoPrecio > 0 ? incrementoPrecio : 50000) * 1.2), 120000);
            
            let avisoHueco = tieneHueco 
                ? `🚀 Subiendo +${(incrementoPrecio / 1000).toFixed(0)}k€/día. Comprar hoy al Computer para vender en 3 días con ~+${(gananciaEstimada3Dias / 1000).toFixed(0)}k€ de beneficio.` 
                : `⚠️ Subiendo +${(incrementoPrecio / 1000).toFixed(0)}k€/día. (Ojo: Plantilla llena ${jugadoresEnPlantilla}/${maxJugadores}. Debes vender a un suplente primero).`;

            oportunidades.push({
                id: idJugador,
                nombre: jDatos.name || `Jugador #${idJugador}`,
                precio: precioActual,
                puja: pujaSugerida,
                limiteMaximo: limiteMaximo,
                subidaDiaria: incrementoPrecio,
                gananciaEstimada3Dias,
                vendedor: 'Computer',
                recomendacion: avisoHueco
            });
        }
    });

    // Ordenar de mayor a menor subida diaria
    return oportunidades.sort((a, b) => b.subidaDiaria - a.subidaDiaria).slice(0, 5);
}

const { obtenerTitularidadJugador } = require('./ojeadorFantasy');

function evaluarActivosToxicos(plantilla, dbJugadores = {}, datosFF = null) {
    const toxicos = [];
    if (!plantilla || !Array.isArray(plantilla)) return toxicos;

    plantilla.forEach(jugador => {
        const id = typeof jugador === 'object' ? jugador.id : jugador;
        const jDatos = dbJugadores[id] || (typeof jugador === 'object' ? jugador : null);
        if (!jDatos) return;

        const infoFF = obtenerTitularidadJugador(jDatos.name || jugador.name, datosFF, jDatos);

        const caidaFinanciera = jDatos.priceIncrement && jDatos.priceIncrement <= -30000;
        const bajaSinMinutosFF = infoFF && infoFF.titularidad < 40;

        if (caidaFinanciera || bajaSinMinutosFF) {
            let mensaje = "";
            if (bajaSinMinutosFF && caidaFinanciera) {
                mensaje = `🔴 ${infoFF.label} y perdiendo ${(jDatos.priceIncrement / 1000).toFixed(0)}k€/día. Descarte urgente.`;
            } else if (bajaSinMinutosFF) {
                mensaje = `⚠️ ${infoFF.label} en FútbolFantasy (${infoFF.titularidad}% probabilidad). Recomendado vender para liberar hueco.`;
            } else {
                mensaje = `📉 Perdiendo ${(jDatos.priceIncrement / 1000).toFixed(0)}k€ al día. Recomienda vender para frenar pérdidas.`;
            }

            toxicos.push({
                id,
                nombre: jDatos.name || jugador.name,
                precio: jDatos.price || jugador.price || 0,
                caidaDiaria: jDatos.priceIncrement || 0,
                titularidadFF: infoFF ? infoFF.titularidad : 60,
                labelFF: infoFF ? infoFF.label : '',
                mensaje
            });
        }
    });

    return toxicos;
}

/**
 * Calcula el índice de inflación global del mercado.
 */
function calcularIndiceInflacion(dbJugadores = {}) {
    const lista = Object.values(dbJugadores);
    if (lista.length === 0) return { estado: '📈 Estable', cambioMedio: 0, consejo: 'Mercado en estado neutro.' };

    let sumaIncrementos = 0;
    let contador = 0;

    lista.forEach(j => {
        if (j.priceIncrement !== undefined) {
            sumaIncrementos += j.priceIncrement;
            contador++;
        }
    });

    const promedio = contador > 0 ? Math.round(sumaIncrementos / contador) : 0;

    if (promedio >= 20000) {
        return {
            estado: '🔥 Hiper-Alcista',
            cambioMedio: promedio,
            consejo: 'Pretemporada desatada. El dinero invertido sube solo de valor. Mantén tu capital en jugadores.'
        };
    } else if (promedio >= 5000) {
        return {
            estado: '📈 Alcista Moderado',
            cambioMedio: promedio,
            consejo: 'Subida sostenida del mercado. Ficha chollos en revalorización.'
        };
    } else {
        return {
            estado: '📉 Estabilización / Bajista',
            cambioMedio: promedio,
            consejo: 'El mercado se frena. Guarda saldo para cuando salgan los cracks.'
        };
    }
}

/**
 * Busca jugadores en el mercado por debajo de 2M€ que sean parches de garantías.
 */
function buscarChollosBaratos(sales, dbJugadores = {}) {
    const chollos = [];
    if (!sales || !Array.isArray(sales)) return chollos;

    sales.forEach(sale => {
        // REGLA LOCAL: Prohibido pujar a rivales. Solo Mercado Libre (Computer).
        if (sale.user !== null && sale.user !== undefined) return;

        const id = typeof sale.player === 'object' ? sale.player.id : sale.player;
        const jDatos = dbJugadores[id] || (sale.player && typeof sale.player === 'object' ? sale.player : null);

        if (jDatos && jDatos.price <= 2000000 && jDatos.status !== 'injured' && jDatos.status !== 'suspended') {
            const subida = jDatos.priceIncrement || 0;
            if (subida >= 10000 || (jDatos.points && jDatos.points > 20)) {
                chollos.push({
                    id,
                    nombre: jDatos.name,
                    precio: jDatos.price,
                    posicion: jDatos.position || 2,
                    subida,
                    vendedor: 'Computer',
                    recomendacion: `💎 Chollo por ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(jDatos.price)}. Ideal para completar plantilla de 14.`
                });
            }
        }
    });

    return chollos.sort((a, b) => b.subida - a.subida).slice(0, 4);
}

module.exports = {
    detectarOportunidadesTrading,
    evaluarActivosToxicos,
    calcularIndiceInflacion,
    buscarChollosBaratos
};
