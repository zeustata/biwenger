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
        console.log("Fetching La Liga DB...");
        const db = await biwengerApi.get('/competitions/la-liga/data?lang=es&score=5');
        console.log("DB Keys:", Object.keys(db.data.data));
        
        console.log("\nFetching League Info...");
        const league = await biwengerApi.get('/league?include=all');
        console.log("League Keys:", Object.keys(league.data.data));
        
        console.log("\nFetching Board...");
        const board = await biwengerApi.get('/league/board?type=transfer,market&limit=10');
        console.log("Board length:", board.data.data.length);
        if (board.data.data.length > 0) {
            console.log("Board sample:", JSON.stringify(board.data.data[0], null, 2));
        }
        
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

test();
