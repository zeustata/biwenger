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

    // 1. Sintetizar PUJAS recomendadas para hoy (Máximo 2 Objetivos Clave para no aturdir al mánager)
    if (recomMercado.length > 0) {
        // Ordenamos las pujas: primero las que cubran necesidades directas de línea
        const pujasTop = [...recomMercado].sort((a, b) => (b.esNecesidadDirecta ? 1 : 0) - (a.esNecesidadDirecta ? 1 : 0)).slice(0, 2);
        pujasTop.forEach(p => {
            let nota = ' (Mercado Libre / Computer)';
            if (estaLleno) nota += ' ⚠️ <em>(Plantilla 14/14: Requiere venta antes)</em>';
            const sobrepuja = p.precio > 0 ? Math.round(((p.puja - p.precio) / p.precio) * 100) : 0;
            const limite = p.puja ? Math.round(p.puja * 1.05) : Math.round(p.precio * 1.08);
            const tagNecesidad = p.esNecesidadDirecta ? '🥇 [OBJETIVO #1 LÍNEA] ' : '🚀 [TRADING TOP] ';
            planPujas.push(`
                <div style="margin-bottom: 12px; background: rgba(59, 130, 246, 0.08); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <strong>⚽ ${tagNecesidad}${p.nombre}</strong>${nota}<br>
                    <span style="font-size:0.85rem; color:#cbd5e1;">
                        💵 Valor Oficial: <strong>${formatoEuro(p.precio)}</strong><br>
                        🎯 <strong>Puja Sugerida: ${formatoEuro(p.puja)}</strong> <span style="color:#34d399;">(+${sobrepuja}% sobrepuja)</span><br>
                        ⛔ Límite Máximo: <strong>${formatoEuro(limite)}</strong>
                    </span>
                    ${p.alerta ? `<div style="font-size:0.8rem; color:#60a5fa; margin-top:4px;">${p.alerta}</div>` : ''}
                </div>
            `);
        });
    } else if (oportunidadesTrading.length > 0) {
        oportunidadesTrading.slice(0, 1).forEach(topTrading => {
            const sobrepuja = topTrading.precio > 0 ? Math.round(((topTrading.puja - topTrading.precio) / topTrading.precio) * 100) : 0;
            const limite = topTrading.limiteMaximo || Math.round(topTrading.precio * 1.05);
            let nota = ' (Trading / Mercado Libre)';
            if (estaLleno) nota += ' ⚠️ <em>(Plantilla 14/14: Vende suplente)</em>';
            planPujas.push(`
                <div style="margin-bottom: 12px; background: rgba(59, 130, 246, 0.08); padding: 8px 12px; border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <strong>🚀 🥇 [OBJETIVO #1 TRADING] ${topTrading.nombre}</strong> (${topTrading.posicion || 'Trading'})${nota}<br>
                    <span style="font-size:0.85rem; color:#cbd5e1;">
                        💵 Valor Oficial: <strong>${formatoEuro(topTrading.precio)}</strong><br>
                        🎯 <strong>Puja Sugerida: ${formatoEuro(topTrading.puja)}</strong> <span style="color:#34d399;">(+${(topTrading.subidaDiaria/1000).toFixed(0)}k€/día)</span><br>
                        ⛔ Límite Máximo: <strong>${formatoEuro(limite)}</strong>
                    </span>
                </div>
            `);
        });
    } else {
        planPujas.push('<div class="action-empty">No pujar por nadie hoy. Guardar saldo.</div>');
    }

    // 2. Sintetizar VENTAS recomendadas (Máximo 2 Ventas Clave)
    let planVentas = [];
    if (saldoActual < 0 && recomVenta.length > 0) {
        recomVenta.slice(0, 2).forEach(v => {
            const extra = v.motivo ? ` — <em>${v.motivo}</em>` : '';
            planVentas.push(`🔴 <strong>${v.nombre}</strong>: Aceptar oferta por <strong>${formatoEuro(v.oferta)}</strong> para salir de saldo negativo.${extra}`);
        });
    } else if (recomVenta.length > 0) {
        recomVenta.slice(0, 2).forEach(v => {
            const motivoStr = v.motivo ? ` — <em>${v.motivo}</em>` : ' (Vender para hacer caja / hueco)';
            const ofertaStr = v.oferta ? ` [Oferta Computer: ${formatoEuro(v.oferta)}]` : '';
            planVentas.push(`🟡 <strong>${v.nombre}</strong>${motivoStr}${ofertaStr}`);
        });
    } else {
        planVentas.push('<div class="action-empty">No vender a nadie hoy. Cuentas saneadas ✅</div>');
    }

    // 3. Sintetizar CLAUSULAZOS (Máximo 1 Robo Táctico Clave)
    let planClausulas = [];
    if (robosSugeridos.length > 0) {
        const roboTop = robosSugeridos.find(r => r.esPagableAlContado) || robosSugeridos[0];
        if (roboTop) {
            const viab = roboTop.viabilidadLabel || '🟡 MEDIA';
            const motivo = roboTop.motivoViabilidad ? ` — <em>${roboTop.motivoViabilidad}</em>` : '';
            const alContadoStr = roboTop.esPagableAlContado ? ' ✅ [Pagable al contado]' : ' ⚠️ [Requiere venta previa]';
            planClausulas.push(`🥷 <strong>🥇 [ROBO TOP DEL DÍA] ${roboTop.nombre}</strong> (${roboTop.posicion}) de <strong>${roboTop.equipoRival || roboTop.dueño}</strong><br><span style="font-size:0.85rem; color:#cbd5e1;">Cláusula: <strong>${formatoEuro(roboTop.clausula || roboTop.precioMercado)}</strong>${alContadoStr}<br>Viabilidad: <strong>${viab}</strong>${motivo}</span>`);
        }
    } else {
        planClausulas.push('<div class="action-empty">No pagar ninguna cláusula hoy.</div>');
    }

    // 4. Sintetizar ALINEACIÓN para hoy
    let planAlineacion = [];
    if (analisisOnce && analisisOnce.onceTitular && analisisOnce.onceTitular.length > 0) {
        planAlineacion.push(`Formación: <strong>${analisisOnce.formacion}</strong> (${analisisOnce.onceTitular.length}/11 titulares)`);
        if (analisisOnce.ariete) planAlineacion.push(`🎯 Ariete (+3 gol): <strong>${analisisOnce.ariete.nombre}</strong>`);
    } else {
        planAlineacion.push(`⚠️ Revisa tu plantilla. Faltan titulares para completar un 11.`);
    }

    // Auditoría de Presupuesto Acumulado:
    // Calculamos el gasto total si el usuario realizase TODAS las sugerencias del día
    let gastoPujasSugeridas = 0;
    if (recomMercado.length > 0) {
        const pujasTop = [...recomMercado].sort((a, b) => (b.esNecesidadDirecta ? 1 : 0) - (a.esNecesidadDirecta ? 1 : 0)).slice(0, 2);
        pujasTop.forEach(p => gastoPujasSugeridas += (p.puja || p.precio || 0));
    } else if (oportunidadesTrading.length > 0) {
        gastoPujasSugeridas += (oportunidadesTrading[0].puja || oportunidadesTrading[0].precio || 0);
    }

    let gastoClausulasSugeridas = 0;
    if (robosSugeridos.length > 0) {
        const roboTop = robosSugeridos.find(r => r.esPagableAlContado) || robosSugeridos[0];
        if (roboTop && roboTop.esPagableAlContado) gastoClausulasSugeridas += (roboTop.clausula || roboTop.precioMercado || 0);
    }

    let ingresosVentasSugeridas = 0;
    if (recomVenta.length > 0) {
        recomVenta.slice(0, 2).forEach(v => ingresosVentasSugeridas += (v.oferta || 0));
    }

    const gastoTotalConjunto = gastoPujasSugeridas + gastoClausulasSugeridas;
    const saldoRestanteConjunto = saldoActual - gastoTotalConjunto + ingresosVentasSugeridas;
    const esConflictoPresupuesto = (gastoTotalConjunto > (saldoActual + ingresosVentasSugeridas)) && (saldoActual > 0);

    let informePresupuestario = "";
    if (esConflictoPresupuesto) {
        informePresupuestario = `🚨 <strong>AUDITORÍA FINANCIERA (OPCIONES EXCLUYENTES):</strong> Realizar la puja y el clausulazo a la vez (${formatoEuro(gastoTotalConjunto)}) supera tu saldo actual de ${formatoEuro(saldoActual)}. <strong>Elige SOLO 1 opción hoy (se recomienda la Puja #1)</strong> para no quedar en números rojos.`;
    } else if (gastoTotalConjunto > 0) {
        informePresupuestario = `💰 <strong>AUDITORÍA FINANCIERA CONJUNTA:</strong> Si ejecutas la puja y el clausulazo sugeridos (Gasto total: ${formatoEuro(gastoTotalConjunto)}), tu saldo líquido resultante será de <strong>${formatoEuro(saldoRestanteConjunto)}</strong> (Garantía de Saldo Positivo ✅).`;
    }

    // 5. Consejos Estratégicos del Director Técnico (Filosofía Gradual a Largo Plazo: 38 Jornadas)
    let consejoEstrategico = "";
    if (diasCuentaAtras > 5) {
        consejoEstrategico = "🌱 <strong>Filosofía de Construcción Gradual (Paciencia Táctica):</strong> En Biwenger el equipo se hace paso a paso a lo largo de las 38 jornadas. No hay ninguna prisa por fichar rápido en pretemporada. Guarda tu saldo líquido para los auténticos cracks y chollos de largo recorrido.";
    } else if (diasCuentaAtras > 2) {
        consejoEstrategico = "⚖️ <strong>Fase de Ajuste y Consolidación:</strong> Refuerza solo las posiciones desguarnecidas. Mantén la calma financiera y no quemes presupuesto en parches secundarios.";
    } else {
        consejoEstrategico = "🚨 <strong>Fase de Previa de Jornada:</strong> Revisa tu saldo (DEBE SER POSITIVO) y asegura tener un portero y 11 titulares alineados para evitar penalizaciones.";
    }

    if (informePresupuestario) {
        consejoEstrategico = `${informePresupuestario}<br><br>${consejoEstrategico}`;
    }

    return {
        pujas: planPujas,
        ventas: planVentas,
        clausulas: planClausulas,
        alineacion: planAlineacion,
        consejo: consejoEstrategico,
        informePresupuestario,
        sinAccionesUrgentes: planPujas.length === 0 && planVentas.length === 0 && planClausulas.length === 0
    };
}

function formatoEuro(numero) {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(numero);
}

module.exports = {
    generarPlanDiario
};
