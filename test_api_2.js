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
        console.log("Fetching activeEvents...");
        const db = await biwengerApi.get('/competitions/la-liga/data?lang=es&score=5');
        console.log("activeEvents:", JSON.stringify(db.data.data.activeEvents, null, 2));
        
        console.log("\nFetching Board properly...");
        try {
            const board1 = await biwengerApi.get(`/league/${process.env.BIWENGER_LEAGUE_ID}/board?type=transfer,market&limit=5`);
            console.log("Board with ID in URL:", board1.data.data.length);
        } catch (e) {
            console.log("Board with ID in URL failed:", e.response ? e.response.data : e.message);
        }
        
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

test();
