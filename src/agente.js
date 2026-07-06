const { 
    obtenerEstadoEquipo, 
    obtenerMercado,
    ponerJugadorEnVenta,
    pujarPorJugador,
    obtenerOfertas,
    aceptarOferta
} = require('./api');
const { detectarNecesidadesPlantilla, evaluarJugador } = require('./analista');

// Función auxiliar para dormir entre peticiones
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    console.log("📈 Aplicando rutina de especulación: Poniendo a toda la plantilla a la venta...");
    if (estado.team && estado.team.length > 0) {
        for (const jugador of estado.team) {
            // Ponemos en venta un poco por encima del VM para no perder dinero si nos compran por cláusula (si aplica)
            // Si la regla de la liga es venta al mercado libre, el precio no importa tanto, computer hará oferta.
            // Biwenger requiere precio, pongamos su precio de mercado como base.
            await ponerJugadorEnVenta(jugador.id, jugador.price);
            await sleep(1000); // Pausa para no saturar la API
        }
        console.log("✅ Toda la plantilla ha sido puesta a la venta para recibir ofertas.");
    }
    
    // GUARDARRAÍLES DE SEGURIDAD (Reglas de Supervivencia)
    console.log("🛡️ Comprobando salvaguardas y saldo...");
    let saldoActual = estado.balance || 0;
    const valorEquipo = estado.teamValue || 0;
    
    console.log(`💰 Saldo Actual: ${saldoActual}€ | Valor Equipo: ${valorEquipo}€`);
    
    if (saldoActual < 0) {
        console.log("⚠️ ¡SALDO NEGATIVO! Procediendo a cuadrar cuentas...");
        const ofertas = await obtenerOfertas();
        if (ofertas && ofertas.length > 0) {
            // Ordenar jugadores de nuestro equipo de peor a mejor (para vender primero a los peores)
            const jugadoresPorVender = [...estado.team].sort((a, b) => a.average - b.average);
            
            for (const jugador of jugadoresPorVender) {
                // Buscar si hay oferta de 'computer' para este jugador
                const ofertaComputer = ofertas.find(o => o.player === jugador.id && o.type === 'computer');
                
                if (ofertaComputer) {
                    console.log(`💸 Vendiendo a ${jugador.name} por ${ofertaComputer.amount}€ para cuadrar cuentas.`);
                    await aceptarOferta(ofertaComputer.id);
                    saldoActual += ofertaComputer.amount;
                    await sleep(1000);
                    
                    if (saldoActual >= 0) {
                        console.log("✅ ¡Saldo vuelto a positivo! Deteniendo ventas de emergencia.");
                        break;
                    }
                }
            }
            if (saldoActual < 0) {
                console.log("❌ Sigue habiendo saldo negativo tras aceptar ofertas. Hacen falta más ventas o mejores ofertas.");
            }
        } else {
            console.log("❌ No hay ofertas disponibles para cuadrar el saldo negativo.");
        }
    }
    
    // 2. Leer el mercado
    const mercado = await obtenerMercado();
    if (!mercado || !mercado.sales) {
        console.log("❌ No se ha podido leer el mercado.");
        return;
    }
    
    console.log(`🛒 Se han encontrado ${mercado.sales.length} jugadores en el mercado hoy.`);
    
    // 3. Lógica de pujas
    const necesidades = detectarNecesidadesPlantilla(estado.team || []);
    console.log("📊 Necesidades actuales detectadas:", necesidades);
    
    for (const venta of mercado.sales) {
        // En Biwenger, el mercado tiene ventas directas (usuario 'computer' o sin user) o de otros usuarios
        const esClausula = (venta.user !== null && venta.user !== undefined); // Simplificación
        const jugador = venta.player; // A veces viene el objeto anidado o solo la info en 'venta'
        
        // Adaptación dependiendo de cómo llega el objeto (Biwenger suele meter datos del jugador dentro de 'player' o mezclados)
        const jugadorObj = venta.player ? venta.player : venta; 
        
        if (evaluarJugador(jugadorObj, esClausula, necesidades, saldoActual, valorEquipo)) {
            // Decidir la cantidad a pujar
            // Estrategia: Puja dinámica muy agresiva porque en la liga se puja fuerte
            let puja = jugadorObj.price;
            if (!esClausula) {
                // Base agresiva: 15% por encima del valor
                let sobrepujaPorcentaje = 0.15; 
                
                // Si el jugador está subiendo fuerte (>50k diarios), pujamos un 25% extra
                if (jugadorObj.priceIncrement && jugadorObj.priceIncrement > 50000) {
                    sobrepujaPorcentaje += 0.25; 
                }
                
                // Si es un jugador Top (media de puntos > 6), sumamos otro 20%
                if (jugadorObj.average && jugadorObj.average > 6) {
                    sobrepujaPorcentaje += 0.20;
                }
                
                // Limite máximo de sobrepuja del 60% para no entrar en bancarrota
                if (sobrepujaPorcentaje > 0.60) sobrepujaPorcentaje = 0.60;
                
                puja = Math.floor(jugadorObj.price * (1 + sobrepujaPorcentaje));
                console.log(`📈 Estrategia agresiva: Calculada sobrepuja del ${(sobrepujaPorcentaje * 100).toFixed(0)}% para ${jugadorObj.name} (Puja: ${puja}€)`);
            } else {
                puja = jugadorObj.clause; // Clausula es fija
            }
            
            // Comprobamos que nos llega el dinero
            if (saldoActual >= puja || (saldoActual + valorEquipo * 0.25) >= puja) { 
                console.log(`🤑 Realizando puja por ${jugadorObj.name} de ${puja}€`);
                await pujarPorJugador(jugadorObj.id, puja);
                // Restamos saldo (aproximado) para no pujar por encima de nuestras posibilidades reales en el mismo bucle
                saldoActual -= puja; 
                await sleep(1500);
            } else {
                console.log(`😞 No hay suficiente margen financiero para pujar por ${jugadorObj.name}`);
            }
        }
    }
    
    console.log(`[${new Date().toLocaleString()}] Tarea del Agente finalizada.\n`);
}

module.exports = {
    ejecutarAgente
};
