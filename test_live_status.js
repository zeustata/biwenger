const { obtenerEstadoEquipo, obtenerMercado, obtenerOfertas } = require('./src/api');

async function comprobarEstadoReal() {
    console.log("🔍 Comprobando estado real de pujas y cuenta en Biwenger...");
    
    const estado = await obtenerEstadoEquipo();
    if (estado) {
        console.log(`💰 Saldo Actual: ${estado.balance} €`);
        console.log(`👥 Plantilla: ${estado.players ? estado.players.length : 0} jugadores`);
    }

    const mercado = await obtenerMercado();
    if (mercado && mercado.bids) {
        console.log(`🛒 Pujas Activas en Mercado: ${mercado.bids.length}`);
        mercado.bids.forEach(b => {
            console.log(`   - Puja por jugador #${b.player}: ${b.amount} € (Estado: ${b.status || 'activa'})`);
        });
    } else {
        console.log("🛒 No hay pujas activas registradas en el mercado actualmente.");
    }

    const ofertas = await obtenerOfertas();
    console.log(`💵 Ofertas Activas/Recibidas: ${ofertas ? ofertas.length : 0}`);
}

comprobarEstadoReal();
