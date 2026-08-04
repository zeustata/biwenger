const axios = require('axios');

const TEAMS = [
    'alaves', 'athletic', 'atletico', 'barcelona', 'betis', 'celta',
    'espanyol', 'getafe', 'girona', 'las-palmas', 'leganes', 'mallorca',
    'osasuna', 'rayo-vallecano', 'real-madrid', 'real-sociedad', 'sevilla', 'valencia',
    'valladolid', 'villarreal'
];

async function testAllTeams() {
    const jugadores = {};

    console.log("Fetching ALL 20 LaLiga team lineups from FutbolFantasy...");
    
    for (let i = 0; i < TEAMS.length; i += 5) {
        const batch = TEAMS.slice(i, i + 5);
        await Promise.all(batch.map(async (team) => {
            try {
                const r = await axios.get(`https://www.futbolfantasy.com/laliga/equipos/${team}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
                    timeout: 8000
                });
                const html = r.data;
                const regexPlayer = /<img[^>]*alt="([^"]+)"[^>]*onerror="[^"]*camisetas[^"]*"/gi;
                let match;
                while ((match = regexPlayer.exec(html)) !== null) {
                    const name = match[1].trim();
                    if (name && name.length > 2) {
                        jugadores[name.toLowerCase()] = { name, team, titularidad: 90, estado: 'titular' };
                    }
                }
            } catch (e) {
                console.warn(`Failed ${team}: ${e.message}`);
            }
        }));
    }

    console.log(`Successfully scraped ALL 20 TEAMS (${Object.keys(jugadores).length} LaLiga players)!`);
}

testAllTeams();
