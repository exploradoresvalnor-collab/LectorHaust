import { useState, useEffect } from 'react';
import { anilistService } from '../services/anilistService';
import { mangaProvider } from '../services/mangaProvider';
import { animeflvService } from '../services/animeflvService';

interface CrossMediaResult {
  id: string; // ID depending on destination (MangaDex ID or Aniwatch ID)
  title: string;
  coverImage: {
    large: string;
    extraLarge: string;
  };
  type: 'ANIME' | 'MANGA';
  destinationUrl: string; // e.g. /anime/id or /manga/id
}

export function useCrossMedia(title: string | null | undefined, currentType: 'MANGA' | 'ANIME') {
  const [crossMedia, setCrossMedia] = useState<CrossMediaResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // DISABLED: Cross-Media search causes excessive AniList rate-limiting
  // This feature is non-essential and was causing cascading searches
  // Re-enable after implementing proper request deduplication and caching
  
  useEffect(() => {
    if (true) { // DISABLED FLAG
      setLoading(false);
      return;
    }
    
    let active = true;
    
    const fetchCrossMedia = async () => {
      if (!title) {
        if (active) setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const targetType = currentType === 'MANGA' ? 'ANIME' : 'MANGA';
        
        // 1. Buscamos en AniList el "Cross Media" utilizando nuestro Proxy unificado
        try {
          // Reutilizamos la función getAnimeDetailsByName o hacemos una query limpia a través de anilistService
          const res = await anilistService.getAnimeDetailsByName(title);
          
          if (!res || !active) {
            setLoading(false);
            return;
          }
          
          const foundTitle = res.title?.english || res.title?.romaji || res.title?.native || title;

          // 2. Resolver el ID dentro de nuestro ecosistema 
          let resolvedId: string | null = null;
          let routePrefix = '';

          if (targetType === 'ANIME') {
            let searchRes = await animeflvService.search(foundTitle);
            if (searchRes && searchRes.length > 0) {
              resolvedId = searchRes[0].id;
              routePrefix = '/anime';
            }
          } else {
            const verifiedManga = await mangaProvider.fetchVerifiedRecommendation(foundTitle, false);
            if (verifiedManga) {
              resolvedId = verifiedManga.id;
              routePrefix = '/manga';
            }
          }

          if (active && resolvedId) {
            setCrossMedia({
              id: resolvedId,
              title: foundTitle,
              coverImage: {
                large: res.coverImage?.large,
                extraLarge: res.coverImage?.extraLarge || res.coverImage?.large
              },
              type: targetType,
              destinationUrl: `${routePrefix}/${resolvedId}`
            });
          }
        } catch (err) {
          // Fallo silencioso en caso de rate limit
        }
      } catch (err) {
        console.warn('Cross media finding error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchCrossMedia();

    return () => {
      active = false;
    };
  }, [title, currentType]);

  return { crossMedia, loadingCrossMedia: loading };
}
