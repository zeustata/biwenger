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
        const ev = await biwengerApi.get('/events');
        console.log("Events:", JSON.stringify(ev.data.data, null, 2));
    } catch (e) {
        console.log("Events failed:", e.response ? e.response.data : e.message);
    }
}

test();
