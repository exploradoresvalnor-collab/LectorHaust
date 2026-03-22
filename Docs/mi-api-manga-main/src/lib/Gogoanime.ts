// @ts-nocheck
import { load } from 'cheerio';
import { AnimeParser } from '@consumet/extensions/dist/models';
import { ISearch, IAnimeResult, IAnimeInfo, ISource, IVideo, ISubtitle, StreamingServers, IEpisodeServer } from '@consumet/extensions';
import { GogoCDN } from '@consumet/extensions/dist/extractors';

class Gogoanime extends AnimeParser {
  name = 'Gogoanime';
  baseUrl = 'https://anitaku.pe';
  logo = 'https://play-lh.googleusercontent.com/MaGEiAEhNHAJXcXKzqTNgxqRmhuKB1rCUgb15UrN_mWUNRnLpO5T1qja64oRasO7mn0';
  classPath = 'ANIME.Gogoanime';
  private readonly ajaxUrl = 'https://ajax.gogocdn.net/ajax';

  search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    try {
      const res = await this.client.get(`${this.baseUrl}/filter.html?keyword=${encodeURIComponent(query)}&page=${page}`);
      const $ = load(res.data);
      const results: IAnimeResult[] = [];
      $('div.last_episodes > ul > li').each((i, el) => {
        results.push({
          id: $(el).find('p.name > a').attr('href')?.split('/')[2]!,
          title: $(el).find('p.name > a').text(),
          image: $(el).find('div > a > img').attr('src'),
          releaseDate: $(el).find('p.released').text().trim().replace('Released: ', ''),
        });
      });
      return { currentPage: page, hasNextPage: true, results };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    if (!id.includes('gogoanime')) id = `${this.baseUrl}/category/${id}`;
    try {
      const res = await this.client.get(id);
      const $ = load(res.data);
      const animeInfo = {
        id: new URL(id).pathname.split('/')[2],
        title: $('div.anime_info_body_bg > h1').text().trim(),
        image: $('div.anime_info_body_bg > img').attr('src'),
        description: $('div.anime_info_body_bg > div:nth-child(6)').text().trim().replace('Plot Summary: ', ''),
        episodes: [],
      };

      const ep_start = $('#episode_page > li').first().find('a').attr('ep_start');
      const ep_end = $('#episode_page > li').last().find('a').attr('ep_end');
      const movie_id = $('#movie_id').attr('value');
      const alias = $('#alias_anime').attr('value');

      const html = await this.client.get(`${this.ajaxUrl}/load-list-episode?ep_start=${ep_start}&ep_end=${ep_end}&id=${movie_id}&default_ep=0&alias=${alias}`);
      const $$ = load(html.data);
      $$('#episode_related > li').each((i, el) => {
        animeInfo.episodes.push({
          id: $(el).find('a').attr('href')?.split('/')[1]!,
          number: parseFloat($(el).find(`div.name`).text().replace('EP ', '')),
          url: `${this.baseUrl}/${$(el).find(`a`).attr('href')?.trim()}`,
        });
      });
      animeInfo.episodes = animeInfo.episodes.reverse();
      animeInfo.totalEpisodes = parseInt(ep_end ?? '0');
      return animeInfo;
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchEpisodeSources = async (episodeId: string): Promise<ISource> => {
    try {
      const res = await this.client.get(`${this.baseUrl}/${episodeId}`);
      const $ = load(res.data);
      let serverUrl = new URL(`${$('#load_anime > div > div > iframe').attr('src')}`);
      return await new GogoCDN().extract(serverUrl);
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchRecentEpisodes = async (page: number = 1, type: number = 1): Promise<ISearch<IAnimeResult>> => {
    try {
      const res = await this.client.get(`${this.ajaxUrl}/page-recent-release.html?page=${page}&type=${type}`);
      const $ = load(res.data);
      const recentEpisodes: IAnimeResult[] = [];
      $('div.last_episodes.loaddub > ul > li').each((i, el) => {
        recentEpisodes.push({
          id: $(el).find('a').attr('href')?.split('/')[1]?.split('-episode')[0]!,
          episodeId: $(el).find('a').attr('href')?.split('/')[1]!,
          episodeNumber: parseFloat($(el).find('p.episode').text().replace('Episode ', '')),
          title: $(el).find('p.name > a').text()!,
          image: $(el).find('div > a > img').attr('src'),
        });
      });
      return { currentPage: page, hasNextPage: true, results: recentEpisodes };
    } catch (err) {
      throw new Error(err.message);
    }
  };

  fetchEpisodeServers = (episodeId: string): Promise<IEpisodeServer[]> => { throw new Error('Not implemented.'); };
}

export default Gogoanime;
