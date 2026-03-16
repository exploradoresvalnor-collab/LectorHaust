/**
 * Jikan API Service (MyAnimeList wrapper)
 */
import { fetchJSON } from './apiHelpers';

const BASE_URL = 'https://api.jikan.moe/v4';

export const jikanService = {
    async getRelatedAnime(malId: number) {
        try {
            const data = await fetchJSON(`${BASE_URL}/manga/${malId}/relations`);
            return data.data.filter((rel: any) => rel.relation === 'Adaptation' || rel.relation === 'Other');
        } catch {
            return [];
        }
    },

    async getCharacters(malId: number) {
        try {
            const data = await fetchJSON(`${BASE_URL}/manga/${malId}/characters`);
            return data.data;
        } catch {
            return [];
        }
    },

    async getExternalLinks(malId: number) {
        try {
            const data = await fetchJSON(`${BASE_URL}/manga/${malId}/external`);
            return data.data;
        } catch {
            return [];
        }
    }
};
