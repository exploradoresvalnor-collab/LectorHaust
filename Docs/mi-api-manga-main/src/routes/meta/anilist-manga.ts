// @ts-nocheck
import { FastifyRequest, FastifyReply, FastifyInstance, RegisterOptions } from 'fastify';
import { META } from '@consumet/extensions';
import { PROVIDERS_LIST } from '@consumet/extensions';

const routes = async (fastify: FastifyInstance, options: RegisterOptions) => {
  fastify.get('/', (_, rp) => {
    const anilist = generateAnilistMangaMeta();
    rp.status(200).send({
      intro: `Welcome to the anilist manga provider: check out the provider's website @ ${anilist.provider.toString.baseUrl}`,
      routes: ['/:query', '/info', '/read'],
      documentation: 'https://docs.consumet.org/#tag/anilist',
    });
  });

  fastify.get('/:query', async (request: FastifyRequest, reply: FastifyReply) => {
    const anilist = generateAnilistMangaMeta();
    const query = (request.params as { query: string }).query;

    const res = await anilist.search(query);

    reply.status(200).send(res);
  });

  fastify.get('/advanced-search', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = (request.query as { query: string }).query;
    const page = (request.query as { page: number }).page;
    const perPage = (request.query as { perPage: number }).perPage;
    const type = (request.query as { type: string }).type;
    let genres = (request.query as { genres: string | string[] }).genres;
    const id = (request.query as { id: string }).id;
    const format = (request.query as { format: string }).format;
    let sort = (request.query as { sort: string | string[] }).sort;
    const status = (request.query as { status: string }).status;
    const year = (request.query as { year: number }).year;

    const anilist = generateAnilistMangaMeta();

    if (genres) genres = JSON.parse(genres as string);
    if (sort) sort = JSON.parse(sort as string);

    const res = await anilist.advancedSearch(
      query,
      type,
      page,
      perPage,
      format,
      sort as string[],
      genres as string[],
      id,
      year,
      status
    );

    reply.status(200).send(res);
  });

  fastify.get('/info/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const provider = (request.query as { provider: string }).provider;

    const anilist = generateAnilistMangaMeta(provider);

    if (typeof id === 'undefined')
      return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await anilist
        .fetchMangaInfo(id)
        .catch((err) => reply.status(404).send({ message: err }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const chapterId = (request.query as { chapterId: string }).chapterId;
    const provider = (request.query as { provider: string }).provider;

    const anilist = generateAnilistMangaMeta(provider);

    if (typeof chapterId === 'undefined')
      return reply.status(400).send({ message: 'chapterId is required' });

    try {
      const res = await anilist
        .fetchChapterPages(chapterId)
        .catch((err: Error) => reply.status(404).send({ message: err.message }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });

  fastify.get('/chapters/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const id = (request.params as { id: string }).id;
    const provider = (request.query as { provider: string }).provider;

    const anilist = generateAnilistMangaMeta(provider);

    if (typeof id === 'undefined')
      return reply.status(400).send({ message: 'id is required' });

    try {
      const res = await anilist
        .fetchChaptersList(id)
        .catch((err: Error) => reply.status(404).send({ message: err.message }));

      reply.status(200).send(res);
    } catch (err) {
      reply
        .status(500)
        .send({ message: 'Something went wrong. Please try again later.' });
    }
  });
};

/**
 * Isolated helper to generate anilist-manga instance per request.
 * Incluye soporte de PROXY para evitar bloqueos de ISP en proveedores como MangaDex.
 */
const generateAnilistMangaMeta = (provider: string | undefined = undefined) => {
  const proxyConfig = process.env.PROXY ? { url: process.env.PROXY as string | string[] } : undefined;

  if (typeof provider !== 'undefined') {
    const possibleProvider = PROVIDERS_LIST.MANGA.find(
      (p: any) => p.toString.name.toLowerCase() === provider.toLocaleLowerCase()
    );
    if (possibleProvider) {
      return new META.Anilist.Manga(possibleProvider, proxyConfig);
    }
  }

  return new META.Anilist.Manga(undefined, proxyConfig);
};

export default routes;
