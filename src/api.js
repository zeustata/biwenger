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

// Exportamos las funciones para usarlas en el agente
module.exports = {
    obtenerEstadoEquipo,
    obtenerMercado,
    obtenerPlantillasRivales
};
