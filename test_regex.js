const fs = require('fs');

async function testRegex() {
    const htmlResponse = await fetch('https://manga-proxy.mchaustman.workers.dev/?url=' + encodeURIComponent('https://jkanime.net/buscar/Seihantai%20na%20Kimi%20to%20Boku/'));
    const html = await htmlResponse.text();
    
    console.log("HTML length:", html.length);
    
    // Pattern based on S-C search results (flexible class matching for g-0 prefix, and flexible closing tag for style attributes)
    const regex = /<div class="[^"]*anime__item">[\s\S]*?<a href="https:\/\/jkanime\.net\/([^/]+)\/">[\s\S]*?<div class="[^"]*anime__item__pic[^"]*" data-setbg="([^"]+)"[^>]*>[\s\S]*?<h5><a[^>]*>([^<]+)<\/a><\/h5>/gi;
    
    const results = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            id: match[1],
            title: match[3].trim(),
            name: match[3].trim(),
            image: match[2],
            source: 'jkanime'
        });
    }
    
    console.log("Results found:", results);
    
    if (results.length === 0) {
        // Find if anime__item__pic even exists
        const picMatch = html.match(/anime__item__pic/g);
        console.log("anime__item__pic occurrences:", picMatch ? picMatch.length : 0);
        
        // Find if data-setbg exists
        const bgMatch = html.match(/data-setbg/g);
        console.log("data-setbg occurrences:", bgMatch ? bgMatch.length : 0);
        
        // Try to match up to image
        const partialRegex = /<div class="[^"]*anime__item__pic[^"]*"[^>]*>/g;
        const pMatch = partialRegex.exec(html);
        console.log("Partial pic match:", pMatch ? pMatch[0] : null);
    }
}

testRegex();
