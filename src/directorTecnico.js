/**
 * Módulo Director Técnico (Superagente Mánager General)
 * Sintetiza las recomendaciones de todos los superagentes (Especulador, Alineador, Analista, GuardiaReglas)
 * en un PLAN DE ACCIÓN DIARIO unificado para el usuario.
 */

function generarPlanDiario({
    recomMercado = [],
    recomVenta = [],
    oportunidadesTrading = [],
    robosSugeridos = [],
    analisisOnce = null,
    plantilla = [],
    saldoActual = 0,
    diasCuentaAtras = 10,
    saludPorteria = null,
    necesidades = null
}) {
    const porteros = plantilla.filter(j => j.position === 1 || j.posicion === 1);
    const numJugadores = plantilla.length;
    const estaLleno = numJugadores >= 14;

    // 1. Sintetizar PUJAS recomendadas para hoy
    let planPujas = [];

    if (necesidades && necesidades.conteo) {
        const c = necesidades.conteo;
        const o = necesidades.objetivos;
        let resumenLineas = `📊 <strong>Estado de Líneas:</strong> PT: ${c.PT}/${o.PT} | DF: ${c.DF}/${o.DF} | MC: ${c.MC}/${o.MC} | DL: ${c.DL}/${o.DL}`;
        if (necesidades.tieneDeficitUrgente) {
            let faltan = [];
            if (necesidades.PT > 0) faltan.push(`${necesidades.PT} PT`);
            if (necesidades.DF > 0) faltan.push(`${necesidades.DF} DF`);
            if (necesidades.MC > 0) faltan.push(`${necesidades.MC} MC`);
            if (necesidades.DL > 0) faltan.push(`${necesidades.DL} DL`);
            resumenLineas += `<br>⚠️ <strong>Déficit Detectado:</strong> Necesitas reforzar: ${faltan.join(', ')}.`;
        }
        planPujas.push(resumenLineas);
    }

    if (saludPorteria && saludPorteria.urgentePujar) {
        planPujas.push(`<strong>${saludPorteria.estado}:</strong> ${saludPorteria.mensaje}`);
    }

    if (recomMercado.length > 0) {
        recomMercado.forEach(p => {
            let nota = ' (Mercado Libre / Computer)';
            if (estaLleno) nota += ' ⚠️ <em>(Plantilla 14/14: Requiere venta antes)</em>';
            const sobrepuja = p.precio > 0 ? Math.round(((p.puja - p.precio) / p.precio) * 100) : 0;
            const limite = p.puja ? Math.round(p.puja * 1.05) : Math.round(p.precio * 1.08);
            const tagNecesidad = p.esNecesidadDirecta ? '🎯 [REFUERZO PRIORITARIO] ' : '';
            planPujas.push(`
                <div style="margin-bottom: 8px;">
                    <strong>⚽ ${tagNecesidad}${p.nombre}</strong>${nota}<br>
                    <span style="font-size:0.85rem; color:#cbd5e1;">
                        💵 Valor Oficial: <strong>${formatoEuro(p.precio)}</strong><br>
                        🎯 <strong>Puja Recomendada: ${formatoEuro(p.puja)}</strong> <span style="color:#34d399;">(+${sobrepuja}% sobrepuja)</span><br>
                        ⛔ Límite Máximo Rentable: <strong>${formatoEuro(limite)}</strong>
                    </span>
                </div>
            `);
        });
    } else if (oportunidadesTrading.length > 0) {
        oportunidadesTrading.slice(0, 3).forEach(topTrading => {
            const sobrepuja = topTrading.precio > 0 ? Math.round(((topTrading.puja - topTrading.precio) / topTrading.precio) * 100) : 0;
            const limite = topTrading.limiteMaximo || Math.round(topTrading.precio * 1.05);
            let nota = ' (Trading / Mercado Libre)';
            if (estaLleno) nota += ' ⚠️ <em>(Plantilla 14/14: Vende suplente)</em>';
            planPujas.push(`
                <div style="margin-bottom: 8px;">
                    <strong>🚀 ${topTrading.nombre}</strong> (${topTrading.posicion || 'Trading'})${nota}<br>
                    <span style="font-size:0.85rem; color:#cbd5e1;">
                        💵 Valor Oficial: <strong>${formatoEuro(topTrading.precio)}</strong><br>
                        🎯 <strong>Puja Recomendada: ${formatoEuro(topTrading.puja)}</strong> <span style="color:#34d399;">(+${(topTrading.subidaDiaria/1000).toFixed(0)}k€/día)</span><br>
                        ⛔ Límite Máximo Rentable: <strong>${formatoEuro(limite)}</strong>
                    </span>
                </div>
            `);
        });
    }

    // 2. Sintetizar VENTAS obligatorias o sugeridas para hoy
    let planVentas = [];
    if (saldoActual < 0 && recomVenta.length > 0) {
        recomVenta.forEach(v => {
            const extra = v.motivo ? ` — <em>${v.motivo}</em>` : '';
            planVentas.push(`🔴 <strong>${v.nombre}</strong>: Aceptar oferta por <strong>${formatoEuro(v.oferta)}</strong> para salir del saldo negativo.${extra}`);
        });
    } else if (recomVenta.length > 0) {
        recomVenta.forEach(v => {
            const motivoStr = v.motivo ? ` — <em>${v.motivo}</em>` : ' (Vender para hacer caja / hueco)';
            const ofertaStr = v.oferta ? ` [Oferta Computer: ${formatoEuro(v.oferta)}]` : '';
            planVentas.push(`🟡 <strong>${v.nombre}</strong>${motivoStr}${ofertaStr}`);
        });
    }

    // 3. Sintetizar CLAUSULAZOS para hoy
    let planClausulas = [];
    if (robosSugeridos.length > 0) {
        robosSugeridos.forEach(r => {
            const viab = r.viabilidadLabel || '🟡 MEDIA';
            const motivo = r.motivoViabilidad ? ` — <em>${r.motivoViabilidad}</em>` : '';
            const alContadoStr = r.esPagableAlContado ? ' ✅ [Pagable al contado: Saldo Positivo]' : ' ⚠️ [Requiere venta previa]';
            planClausulas.push(`🥷 <strong>${r.nombre}</strong> (${r.posicion}) en plantilla de <strong>${r.equipoRival || r.dueño}</strong>: Cláusula <strong>${formatoEuro(r.clausula || r.precioMercado)}</strong>${alContadoStr}<br><span style="font-size:0.85rem; color:#cbd5e1;">Viabilidad: <strong>${viab}</strong>${motivo}</span>`);
        });
    }

    // 4. Sintetizar ALINEACIÓN para hoy
    let planAlineacion = [];
    if (analisisOnce && analisisOnce.onceTitular && analisisOnce.onceTitular.length > 0) {
        planAlineacion.push(`Formación: <strong>${analisisOnce.formacion}</strong> (${analisisOnce.onceTitular.length}/11 titulares)`);
        if (analisisOnce.ariete) planAlineacion.push(`🎯 Ariete (+3 gol): <strong>${analisisOnce.ariete.nombre}</strong>`);
    } else {
        planAlineacion.push(`⚠️ Revisa tu plantilla. Faltan titulares para completar un 11.`);
    }

    // 5. Consejos Estratégicos del Director Técnico según el calendario
    let consejoEstrategico = "";
    if (diasCuentaAtras > 5) {
        consejoEstrategico = "🛡️ <strong>Fase de Crecimiento Financiero:</strong> Centra tus esfuerzos en especular con jugadores al alza para aumentar el valor de tu plantilla antes de la Jornada 1.";
    } else if (diasCuentaAtras > 2) {
        consejoEstrategico = "⚖️ <strong>Fase de Consolidación de 11 Titular:</strong> Empieza a perfilar tus 11 titulares definitivos y asegura parches para no dejar casillas vacías.";
    } else {
        consejoEstrategico = "🚨 <strong>Fase de Emergencia (Previa de Jornada):</strong> Verifica que tu saldo esté POSITIVO y tengas un portero titular asignado para no perder puntos.";
    }

    return {
        pujas: planPujas,
        ventas: planVentas,
        clausulas: planClausulas,
        alineacion: planAlineacion,
        consejo: consejoEstrategico,
        sinAccionesUrgentes: planPujas.length === 0 && planVentas.length === 0 && planClausulas.length === 0
    };
}

function formatoEuro(numero) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(numero);
}

module.exports = {
    generarPlanDiario
};
