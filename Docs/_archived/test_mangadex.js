const chapterId = 'c17621f3-2fdb-4cce-9e0c-806d203f56dd'; // Let's get an actual chapter ID.
// actually let's just fetch the feed of Solo Leveling.
const mangaId = 'ade0306c-f4b6-4890-9edb-1ddf04df2039';
fetch(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&limit=1`)
.then(r => r.json())
.then(data => {
    console.log("Feed:", data.data[0]);
    const cid = data.data[0].id;
    return fetch(`https://api.mangadex.org/at-home/server/${cid}`);
})
.then(r => r.json())
.then(atHome => {
    console.log("AtHome:", atHome);
})
.catch(err => console.error(err));
