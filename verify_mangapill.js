// Mock Capacitor for the test script
const Capacitor = { isNativePlatform: () => false };

// Import or copy the service logic for testing
// Since I can't easily import from the TS file in a plain node script without setup, 
// I'll just copy the relevant parts or use a dynamic require if possible.
// Actually, I'll just write a script that imports the service if it's already compiled, 
// or I'll just use the logic I wrote to verify it works against the real site.

const BASE_URL = 'https://mangapill.com';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function fetchHtml(url) {
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    return resp.text();
}

async function testSearch(query) {
    console.log(`--- Searching for: ${query} ---`);
    const html = await fetchHtml(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
    const matches = [...html.matchAll(/<a[^>]*href="\/manga\/(\d+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
    
    const results = matches.map(m => {
        const id = `mp:${m[1]}/${m[2]}`;
        const slug = m[2];
        const innerHtml = m[3];
        const imgMatch = innerHtml.match(/data-src="([^"]+)"/) || innerHtml.match(/src="([^"]+)"/);
        const coverUrl = imgMatch ? imgMatch[1] : null;
        const titleMatch = innerHtml.match(/<div[^>]*>([^<]+)<\/div>/);
        const title = titleMatch ? titleMatch[1].trim() : slug.toUpperCase();

        return { id, title, coverUrl };
    });

    console.log(JSON.stringify(results.slice(0, 2), null, 2));
    return results[0];
}

async function testDetails(id) {
    console.log(`--- Getting details for: ${id} ---`);
    const [numId, slug] = id.replace('mp:', '').split('/');
    const url = `${BASE_URL}/manga/${numId}/${slug}`;
    const html = await fetchHtml(url);

    const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const title = titleMatch ? titleMatch[1].trim() : 'Unknown';

    const descMatch = html.match(/<p[^>]*class="[^"]*text-secondary[^"]*"[^>]*>([\s\S]*?)<\/p>/);
    const description = descMatch ? descMatch[1].trim() : 'No desc';

    const genreMatches = [...html.matchAll(/href="\/search\?genre=([^"]+)"[^>]*>([^<]+)<\/a>/g)];
    const tags = genreMatches.map(g => g[2].trim());

    const coverMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*Poster[^"]*"/);
    const coverUrl = coverMatch ? coverMatch[1] : null;

    console.log({ title, description: description.substring(0, 100) + '...', tags, coverUrl });
}

async function run() {
    const firstResult = await testSearch('mashle');
    if (firstResult) {
        await testDetails(firstResult.id);
    }
}

run();
