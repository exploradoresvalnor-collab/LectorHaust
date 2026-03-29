async function testRegex() {
    const htmlResponse = await fetch('https://manga-proxy.mchaustman.workers.dev/?url=' + encodeURIComponent('https://jkanime.net/directorio/'));
    const html = await htmlResponse.text();
    
    const pMatch = html.match(/<div class="[^"]*anime__item">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/);
    console.log(pMatch ? pMatch[0].substring(0, 1500) : "NO MATCH");
}

testRegex();
