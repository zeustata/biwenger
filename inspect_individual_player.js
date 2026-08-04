const fs = require('fs');

const html = fs.readFileSync('rm_full.html', 'utf8');

const regexRow = /<div[^>]*class="elemento\s+([^"]+)\s+elemento_jugador[^"]*"[\s\S]*?<img[^>]*alt="([^"]+)"/gi;
let match;
let count = 0;
while ((match = regexRow.exec(html)) !== null) {
    count++;
    const classStr = match[1];
    const name = match[2].trim();
    let estadoStr = 'titular';
    let prob = 90;
    let badgeColor = '🟢';

    if (classStr.includes('lesionado') || classStr.includes('baja')) {
        estadoStr = 'lesionado';
        prob = 0;
        badgeColor = '🔴';
    } else if (classStr.includes('duda') || classStr.includes('rotacion')) {
        estadoStr = 'duda';
        prob = 55;
        badgeColor = '🟡';
    } else if (classStr.includes('suplente')) {
        estadoStr = 'suplente';
        prob = 30;
        badgeColor = '🔴';
    } else if (classStr.includes('titular')) {
        estadoStr = 'titular';
        prob = 95;
        badgeColor = '🟢';
    }

    console.log(`${count}. ${name} -> [${classStr}] -> ${badgeColor} ${estadoStr.toUpperCase()} ${prob}% FF`);
}
