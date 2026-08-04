const fs = require('fs');

const html = fs.readFileSync('rm_full.html', 'utf8');

// Match div elements that contain player links / names
const playerRows = html.match(/<div[^>]*class="[^"]*jugador-[0-9]+[^"]*"[\s\S]*?<\/div>/gi) || [];
console.log("Found player rows with 'jugador-XXXX':", playerRows.length);

playerRows.slice(0, 10).forEach((row, i) => {
    const classMatch = row.match(/class="([^"]+)"/);
    const nameMatch = row.match(/alt="([^"]+)"/) || row.match(/<span[^>]*class="nombre"[^>]*>([\s\S]*?)<\/span>/);
    console.log(`Row ${i+1}:`);
    console.log(`  Classes: ${classMatch ? classMatch[1] : 'none'}`);
    console.log(`  Name: ${nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : 'none'}`);
});
