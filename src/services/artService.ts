import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const PROXY_URL = 'https://manga-proxy.mchaustman.workers.dev/?url=';

export interface SafebooruPost {
  id: number;
  image: string;
  directory: string;
  tags: string;
  width: number;
  height: number;
  sample_url: string;
  file_url: string;
  preview_url: string;
}

class ArtService {
  private baseUrl = 'https://safebooru.org/index.php';

  /**
   * Fetches a random set of anime-style backgrounds from Safebooru.
   * @param tags Tag string (e.g. "scenery+landscape+rating:safe")
   * @param limit Number of results
   */
  async getRandomBackgrounds(tags: string = 'scenery landscape', limit: number = 20): Promise<SafebooruPost[]> {
    try {
      // Safebooru can be picky about + vs %20. We'll use spaces in the initial string.
      const cleanTags = tags.replace(/\+/g, ' ').trim();
      
      // CRITICAL: Construct the apiUrl WITHOUT pre-encoding tags separately if using proxy,
      // because the proxy encoding covers the whole string. Double encoding (e.g. %2520) breaks Booru searches.
      const apiUrl = `${this.baseUrl}?page=dapi&s=post&q=index&json=1&tags=${cleanTags}&limit=${limit}`;
      const requestUrl = Capacitor.isNativePlatform() 
        ? apiUrl.replace(/ /g, '%20') 
        : `${PROXY_URL}${encodeURIComponent(apiUrl)}`;

      console.log('[ArtService] Fetching from:', requestUrl);

      // Force text response to avoid axios parsing issues with certain Content-Types from proxy
      const response = await axios.get(requestUrl, { 
        responseType: 'text',
        timeout: 10000 
      });

      let data = response.data;
      if (typeof data === 'string') {
        const trimmed = data.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            data = JSON.parse(trimmed);
          } catch (e) {
            console.error('[ArtService] JSON Parse Error:', e);
            return [];
          }
        } else {
          console.warn('[ArtService] Received non-JSON response:', trimmed.substring(0, 100));
          return [];
        }
      }

      if (!Array.isArray(data)) {
        console.warn('[ArtService] Response is not an array:', data);
        return [];
      }

      // Construct and proxy all URLs
      return data.map((post: any) => {
        const proxy = (url: string) => {
          if (!url) return '';
          // Ensure protocol
          let full = url;
          if (url.startsWith('//')) full = `https:${url}`;
          else if (!url.startsWith('http')) full = `https:${url.startsWith('/') ? '' : '//'}${url}`;
          
          return Capacitor.isNativePlatform() ? full : `${PROXY_URL}${encodeURIComponent(full)}`;
        };

        const imageBase = `https://safebooru.org/images/${post.directory}/${post.image}`;
        // Safebooru usually has consistent naming for thumbnails
        const previewBase = `https://safebooru.org/thumbnails/${post.directory}/thumbnail_${post.image.replace(/\.[^/.]+$/, ".jpg")}`;
        
        return {
          id: post.id,
          image: post.image,
          directory: post.directory,
          tags: post.tags,
          width: post.width,
          height: post.height,
          preview_url: proxy(post.preview_url || previewBase),
          sample_url: proxy(post.sample_url || imageBase),
          file_url: proxy(post.file_url || imageBase)
        };
      });
    } catch (error) {
      console.error('[ArtService] Failed to fetch backgrounds:', error);
      return [];
    }
  }

  /**
   * Gets a single random background post.
   */
  async getOneRandomBackground(tags: string = 'scenery landscape'): Promise<SafebooruPost | null> {
    const images = await this.getRandomBackgrounds(tags, 50);
    if (images.length === 0) return null;
    return images[Math.floor(Math.random() * images.length)];
  }
}

export const artService = new ArtService();
