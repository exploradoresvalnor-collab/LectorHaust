const fetch = require('node-fetch');
async function run() {
    const r = await fetch('https://lacartoons.com/serie/bob-esponja');
    const html = await r.text();
    const links = Array.from(html.matchAll(/href=\"([^\"]+)\"/g)).map(m=>m[1]);
    const setLinks = Array.from(new Set(links));
    console.log(setLinks.filter(l => l.includes('bob-esponja') || l.includes('capitulo')));
}
run();
