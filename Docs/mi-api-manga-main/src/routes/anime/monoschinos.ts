import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import MonosChinos from '../../lib/MonosChinos';
import cache from '../../utils/cache';
import { redis, REDIS_TTL } from '../../main';
import { Redis } from 'ioredis';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  // Local helper to get instance with local provider
  const getMonoschinos = () => {
    return new MonosChinos();
  };

  const monoschinos = getMonoschinos();

  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro: `Welcome to the monoschinos provider (Spanish Anime): check out the provider's website @ ${monoschinos.baseUrl}`,
      routes: ['/:query', '/info/:id', '/watch/:episodeId', '/recent-episodes'],
      documentation: 'https://docs.consumet.org/#tag/monoschinos',
    });
  });

  fastify.get('/recent-episodes', async (request: FastifyRequest, reply: FastifyReply) => {
    const page = (request.query as { page: number }).page;
    try {
      const provider = getMonoschinos();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `monoschinos:recent-episodes:${page}`,
            async () => await provider.fetchRecentEpisodes(page),
            REDIS_TTL,
          )
        : await provider.fetchRecentEpisodes(page);

      reply.status(200).send(res);
    } catch (error) {
      reply.status(500).send({
        message: 'Something went wrong. Contact developer for help.',
      });
    }
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;

    try {
      const provider = getMonoschinos();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `monoschinos:search:${query}`,
            async () => await provider.search(query),
            REDIS_TTL,
          )
        : await provider.search(query);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Contact developer for help.',
      });
    }
  });

  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = decodeURIComponent((request.params as { id: string }).id);

    try {
      const provider = getMonoschinos();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `monoschinos:info:${id}`,
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
      const provider = getMonoschinos();
      let res = redis
        ? await cache.fetch(
            redis as Redis,
            `monoschinos:watch:${episodeId}`,
            async () => await provider.fetchEpisodeSources(episodeId),
            REDIS_TTL,
          )
        : await provider.fetchEpisodeSources(episodeId);

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Contact developer for help.' });
    }
  });
};

export default routes;
