const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';
const TARGET_URL = 'https://mangapill.com/search?q=mashle';

async function test() {
    try {
        const resp = await fetch(`${PROXY_URL}${encodeURIComponent(TARGET_URL)}`);
        const text = await resp.text();
        const matches = [...text.matchAll(/<div[^>]*>\s*<a[^>]*href="\/manga\/(\d+)\/([^"]+)"[^>]*>\s*<img[^>]*src="([^"]+)"/g)];
        console.log('Matches found:', matches.length);
        matches.forEach(m => {
            console.log(`ID: ${m[1]}, Slug: ${m[2]}, Cover: ${m[3]}`);
        });
        
        // Let's also try to find the title
        const matchesWithTitle = [...text.matchAll(/<a[^>]*href="\/manga\/\d+\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g)];
        console.log('Title matches found:', matchesWithTitle.length);
        matchesWithTitle.forEach(m => {
             console.log(`Content: ${m[1].trim()}`);
        });

    } catch (e) {
        console.error(e);
    }
}

test();
