import { mangadexService } from './mangadexService';

export interface MangaUpdate {
  mangaId: string;
  mangaTitle: string;
  chapterTitle: string;
  chapterId: string;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Checks if any of the user's favorite manga have new chapters.
 * @param favorites List of favorite manga from the store.
 * @param hours How far back to check (default 24h).
 */
export const checkUpdatesForLibrary = async (favorites: any[], hours = 24): Promise<MangaUpdate[]> => {
  const updates: MangaUpdate[] = [];
  const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);

  // We check them sequentially with delays to respect MangaDex rate limits.
  for (const manga of favorites.slice(0, 10)) { // Limit to top 10 for performance/rate-limits
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
            chapterId: lastChapter.id
          });
        }
      }
    } catch (err) {
      console.error(`Error checking updates for ${manga.title}:`, err);
    }
  }

  return updates;
};
