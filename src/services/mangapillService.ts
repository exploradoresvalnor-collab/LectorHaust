/**
 * MangaPill Scraping Service
 * 
 * Used as a fallback for titles blocked on MangaDex (e.g. Mashle).
 * Since MangaPill doesn't have an official API, we scrape its HTML.
 */

import { Capacitor } from '@capacitor/core';

const BASE_URL = 'https://mangapill.com';
const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

async function fetchHtml(url: string) {
    // We always use the proxy on web to bypass CORS and Referer restrictions
    if (Capacitor.isNativePlatform()) {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`MangaPill Error: ${resp.status}`);
        return resp.text();
    }
    
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (!resp.ok) throw new Error(`Proxy Error: ${resp.status}`);
    return resp.text(); // The manga-proxy returns the body directly
}


export const mangapillService = {
    async searchManga(query: string) {
        const html = await fetchHtml(`${BASE_URL}/search?q=${encodeURIComponent(query)}`);
        
        // Broader regex to capture the whole link block
        const matches = [...html.matchAll(/<a[^>]*href="\/manga\/(\d+)\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
        
        return matches.map(m => {
            const id = `mp:${m[1]}$${m[2]}`;
            const slug = m[2];
            const innerHtml = m[3];
            
            // Extract cover: look for data-src first (lazy loading), then src
            const imgMatch = innerHtml.match(/data-src\s*=\s*"([^"]+)"/i) || 
                             innerHtml.match(/src\s*=\s*"([^"]+)"/i);
            const coverUrl = imgMatch ? imgMatch[1] : null;

            // Extract title: usually the text inside the div with certain classes
            // We'll take the first non-empty div content
            const titleMatch = innerHtml.match(/<div[^>]*>\s*([^<]+)\s*<\/div>/);
            const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase();

            return {
                id: id,
                attributes: {
                    title: { en: title },
                    description: { en: '' }
                },
                relationships: coverUrl ? [{
                    type: 'cover_art',
                    attributes: { fileName: Capacitor.isNativePlatform() ? coverUrl : `${PROXY_URL}${encodeURIComponent(coverUrl)}` }
                }] : [],
                source: 'mangapill' as const
            };
        });
    },

    async getMangaDetails(id: string) {
        const [numId, slug] = id.includes('$') ? id.split('$') : id.includes('/') ? id.split('/') : [id, ''];
        const url = `${BASE_URL}/manga/${numId}/${slug}`;
        const html = await fetchHtml(url);

        // Extract Title (H1)
        const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const title = titleMatch ? titleMatch[1].trim() : slug.replace(/-/g, ' ').toUpperCase();

        // Extract Description: look for p tag with text-secondary or simple p tags in the info block
        const descMatch = html.match(/<p[^>]*class="[^"]*text-secondary[^"]*"[^>]*>([\s\S]*?)<\/p>/i) ||
                          html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
        const description = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, '') : 'Sin descripción disponible (MangaPill).';

        // Extract Genres
        const genreMatches = [...html.matchAll(/href="\/search\?genre=([^"]+)"[^>]*>([^<]+)<\/a>/gi)];
        const tags = genreMatches.map(g => ({
            id: g[1],
            type: 'tag',
            attributes: { name: { en: g[2].trim() } }
        }));

        // Extract Cover: look for the main image in the header/info area
        // It usually has 'Poster' in alt, but we'll fallback to the first significant img
        const coverMatch = html.match(/<img[^>]*src="([^"]+)"[^>]*alt="[^"]*Poster[^"]*"/i) ||
                           html.match(/<img[^>]*src="([^"]+)"[^>]*class="[^"]*rounded[^"]*"/i) ||
                           html.match(/<img[^>]*src="([^"]+)"/i);
        const coverUrl = coverMatch ? coverMatch[1] : null;

        return {
            data: {
                id: `mp:${id}`,
                type: 'manga',
                attributes: {
                    title: { en: title },
                    description: { en: description },
                    tags: tags,
                    status: 'completed',
                    contentRating: 'safe'
                },
                relationships: coverUrl ? [{
                    type: 'cover_art',
                    attributes: { fileName: Capacitor.isNativePlatform() ? coverUrl : `${PROXY_URL}${encodeURIComponent(coverUrl)}` }
                }] : []
            }
        };
    },



    async getMangaChapters(mangaId: string, _lang: string | null = 'en', _limit = 500, _offset = 0) {
        const [numId, slug] = mangaId.includes('$') ? mangaId.split('$') : mangaId.includes('/') ? mangaId.split('/') : [mangaId, ''];
        const url = `${BASE_URL}/manga/${numId}/${slug}`;
        const html = await fetchHtml(url);
        
        const chapterMatches = [...html.matchAll(/href="\/chapters\/(\d+-\d+)\/([^"]+)"/g)];
        let chapters = chapterMatches.map((m, idx) => ({
            id: `mp:${m[1]}$${m[2]}@${mangaId}`, // Embed slug and mangaId context!
            attributes: {
                chapter: m[2].match(/chapter-(\d+)/)?.[1] || (chapterMatches.length - idx).toString(),
                title: m[2].replace(/-/g, ' '),
                translatedLanguage: 'en'
            },
            relationships: [{ type: 'manga', id: `mp:${mangaId}` }],
            source: 'mangapill' as const
        }));

        const total = chapters.length;

        // Ensure order isn't reversed by default unless requested (MangaPill is latest first already usually)
        // Apply limit and offset for pagination
        if (_offset >= 0 && _limit > 0) {
            chapters = chapters.slice(_offset, _offset + _limit);
        }

        return {
            data: chapters,
            total: total
        };
    },

    async getChapter(chapterId: string) {
        // chapterId is like "5323-10162000"
        // We need to return an object that looks like MangaDex's response
        const [cleanChapterId, rawMangaId] = chapterId.includes('@') ? chapterId.split('@') : [chapterId, ''];
        const numIdOnly = cleanChapterId.includes('$') ? cleanChapterId.split('$')[0] : cleanChapterId;
        
        return {
            data: {
                id: chapterId,
                type: 'chapter',
                attributes: {
                    chapter: numIdOnly.split('-')[1] || '1',
                    translatedLanguage: 'en'
                },
                relationships: [
                    { type: 'manga', id: rawMangaId ? `mp:${rawMangaId}` : `mp:${numIdOnly.split('-')[0]}` }
                ]
            }
        };
    },

    async getChapterPages(chapterId: string) {
        const cleanChapterId = chapterId.includes('@') ? chapterId.split('@')[0] : chapterId;
        const [numId, chapterSlug] = cleanChapterId.includes('$') ? cleanChapterId.split('$') : [cleanChapterId, 'chapter'];
        const url = `${BASE_URL}/chapters/${numId}/${chapterSlug}`;
        const html = await fetchHtml(url);
        
        const imgMatches = [...html.matchAll(/data-src="([^"]+)"/g)];
        const pages = imgMatches.map(m => {
            const rawUrl = m[1];
            // On web, we MUST proxy the images to send the correct Referer
            return Capacitor.isNativePlatform() 
                ? rawUrl 
                : `${PROXY_URL}${encodeURIComponent(rawUrl)}`;
        });

        return {
            pages: pages,
            source: 'mangapill'
        };
    }
};

