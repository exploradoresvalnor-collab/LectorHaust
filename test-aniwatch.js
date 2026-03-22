const url = 'https://apideaniwatch.vercel.app/api/v2/hianime/search?q=mashle';
fetch(url)
  .then(r => r.json())
  .then(data => {
    console.log("Search Result:");
    console.log(data);
    const animeId = data.data.animes[0].id;
    console.log("\nFetching episodes for:", animeId);
    return fetch(`https://apideaniwatch.vercel.app/api/v2/hianime/anime/${animeId}/episodes`);
  })
  .then(r => r.json())
  .then(data => {
    console.log("\nEpisodes Result:");
    const epId = data.data.episodes[0].episodeId;
    console.log("Fetching sources for:", epId);
    return fetch(`https://apideaniwatch.vercel.app/api/v2/hianime/episode/sources?animeEpisodeId=${encodeURIComponent(epId)}`);
  })
  .then(r => r.json())
  .then(data => {
    console.log("\nSources Result:");
    console.log(JSON.stringify(data, null, 2));
  })
  .catch(console.error);
