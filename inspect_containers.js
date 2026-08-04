const fs = require('fs');

const html = fs.readFileSync('rm_full.html', 'utf8');

// Match <div class="elemento ... elemento_jugador" ...> and extract player name + status
const regexElemento = /<div[^>]*class="[^"]*elemento\s+([^"]+)\s+elemento_jugador[^"]*"[\s\S]*?<img[^>]*alt="([^"]+)"/gi;

let match;
let count = 0;
console.log("=== Extracted Players & Statuses from Real Madrid ===");
while ((match = regexElemento.exec(html)) !== null) {
    count++;
    const statusClasses = match[1];
    const name = match[2];
    let prob = 85;
    let label = 'Titular';
    if (statusClasses.includes('lesionado') || statusClasses.includes('baja')) {
        prob = 0;
        label = 'Lesionado';
    } else if (statusClasses.includes('duda')) {
        prob = 45;
        label = 'Duda';
    } else if (statusClasses.includes('suplente')) {
        prob = 25;
        label = 'Suplente';
    } else if (statusClasses.includes('plantilla')) {
        prob = 35;
        label = 'Reserva';
    } else if (statusClasses.includes('titular')) {
        prob = 95;
        label = 'Titular XI';
    }
    console.log(`${count}. ${name} -> Status: [${statusClasses}] -> Probabilidad: ${prob}% (${label})`);
}
