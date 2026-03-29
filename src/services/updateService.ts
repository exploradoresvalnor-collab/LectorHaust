import { mangadexService } from './mangadexService';
import { animeflvService } from './animeflvService';

export interface MangaUpdate {
  mangaId: string;
  mangaTitle: string;
  chapterTitle: string;
  chapterId: string;
  type: 'manga' | 'anime';
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Checks if any of the user's favorite manga or anime have new chapters/episodes.
 * @param favorites List of favorite items (manga and anime) from the store.
 * @param hours How far back to check (default 24h).
 */
export const checkUpdatesForLibrary = async (favorites: any[], hours = 24): Promise<MangaUpdate[]> => {
  const updates: MangaUpdate[] = [];
  const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

  // 1. CHECK MANGA UPDATES (MangaDex)
  // We check them sequentially with delays to respect MangaDex rate limits.
  const favMangas = favorites.filter(f => f.format !== 'Anime');
  for (const manga of favMangas.slice(0, 10)) { // Limit to top 10 for performance/rate-limits
    try {
      await delay(300); // Rate-limit: max ~3 req/s
      // Fetch the latest chapter for this manga in Spanish (Spain or LA)
      const feed = await mangadexService.getMangaChapters(manga.id, ['es', 'es-la'] as any, 1, 0);
      
      if (feed.data && feed.data.length > 0) {
        const lastChapter = feed.data[0];
        const createdAt = new Date(lastChapter.attributes.createdAt);
        
        if (createdAt > timeThreshold) {
          updates.push({
            mangaId: manga.id,
            mangaTitle: manga.title,
            chapterTitle: lastChapter.attributes.chapter || 'Nuevo',
            chapterId: lastChapter.id,
            type: 'manga'
          });
        }
      }
    } catch (err) {
      console.error(`Error checking updates for ${manga.title}:`, err);
    }
  }

  // 2. CHECK ANIME UPDATES (AnimeFLV)
  try {
    const recentEps = await animeflvService.getRecentEpisodes();
    const favAnimes = favorites.filter(f => f.format === 'Anime');
    
    for (const ep of recentEps) {
      const match = favAnimes.find(f => f.id === ep.animeId);
      if (match) {
        updates.push({
          mangaId: ep.animeId,
          mangaTitle: match.title,
          chapterTitle: ep.title,
          chapterId: ep.id,
          type: 'anime'
        });
      }
    }
  } catch (err) {
    console.error(`Error checking anime updates:`, err);
  }

  return updates;
};
