/**
 * Centralized user-related type definitions
 */

export interface MangaEntry {
  id: string;
  title: string;
  cover: string;
  format?: string;
  tags?: string[];
}

export interface ReadingProgress {
  chapterId: string;
  chapterNumber: string;
  pageIndex: number;
  lastRead: number; // Timestamp
}

export interface UserStats {
  xp: number;
  level: number;
  chaptersRead: number;
  commentsPosted: number;
  lastUpdated: number;
}
