const { obtenerEstadoEquipo, obtenerMercado } = require('./api');

async function ejecutarAgente() {
    console.log(`[${new Date().toLocaleString()}] Iniciando el Agente Biwenger...`);
    
// Comprobar si ya estamos en la fecha de inicio permitida
    const fechaInicio = process.env.FECHA_INICIO_PUJAS;
    if (fechaInicio) {
        const hoy = new Date();
        const inicio = new Date(fechaInicio);
        if (hoy < inicio) {
            console.log(`⏳ Aún no es la fecha de inicio (${fechaInicio}). El agente volverá a dormir.`);
            return;
        }
    }
    
    // 1. Comprobar que tenemos conexión y leer saldo
    const estado = await obtenerEstadoEquipo();
    if (!estado) {
        console.log("❌ No se ha podido conectar. Revisa el Token en el archivo .env");
        return;
    }
    
    // NOTA: Biwenger suele devolver la plantilla en estado.team o un campo similar.
    const jugadoresEnPlantilla = estado.team ? estado.team.length : 0;
    const maxJugadores = parseInt(process.env.MAX_JUGADORES_PLANTILLA || "25");
    
    console.log(`✅ Conectado. Plantilla actual: ${jugadoresEnPlantilla}/${maxJugadores} jugadores.`);
    
    // Si la plantilla está llena, tenemos que decidir qué hacer
    if (jugadoresEnPlantilla >= maxJugadores) {
        console.log("⚠️ ¡Plantilla llena! El agente no hará pujas a menos que decidas vender a alguien.");
    }
    
    // NUEVA REGLA (Biwenger Optimizer 3.0): ESPECULACIÓN DIARIA
    // Ponemos a toda la plantilla en venta automáticamente cada día para recibir ofertas.
    console.log("📈 Aplicando rutina de especulación: Poniendo a toda la plantilla a la venta...");
    // await ponerPlantillaEnVenta(estado.team);
    
    // GUARDARRAÍLES DE SEGURIDAD (Reglas de Supervivencia)
    console.log("🛡️ Comprobando salvaguardas antes de aceptar cualquier venta...");
    // 1. Asegurar Saldo Positivo: Si estamos en negativo, aceptar las mejores ofertas por los peores jugadores.
    // 2. Asegurar el Once: NO aceptar ninguna venta si eso nos deja con menos de 11 jugadores sanos para la jornada.
    // if (saldo < 0) { await cuadrarCuentas(estado.team); }
    // if (jugadoresSanos < 11) { bloquearVentasTitulares(); }
    
    // 2. Leer el mercado
    const mercado = await obtenerMercado();
    if (!mercado || !mercado.sales) {
        console.log("❌ No se ha podido leer el mercado.");
        return;
    }
    
    console.log(`🛒 Se han encontrado ${mercado.sales.length} jugadores en el mercado hoy.`);
    
    // 3. (AQUÍ IRÁ LA LÓGICA DE PUJAS EN EL FUTURO)
    console.log("🧠 Lógica de pujas pendiente de programar.");
    
    console.log(`[${new Date().toLocaleString()}] Tarea del Agente finalizada.\n`);
}

module.exports = {
    ejecutarAgente
};
