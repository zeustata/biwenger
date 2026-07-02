require('dotenv').config();
const cron = require('node-cron');
const { ejecutarAgente } = require('./src/agente');

// Ejecutamos el agente una vez al iniciar para comprobar que todo va bien
console.log("Iniciando aplicación y comprobando credenciales...");
ejecutarAgente();

// Programamos la tarea diaria. 
// El usuario pidió que se ejecute "un poco más tarde".
// '0 8 * * *' significa todos los días a las 08:00 AM.
console.log("⏰ Alarma programada para ejecutarse todos los días a las 08:00 AM.");

cron.schedule('0 8 * * *', () => {
    console.log("⏰ ¡Es la hora! Despertando al Agente...");
    ejecutarAgente();
});
