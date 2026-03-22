import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import Gogoanime from '../../lib/Gogoanime';
import cache from '../../utils/cache';
import { redis, REDIS_TTL } from '../../main';
import { Redis } from 'ioredis';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Local helper for isolation and proxy
  const getGogo = () => {
    return new Gogoanime();
  };

  const gogoanime = getGogo();

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: `Welcome to the gogoanime provider (English Anime): check out the provider's website @ ${gogoanime.baseUrl}`,
      routes: ['/:query', '/info/:id', '/watch/:episodeId', '/recent-episodes'],
      documentation: 'https://docs.consumet.org/#tag/gogoanime',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = (request.query as { page: number }).page;

    try {
      const provider = getGogo();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `gogoanime:search:${query}:${page}`,
            async () => await provider.search(query, page),
            REDIS_TTL,
          )
        : await provider.search(query, page);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Contact developer for help.',
      });
    }
  });

  fastify.get('/recent-episodes', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = (request.query as { page: number }).page;
    const type = (request.query as { type: number }).type;

    try {
      const provider = getGogo();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `gogoanime:recent-episodes:${page}:${type}`,
            async () => await provider.fetchRecentEpisodes(page, type),
            REDIS_TTL,
          )
        : await provider.fetchRecentEpisodes(page, type);

      reply.status(200).send(res);
    } catch (error) {
      reply.status(500).send({
        message: 'Something went wrong. Contact developer for help.',
      });
    }
  });

  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = decodeURIComponent((request.params as { id: string }).id);

    try {
      const provider = getGogo();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `gogoanime:info:${id}`,
            async () => await provider.fetchAnimeInfo(id),
            REDIS_TTL,
          )
        : await provider.fetchAnimeInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });

  fastify.get('/watch/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const episodeId = decodeURIComponent((request.params as { '*': string })['*']);
    
    try {
      const gogoInstance = getGogo();
      const fetchSources = async () => await gogoInstance.fetchEpisodeSources(episodeId);

      if (redis) {
        const res = await cache.fetch(
          redis as Redis,
          `gogoanime:watch:${episodeId}`,
          fetchSources,
          REDIS_TTL,
        );
        reply.status(200).send(res);
      } else {
        const res = await fetchSources();
        reply.status(200).send(res);
      }
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });
};

export default routes;
