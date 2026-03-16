/**
 * Centralized MangaDex type definitions
 */

export interface MangaDexManga {
  id: string;
  type: string;
  attributes: {
    title: Record<string, string>;
    altTitles?: Array<Record<string, string>>;
    description: Record<string, string>;
    status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
    originalLanguage: string;
    lastChapter?: string;
    publicationDemographic?: 'shounen' | 'shoujo' | 'seinen' | 'josei';
    tags: MangaDexTag[];
    // Injected by our service
    mangaType?: string;
    latestChapterReadableAt?: string;
    latestChapterNumber?: string;
  };
  relationships: MangaDexRelationship[];
}

export interface MangaDexTag {
  id: string;
  type: string;
  attributes: {
    name: Record<string, string>;
    group: 'genre' | 'theme' | 'format' | 'content';
  };
}

export interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: any;
}

export interface MangaDexChapter {
  id: string;
  type: string;
  attributes: {
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    readableAt: string;
    externalUrl: string | null;
    pages: number;
  };
  relationships: MangaDexRelationship[];
}

export interface MangaSearchFilters {
  origin?: string;
  lang?: string;
  tags?: string[];
  status?: string;
  demographic?: string;
  fullColor?: boolean;
}
