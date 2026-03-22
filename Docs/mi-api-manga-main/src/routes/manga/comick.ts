// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { MANGA } from '@consumet/extensions';

import cache from '../../utils/cache';
import { redis, REDIS_TTL } from '../../main';
import { Redis } from 'ioredis';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  const comick = new MANGA.ComicK();

  fastify.get('/', (_: any, rp: any) => {
    rp.status(200).send({
      intro: `Welcome to the ComicK provider: check out the provider's website @ ${comick.toString.baseUrl}`,
      routes: ['/:query', '/info', '/read', '/recent-updates', '/trending'],
      documentation: 'https://docs.consumet.org/#tag/comick',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const { query } = request.params as { query: string };
    const { page } = request.query as { page?: number };

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `comick:search:${query}:${page ?? 1}`,
            () => comick.search(query, page),
            60 * 60, // 1 hour cache for search
          )
        : await comick.search(query, page);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
      });
    }
  });

  fastify.get('/info', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.query as { id: string }).id;

    if (!id) return reply.status(400).send({ message: 'id is required' });

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `comick:info:${id}`,
            () => comick.fetchMangaInfo(id),
            REDIS_TTL,
          )
        : await comick.fetchMangaInfo(id);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
      });
    }
  });

  fastify.get('/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const chapterId = (request.query as { chapterId: string }).chapterId;

    if (!chapterId) return reply.status(400).send({ message: 'chapterId is required' });

    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `comick:read:${chapterId}`,
            () => comick.fetchChapterPages(chapterId),
            REDIS_TTL,
          )
        : await comick.fetchChapterPages(chapterId);

      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({
        message: 'Something went wrong. Please try again later.',
      });
    }
  });

  fastify.get('/recent-updates', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page?: number };
    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `comick:recent:${page ?? 1}`,
            () => comick.fetchRecentUpdates(page),
            REDIS_TTL,
          )
        : await comick.fetchRecentUpdates(page);
      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: err.message });
    }
  });

  fastify.get('/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page } = request.query as { page?: number };
    try {
      const res = redis
        ? await cache.fetch(
            redis as Redis,
            `comick:trending:${page ?? 1}`,
            () => comick.fetchTrending(page),
            REDIS_TTL,
          )
        : await comick.fetchTrending(page);
      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: err.message });
    }
  });
};

export default routes;
