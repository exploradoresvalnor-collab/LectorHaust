async function test() {
  const res = await fetch('https://www3.animeflv.net/browse?q=naruto');
  const html = await res.text();
  
  const regex1 = /<article class="Anime alt B">[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="Title">([^<]+)<\/h3>/gi;
  const regex2 = /<article class="Anime[^"]*">[\s\S]*?<a href="\/anime\/([^"]+)">[\s\S]*?<img src="([^"]+)"[\s\S]*?<h3 class="Title">([^<]+)<\/h3>/gi;
  
  const match1 = html.match(regex1);
  const match2 = html.match(regex2);
  
  console.log("Match alt B:", match1 ? match1.length : 0);
  console.log("Match any Anime class:", match2 ? match2.length : 0);
}
test();
