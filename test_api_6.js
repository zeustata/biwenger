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
        const board = await biwengerApi.get(`/league/${process.env.BIWENGER_LEAGUE_ID}/board?type=transfer,market&limit=5`);
        const moves = board.data.data;
        console.log(JSON.stringify(moves, null, 2));
    } catch (e) {
        console.error(e.response ? e.response.data : e.message);
    }
}

test();
