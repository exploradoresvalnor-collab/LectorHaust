// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META, PROVIDERS_LIST } from '@consumet/extensions';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  fastify.get('/', (_, rp) => {
    rp.status(200).send({
      intro:
        "Welcome to the mal provider: check out the provider's website @ https://mal.co/",
      routes: ['/:query', '/info/:id', '/watch/:episodeId'],
      documentation: 'https://docs.consumet.org/#tag/mal',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.params as { query: string }).query;
    const page = (request.query as { page: number }).page;
    
    const mal = generateMalMeta();
    const res = await mal.search(query, page);

    reply.status(200).send(res);
  });

  // mal info with episodes
  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const provider = (request.query as { provider?: string }).provider;
    let fetchFiller = (request.query as { fetchFiller?: string | boolean }).fetchFiller;
    let isDub = (request.query as { dub?: string | boolean }).dub;
    
    const mal = generateMalMeta(provider);

    if (isDub === 'true' || isDub === '1') isDub = true;
    else isDub = false;

    if (fetchFiller === 'true' || fetchFiller === '1') fetchFiller = true;
    else fetchFiller = false;

    try {
      const res = await mal.fetchAnimeInfo(id, isDub as boolean, fetchFiller as boolean);
      reply.status(200).send(res);
    } catch (err: any) {
      reply.status(500).send({ message: err.message });
    }
  });

  fastify.get(
    '/watch/:episodeId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const episodeId = (request.params as { episodeId: string }).episodeId;
      const provider = (request.query as { provider?: string }).provider;

      const mal = generateMalMeta(provider);
      try {
        const res = await mal
          .fetchEpisodeSources(episodeId)
          .catch((err) => reply.status(404).send({ message: err }));

        reply.status(200).send(res);
      } catch (err) {
        reply
          .status(500)
          .send({ message: 'Something went wrong. Contact developer for help.' });
      }
    },
  );
};

/**
 * Isolated helper to generate Myanimelist instance per request.
 * Incluye soporte de PROXY.
 */
const generateMalMeta = (providerName: string | undefined = undefined) => {
  const proxyConfig = process.env.PROXY ? { url: process.env.PROXY as string | string[] } : undefined;

  if (typeof providerName !== 'undefined') {
    const possibleProvider = PROVIDERS_LIST.ANIME.find(
      (p: any) => p.toString.name.toLowerCase() === providerName.toLocaleLowerCase()
    );
    if (possibleProvider) {
      return new META.Myanimelist(possibleProvider, proxyConfig);
    }
  }

  return new META.Myanimelist(undefined, proxyConfig);
};

export default routes;
