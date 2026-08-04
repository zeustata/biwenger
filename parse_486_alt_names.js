const fs = require('fs');

const html = fs.readFileSync('ff_lineups.html', 'utf8');

const regexImg = /alt="([^"]+)"/gi;
const playerNames = [];
let m;
while ((m = regexImg.exec(html)) !== null) {
    const name = m[1].trim();
    if (name && name.length > 2 && !name.includes('LaLiga') && !name.includes('FutbolFantasy') && !name.includes('escudo') && !name.includes('logo') && !name.includes('menu') && !name.includes('Fantasy') && !name.includes('Predicted') && !name.includes('campeonato')) {
        playerNames.push(name);
    }
}

const uniqueNames = Array.from(new Set(playerNames));
console.log("Unique player names count:", uniqueNames.length);
console.log("Sample 30 players from probable lineups page:", uniqueNames.slice(0, 30));
