const fs = require('fs');

const html = fs.readFileSync('rm_full.html', 'utf8');

// Search for any occurrence of "titular", "duda", "rotacion", "suplente", "porcentaje", "%"
const pcts = [];
const regex = /<[^>]*class="[^"]*(porcentaje|titularidad|pct|duda|rotacion|titular|suplente)[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/gi;
let match;
while ((match = regex.exec(html)) !== null) {
    pcts.push(match[0]);
}

console.log("Total status/pct tags found:", pcts.length);
if (pcts.length > 0) {
    console.log("Sample 20 tags:");
    pcts.slice(0, 20).forEach(t => console.log(t.replace(/\s+/g, ' ').slice(0, 150)));
}
