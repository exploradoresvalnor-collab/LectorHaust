const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';
const BASE_URL = 'https://mangapill.com';

async function fetchHtml(url) {
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    return resp.text();
}

async function searchManga(query) {
    const html = await fetchHtml(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
    const matches = [...html.matchAll(/<a[^>]*href="\/manga\/(\d+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    
    return matches.map(m => {
        const id = `mp:${m[1]}/${m[2]}`;
        const slug = m[2];
        const innerHtml = m[3];
        const imgMatch = innerHtml.match(/data-src\s*=\s*"([^"]+)"/i) || innerHtml.match(/src\s*=\s*"([^"]+)"/i);
        const coverUrl = imgMatch ? imgMatch[1] : null;
        const titleMatch = innerHtml.match(/<div[^>]*>\s*([^<]+)\s*<\/div>/);
        const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase();

        return { id, title, coverUrl };
    });
}

async function getMangaDetails(id) {
    const [numId, slug] = id.replace('mp:', '').split('/');
    const url = `${BASE_URL}/manga/${numId}/${slug}`;
    const html = await fetchHtml(url);

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase();

    const descMatch = html.match(/<p[^>]*class="[^"]*text-secondary[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                      html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const description = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, '') : 'No desc';

    const genreMatches = [...html.matchAll(/href="\/search\?genre=([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
    const tags = genreMatches.map(g => g[2].trim());

    const coverMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*Poster[^"]*"/i) ||
                       html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*rounded[^"]*"/i) ||
                       html.match(/<img[^>]*src="([^"]+)"/i);
    const coverUrl = coverMatch ? coverMatch[1] : null;

    return { title, description, tags, coverUrl };
}

async function run() {
    console.log("--- FINAL SEARCH TEST ---");
    const results = await searchManga('mashle');
    console.log(JSON.stringify(results.slice(0, 2), null, 2));
    
    if (results.length > 0) {
        console.log("\n--- FINAL DETAILS TEST ---");
        const details = await getMangaDetails(results[0].id);
        console.log(JSON.stringify(details, null, 2));
    }
}

run();
