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
    diasCuentaAtras = 10
}) {
    const porteros = plantilla.filter(j => j.position === 1 || j.posicion === 1);
    const numJugadores = plantilla.length;
    const estaLleno = numJugadores >= 14;

    // 1. Sintetizar PUJAS recomendadas para hoy
    let planPujas = [];
    if (recomMercado.length > 0) {
        recomMercado.forEach(p => {
            let nota = p.clausula ? ' (Cláusula)' : ' (Mercado Libre)';
            if (estaLleno) nota += ' ⚠️ *Atención: Plantilla en 14/14. Requiere venta antes.*';
            planPujas.push(`<strong>${p.nombre}</strong>: Pujar <strong>${formatoEuro(p.puja)}</strong>${nota}`);
        });
    } else if (oportunidadesTrading.length > 0) {
        const topTrading = oportunidadesTrading[0];
        planPujas.push(`<strong>${topTrading.nombre}</strong> (Trading): Comprar a <strong>${formatoEuro(topTrading.precio)}</strong> (Subiendo +${(topTrading.subidaDiaria/1000).toFixed(0)}k€/día).`);
    }

    // 2. Sintetizar VENTAS obligatorias o sugeridas para hoy
    let planVentas = [];
    if (saldoActual < 0 && recomVenta.length > 0) {
        recomVenta.forEach(v => {
            planVentas.push(`🔴 <strong>${v.nombre}</strong>: Aceptar oferta del Computer por <strong>${formatoEuro(v.oferta)}</strong> para salir del saldo negativo.`);
        });
    } else if (recomVenta.length > 0) {
        recomVenta.forEach(v => {
            planVentas.push(`🟡 <strong>${v.nombre}</strong>: Vender si necesitas hacer caja (Oferta: ${formatoEuro(v.oferta)}).`);
        });
    }

    // 3. Sintetizar CLAUSULAZOS para hoy
    let planClausulas = [];
    if (robosSugeridos.length > 0) {
        robosSugeridos.forEach(r => {
            const viab = r.viabilidadLabel || '🟡 MEDIA';
            const motivo = r.motivoViabilidad ? ` — <em>${r.motivoViabilidad}</em>` : '';
            planClausulas.push(`🥷 <strong>${r.nombre}</strong> (${r.equipoRival || r.dueño}): Cláusula de <strong>${formatoEuro(r.clausula || r.precioMercado)}</strong> [Viabilidad: ${viab}]${motivo}`);
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
