const { 
    obtenerEstadoEquipo, 
    obtenerMercado,
    obtenerOfertas,
    obtenerInicioProximaJornada,
    obtenerPlantillasRivales,
    obtenerUltimosMovimientos,
    obtenerBaseDatosJugadores
} = require('./api');
const { detectarNecesidadesPlantilla, evaluarJugador, evaluarPlantillaInicial, analizarRivales, calcularPerfilPujador, buscarMejoresClausulazos, generarParteMedico } = require('./analista');
const { detectarOportunidadesTrading, evaluarActivosToxicos, calcularIndiceInflacion, buscarChollosBaratos } = require('./especulador');
const { seleccionarOnceOptimo } = require('./alineador');
const { verificarUnicoPortero } = require('./guardiaReglas');
const { generarPlanDiario } = require('./directorTecnico');
const { obtenerDatosFutbolFantasy, evaluarSaludPorteria, obtenerTitularidadJugador } = require('./ojeadorFantasy');

const fs = require('fs');
const path = require('path');

async function ejecutarAgente() {
    const registroAcciones = [];
    const registrarAccion = (icono, texto) => {
        const accion = `${icono} ${texto}`;
        console.log(accion);
        registroAcciones.push({ hora: new Date().toLocaleTimeString(), texto: accion });
    };

    const recomendacionesMercado = [];
    const recomendacionesVenta = [];

    registrarAccion("🚀", `[${new Date().toLocaleString()}] Iniciando el Biwenger Advisor Dashboard...`);
    
    // Comprobar fecha de inicio
    const fechaInicio = process.env.FECHA_INICIO_PUJAS;
    let modoPretemporada = false;
    if (fechaInicio) {
        const hoy = new Date();
        const inicio = new Date(fechaInicio);
        if (hoy < inicio) {
            modoPretemporada = true;
            registrarAccion("⏳", `Modo Pretemporada activo. Inicio de mercado/liga: ${fechaInicio}. Analizando plantilla inicial...`);
        }
    }
    
    // 1. Estado del equipo
    const estado = await obtenerEstadoEquipo();
    if (!estado) {
        registrarAccion("❌", "No se ha podido conectar. Revisa el Token en el archivo .env o en los Secrets.");
        generarHTML(registroAcciones, 0, 0, recomendacionesMercado, recomendacionesVenta, null, [], 0, 999, []);
        return;
    }
    
    const jugadoresEnPlantilla = estado.players ? estado.players.length : 0;
    const maxJugadores = parseInt(process.env.MAX_JUGADORES_PLANTILLA || "25");
    
    registrarAccion("✅", `Conectado. Plantilla actual: ${jugadoresEnPlantilla}/${maxJugadores} jugadores.`);
    
    const saldoActual = estado.balance || 0;
    let valorEquipo = estado.teamValue || 0;
    
    // Si la API no devuelve teamValue, lo sumamos manualmente
    if (valorEquipo === 0 && estado.players) {
        valorEquipo = estado.players.reduce((sum, p) => sum + (p.price || 0), 0);
    }
    
    registrarAccion("💰", `Saldo Actual: ${saldoActual}€ | Valor Equipo: ${valorEquipo}€`);
    
    let analisisPretemporada = null;
    if (modoPretemporada) {
        analisisPretemporada = evaluarPlantillaInicial(estado.players || []);
        registrarAccion("✅", `Análisis de pretemporada completado. Se han detectado ${analisisPretemporada.vender.length} descartes claros.`);
    }

    
    // Calcular tiempo hasta la próxima jornada (Para Riesgos)
    let esRiesgoJornada = false;
    let horasHastaJornada = 999;
    const fechaJornada = await obtenerInicioProximaJornada();
    
    if (fechaJornada) {
        const msHastaJornada = fechaJornada.getTime() - new Date().getTime();
        horasHastaJornada = msHastaJornada / (1000 * 60 * 60);
        if (horasHastaJornada > 0 && horasHastaJornada <= 48) {
            esRiesgoJornada = true;
        }
    } else {
        const diaSemana = new Date().getDay();
        esRiesgoJornada = (diaSemana === 4 || diaSemana === 5 || diaSemana === 1 || diaSemana === 2); // Jueves, Viernes, Lunes, Martes pueden ser previas
        if (esRiesgoJornada) horasHastaJornada = 24;
    }

    if (esRiesgoJornada) {
        registrarAccion("⏳", `¡Atención! Faltan aprox ${Math.round(horasHastaJornada)} horas para que empiece la jornada.`);
    }

    // CUADRAR CUENTAS (Asesoramiento)
    if (saldoActual < 0) {
        const urgencia = esRiesgoJornada ? "¡CRÍTICO! PUNTUARÁS CERO SI NO VENDES YA." : "Analizando opciones de venta para cuadrar cuentas...";
        registrarAccion("⚠️", `¡SALDO NEGATIVO! ${urgencia}`);
        const ofertas = await obtenerOfertas();
        if (ofertas && ofertas.length > 0) {
            const jugadoresPorVender = [...estado.team].sort((a, b) => a.average - b.average);
            let saldoSimulado = saldoActual;

            for (const jugador of jugadoresPorVender) {
                const ofertaComputer = ofertas.find(o => o.player === jugador.id && o.type === 'computer');
                if (ofertaComputer) {
                    recomendacionesVenta.push({
                        nombre: jugador.name,
                        oferta: ofertaComputer.amount
                    });
                    saldoSimulado += ofertaComputer.amount;
                    registrarAccion("💡", `Recomendación: Vender a ${jugador.name} por ${ofertaComputer.amount}€ al computer.`);
                    
                    if (saldoSimulado >= 0) {
                        registrarAccion("✅", "Con estas ventas simuladas cuadrarías el saldo.");
                        break;
                    }
                }
            }
            if (saldoSimulado < 0) {
                registrarAccion("❌", "Las ofertas actuales no son suficientes para salir del negativo.");
            }
        } else {
            registrarAccion("❌", "No hay ofertas del computer disponibles para cuadrar el saldo negativo.");
        }
    }
    
    // 2. Leer el mercado
    const mercado = await obtenerMercado();
    if (!mercado || !mercado.sales) {
        registrarAccion("❌", "No se ha podido leer el mercado.");
        generarHTML(registroAcciones, saldoActual, valorEquipo, recomendacionesMercado, recomendacionesVenta, null, [], jugadoresEnPlantilla, 999, []);
        return;
    }
    
    const ventasComputer = mercado.sales.filter(v => v.user === null || v.user === undefined).length;
    const ventasRivales = mercado.sales.filter(v => v.user !== null && v.user !== undefined).length;
    registrarAccion("🛒", `Analizando el mercado: ${ventasComputer} libres del computer y ${ventasRivales} a la venta por rivales.`);
    
    // 3. Lógica de pujas (Asesoramiento)
    const necesidades = detectarNecesidadesPlantilla(estado.team || []);
    registrarAccion("📊", `Necesidades detectadas: PT:${necesidades.PT} DF:${necesidades.DF} MC:${necesidades.MC} DL:${necesidades.DL}`);
    
    // MODO DETECTIVE: Analizar rivales y pujas
    const dbJugadores = await obtenerBaseDatosJugadores();

    const datosLiga = await obtenerPlantillasRivales();
    let expedienteRivales = [];
    if (datosLiga && datosLiga.standings) {
        expedienteRivales = analizarRivales(datosLiga.standings, dbJugadores, process.env.BIWENGER_USER_ID);
        registrarAccion("🕵️", `Expediente de Liga: Investigados ${expedienteRivales.length} mánagers rivales.`);
    }

    const datosFF = await obtenerDatosFutbolFantasy();
    const saludPorteria = evaluarSaludPorteria(estado.players || [], dbJugadores, datosFF);
    if (saludPorteria && saludPorteria.urgentePujar) {
        registrarAccion("🧤", `${saludPorteria.estado}: ${saludPorteria.mensaje}`);
    } else if (saludPorteria) {
        registrarAccion("🧤", `Ojeador FF: ${saludPorteria.mensaje}`);
    }

    const alertasMedicas = dbJugadores ? generarParteMedico(estado.players || [], dbJugadores) : [];
    if (alertasMedicas.length > 0) {
        registrarAccion("🏥", `Parte Médico: ¡Atención! Tienes ${alertasMedicas.length} alertas en tu equipo.`);
    }

    // Superagente Especulador (Trading & Inflación)
    const MAX_JUGADORES = process.env.MAX_JUGADORES_PLANTILLA ? parseInt(process.env.MAX_JUGADORES_PLANTILLA) : 14;
    const oportunidadesTrading = mercado && mercado.sales ? detectarOportunidadesTrading(mercado.sales, dbJugadores, jugadoresEnPlantilla, MAX_JUGADORES) : [];
    const activosToxicos = evaluarActivosToxicos(estado.players || [], dbJugadores);
    const inflacionMercado = dbJugadores ? calcularIndiceInflacion(dbJugadores) : { estado: '📈 Estable', cambioMedio: 0, consejo: '' };
    const chollosBaratos = mercado && mercado.sales ? buscarChollosBaratos(mercado.sales, dbJugadores) : [];

    if (oportunidadesTrading.length > 0) {
        registrarAccion("🚀", `Superagente Especulador: Detectadas ${oportunidadesTrading.length} oportunidades de trading rápido.`);
    }

    // Superagente Táctico (Alineación Óptima, Capitán y Ariete)
    const analisisOnce = seleccionarOnceOptimo(estado.players || [], dbJugadores);
    if (analisisOnce && analisisOnce.capitan) {
        registrarAccion("🌟", `Superagente Táctico: 11 Óptimo (${analisisOnce.formacion}) seleccionado. Capitán sugerido: ${analisisOnce.capitan.nombre}.`);
    }

    let robosSugeridos = [];
    
    // Si tenemos necesidades y hemos cargado la DB
    if (dbJugadores && (necesidades.PT > 0 || necesidades.DF > 0 || necesidades.MC > 0 || necesidades.DL > 0)) {
        robosSugeridos = buscarMejoresClausulazos(necesidades, expedienteRivales, dbJugadores, saldoActual, valorEquipo);
        if (robosSugeridos.length > 0) {
            registrarAccion("🥷", `Modo Robos activado: Se han encontrado ${robosSugeridos.length} opciones interesantes en plantillas rivales.`);
        }
    }

    const dirDocs = path.join(__dirname, '..', 'docs');
    const statsPath = path.join(dirDocs, 'stats.json');
    let statsPujas = {};
    if (fs.existsSync(statsPath)) {
        statsPujas = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    }

    const ultimosMovimientos = await obtenerUltimosMovimientos();
    if (ultimosMovimientos && ultimosMovimientos.length > 0) {
        statsPujas = calcularPerfilPujador(ultimosMovimientos, statsPujas);
        if (!fs.existsSync(dirDocs)) fs.mkdirSync(dirDocs);
        fs.writeFileSync(statsPath, JSON.stringify(statsPujas, null, 2));
        registrarAccion("🧠", `Analítica de Pujas: Historial actualizado y guardado en memoria.`);
    }

    if (expedienteRivales.length > 0) {
        // Enriquecer el expediente con las stats de pujas
        expedienteRivales.forEach(r => {
            r.statsPuja = statsPujas[r.id] || null;
        });
        registrarAccion("🕵️", `Modo Detective: Analizadas las urgencias de ${expedienteRivales.length} plantillas rivales.`);
    }

    for (const venta of mercado.sales) {
        const esClausula = (venta.user !== null && venta.user !== undefined);
        const jugadorObj = venta.player ? venta.player : venta; 
        
        if (evaluarJugador(jugadorObj, esClausula, necesidades, saldoActual, valorEquipo)) {
            let pujaRecomendada = jugadorObj.price;
            let sobrepujaPorcentaje = 0;

            if (!esClausula) {
                // REGLAS 26-27: Economía escasa. Base mucho más baja (5% en lugar de 15%)
                sobrepujaPorcentaje = 0.05; 
                if (jugadorObj.priceIncrement && jugadorObj.priceIncrement > 50000) {
                    sobrepujaPorcentaje += 0.15; // Antes 0.25
                }
                if (jugadorObj.average && jugadorObj.average > 6) {
                    sobrepujaPorcentaje += 0.15; // Antes 0.20
                }
                // Bonus extra para Delanteros (por la regla de +3 puntos por gol)
                if (jugadorObj.position === 4) {
                    sobrepujaPorcentaje += 0.10;
                }

                if (sobrepujaPorcentaje > 0.40) sobrepujaPorcentaje = 0.40; // Límite máximo bajado a 40%
                
                pujaRecomendada = Math.floor(jugadorObj.price * (1 + sobrepujaPorcentaje));
            } else {
                pujaRecomendada = jugadorObj.clause;
            }
            
            // Riesgo de jornada ya calculado fuera del bucle
            
            let puedePujar = false;
            let alertaRiesgo = "";
            if (esRiesgoJornada) {
                if (esClausula) {
                    // NUEVA REGLA: Prohibido robar (clausulazo) a menos de 48h de la jornada
                    puedePujar = false;
                } else {
                    puedePujar = (saldoActual + valorEquipo * 0.10) >= pujaRecomendada;
                    if (puedePujar && saldoActual < pujaRecomendada) {
                        alertaRiesgo = "⚠️ Riesgo de jornada: Pujar te dejará en negativo a <48h.";
                    }
                }
            } else {
                puedePujar = (saldoActual + valorEquipo * 0.20) >= pujaRecomendada;
            }

            // Inteligencia de Rivales (Modo Detective)
            let posString = '';
            if (jugadorObj.position === 1) posString = 'PT';
            else if (jugadorObj.position === 2) posString = 'DF';
            else if (jugadorObj.position === 3) posString = 'MC';
            else if (jugadorObj.position === 4) posString = 'DL';
            
            const rivalesInteresados = expedienteRivales.filter(r => r.urgencias.includes(posString));
            let alertaCompetencia = '';
            if (rivalesInteresados.length > 0) {
                const nombres = rivalesInteresados.map(r => r.nombre).slice(0, 3).join(', '); // Mostramos max 3
                
                // Buscar si alguno de estos rivales tiene tendencia a sobrepujar
                let maxSobrepujaMedia = 0;
                rivalesInteresados.forEach(r => {
                    if (r.statsPuja && r.statsPuja.sobrepujaMedia > maxSobrepujaMedia) {
                        maxSobrepujaMedia = r.statsPuja.sobrepujaMedia;
                    }
                });

                let porcentajeAumento = 0.05; // Base 5% por competencia
                if (maxSobrepujaMedia > 0) {
                    // Si el rival suele sobrepujar un 20%, nosotros sugerimos un 21%
                    porcentajeAumento = maxSobrepujaMedia + 0.01;
                }

                const porcentajeAumentoMostrar = Math.round(porcentajeAumento * 100);
                alertaCompetencia = `🔥 ¡Peligro! ${nombres} necesitan un ${posString}. Incrementamos puja al +${porcentajeAumentoMostrar}% por su historial de compras.`;
                
                // En lugar de sobreescribir la puja, tomamos el valor del jugador + porcentaje de aumento táctico
                const pujaCompetitiva = Math.floor(jugadorObj.price * (1 + porcentajeAumento));
                if (pujaCompetitiva > pujaRecomendada) {
                    pujaRecomendada = pujaCompetitiva;
                }
            }

            if (puedePujar) { 
                let alertaFinal = alertaRiesgo;
                if (alertaCompetencia) {
                    alertaFinal = alertaRiesgo ? alertaRiesgo + '<br>' + alertaCompetencia : alertaCompetencia;
                }
                
                if (esClausula) {
                    const alertaClausula = "ℹ️ REGLA 26-27: Recuerda que solo tienes 2 'robos' cada 7 días. Gástalo sabiamente.";
                    alertaFinal = alertaFinal ? alertaFinal + '<br>' + alertaClausula : alertaClausula;
                }

                recomendacionesMercado.push({
                    nombre: jugadorObj.name,
                    precio: jugadorObj.price,
                    puja: pujaRecomendada,
                    clausula: esClausula,
                    alerta: alertaFinal
                });
                registrarAccion("🎯", `Oportunidad: ${jugadorObj.name}. Puja recomendada: ${pujaRecomendada}€`);
            }
        }
    }
    
    // Cálculo del Contador Regresivo a la Jornada 1
    let fechaPujas = process.env.FECHA_INICIO_PUJAS ? new Date(process.env.FECHA_INICIO_PUJAS) : null;
    if (!fechaPujas || isNaN(fechaPujas.getTime()) || fechaPujas.getTime() <= Date.now()) {
        fechaPujas = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000); // 10 días de margen por defecto
    }
    const diffMs = fechaPujas - new Date();
    const diasCuentaAtras = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const horasCuentaAtras = Math.max(0, Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));

    registrarAccion("🏁", `[${new Date().toLocaleString()}] Análisis finalizado.`);
    generarHTML(registroAcciones, saldoActual, valorEquipo, recomendacionesMercado, recomendacionesVenta, analisisPretemporada, expedienteRivales, jugadoresEnPlantilla, horasHastaJornada, robosSugeridos, alertasMedicas, ultimosMovimientos, dbJugadores, oportunidadesTrading, activosToxicos, analisisOnce, inflacionMercado, chollosBaratos, diasCuentaAtras, horasCuentaAtras, estado.players || [], saludPorteria, datosFF);
}

function generarHTML(registro, saldo, valor, recomMercado, recomVenta, analisisPretemporada = null, expedienteRivales = [], jugadoresEnPlantilla = 0, horasJornada = 999, robosSugeridos = [], alertasMedicas = [], movimientos = [], dbJugadores = null, oportunidadesTrading = [], activosToxicos = [], analisisOnce = null, inflacionMercado = null, chollosBaratos = [], diasCuentaAtras = 0, horasCuentaAtras = 0, plantillaUsuario = [], saludPorteria = null, datosFF = null) {
    const dirDocs = path.join(__dirname, '..', 'docs');
    if (!fs.existsSync(dirDocs)) {
        fs.mkdirSync(dirDocs);
    }

    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    const formatoEuro = (num) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);

    let htmlPlantilla = '';
    const MAX_JUGADORES = process.env.MAX_JUGADORES_PLANTILLA ? parseInt(process.env.MAX_JUGADORES_PLANTILLA) : 14;
    
    if (jugadoresEnPlantilla >= MAX_JUGADORES) {
        htmlPlantilla = `
        <div class="section-card danger" style="border-top-color: #ef4444; background: rgba(239, 68, 68, 0.1);">
            <h2 style="color: #fca5a5;">🛑 Límite de Plantilla Superado o Alcanzado</h2>
            <p>Tienes <strong>${jugadoresEnPlantilla} jugadores</strong> en tu equipo. El límite de la liga es de <strong>${MAX_JUGADORES}</strong>.</p>
            <p><strong>REGLA 26-27:</strong> No puedes fichar a nadie nuevo a menos que vendas jugadores para hacer hueco en tu plantilla. Solo se permite vender al Computer.</p>
        </div>`;
    }

    let htmlVentas = '';
    const alertaUrgenciaVenta = (horasJornada <= 48) ? `<div style="background: rgba(239, 68, 68, 0.2); border: 2px solid #ef4444; padding: 10px; border-radius: 8px; margin-bottom: 15px; color: #fca5a5; font-weight: bold; font-size: 1.1rem; text-align: center;">⏳ ¡QUEDAN ${Math.round(horasJornada)} HORAS PARA LA JORNADA! PUNTUARÁS 0 SI NO VENDES AHORA.</div>` : '';

    if (saldo < 0 && recomVenta.length > 0) {
        htmlVentas = `
        <div class="section-card danger">
            <h2>🚨 Alerta de Saldo Negativo</h2>
            ${alertaUrgenciaVenta}
            <p>Para salir del negativo, el analista recomienda aceptar las siguientes ofertas del computer:</p>
            <div class="grid-cards">
                ${recomVenta.map(v => `
                    <div class="card sell-card">
                        <div class="card-title">${v.nombre}</div>
                        <div class="card-price">${formatoEuro(v.oferta)}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    } else if (saldo < 0) {
        htmlVentas = `
        <div class="section-card danger">
            <h2>🚨 Alerta de Saldo Negativo</h2>
            ${alertaUrgenciaVenta}
            <p>Estás en negativo pero no tienes ofertas suficientes del computer para cuadrar cuentas. ¡Pon jugadores a la venta hoy mismo!</p>
        </div>`;
    } else {
        htmlVentas = `
        <div class="section-card success">
            <h2>✅ Cuentas Saneadas</h2>
            <p>Tu saldo es positivo. No tienes obligación de vender para cuadrar cuentas.</p>
        </div>`;
    }

    let htmlMercado = '';
    if (recomMercado.length > 0) {
        const recomComputer = recomMercado.filter(m => !m.clausula);
        const recomRivales = recomMercado.filter(m => m.clausula);

        let htmlCards = '';
        
        if (recomComputer.length > 0) {
            htmlCards += `<h3 style="color: #60a5fa; margin-top: 15px;">🤖 Mercado Libre (Computer)</h3><div class="grid-cards">`;
            htmlCards += recomComputer.map(m => `
                <div class="card buy-card">
                    <div class="card-title">${m.nombre}</div>
                    <div class="card-detail">Valor: ${formatoEuro(m.precio)}</div>
                    <div class="card-bid">Puja Sugerida:<br>${formatoEuro(m.puja)}</div>
                    ${m.alerta ? `<div class="card-alert">${m.alerta}</div>` : ''}
                </div>
            `).join('');
            htmlCards += `</div>`;
        }

        if (recomRivales.length > 0) {
            htmlCards += `<h3 style="color: #f472b6; margin-top: 25px;">🏃‍♂️ En Venta por Rivales</h3><div class="grid-cards">`;
            htmlCards += recomRivales.map(m => `
                <div class="card buy-card" style="border-left: 3px solid #f472b6;">
                    <div class="card-title">${m.nombre}</div>
                    <div class="card-detail">Valor: ${formatoEuro(m.precio)}</div>
                    <div class="card-bid">Pagarás aprox:<br>${formatoEuro(m.puja)}</div>
                    ${m.alerta ? `<div class="card-alert">${m.alerta}</div>` : ''}
                </div>
            `).join('');
            htmlCards += `</div>`;
        }

        htmlMercado = `
        <div class="section-card market">
            <h2>🎯 Recomendaciones de Mercado</h2>
            <p>El algoritmo ha detectado estos jugadores rentables a la venta hoy:</p>
            ${htmlCards}
        </div>`;
    } else {
        htmlMercado = `
        <div class="section-card neutral">
            <h2>🤷‍♂️ Sin Objetivos en el Mercado</h2>
            <p>Hoy no hay ningún jugador en el mercado que encaje con tus necesidades o presupuesto.</p>
        </div>`;
    }

    let htmlRobos = '';
    if (robosSugeridos && robosSugeridos.length > 0) {
        htmlRobos = `
        <div class="section-card" style="border-top-color: #8b5cf6; background: rgba(139, 92, 246, 0.05);">
            <h2>🥷 Robos Tácticos Sugeridos (Clausulazos)</h2>
            <p>El Asesor ha escaneado a tus rivales y te recomienda estos "robos" para cubrir tus posiciones urgentes:</p>
            <div class="grid-cards">
                ${robosSugeridos.map(r => `
                    <div class="card buy-card" style="border-left: 3px solid #8b5cf6;">
                        <div class="card-title">${r.nombre} <span style="font-size: 0.8rem; background: #475569; padding: 2px 6px; border-radius: 8px;">${r.posicion}</span></div>
                        <div class="card-detail">Pertenece a: <strong>${r.dueño}</strong></div>
                        <div class="card-detail" style="margin-top: 5px;">Media: ⭐ ${r.mediaPuntos} pts</div>
                        <div class="card-bid" style="margin-top: 10px;">Valor aprox.:<br>${formatoEuro(r.precioMercado)}</div>
                        <div class="card-alert" style="margin-top: 10px; background: rgba(139, 92, 246, 0.1); color: #c4b5fd;">Alta rentabilidad. Verifica su cláusula real en la app.</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    let htmlPretemporada = '';
    if (analisisPretemporada) {
        htmlPretemporada = `
        <div class="section-card" style="border-top-color: #f472b6;">
            <h2>🧐 Análisis de Plantilla Inicial</h2>
            <p>El asesor ha evaluado tu equipo inicial. Aquí tienes el desglose:</p>
            
            <h3 style="color: var(--success); margin-top: 20px;">🛡️ Jugadores a Mantener (Claves/Especulación)</h3>
            <div class="grid-cards">
                ${analisisPretemporada.mantener.map(m => `
                    <div class="card">
                        <div class="card-title">${m.nombre}</div>
                        <div class="card-detail">Valor: ${formatoEuro(m.precio)} | Tendencia: ${m.incremento > 0 ? '+' : ''}${formatoEuro(m.incremento)}/día</div>
                        <div class="card-alert" style="color: var(--success); background: rgba(16, 185, 129, 0.1);">${m.motivo}</div>
                    </div>
                `).join('')}
            </div>

            <h3 style="color: var(--danger); margin-top: 20px;">👋 Jugadores a Vender (Descartes/Bajando)</h3>
            <div class="grid-cards">
                ${analisisPretemporada.vender.map(m => `
                    <div class="card">
                        <div class="card-title">${m.nombre}</div>
                        <div class="card-detail">Valor: ${formatoEuro(m.precio)} | Tendencia: ${m.incremento > 0 ? '+' : ''}${formatoEuro(m.incremento)}/día</div>
                        <div class="card-alert" style="color: var(--danger); background: rgba(239, 68, 68, 0.1);">${m.motivo}</div>
                    </div>
                `).join('')}
            </div>

            <h3 style="color: #94a3b8; margin-top: 20px;">🤔 Dudas / Parches</h3>
            <div class="grid-cards">
                ${analisisPretemporada.duda.map(m => `
                    <div class="card">
                        <div class="card-title">${m.nombre}</div>
                        <div class="card-detail">Valor: ${formatoEuro(m.precio)} | Tendencia: ${m.incremento > 0 ? '+' : ''}${formatoEuro(m.incremento)}/día</div>
                        <div class="card-alert" style="color: #94a3b8; background: rgba(148, 163, 184, 0.1);">${m.motivo}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
        
        // Sobrescribir las secciones normales ya que no hay mercado aún
        htmlVentas = '';
        htmlMercado = '';
    }

    let htmlDetective = '';
    if (expedienteRivales && expedienteRivales.length > 0) {
        htmlDetective = `
        <div class="section-card" style="border-top-color: #f59e0b;">
            <h2>🕵️ Expediente de Rivales y Analítica de Pujas</h2>
            <p>El Asesor ha investigado a tus contrincantes para detectar sus puntos débiles y predecir sus pujas.</p>
            <div class="grid-cards">
                ${expedienteRivales.map(r => `
                    <div class="card" style="border-left: 3px solid #f59e0b;">
                        <div class="card-title">${r.nombre}</div>
                        <div class="card-detail">Valor Plantilla: ${formatoEuro(r.valor)}</div>
                        <div style="margin-top: 10px;">
                            <strong>Busca urgentemente:</strong><br>
                            ${r.urgencias.map(u => `<span style="display:inline-block; margin-right:5px; background:#475569; padding:2px 8px; border-radius:12px; font-size:0.8rem;">${u}</span>`).join('')}
                        </div>
                        ${r.statsPuja && r.statsPuja.fichajesAnalizados > 0 ? `
                        <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; font-size: 0.85rem;">
                            <div style="color: #cbd5e1;">💰 <strong>Perfil Comprador</strong></div>
                            <div style="color: #94a3b8; margin-top: 5px;">Sobrepuja media: <span style="color: #f87171;">+${Math.round(r.statsPuja.sobrepujaMedia * 100)}%</span></div>
                            <div style="color: #94a3b8;">Fichaje +Caro: ${formatoEuro(r.statsPuja.pujaMaxima)}</div>
                            <div style="color: #64748b; font-size: 0.75rem;">(Analizados ${r.statsPuja.fichajesAnalizados} fichajes)</div>
                        </div>
                        ` : `
                        <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; font-size: 0.85rem; color: #64748b;">
                            💰 Sin datos históricos de fichajes
                        </div>
                        `}
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    let htmlSalud = '';
    if (alertasMedicas.length > 0) {
        htmlSalud = `
        <div class="section-card danger">
            <h2>🏥 Parte Médico de tu Equipo</h2>
            <p>Se han detectado problemas en jugadores de tu plantilla. Te recomendamos buscarles recambio antes de la jornada:</p>
            <div class="grid-cards">
                ${alertasMedicas.map(a => `
                    <div class="card" style="border-left: 4px solid #ef4444;">
                        <div class="card-title">${a.nombre}</div>
                        <div class="card-alert" style="margin-top: 10px; font-weight: bold; background: rgba(239, 68, 68, 0.2); color: #fca5a5;">${a.mensaje}</div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    let htmlOnce = '';
    if (analisisOnce && analisisOnce.onceTitular && analisisOnce.onceTitular.length > 0) {
        htmlOnce = `
        <div class="section-card" style="border-top-color: #f59e0b; background: rgba(245, 158, 11, 0.03);">
            <h2>👑 11 Titular Sugerido & Elección de Capitán (Formación: ${analisisOnce.formacion})</h2>
            <p>El Superagente Táctico ha analizado el rendimiento proyectado de tus jugadores disponibles:</p>
            <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
                ${analisisOnce.capitan ? `
                <div style="background: rgba(234, 179, 8, 0.15); border: 2px solid #eab308; border-radius: 12px; padding: 15px; flex: 1; min-width: 200px;">
                    <div style="color: #fef08a; font-size: 0.85rem; font-weight: bold;">🌟 CAPITÁN RECOMENDADO (x2 Puntos)</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: #fff; margin-top: 5px;">${analisisOnce.capitan.nombre}</div>
                    <div style="color: #cbd5e1; font-size: 0.85rem;">Media Proyectada: ${analisisOnce.capitan.puntosMedia} pts/partido</div>
                </div>` : ''}
                ${analisisOnce.ariete ? `
                <div style="background: rgba(239, 68, 68, 0.15); border: 2px solid #ef4444; border-radius: 12px; padding: 15px; flex: 1; min-width: 200px;">
                    <div style="color: #fca5a5; font-size: 0.85rem; font-weight: bold;">🎯 ARIETE RECOMENDADO (Goles Extra)</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: #fff; margin-top: 5px;">${analisisOnce.ariete.nombre}</div>
                    <div style="color: #cbd5e1; font-size: 0.85rem;">Media Proyectada: ${analisisOnce.ariete.puntosMedia} pts/partido</div>
                </div>` : ''}
            </div>
            <div class="grid-cards">
                ${analisisOnce.onceTitular.map(j => {
                    const infoFF = obtenerTitularidadJugador(j.nombre, datosFF);
                    return `
                    <div class="card" style="border-left: 3px solid #f59e0b;">
                        <div class="card-title">${j.nombre} ${j.id === (analisisOnce.capitan ? analisisOnce.capitan.id : null) ? '🌟 (Capitán)' : ''} ${j.id === (analisisOnce.ariete ? analisisOnce.ariete.id : null) ? '🎯 (Ariete)' : ''} <span class="badge ${infoFF.badge}">${infoFF.label}</span></div>
                        <div class="card-detail">Posición: ${j.posicion === 1 ? '🧤 Portero' : j.posicion === 2 ? '🛡️ Defensa' : j.posicion === 3 ? '⚙️ Medio' : '⚽ Delantero'}</div>
                        <div style="margin-top: 5px; color: #f59e0b; font-weight: bold;">Expectativa: ~${j.puntosMedia} pts</div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    let htmlTrading = '';
    if (oportunidadesTrading && oportunidadesTrading.length > 0) {
        htmlTrading = `
        <div class="section-card" style="border-top-color: #10b981; background: rgba(16, 185, 129, 0.03);">
            <h2>🚀 Mercado de Especulación Rápida (Trading)</h2>
            <p>Jugadores en subida libre recomendados strictly para ganar dinero limpio en 3-4 días:</p>
            <div class="grid-cards">
                ${oportunidadesTrading.map(t => {
                    const infoFF = obtenerTitularidadJugador(t.nombre, datosFF);
                    return `
                    <div class="card" style="border-left: 3px solid #10b981;">
                        <div class="card-title" style="color: #34d399;">${t.nombre} <span class="badge ${infoFF.badge}">${infoFF.label}</span></div>
                        <div class="card-detail">Valor: ${formatoEuro(t.precio)}</div>
                        <div style="color: #a7f3d0; margin-top: 5px; font-weight: bold;">📈 Subiendo +${(t.subidaDiaria/1000).toFixed(0)}k€/día</div>
                        <div class="card-alert" style="background: rgba(16, 185, 129, 0.2); color: #6ee7b7; margin-top: 10px; font-size: 0.85rem;">
                            ${t.recomendacion}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;
    }

    // Sintetizar Plan de Acción Diario con el Superagente Director Técnico
    const planDiario = generarPlanDiario({
        recomMercado,
        recomVenta,
        oportunidadesTrading,
        robosSugeridos,
        analisisOnce,
        plantilla: [],
        saldoActual: saldo,
        diasCuentaAtras,
        saludPorteria
    });

    let htmlOrdenesDia = `
    <div class="executive-banner" style="border-color: #3b82f6; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 58, 138, 0.35) 100%);">
        <div class="banner-header">
            <h2 style="color: #60a5fa; display: flex; align-items: center; gap: 10px; margin: 0;">
                <span>👔</span> PLAN DE ACCIÓN DIARIO DE TU DIRECTOR TÉCNICO
            </h2>
            <span class="live-pill" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: #60a5fa;">📋 HOY TIENES QUE HACER ESTO</span>
        </div>
        <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 8px; margin-bottom: 20px; border-left: 2px solid #3b82f6; padding-left: 10px;">
            ${planDiario.consejo}
        </div>
        <div class="action-grid">
            <div class="action-card card-pujas" style="border-left: 3px solid #3b82f6;">
                <div class="action-icon">🛒</div>
                <div class="action-title">Hoy Puja Por</div>
                <div class="action-body">
                    ${planDiario.pujas.length > 0 ? planDiario.pujas.map(p => `<div class="action-item">${p}</div>`).join('') : '<div class="action-empty">No hace falta pujar por nadie hoy. Guarda saldo.</div>'}
                </div>
            </div>

            <div class="action-card card-ventas" style="border-left: 3px solid #ef4444;">
                <div class="action-icon">💵</div>
                <div class="action-title">Hoy Vende A</div>
                <div class="action-body">
                    ${planDiario.ventas.length > 0 ? planDiario.ventas.map(v => `<div class="action-item">${v}</div>`).join('') : '<div class="action-empty">No hace falta vender a nadie hoy. Cuentas saneadas ✅</div>'}
                </div>
            </div>

            <div class="action-card card-clausulas" style="border-left: 3px solid #a855f7;">
                <div class="action-icon">🥷</div>
                <div class="action-title">Hoy Paga Cláusula</div>
                <div class="action-body">
                    ${planDiario.clausulas.length > 0 ? planDiario.clausulas.map(c => `<div class="action-item">${c}</div>`).join('') : '<div class="action-empty">No pagar ninguna cláusula hoy.</div>'}
                </div>
            </div>

            <div class="action-card card-alineacion" style="border-left: 3px solid #eab308;">
                <div class="action-icon">⚽</div>
                <div class="action-title">Hoy Alinea Esto</div>
                <div class="action-body">
                    ${planDiario.alineacion.map(a => `<div class="action-item">${a}</div>`).join('')}
                </div>
            </div>
        </div>
    </div>`;

    let htmlChollos = '';
    if (chollosBaratos && chollosBaratos.length > 0) {
        htmlChollos = `
        <div class="section-card" style="border-top-color: #06b6d4; background: rgba(6, 182, 212, 0.03);">
            <h2>💎 Radar de Titulares Chollo (< 2.000.000€)</h2>
            <p>Jugadores económicos recomendados para completar los 14 puestos de tu plantilla sin arruinarte:</p>
            <div class="grid-cards">
                ${chollosBaratos.map(c => `
                    <div class="card" style="border-left: 3px solid #06b6d4;">
                        <div class="card-title" style="color: #67e8f9;">${c.nombre}</div>
                        <div class="card-detail">Precio: ${formatoEuro(c.precio)}</div>
                        <div style="color: #a5f3fc; margin-top: 5px; font-weight: bold;">📈 Subiendo +${(c.subida/1000).toFixed(0)}k€/día</div>
                        <div class="card-alert" style="background: rgba(6, 182, 212, 0.2); color: #67e8f9; margin-top: 10px; font-size: 0.85rem;">
                            ${c.recomendacion}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>`;
    }

    let htmlTablon = '';
    if (movimientos.length > 0) {
        // Filtrar solo los fichajes (transfer)
        const fichajes = movimientos.filter(m => m.type === 'transfer' && Array.isArray(m.content)).flatMap(m => m.content);
        if (fichajes.length > 0) {
            htmlTablon = `
            <div class="section-card" style="border-top-color: #3b82f6;">
                <h2>📰 Últimos Movimientos de la Liga</h2>
                <p>El mercado se mueve. Estos han sido los últimos fichajes de tus rivales:</p>
                <div class="grid-cards">
                    ${fichajes.slice(0, 10).map(f => {
                        const idJugador = typeof f.player === 'object' ? f.player.id : f.player;
                        const nombreJugador = dbJugadores && dbJugadores[idJugador] ? dbJugadores[idJugador].name : 'Jugador Desconocido';
                        const vendedor = f.from ? f.from.name : 'Computer';
                        const comprador = f.to ? f.to.name : 'Computer';
                        const esVenta = vendedor !== 'Computer' && comprador === 'Computer';
                        const accionStr = esVenta ? 'Ha vendido a:' : 'Ha fichado a:';
                        const usuarioDestacado = esVenta ? vendedor : comprador;
                        
                        return `
                        <div class="card" style="background: rgba(59, 130, 246, 0.05);">
                            <div style="color: #94a3b8; font-size: 0.85rem;"><strong>${usuarioDestacado}</strong> ${accionStr.toLowerCase()}</div>
                            <div class="card-title" style="color: #60a5fa;">${nombreJugador}</div>
                            <div class="card-detail">De: ${vendedor} ➡️ Para: ${comprador}</div>
                            <div style="margin-top: 10px; color: #f8fafc; font-weight: bold;">Precio: ${formatoEuro(f.amount)}</div>
                        </div>
                        `;
                    }).join('')}
                </div>
            </div>`;
        }
    }

    let htmlCalendario = `
    <div class="section-card" style="border-top-color: #10b981; background: rgba(16, 185, 129, 0.05);">
        <h2>📅 Calendario de la Jornada</h2>
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-style: italic;">
            <p>⏳ Esperando a que Biwenger publique los horarios oficiales de la jornada...</p>
            <p style="font-size: 0.8rem;">(Este bloque se llenará automáticamente con los partidos en cuanto la API los habilite unos días antes del inicio de la liga)</p>
        </div>
    </div>`;

    // Conteo de posiciones para gráfico de donut
    const jugPlantilla = plantillaUsuario || [];
    const plantillaCounts = {
        PT: jugPlantilla.filter(p => p.position === 1 || p.posicion === 1).length,
        DF: jugPlantilla.filter(p => p.position === 2 || p.posicion === 2).length,
        MC: jugPlantilla.filter(p => p.position === 3 || p.posicion === 3).length,
        DL: jugPlantilla.filter(p => p.position === 4 || p.posicion === 4).length
    };

    let htmlBuscador = `
    <div class="search-container" style="margin-bottom: 25px; background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(16px); padding: 15px 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); display: flex; gap: 15px; align-items: center; flex-wrap: wrap;">
        <span style="font-size: 1.2rem;">🔍</span>
        <input type="text" id="searchInput" onkeyup="filtrarContenido()" placeholder="Buscar jugador, posición (PT, DF, MC, DL) o rival en vivo..." style="flex: 1; min-width: 250px; background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 10px 16px; border-radius: 10px; font-family: inherit; font-size: 0.95rem; outline: none;">
        <div style="font-size: 0.8rem; color: #94a3b8; display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="filter-chip" onclick="filtrarPosicion('')" style="cursor:pointer; padding: 5px 12px; background: rgba(255,255,255,0.1); border-radius: 8px; font-weight: 600;">Todos</span>
            <span class="filter-chip" onclick="filtrarPosicion('PT')" style="cursor:pointer; padding: 5px 12px; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-radius: 8px; font-weight: 600;">🧤 PT</span>
            <span class="filter-chip" onclick="filtrarPosicion('DF')" style="cursor:pointer; padding: 5px 12px; background: rgba(16, 185, 129, 0.2); color: #34d399; border-radius: 8px; font-weight: 600;">🛡️ DF</span>
            <span class="filter-chip" onclick="filtrarPosicion('MC')" style="cursor:pointer; padding: 5px 12px; background: rgba(245, 158, 11, 0.2); color: #fbbf24; border-radius: 8px; font-weight: 600;">⚙️ MC</span>
            <span class="filter-chip" onclick="filtrarPosicion('DL')" style="cursor:pointer; padding: 5px 12px; background: rgba(239, 68, 68, 0.2); color: #fca5a5; border-radius: 8px; font-weight: 600;">⚽ DL</span>
        </div>
    </div>`;

    let htmlGraficos = `
    <div class="section-card" style="border-top-color: #3b82f6; background: rgba(15, 23, 42, 0.4);">
        <h2 style="display: flex; align-items: center; gap: 10px;">
            <span>📊</span> Centro de Analítica Visual & Comparativa
        </h2>
        <p style="color: #94a3b8;">Visualización interactiva del valor de plantilla de la comunidad y desglose de tu equipo:</p>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top: 20px;">
            <div style="background: rgba(15, 23, 42, 0.7); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.08);">
                <h3 style="margin-top: 0; font-size: 1rem; color: #60a5fa; text-align: center;">🏆 Valores de Plantilla de la Liga (€)</h3>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="chartRivales"></canvas>
                </div>
            </div>
            
            <div style="background: rgba(15, 23, 42, 0.7); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,0.08);">
                <h3 style="margin-top: 0; font-size: 1rem; color: #34d399; text-align: center;">⚽ Tu Plantilla por Posición</h3>
                <div style="position: relative; height: 260px; width: 100%;">
                    <canvas id="chartPlantilla"></canvas>
                </div>
            </div>
        </div>
    </div>`;

    let htmlCaraACara = `
    <div class="section-card" style="border-top-color: #a855f7; background: rgba(168, 85, 247, 0.03);">
        <h2 style="display: flex; align-items: center; gap: 10px; color: #c084fc;">
            <span>⚔️</span> Comparador Cara a Cara (Head-to-Head)
        </h2>
        <p style="color: #94a3b8;">Selecciona a cualquier rival para analizar sus necesidades tácticas, perfil psicológico de sobrepuja y vulnerabilidad:</p>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;">
            <label for="selectRival" style="font-weight: bold; color: #e2e8f0;">Rival a Espiar:</label>
            <select id="selectRival" onchange="actualizarCaraACara()" style="background: #0f172a; color: #a78bfa; border: 1px solid #a855f7; padding: 10px 15px; border-radius: 10px; font-family: inherit; font-size: 0.95rem; outline: none; cursor: pointer;">
            </select>
        </div>
        
        <div id="panelCaraACara" style="background: rgba(15, 23, 42, 0.7); border-radius: 16px; padding: 25px; border: 1px solid rgba(168, 85, 247, 0.2);">
        </div>
    </div>`;

    let listaHTML = registro.map(r => `<li><span class="hora">${r.hora}</span> ${r.texto.replace(/<.*?>/g, '')}</li>`).join('\n');

    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Biwenger Advisor</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --bg-color: #0b0f19;
            --text-main: #f8fafc;
            --card-bg: rgba(30, 41, 59, 0.7);
            --accent: #3b82f6;
            --success: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
        }
        body {
            font-family: 'Outfit', 'Inter', sans-serif;
            background-color: var(--bg-color);
            background-image: radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.12) 0px, transparent 50%),
                              radial-gradient(at 100% 100%, rgba(236, 72, 153, 0.12) 0px, transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            margin: 0;
            padding: 0;
            line-height: 1.6;
        }
        header {
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
            padding: 50px 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        h1 { margin: 0; font-weight: 800; font-size: 2.8rem; letter-spacing: -1px; background: linear-gradient(to right, #60a5fa, #a78bfa, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .subtitle { font-size: 1.1rem; color: #94a3b8; margin-top: 8px; font-weight: 500; }
        
        .container {
            max-width: 1100px;
            margin: -30px auto 50px auto;
            padding: 0 20px;
        }

        .executive-banner {
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(244, 114, 182, 0.3);
            border-radius: 20px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 10px 30px -10px rgba(236, 72, 153, 0.2);
        }
        .banner-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .banner-header h2 { margin: 0; color: #f472b6; font-size: 1.4rem; }
        .live-pill { background: rgba(236, 72, 153, 0.2); color: #f472b6; border: 1px solid #f472b6; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; letter-spacing: 1px; }

        .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
        .action-card { background: rgba(15, 23, 42, 0.6); border-radius: 14px; padding: 18px; border: 1px solid rgba(255,255,255,0.06); transition: all 0.3s ease; }
        .action-card:hover { transform: translateY(-4px); border-color: rgba(255,255,255,0.2); }
        .action-icon { font-size: 1.6rem; margin-bottom: 8px; }
        .action-title { font-size: 0.95rem; font-weight: 700; color: #cbd5e1; margin-bottom: 10px; }
        .action-body { font-size: 0.85rem; color: #94a3b8; }
        .action-item { margin-bottom: 8px; }
        .action-empty { color: #64748b; font-style: italic; font-size: 0.8rem; }

        .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; margin-top: 4px; }
        .badge-blue { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.3); }
        .badge-emerald { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
        .badge-purple { background: rgba(168, 85, 247, 0.2); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.3); }
        .badge-success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }

        .stats-hero {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-box {
            background: var(--card-bg);
            backdrop-filter: blur(12px);
            padding: 25px;
            border-radius: 18px;
            text-align: center;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.08);
            transition: transform 0.3s ease;
        }
        .stat-box:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.2); }
        .stat-label { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; }
        .stat-value { font-size: 2.2rem; font-weight: 800; margin-top: 8px; }
        .val-positive { color: var(--success); }
        .val-negative { color: var(--danger); }
        
        .section-card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            padding: 30px;
            border-radius: 20px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255,255,255,0.08);
            border-top: 4px solid var(--accent);
        }
        .section-card.danger { border-top-color: var(--danger); }
        .section-card.success { border-top-color: var(--success); }
        .section-card.market { border-top-color: #8b5cf6; }
        
        .section-card h2 { margin-top: 0; font-weight: 700; font-size: 1.5rem; }
        
        .grid-cards {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
            gap: 18px;
            margin-top: 20px;
        }
        .card {
            background: rgba(15, 23, 42, 0.5);
            border-radius: 14px;
            padding: 20px;
            border: 1px solid rgba(255,255,255,0.06);
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card:hover {
            background: rgba(30, 41, 59, 0.8);
            transform: translateY(-4px);
            box-shadow: 0 12px 20px -5px rgba(0,0,0,0.3);
            border-color: rgba(255,255,255,0.15);
        }
        .card-title { font-weight: 600; font-size: 1.2rem; margin-bottom: 10px; }
        .sell-card .card-price { color: var(--success); font-size: 1.4rem; font-weight: 800; }
        .buy-card .card-bid { margin-top: 15px; color: #a78bfa; font-size: 1.3rem; font-weight: 800; }
        .card-detail { font-size: 0.9rem; color: #94a3b8; }
        .card-alert { margin-top: 10px; font-size: 0.8rem; color: var(--warning); background: rgba(245, 158, 11, 0.1); padding: 5px; border-radius: 4px; }
        
        .logs-section {
            background: #0f172a;
            border-radius: 12px;
            padding: 20px;
            border: 1px solid #334155;
        }
        .logs-section h3 { margin-top: 0; color: #94a3b8; font-size: 1rem; }
        ul { list-style: none; padding: 0; margin: 0; }
        li { padding: 10px 0; border-bottom: 1px solid #1e293b; font-size: 0.95rem; }
        li:last-child { border-bottom: none; }
        .hora { color: #64748b; font-family: monospace; margin-right: 15px; }
        
    </style>
</head>
<body>
    <header>
        <h1>Biwenger Advisor</h1>
        <div class="subtitle">Análisis Estratégico - ${fecha}</div>
    </header>
    
    <div class="container">
        <div class="stats-hero">
            <div class="stat-box" style="border-top-color: #ec4899;">
                <div class="stat-label">⏳ Cuenta Atrás Jornada 1</div>
                <div class="stat-value" style="color: #f472b6; font-size: 1.6rem;">${diasCuentaAtras}d ${horasCuentaAtras}h</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Saldo de Cuenta</div>
                <div class="stat-value ${saldo >= 0 ? 'val-positive' : 'val-negative'}">${formatoEuro(saldo)}</div>
            </div>
            <div class="stat-box">
                <div class="stat-label">Valor de Plantilla</div>
                <div class="stat-value" style="color: #60a5fa;">${formatoEuro(valor)}</div>
            </div>
            <div class="stat-box" style="border-top-color: #10b981;">
                <div class="stat-label">📊 Mercado Pretemporada</div>
                <div class="stat-value" style="color: #34d399; font-size: 1.1rem;">${inflacionMercado ? inflacionMercado.estado : 'Estable'}</div>
                <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 5px;">${inflacionMercado ? inflacionMercado.consejo : ''}</div>
            </div>
        </div>

        ${htmlBuscador}
        ${htmlOrdenesDia}
        ${htmlGraficos}
        ${htmlCaraACara}
        ${htmlSalud}
        ${htmlOnce}
        ${htmlTrading}
        ${htmlChollos}
        ${htmlPlantilla}
        ${htmlPretemporada}
        ${htmlVentas}
        ${htmlMercado}
        ${htmlRobos}
        ${htmlTablon}
        ${htmlDetective}
        ${htmlCalendario}

        <div class="logs-section">
            <h3>Terminal de Análisis</h3>
            <ul>
                ${listaHTML}
            </ul>
        </div>
    </div>

    <script>
    window.DATA_RIVALES = ${JSON.stringify(expedienteRivales || [])};
    window.DATA_MI_VALOR = ${valor};
    window.DATA_PLANTILLA_COUNTS = ${JSON.stringify(plantillaCounts)};
    window.DATA_ROBOS = ${JSON.stringify(robosSugeridos || [])};

    function formatoEuroJS(num) {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
    }

    document.addEventListener("DOMContentLoaded", function() {
        // Chart 1: Rivales vs Tu Equipo
        const ctxRivales = document.getElementById('chartRivales');
        if (ctxRivales && window.Chart) {
            const labels = ['Tu Equipo'].concat(window.DATA_RIVALES.map(function(r) { return r.nombre; }));
            const dataValues = [window.DATA_MI_VALOR].concat(window.DATA_RIVALES.map(function(r) { return r.valor; }));
            const bgColors = ['rgba(59, 130, 246, 0.85)'].concat(window.DATA_RIVALES.map(function(_, i) { 
                return 'hsl(' + (250 + i * 30) + ', 65%, 60%)'; 
            }));
            
            new Chart(ctxRivales, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Valor de Plantilla (€)',
                        data: dataValues,
                        backgroundColor: bgColors,
                        borderRadius: 8,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) { return 'Valor: ' + formatoEuroJS(context.raw); }
                            }
                        }
                    },
                    scales: {
                        x: { ticks: { color: '#94a3b8', font: { family: 'Outfit' } }, grid: { display: false } },
                        y: { ticks: { color: '#94a3b8', font: { family: 'Outfit' }, callback: function(value) { return (value/1000000).toFixed(1) + 'M€'; } }, grid: { color: 'rgba(255,255,255,0.05)' } }
                    }
                }
            });
        }

        // Chart 2: Donut de Plantilla
        const ctxPlantilla = document.getElementById('chartPlantilla');
        if (ctxPlantilla && window.Chart) {
            const counts = window.DATA_PLANTILLA_COUNTS;
            new Chart(ctxPlantilla, {
                type: 'doughnut',
                data: {
                    labels: ['🧤 Porteros', '🛡️ Defensas', '⚙️ Medios', '⚽ Delanteros'],
                    datasets: [{
                        data: [counts.PT, counts.DF, counts.MC, counts.DL],
                        backgroundColor: [
                            '#3b82f6',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444'
                        ],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { family: 'Outfit' } } }
                    }
                }
            });
        }

        // 2. Poblar Selector Cara a Cara
        const select = document.getElementById('selectRival');
        if (select && window.DATA_RIVALES.length > 0) {
            select.innerHTML = window.DATA_RIVALES.map(function(r) { return '<option value="' + r.nombre + '">' + r.nombre + '</option>'; }).join('');
            actualizarCaraACara();
        } else if (select) {
            select.innerHTML = '<option>Sin rivales cargados</option>';
        }
    });

    function actualizarCaraACara() {
        const select = document.getElementById('selectRival');
        const panel = document.getElementById('panelCaraACara');
        if (!select || !panel) return;
        
        const nombreRival = select.value;
        const rival = window.DATA_RIVALES.find(function(r) { return r.nombre === nombreRival; });
        if (!rival) {
            panel.innerHTML = '<div style="color: #94a3b8;">Selecciona un rival válido.</div>';
            return;
        }

        const difValor = rival.valor - window.DATA_MI_VALOR;
        const difStr = difValor > 0 ? ('+' + formatoEuroJS(difValor) + ' respecto a ti') : (formatoEuroJS(difValor) + ' respecto a ti');
        const robosRival = window.DATA_ROBOS.filter(function(r) { return r.equipoRival === rival.nombre || r.dueño === rival.nombre; });

        let urgenciasHTML = '<span style="color:#34d399; font-size:0.85rem;">Plantilla equilibrada</span>';
        if (rival.urgencias && rival.urgencias.length > 0) {
            urgenciasHTML = rival.urgencias.map(function(u) { 
                return '<span style="display:inline-block; margin-right:5px; background:rgba(239, 68, 68, 0.2); color:#fca5a5; padding:3px 10px; border-radius:12px; font-weight:bold; font-size:0.85rem;">Busca ' + u + '</span>'; 
            }).join('');
        }

        let perfilPsico = (rival.statsPuja && rival.statsPuja.perfilPsicologico) ? rival.statsPuja.perfilPsicologico : '⚖️ Conservador / Calculador';
        let sobrepujaInfo = (rival.statsPuja && rival.statsPuja.sobrepujaMedia) ? ('<div style="font-size: 0.8rem; color: #cbd5e1; margin-top: 2px;">Sobrepuja media: +' + Math.round(rival.statsPuja.sobrepujaMedia * 100) + '%</div>') : '';

        let robosHTML = '<div style="font-size: 0.85rem; color: #94a3b8; font-style: italic;">No hay clausulazos recomendados actualmente contra este rival.</div>';
        if (robosRival.length > 0) {
            robosHTML = robosRival.map(function(r) {
                return '<div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #a855f7; padding: 10px 15px; border-radius: 8px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">' +
                    '<div><strong style="color: #fff;">' + r.nombre + '</strong> (' + r.posicion + ') — Media: ⭐ ' + r.mediaPuntos + '<div style="font-size: 0.8rem; color: #94a3b8;">' + (r.motivoViabilidad || '') + '</div></div>' +
                    '<div><span style="font-weight: bold; color: #a78bfa;">Cláusula: ' + formatoEuroJS(r.clausula || r.precioMercado) + '</span><span class="badge ' + (r.viabilidadBadge || 'badge-purple') + '" style="margin-left: 8px;">' + (r.viabilidadLabel || '🟡 MEDIA') + '</span></div>' +
                '</div>';
            }).join('');
        }

        panel.innerHTML = 
            '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">' +
                '<div>' +
                    '<div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Valor de Plantilla</div>' +
                    '<div style="font-size: 1.5rem; font-weight: 800; color: #a78bfa; margin-top: 4px;">' + formatoEuroJS(rival.valor) + '</div>' +
                    '<div style="font-size: 0.8rem; color: ' + (difValor > 0 ? '#f87171' : '#34d399') + ';">' + difStr + '</div>' +
                '</div>' +
                '<div>' +
                    '<div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Urgencias de Mercado</div>' +
                    '<div style="margin-top: 8px;">' + urgenciasHTML + '</div>' +
                '</div>' +
                '<div>' +
                    '<div style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Perfil Psicológico de Puja</div>' +
                    '<div style="font-weight: bold; color: #fbbf24; margin-top: 6px; font-size: 0.95rem;">' + perfilPsico + '</div>' +
                    sobrepujaInfo +
                '</div>' +
            '</div>' +
            '<div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">' +
                '<div style="font-size: 0.9rem; font-weight: bold; color: #c084fc; margin-bottom: 8px;">🥷 Vulnerabilidad a Clausulazo en su Equipo:</div>' +
                robosHTML +
            '</div>';
    }

    function filtrarContenido() {
        const input = document.getElementById('searchInput');
        const query = input ? input.value.toLowerCase().trim() : '';
        const cards = document.querySelectorAll('.grid-cards .card');

        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            if (!query || text.includes(query)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    function filtrarPosicion(pos) {
        const input = document.getElementById('searchInput');
        if (input) {
            input.value = pos;
            filtrarContenido();
        }
    }
    </script>
</body>
</html>`;

    fs.writeFileSync(path.join(dirDocs, 'index.html'), htmlContent);
    console.log("📄 Dashboard HTML generado en docs/index.html");
}

module.exports = {
    ejecutarAgente
};
