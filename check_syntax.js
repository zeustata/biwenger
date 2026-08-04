const fs = require('fs');
const content = fs.readFileSync('src/agente.js', 'utf8');

let depth = 0;
let inTemplate = false;

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '`') inTemplate = !inTemplate;
    
    // Only count braces outside template literal OR inside ${}
    if (char === '{') {
        depth++;
    } else if (char === '}') {
        depth--;
    }
}

console.log("Final brace depth:", depth);
