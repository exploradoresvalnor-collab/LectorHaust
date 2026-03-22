const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';
const BASE_URL = 'https://mangapill.com';

async function fetchHtml(url) {
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    return resp.text();
}

async function run() {
    console.log("--- Testing Search ---");
    const searchHtml = await fetchHtml(`${BASE_URL}/search?q=mashle`);
    const matches = [...searchHtml.matchAll(/<a[^>]*href="\/manga\/(\d+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    
    if (matches.length > 0) {
        const m = matches[0];
        console.log("First Match Inner HTML snippet:", m[3].substring(0, 500));
        const imgMatch = m[3].match(/data-src="([^"]+)"/) || m[3].match(/src="([^"]+)"/);
        console.log("Img Match:", imgMatch ? imgMatch[1] : "NOT FOUND");
    }

    console.log("\n--- Testing Details ---");
    const detailsHtml = await fetchHtml(`${BASE_URL}/manga/2816/mashle`);
    console.log("Details HTML snippet (Poster search):");
    const posterIdx = detailsHtml.indexOf('Poster');
    if (posterIdx !== -1) {
        console.log(detailsHtml.substring(posterIdx - 100, posterIdx + 200));
    } else {
        console.log("Keyword 'Poster' not found. Searching for 'img' tags...");
        const imgMatches = [...detailsHtml.matchAll(/<img[^>]*src="([^"]+)"/g)];
        imgMatches.slice(0, 5).forEach(im => console.log("Img src found:", im[1]));
    }
}

run();
