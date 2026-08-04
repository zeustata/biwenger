require('dotenv').config();
const axios = require('axios');

const biwengerApi = axios.create({
    baseURL: 'https://biwenger.as.com/api/v2',
    headers: {
        'Authorization': `Bearer ${process.env.BIWENGER_TOKEN}`,
        'X-League': process.env.BIWENGER_LEAGUE_ID,
        'X-User': process.env.BIWENGER_USER_ID
    }
});

async function test() {
    try {
        const db = await biwengerApi.get('/competitions/la-liga/data?lang=es&score=5');
        const rounds = db.data.data.rounds;
        if (rounds) {
            console.log("Rounds available:", Object.keys(rounds).length);
            const r1 = Object.values(rounds)[0];
            console.log("Round 1 keys:", Object.keys(r1));
            console.log("Round 1 sample:", JSON.stringify(r1, null, 2));
        } else {
            console.log("No rounds in DB");
        }
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

test();
