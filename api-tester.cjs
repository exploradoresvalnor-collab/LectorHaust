const https = require('https');

const fetchUrl = (url) => {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => resolve({ status: 'error', data: err.message }));
  });
};

const apisToTest = [
  'https://api-aniwatch.onrender.com/api/v2/hianime/episode/sources?animeEpisodeId=one-piece-100%3Fep%3D2142&server=hd-1&category=sub',
  'https://aniwatch-rest-api.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=one-piece-100%3Fep%3D2142&server=hd-1&category=sub',
  'https://hianime-api-gamma.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=one-piece-100%3Fep%3D2142&server=hd-1&category=sub',
  'https://aniwatch-api-v1-0.onrender.com/api/v2/hianime/episode/sources?animeEpisodeId=one-piece-100%3Fep%3D2142&server=hd-1&category=sub',
  'https://aniwatch-api-cyan.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=one-piece-100%3Fep%3D2142&server=hd-1&category=sub'
];

async function runTests() {
  console.log('Testing public API instances for HiAnime...');
  for (const url of apisToTest) {
    console.log(`\nTesting: ${new URL(url).hostname}`);
    try {
      const res = await fetchUrl(url);
      console.log(`Status: ${res.status}`);
      if (res.status === 200) {
        const parsed = JSON.parse(res.data);
        if (parsed.data && parsed.data.sources && parsed.data.sources.length > 0) {
          console.log('✅ SUCCESS! Found working sources!');
          console.log(parsed.data.sources[0].url.substring(0, 100) + '...');
        } else {
          console.log('❌ 200 OK but NO sources found.');
        }
      } else {
        console.log(`❌ Failed with ${res.status}`);
      }
    } catch (e) {
      console.log(`❌ Error parsing response`);
    }
  }
}

runTests();
