// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META, PROVIDERS_LIST, StreamingServers } from '@consumet/extensions';
import { tmdbApi } from '../../main';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the tmdb provider: check out the provider's website @ https://www.themoviedb.org/",
      routes: ['/:query', '/info/:id', '/watch/:episodeId'],
      documentation: 'https://docs.consumet.org/#tag/tmdb',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = (request.query as { page: number }).page;
    const tmdb = generateTmdbMeta();

    const res = await tmdb.search(query, page);

    reply.status(200).send(res);
  });

  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const type = (request.query as { type: string }).type;
    const provider = (request.query as { provider?: string }).provider;
    
    const tmdb = generateTmdbMeta(provider);

    if (!type) return reply.status(400).send({ message: "The 'type' query is required" });

    const res = await tmdb.fetchMediaInfo(id, type);
    reply.status(200).send(res);
  });

  fastify.get('/trending', async (request: FastifyRequest, reply: FastifyReply) => {
    const validTimePeriods = new Set(['day', 'week'] as const);
    type validTimeType = typeof validTimePeriods extends Set<infer T> ? T : undefined;

    const type = (request.query as { type?: string }).type || 'all';
    let timePeriod =
      (request.query as { timePeriod?: validTimeType }).timePeriod || 'day';

    // make day as default time period
    if (!validTimePeriods.has(timePeriod)) timePeriod = 'day';

    const page = (request.query as { page?: number }).page || 1;

    const tmdb = generateTmdbMeta();

    try {
      const res = await tmdb.fetchTrending(type, timePeriod, page);
      reply.status(200).send(res);
    } catch (err) {
      reply.status(500).send({ message: 'Failed to fetch trending media.' });
    }
  });

  const watch = async (request: FastifyRequest, reply: FastifyReply) => {
    let episodeId = (request.params as { episodeId: string }).episodeId;
    if (!episodeId) {
      episodeId = (request.query as { episodeId: string }).episodeId;
    }
    const id = (request.query as { id: string }).id;
    const provider = (request.query as { provider?: string }).provider;
    const server = (request.query as { server?: StreamingServers }).server;

    const tmdb = generateTmdbMeta(provider);

    try {
      const res = await tmdb
        .fetchEpisodeSources(episodeId, id, server)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Contact developer for help.' });
    }
  };
  fastify.get('/watch', watch);
  fastify.get('/watch/:episodeId', watch);
};

/**
 * Isolated helper to generate TMDB instance per request.
 * Incluye soporte de PROXY y API Key de TMDB.
 */
const generateTmdbMeta = (providerName: string | undefined = undefined) => {
  const proxyConfig = process.env.PROXY ? { url: process.env.PROXY as string | string[] } : undefined;
  
  if (typeof providerName !== 'undefined') {
    const possibleProvider = PROVIDERS_LIST.MOVIES.find(
      (p: any) => p.toString.name.toLowerCase() === providerName.toLocaleLowerCase()
    );
    if (possibleProvider) {
      return new META.TMDB(tmdbApi, possibleProvider, proxyConfig);
    }
  }

  return new META.TMDB(tmdbApi, undefined, proxyConfig);
};

export default routes;
