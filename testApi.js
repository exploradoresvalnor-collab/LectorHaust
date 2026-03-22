const https = require('https');

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            resolve({ error: true, status: res.statusCode, body: data.substring(0, 100) });
          } else {
            resolve(JSON.parse(data));
          }
        } catch(e) {
          resolve({ error: true, msg: e.message, body: data.substring(0, 100) });
        }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  const BASE_URL = 'https://mi-api-manga.vercel.app';
  
  console.log("=== MANGA TESTS ===");
  // Test MangaDex search for Solo Leveling
  console.log("1. MangaDex Search (Solo Leveling)");
  const mdSearch = await fetchJSON(`${BASE_URL}/manga/mangadex/Solo Leveling`);
  if (mdSearch.results && mdSearch.results.length > 0) {
    const mangaId = mdSearch.results[0].id;
    console.log(`   Found ID: ${mangaId}`);
    
    // Test MangaDex Info
    console.log("2. MangaDex Info");
    const mdInfo = await fetchJSON(`${BASE_URL}/manga/mangadex/info/${mangaId}`);
    if (mdInfo.chapters && mdInfo.chapters.length > 0) {
       const chapterId = mdInfo.chapters[0].id;
       console.log(`   Found Chapter ID: ${chapterId}`);
       
       // Test MangaDex Read
       console.log("3. MangaDex Read Chapter");
       const mdRead = await fetchJSON(`${BASE_URL}/manga/mangadex/read/${chapterId}`);
       if (mdRead.error) {
         console.log("   FAILED:", mdRead);
       } else if (Array.isArray(mdRead) && mdRead.length === 0) {
         console.log("   FAILED: Empty Array Returned []");
       } else {
         console.log(`   SUCCESS: Found ${mdRead.length} pages`);
         console.log(`   Sample: ${JSON.stringify(mdRead[0])}`);
       }
    }
  }

  console.log("\n=== ANIME TESTS ===");
  console.log("1. Gogoanime Search (Naruto)");
  const gogoSearch = await fetchJSON(`${BASE_URL}/anime/gogoanime/naruto`);
  if (gogoSearch.results && gogoSearch.results.length > 0) {
    const animeId = gogoSearch.results[0].id;
    console.log(`   Found ID: ${animeId}`);
    
    console.log("2. Gogoanime Info");
    const gogoInfo = await fetchJSON(`${BASE_URL}/anime/gogoanime/info/${animeId}`);
    if (gogoInfo.episodes && gogoInfo.episodes.length > 0) {
       const episodeId = gogoInfo.episodes[0].id;
       console.log(`   Found Episode ID: ${episodeId}`);
       
       console.log("3. Gogoanime Watch/Streaming Links");
       const gogoWatch = await fetchJSON(`${BASE_URL}/anime/gogoanime/watch/${episodeId}`);
       if (gogoWatch.error) {
         console.log("   FAILED:", gogoWatch);
       } else if (gogoWatch.sources) {
         console.log(`   SUCCESS: Found sources! Default quality: ${gogoWatch.sources[0].quality}`);
       }
    }
  }
}

runTests().catch(console.error);
