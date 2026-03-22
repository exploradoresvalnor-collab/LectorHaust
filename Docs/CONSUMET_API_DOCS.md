# Consumet API Documentation

## Introduction
The base URL for the Consumet REST API is: [https://mi-api-manga.vercel.app](https://mi-api-manga.vercel.app)

## List of Providers
Consumet supports a wealth of API providers, which can be categorized into the following groups:

### Anime
- **AnimePahe**: Often provides high quality anime streaming links.
- **AnimeKai**: A modern anime streaming site with MegaUp servers.
- **AnimeSama**: French anime streaming provider.
- **AnimeSaturn**: 🇮🇹 Italian anime streaming provider.
- **AnimeUnity**: 🇮🇹 Italian anime streaming provider.
- **HiAnime**: High quality anime streaming with sub/dub options, spotlight, and schedule features.
- **KickAssAnime**: Anime streaming with multiple server options.

### Books
- **Libgen**: Currently the only provider for books - a vast library of e-books available for download.

### Comics
- **GetComics**: Currently the only provider for comics - read & download comics for free online!

### Light Novels
- **NovelUpdates**: The most comprehensive light novel database with chapter links.
- **Read Light Novels**: Read your favourite light novel series online here.

### Manga
- **AsuraScans**: Popular manhwa/manhua reading site with fast releases.
- **ComicK**: Fast and comprehensive manga reading platform.
- **Mangadex**: Hosts 10,000s of chapters of scanlated manga.
- **Mangahere**: English-translated manga for free online with rankings and trending.
- **Mangakakalot**: Read manga online in English with search suggestions and genre filtering.
- **Mangapill**: Your daily dose of manga!
- **Mangareader**: A great provider for manga images with high quality scans.
- **WeebCentral**: Manga reading platform with a vast collection.

### Meta
- **Anilist for Anime**: A metadata provider used to aggregate anime data from Anilist, and to accurately map these anime to publicly-available streaming links.
- **Anilist for Manga**: A metadata provider used to aggregate manga data from Anilist, and to accurately map these manga to publicly-available streaming links.
- **MyAnimeList**: A metadata provider used to aggregate media (primarily anime & manga) data from MyAnimeList, and to accurately map these media to publicly-available streaming links.
- **The Movie Database (TMDB)**: A metadata provider that returns data about current, past & upcoming TV shows/movies, and accurately map these media to publicly-available streaming links.

### Movies
- **Dramacool**: Provides mainly K-Dramas & other similar Asian content with spotlight features.
- **FlixHQ**: Provides 1,000s of high-quality movies & series with spotlight and trending features.
- **Goku**: Movies & TV shows streaming with trending features.
- **HiMovies**: Movies & TV shows streaming platform.
- **SFlix**: Movies & TV shows with spotlight features.
- **Turkish123**: Turkish dramas and TV shows streaming.

### News
- **AnimeNewsNetwork**: Serves 10s of stories regarding the latest Japanese media news per day: "The internet's most trusted anime news source."

## FAQ
### How do I fix a source error (503)?
Add the relevant User-Agent header.

### CORS causing trouble?
Use the Consumet CORS proxy.

## API Usage Examples (AnimeKai)

### Search
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/{query}`

**Request Sample (JavaScript)**:
```javascript
import axios from "axios";
const url = "https://mi-api-manga.vercel.app/anime/animekai/naruto";
const { data } = await axios.get(url, { params: { page: 1 } });
```

### Get Anime Info
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/info?id={id}`

### Get Episode Streaming Links
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/watch/{episodeId}`

### Get Episode Servers
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/servers/{episodeId}`

### Recently Added
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/recent-added`

### New Releases
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/new-releases`

### Latest Completed
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/latest-completed`

### Genre List
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/genre/list`

### Search by Genre
**Route Schema**: `https://mi-api-manga.vercel.app/anime/animekai/genre/{genre}`

