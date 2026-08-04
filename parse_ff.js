const fs = require('fs');

const html = fs.readFileSync('rm.html', 'utf8');

const targetName = 'Thibaut Courtois';
const idx = html.indexOf(targetName);
if (idx !== -1) {
    console.log("Snippet around Courtois:");
    console.log(html.slice(Math.max(0, idx - 400), Math.min(html.length, idx + 400)));
}
