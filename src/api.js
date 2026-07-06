require('dotenv').config();
const axios = require('axios');

// Configuración base para todas las peticiones a la API de Biwenger
const biwengerApi = axios.create({
    baseURL: 'https://biwenger.as.com/api/v2',
    headers: {
        'Authorization': `Bearer ${process.env.BIWENGER_TOKEN}`,
        'X-League': process.env.BIWENGER_LEAGUE_ID,
        'Content-Type': 'application/json',
        // Simulamos ser un navegador normal para evitar bloqueos
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
    }
});

// Función para simular comportamiento humano y no saturar el servidor
const pausaHumana = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para obtener el estado del equipo y saldo actual
async function obtenerEstadoEquipo() {
    try {
        const response = await biwengerApi.get('/user');
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

// Función para poner un jugador en venta
async function ponerJugadorEnVenta(idJugador, precio) {
    try {
        const payload = {
            type: "player",
            player: idJugador,
            price: precio
        };
        const response = await biwengerApi.post('/market/sales', payload);
        return response.data;
    } catch (error) {
        console.error(`Error al poner en venta al jugador ${idJugador}:`, error.response ? error.response.data : error.message);
        return null;
    }
}

// Función para pujar por un jugador
async function pujarPorJugador(idJugador, monto) {
    try {
        const payload = {
            type: "player",
            player: idJugador,
            amount: monto
        };
        const response = await biwengerApi.post('/market/bids', payload);
        return response.data;
    } catch (error) {
        console.error(`Error al pujar por el jugador ${idJugador}:`, error.response ? error.response.data : error.message);
        return null;
    }
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

// Función para aceptar una oferta
async function aceptarOferta(idOferta) {
    try {
        const response = await biwengerApi.put(`/market/offers/${idOferta}/accept`);
        return response.data;
    } catch (error) {
        console.error(`Error al aceptar oferta ${idOferta}:`, error.response ? error.response.data : error.message);
        return null;
    }
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

// Exportamos las funciones para usarlas en el agente
module.exports = {
    obtenerEstadoEquipo,
    obtenerMercado,
    obtenerPlantillasRivales,
    ponerJugadorEnVenta,
    pujarPorJugador,
    obtenerOfertas,
    aceptarOferta,
    obtenerInicioProximaJornada
};
