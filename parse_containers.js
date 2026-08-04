const fs = require('fs');

const html = fs.readFileSync('rm_full.html', 'utf8');

function parseTeamHTML(html) {
    const titulares = new Set();
    const lesionados = new Set();
    const otros = new Set();

    // 1. Extract players from mod alineacion_wrapper (Starting XI)
    const alineacionSection = html.match(/class="[^"]*mod\s+alineacion_wrapper[\s\S]*?(?=class="[^"]*mod\s+lesionados|class="[^"]*mod\s+sancionados|<footer)/i);
    if (alineacionSection) {
        const regexImg = /alt="([^"]+)"/gi;
        let m;
        while ((m = regexImg.exec(alineacionSection[0])) !== null) {
            const name = m[1].trim();
            if (name && name.length > 2 && !name.includes('LaLiga') && !name.includes('FutbolFantasy') && !name.includes('escudo') && !name.includes('logo') && !name.includes('Vista')) {
                titulares.add(name);
            }
        }
    }

    // 2. Extract players from mod lesionados & mod sancionados
    const bajaSection = html.match(/class="[^"]*mod\s+(lesionados|sancionados)[\s\S]*?(?=class="[^"]*mod\s+traspasos|<footer)/gi) || [];
    bajaSection.forEach(sec => {
        const regexImg = /alt="([^"]+)"/gi;
        let m;
        while ((m = regexImg.exec(sec)) !== null) {
            const name = m[1].trim();
            if (name && name.length > 2 && !name.includes('LaLiga') && !name.includes('FutbolFantasy')) {
                lesionados.add(name);
            }
        }
    });

    // 3. Extract all other squad players
    const regexImgAll = /alt="([^"]+)"/gi;
    let m;
    while ((m = regexImgAll.exec(html)) !== null) {
        const name = m[1].trim();
        if (name && name.length > 2 && !name.includes('LaLiga') && !name.includes('FutbolFantasy') && !name.includes('escudo') && !name.includes('logo') && !name.includes('Vista')) {
            if (!titulares.has(name) && !lesionados.has(name)) {
                otros.add(name);
            }
        }
    }

    return {
        titulares: Array.from(titulares),
        lesionados: Array.from(lesionados),
        otros: Array.from(otros)
    };
}

const parsed = parseTeamHTML(html);
console.log("🟢 TITULARES XI (" + parsed.titulares.length + "):", parsed.titulares);
console.log("🔴 LESIONADOS / BAJAS (" + parsed.lesionados.length + "):", parsed.lesionados);
console.log("🟡 ROTACIÓN / BANQUILLO (" + parsed.otros.length + "):", parsed.otros.slice(0, 10));
