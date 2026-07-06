const { 
    obtenerEstadoEquipo, 
    obtenerMercado,
    ponerJugadorEnVenta,
    pujarPorJugador,
    obtenerOfertas,
    aceptarOferta,
    obtenerInicioProximaJornada
} = require('./api');
const { detectarNecesidadesPlantilla, evaluarJugador } = require('./analista');

const fs = require('fs');
const path = require('path');

// Función auxiliar para dormir entre peticiones
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function ejecutarAgente() {
    const registroAcciones = [];
    const registrarAccion = (icono, texto) => {
        const accion = `${icono} ${texto}`;
        console.log(accion);
        registroAcciones.push({ hora: new Date().toLocaleTimeString(), texto: accion });
    };

    registrarAccion("🚀", `[${new Date().toLocaleString()}] Iniciando el Agente Biwenger...`);
    
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
        registrarAccion("❌", "No se ha podido conectar. Revisa el Token en el archivo .env o en los Secrets de GitHub.");
        generarHTML(registroAcciones, 0, 0);
        return;
    }
    
    // NOTA: Biwenger suele devolver la plantilla en estado.team o un campo similar.
    const jugadoresEnPlantilla = estado.team ? estado.team.length : 0;
    const maxJugadores = parseInt(process.env.MAX_JUGADORES_PLANTILLA || "25");
    
    registrarAccion("✅", `Conectado. Plantilla actual: ${jugadoresEnPlantilla}/${maxJugadores} jugadores.`);
    
    // Si la plantilla está llena, tenemos que decidir qué hacer
    if (jugadoresEnPlantilla >= maxJugadores) {
        registrarAccion("⚠️", "¡Plantilla llena! El agente no hará pujas a menos que decidas vender a alguien.");
    }
    
    // NUEVA REGLA (Biwenger Optimizer 3.0): ESPECULACIÓN DIARIA
    registrarAccion("📈", "Aplicando rutina de especulación: Poniendo a toda la plantilla a la venta...");
    if (estado.team && estado.team.length > 0) {
        for (const jugador of estado.team) {
            await ponerJugadorEnVenta(jugador.id, jugador.price);
            await sleep(1000); // Pausa para no saturar la API
        }
        registrarAccion("✅", "Toda la plantilla ha sido puesta a la venta para recibir ofertas.");
    }
    
    // GUARDARRAÍLES DE SEGURIDAD (Reglas de Supervivencia)
    registrarAccion("🛡️", "Comprobando salvaguardas y saldo...");
    let saldoActual = estado.balance || 0;
    const valorEquipo = estado.teamValue || 0;
    
    registrarAccion("💰", `Saldo Actual: ${saldoActual}€ | Valor Equipo: ${valorEquipo}€`);
    
    if (saldoActual < 0) {
        registrarAccion("⚠️", "¡SALDO NEGATIVO! Procediendo a cuadrar cuentas...");
        const ofertas = await obtenerOfertas();
        if (ofertas && ofertas.length > 0) {
            // Ordenar jugadores de nuestro equipo de peor a mejor (para vender primero a los peores)
            const jugadoresPorVender = [...estado.team].sort((a, b) => a.average - b.average);
            
            for (const jugador of jugadoresPorVender) {
                // Buscar si hay oferta de 'computer' para este jugador
                const ofertaComputer = ofertas.find(o => o.player === jugador.id && o.type === 'computer');
                
                if (ofertaComputer) {
                    registrarAccion("💸", `Vendiendo a ${jugador.name} por ${ofertaComputer.amount}€ para cuadrar cuentas.`);
                    await aceptarOferta(ofertaComputer.id);
                    saldoActual += ofertaComputer.amount;
                    await sleep(1000);
                    
                    if (saldoActual >= 0) {
                        registrarAccion("✅", "¡Saldo vuelto a positivo! Deteniendo ventas de emergencia.");
                        break;
                    }
                }
            }
            if (saldoActual < 0) {
                registrarAccion("❌", "Sigue habiendo saldo negativo tras aceptar ofertas. Hacen falta más ventas o mejores ofertas.");
            }
        } else {
            registrarAccion("❌", "No hay ofertas disponibles para cuadrar el saldo negativo.");
        }
    }
    
    // 2. Leer el mercado
    const mercado = await obtenerMercado();
    if (!mercado || !mercado.sales) {
        registrarAccion("❌", "No se ha podido leer el mercado.");
        generarHTML(registroAcciones, saldoActual, valorEquipo);
        return;
    }
    
    registrarAccion("🛒", `Se han encontrado ${mercado.sales.length} jugadores en el mercado hoy.`);
    
    // 3. Lógica de pujas
    const necesidades = detectarNecesidadesPlantilla(estado.team || []);
    registrarAccion("📊", `Necesidades actuales detectadas: PT:${necesidades.PT} DF:${necesidades.DF} MC:${necesidades.MC} DL:${necesidades.DL}`);
    
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
            
            // CONTROL DE RIESGO DE JORNADA DINÁMICO
            // Comprobamos la fecha de la próxima jornada.
            let esRiesgoJornada = false;
            const fechaJornada = await obtenerInicioProximaJornada();
            
            if (fechaJornada) {
                const msHastaJornada = fechaJornada.getTime() - new Date().getTime();
                const horasHastaJornada = msHastaJornada / (1000 * 60 * 60);
                
                if (horasHastaJornada > 0 && horasHastaJornada <= 48) {
                    esRiesgoJornada = true;
                }
            } else {
                const diaSemana = new Date().getDay();
                esRiesgoJornada = (diaSemana === 4 || diaSemana === 5); // 4=Jueves, 5=Viernes
            }
            
            let puedePujar = false;
            if (esRiesgoJornada) {
                // MODO RELAJADO (A la espera de las reglas de agosto):
                // Permitimos endeudarnos un 10% del equipo incluso si estamos cerca de la jornada,
                // confiando en que la rutina de "Cuadrar Cuentas" del día siguiente lo arreglará.
                puedePujar = (saldoActual + valorEquipo * 0.10) >= puja;
                if (puedePujar && saldoActual < puja) {
                    registrarAccion("⚠️", `Aviso de Jornada: Pujando en negativo a menos de 48h. Se confiará en vender suplentes mañana para cuadrar.`);
                }
            } else {
                // Lunes a Miércoles: Podemos especular más (20% del valor del equipo)
                puedePujar = (saldoActual + valorEquipo * 0.20) >= puja;
            }

            if (puedePujar) { 
                registrarAccion("🤑", `Realizando puja por ${jugadorObj.name} de ${puja}€`);
                await pujarPorJugador(jugadorObj.id, puja);
                // Restamos la puja del saldo actual simulado para no sobre-endeudarnos en la misma ejecución
                saldoActual -= puja; 
                await sleep(1500);
            } else {
                registrarAccion("😞", `No hay suficiente margen financiero para pujar por ${jugadorObj.name}`);
            }
        }
    }
    
    registrarAccion("🏁", `[${new Date().toLocaleString()}] Tarea del Agente finalizada.`);
    
    // Generar el reporte HTML al terminar
    generarHTML(registroAcciones, saldoActual, valorEquipo);
}

function generarHTML(registro, saldo, valor) {
    const dirDocs = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(dirDocs)) {
        fs.mkdirSync(dirDocs);
    }

    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let listaHTML = registro.map(r => `<li><span class="hora">${r.hora}</span> - ${r.texto}</li>`).join('\n');

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte Diario - Biwenger Bot</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #121212; color: #e0e0e0; margin: 0; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; background-color: #1e1e1e; border-radius: 10px; padding: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.5); }
        h1 { color: #4caf50; border-bottom: 2px solid #4caf50; padding-bottom: 10px; }
        .stats { display: flex; justify-content: space-between; background-color: #2c2c2c; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .stat-box { text-align: center; }
        .stat-value { font-size: 1.5em; font-weight: bold; color: #4fc3f7; }
        ul { list-style: none; padding: 0; }
        li { background-color: #2a2a2a; margin-bottom: 10px; padding: 15px; border-radius: 5px; border-left: 4px solid #4caf50; }
        .hora { color: #aaa; font-size: 0.8em; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Informe del Bot - ${fecha}</h1>
        <div class="stats">
            <div class="stat-box">
                <div>Saldo Estimado Fin del Día</div>
                <div class="stat-value">${saldo} €</div>
            </div>
            <div class="stat-box">
                <div>Valor del Equipo</div>
                <div class="stat-value">${valor} €</div>
            </div>
        </div>
        <h2>Registro de Acciones</h2>
        <ul>
            ${listaHTML}
        </ul>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(dirDocs, 'index.html'), htmlContent);
    console.log("📄 Reporte HTML generado en docs/index.html");
}

module.exports = {
    ejecutarAgente
};
