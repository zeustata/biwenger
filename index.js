require('dotenv').config();
const { ejecutarAgente } = require('./src/agente');

// En GitHub Actions, el "cron" ya está configurado en biwenger.yml
// Por tanto, el script solo necesita ejecutarse una vez y cerrarse.
async function main() {
    console.log("Iniciando aplicación y comprobando credenciales...");
    await ejecutarAgente();
    console.log("Cerrando aplicación tras la ejecución.");
    process.exit(0);
}

main();
