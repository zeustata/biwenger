const axios = require('axios');
const fs = require('fs');

async function testLineups() {
    try {
        const r = await axios.get('https://www.futbolfantasy.com/laliga/posibles-alineaciones', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = r.data;
        fs.writeFileSync('ff_lineups.html', html);
        console.log("HTML length:", html.length);
        
        // Find player names in lineup tables
        const names = [];
        const regexName = /<div class="name"[^>]*>([\s\S]*?)<\/div>/gi;
        let match;
        while ((match = regexName.exec(html)) !== null) {
            names.push(match[1].replace(/<[^>]+>/g, '').trim());
        }
        console.log("Found names in .name class:", names.length, names.slice(0, 10));

        // Find percentages or probability classes
        const percentMatches = html.match(/class="[^"]*(titular|rotacion|duda|suplente|baja|pct|pct-\d+)[^"]*"/gi) || [];
        console.log("Found probability classes count:", percentMatches.length, percentMatches.slice(0, 10));

    } catch (e) {
        console.error("Error:", e.message);
    }
}

testLineups();
