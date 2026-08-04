const axios = require('axios');
const fs = require('fs');

async function inspectLineups() {
    try {
        const r = await axios.get('https://www.futbolfantasy.com/laliga/posibles-alineaciones', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const html = r.data;
        fs.writeFileSync('ff_lineups.html', html);

        // Find all player names or links in probable lineups page
        const regexPlayerLink = /href="https:\/\/www\.futbolfantasy\.com\/laliga\/equipos\/[^"]*"[^>]*title="([^"]+)"/gi;
        const names = [];
        let m;
        while ((m = regexPlayerLink.exec(html)) !== null) {
            names.push(m[1].trim());
        }
        console.log("Found player title names in lineups page:", names.length, names.slice(0, 15));

        // Find any img alt tags
        const regexImg = /alt="([^"]+)"/gi;
        const altNames = [];
        while ((m = regexImg.exec(html)) !== null) {
            const alt = m[1].trim();
            if (alt && alt.length > 2 && !alt.includes('LaLiga') && !alt.includes('FutbolFantasy') && !alt.includes('escudo') && !alt.includes('logo')) {
                altNames.push(alt);
            }
        }
        console.log("Found alt names:", altNames.length, altNames.slice(0, 15));

    } catch (e) {
        console.error(e.message);
    }
}

inspectLineups();
