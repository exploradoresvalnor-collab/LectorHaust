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
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    
    const fetchCrossMedia = async () => {
      if (!title) {
        if (active) setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const targetType = currentType === 'MANGA' ? 'ANIME' : 'MANGA';
        
        // 1. Buscamos en AniList el "Cross Media"
        const query = `
          query ($search: String, $type: MediaType) {
            Media(search: $search, type: $type, sort: SEARCH_MATCH) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                extraLarge
              }
              type
              format
            }
          }
        `;
        
        const variables = {
          search: title,
          type: targetType
        };

        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ query, variables })
        }).catch(() => null);

        if (!response || !response.ok) {
           if (active) setLoading(false);
           return;
        }

        const data = await response.json();
        const media = data?.data?.Media;
        
        if (!media || !active) {
          setLoading(false);
          return;
        }

        const foundTitle = media.title.english || media.title.romaji || media.title.native;

        // 2. Resolver el ID dentro de nuestro ecosistema 
        let resolvedId: string | null = null;
        let routePrefix = '';

        if (targetType === 'ANIME') {
          // Verify on AnimeFLV
          const searchRes = await animeflvService.search(foundTitle);
          if (searchRes && searchRes.length > 0) {
            resolvedId = searchRes[0].id;
            routePrefix = '/anime';
          }
        } else {
          // Verify on MangaDex
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
              large: media.coverImage.large,
              extraLarge: media.coverImage.extraLarge || media.coverImage.large
            },
            type: targetType,
            destinationUrl: `${routePrefix}/${resolvedId}`
          });
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
