const { pujarPorJugador, aceptarOferta, obtenerMercado } = require('./src/api');

async function ejecutarPujaTop() {
    console.log("⚡ Ejecutando Puja Top del día en la API de Biwenger...");
    const mercado = await obtenerMercado();
    if (!mercado || !mercado.sales) {
        console.log("❌ No se pudo obtener el mercado.");
        return;
    }

    // Buscar a Berrocal en el mercado libre
    const berrocal = mercado.sales.find(s => {
        const p = s.player;
        return p && (p.name === 'Berrocal' || p.slug === 'berrocal' || (typeof p === 'object' && p.name && p.name.includes('Berrocal')));
    });

    if (berrocal) {
        const idJugador = typeof berrocal.player === 'object' ? berrocal.player.id : berrocal.player;
        const precioOficial = berrocal.price || (typeof berrocal.player === 'object' ? berrocal.player.price : 150000);
        const pujaRecomendada = Math.floor(precioOficial * 1.17); // +17% sobrepuja competitiva
        
        console.log(`🎯 Encontrado Berrocal (ID: ${idJugador}, Precio: ${precioOficial}€). Enviando puja de ${pujaRecomendada}€...`);
        const res = await pujarPorJugador(idJugador, pujaRecomendada);
        if (res) {
            console.log(`✅ ¡PUJA REALIZADA CON ÉXITO EN BIWENGER!`);
        }
    } else {
        console.log("ℹ️ Berrocal no está actualmente disponible en el mercado libre del computer.");
    }
}

ejecutarPujaTop();
