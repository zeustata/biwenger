const fs = require('fs');

const html = fs.readFileSync('rm_full.html', 'utf8');

// Search for starting XI container (#alineacion, .posicion, .campo, .diagrama, .titulares)
const lineupDiagram = html.match(/id="alineacion"[\s\S]*?<\/section>/i) || html.match(/class="[^"]*campo[^"]*"[\s\S]*?<\/div>/i) || [];
console.log("Diagram found length:", lineupDiagram.length > 0 ? lineupDiagram[0].length : 0);

if (lineupDiagram.length > 0) {
    const namesInDiagram = lineupDiagram[0].match(/alt="([^"]+)"/g) || lineupDiagram[0].match(/title="([^"]+)"/g) || [];
    console.log("Players in starting XI diagram:", namesInDiagram);
} else {
    console.log("No alineacion diagram found.");
}
