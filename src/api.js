require('dotenv').config();
const axios = require('axios');

// Configuración base para todas las peticiones a la API de Biwenger
const biwengerApi = axios.create({
    baseURL: 'https://biwenger.as.com/api/v2',
    headers: {
        'Authorization': `Bearer ${process.env.BIWENGER_TOKEN}`,
        'X-League': process.env.BIWENGER_LEAGUE_ID,
        'X-User': process.env.BIWENGER_USER_ID,
        'Content-Type': 'application/json',
        // Simulamos ser un navegador normal para evitar bloqueos
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
});

// Función para simular comportamiento humano y no saturar el servidor
const pausaHumana = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Interceptor Anti-Baneo: Fuerza una pausa aleatoria antes de CADA petición
biwengerApi.interceptors.request.use(async (config) => {
    // Retraso aleatorio entre 1000ms y 3000ms (1s - 3s)
    const delay = Math.floor(Math.random() * (3000 - 1000 + 1)) + 1000;
    console.log(`🛡️ [Anti-Baneo] Pausa táctica de ${delay}ms simulando lectura humana...`);
    await pausaHumana(delay);
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Función para obtener el estado del equipo y saldo actual
async function obtenerEstadoEquipo() {
    try {
        // Biwenger cambió su API: ahora la plantilla viene en 'players' en lugar de 'team'
        const response = await biwengerApi.get('/user?fields=*,players');
        // biwenger devuelve la info en response.data.data
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener estado del equipo:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Función para obtener el mercado de hoy
async function obtenerMercado() {
    try {
        const response = await biwengerApi.get('/market');
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener el mercado:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Función para obtener las plantillas de los rivales
async function obtenerPlantillasRivales() {
    try {
        // En Biwenger suele ser la ruta /league que contiene a los usuarios (standings) y sus equipos
        const response = await biwengerApi.get('/league?include=all');
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener plantillas rivales:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Función para poner un jugador en venta (DESACTIVADA EN MODO ASESOR)
async function ponerJugadorEnVenta(idJugador, precio) {
    console.warn(`[MODO ASESOR] Acción bloqueada: Intento de poner en venta al jugador ${idJugador}.`);
    return null;
}

// Función para pujar por un jugador (DESACTIVADA EN MODO ASESOR)
async function pujarPorJugador(idJugador, monto) {
    console.warn(`[MODO ASESOR] Acción bloqueada: Intento de pujar ${monto}€ por el jugador ${idJugador}.`);
    return null;
}

// Función para obtener ofertas recibidas
async function obtenerOfertas() {
    try {
        const response = await biwengerApi.get('/market/offers');
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener ofertas:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Función para aceptar una oferta (DESACTIVADA EN MODO ASESOR)
async function aceptarOferta(idOferta) {
    console.warn(`[MODO ASESOR] Acción bloqueada: Intento de aceptar la oferta ${idOferta}.`);
    return null;
}

// Función para obtener la fecha de la próxima jornada (usando los datos de la liga)
async function obtenerInicioProximaJornada() {
    try {
        // En Biwenger, a veces la información de la ronda actual viene en /league o en un endpoint de rondas
        // Intentaremos sacar la info del campeonato.
        const response = await biwengerApi.get('/league?include=all');
        const leagueData = response.data.data;
        
        // Normalmente la API de Biwenger devuelve la info de las jornadas
        // en algún objeto relacionado con la competición. Buscamos propiedades como "round" o "activeEvents"
        if (leagueData && leagueData.round && leagueData.round.start) {
            return new Date(leagueData.round.start * 1000); // Unix timestamp
        }
        
        // Fallback: intentamos ver si viene en estado de usuario
        const userRes = await biwengerApi.get('/user');
        if (userRes.data.data && userRes.data.data.round && userRes.data.data.round.start) {
            return new Date(userRes.data.data.round.start * 1000);
        }
        
        return null; // Fallback
    } catch (error) {
        console.error("Error al obtener inicio de próxima jornada:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Función para obtener los últimos movimientos del mercado (tablón)
async function obtenerUltimosMovimientos() {
    try {
        // En Biwenger el tablón se consulta en /league/board o /events
        // Pedimos los últimos eventos para analizar fichajes (tipo transfer)
        const response = await biwengerApi.get('/league/board?type=transfer,market&limit=100');
        return response.data.data;
    } catch (error) {
        console.error("Error al obtener últimos movimientos:", error.response ? error.response.data : error.message);
        return [];
    }
}

// Exportamos las funciones para usarlas en el agente
module.exports = {
    obtenerEstadoEquipo,
    obtenerMercado,
    obtenerPlantillasRivales,
    ponerJugadorEnVenta,
    pujarPorJugador,
    obtenerOfertas,
    aceptarOferta,
    obtenerInicioProximaJornada,
    obtenerUltimosMovimientos
};
