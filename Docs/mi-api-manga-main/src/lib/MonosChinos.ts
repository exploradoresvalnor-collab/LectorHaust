// @ts-nocheck
import { load } from 'cheerio';
import { AnimeParser } from '@consumet/extensions/dist/models';
import { ISearch, IAnimeResult, IAnimeInfo, ISource, IVideo, ISubtitle, StreamingServers, IEpisodeServer } from '@consumet/extensions';
import { Voe, StreamTape } from '@consumet/extensions/dist/extractors';

class MonosChinos extends AnimeParser {
  name = 'MonosChinos';
  baseUrl = 'https://monoschinos2.com';
  logo = 'https://monoschinos2.com/public/favicon.ico?v=4.57';
  classPath = 'ANIME.MonosChinos';

  /**
   * @param query Search query
   */
  search = async (query: string): Promise<ISearch<IAnimeResult>> => {
    try {
      const res = await this.client.get(`${this.baseUrl}/buscar?q=${query}`);
      const $ = load(res.data);
      if (!$) return { results: [] };

      const results: IAnimeResult[] = [];
      $('section ul li article').each((_, el) => {
        results.push({
          id: $(el).find('a').attr('href')?.split(`/anime/`)[1]!,
          title: $(el).find('h3').text(),
          url: $(el).find('a').attr('href'),
          image: $(el).find('.tarjeta img').attr('data-src') || $(el).find('.tarjeta img').attr('src'),
          releaseDate: $(el).find('span.text-muted').text(),
        });
      });
      return { results, hasNextPage: false };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchAnimeInfo = async (id: string, totalEpisodes: number = 1000): Promise<IAnimeInfo> => {
    try {
      const url = `${this.baseUrl}/anime/${id}`;
      const res = await this.client.get(url);
      const $ = load(res.data);

      const animeInfo: IAnimeInfo = {
        id: id,
        title: $('h1.fs-2.text-capitalize.text-light').text(),
        url: url,
        genres: $('#profile-tab-pane .d-flex.gap-3 .lh-lg a').map((_, el) => $(el).text()).get(),
        totalEpisodes: totalEpisodes,
        image: $('img.lazy.bg-secondary').attr('data-src') || $('img.lazy.bg-secondary').attr('src'),
        description: $('#profile-tab-pane .col-12.col-md-9 p').text(),
        episodes: [],
      };

      for (let i = 1; i <= totalEpisodes; i++) {
        const epLink = $('.d-flex.flex-column.pt-3 .d-flex.gap-3.mt-3 a').attr('href');
        if (epLink) {
             const match = epLink.match(/([a-z0-9\-]+-episodio-)/);
             if (match) {
                animeInfo.episodes.push({
                  id: `${match[0]}${i}`,
                  number: i,
                  url: epLink,
                });
             }
        }
      }
      return animeInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchEpisodeSources = async (episodeId: string): Promise<ISource> => {
    try {
      const res = await this.client.get(`https://monoschinos2.com/ver/${episodeId}`);
      const $ = load(res.data);
      let decodedUrl;
      let sources: IVideo[] = [];
      let subtitles: ISubtitle[] = [];
      
      try {
        decodedUrl = await this.getServerDecodedUrl($, StreamingServers.Voe);
        const voeResult = await new Voe().extract(new URL(decodedUrl.replace('voe.sx', 'thomasalthoughhear.com')));
        sources = voeResult.sources;
        subtitles = voeResult?.subtitles || [];
      } catch (err) {
        decodedUrl = await this.getServerDecodedUrl($, StreamingServers.StreamTape);
        sources = await new StreamTape().extract(new URL(decodedUrl));
      }
      return { sources, subtitles };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  private getServerDecodedUrl = async ($: any, server: string) => {
      const button = $('button').filter(function () { return $(this).text() === server; });
      const res2 = await this.client.get(`https://monoschinos2.com/reproductor?url=${button.attr('data-player')}`);
      const $2 = load(res2.data);
      const base64Match = $2.html().match(/atob\("([^"]+)"\)/)!;
      return Buffer.from(base64Match[1], 'base64').toString('utf-8');
  };

  fetchEpisodeServers = (episodeId: string): Promise<IEpisodeServer[]> => { throw new Error('Not implemented.'); };

  fetchRecentEpisodes = async (page: number = 1): Promise<ISearch<IAnimeResult>> => {
    try {
      const res = await this.client.get(`${this.baseUrl}/anime-recientes?page=${page}`);
      const $ = load(res.data);
      const results: IAnimeResult[] = [];
      $('.row article').each((_, el) => {
        results.push({
          id: $(el).find('a').attr('href')?.split(`/anime/`)[1]!,
          title: $(el).find('h3').text(),
          image: $(el).find('.tarjeta img').attr('data-src') || $(el).find('.tarjeta img').attr('src'),
          episodeNumber: parseInt($(el).find('.episodio').text().replace('Episodio ', '')),
        });
      });
      return { results, hasNextPage: true, currentPage: page };
    } catch (err) {
       return { results: [] };
    }
  };
}

export default MonosChinos;
