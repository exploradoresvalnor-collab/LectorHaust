import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import localforage from 'localforage';
import { mangaProvider } from './mangaProvider';

// IndexedDB store for download metadata
const downloadStore = localforage.createInstance({
  name: 'lectorhaus-offline',
  storeName: 'downloads'
});

export interface DownloadedChapter {
  chapterId: string;
  mangaId: string;
  mangaTitle: string;
  chapterNumber: string;
  pageCount: number;
  sizeBytes: number;
  downloadedAt: number;
  coverUrl?: string;
}

export interface DownloadProgress {
  chapterId: string;
  current: number;
  total: number;
  percent: number;
}

type ProgressCallback = (progress: DownloadProgress) => void;

class OfflineService {
  private basePath = 'lectorhaus/downloads';

  /**
   * Download a chapter's pages to the device filesystem
   */
  async downloadChapter(
    chapterId: string,
    mangaId: string,
    mangaTitle: string,
    chapterNumber: string,
    pages: string[],
    coverUrl?: string,
    onProgress?: ProgressCallback
  ): Promise<boolean> {
    try {
      const folderPath = `${this.basePath}/${mangaId}/${chapterId}`;
      let totalSize = 0;

      for (let i = 0; i < pages.length; i++) {
        let pageUrl = pages[i];
        
        // Fix for Web CORS: Use mangaProvider optimized URL for proxying
        if (!Capacitor.isNativePlatform()) {
          pageUrl = mangaProvider.getOptimizedUrl(pageUrl);
        }

        // Report progress
        onProgress?.({
          chapterId,
          current: i,
          total: pages.length,
          percent: Math.round((i / pages.length) * 100)
        });

        try {
          // Fetch the image as blob
          const response = await fetch(pageUrl);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const blob = await response.blob();
          totalSize += blob.size;

          // Convert blob to base64
          const base64 = await this.blobToBase64(blob);

          // Write to filesystem
          await Filesystem.writeFile({
            path: `${folderPath}/page_${i}.jpg`,
            data: base64,
            directory: Directory.Data,
            recursive: true
          });
        } catch (pageErr) {
          console.warn(`[Offline] Failed to download page ${i} of ${chapterId}:`, pageErr);
          // Continue with other pages
        }
      }

      // Save metadata to IndexedDB
      const meta: DownloadedChapter = {
        chapterId,
        mangaId,
        mangaTitle,
        chapterNumber,
        pageCount: pages.length,
        sizeBytes: totalSize,
        downloadedAt: Date.now(),
        coverUrl
      };
      await downloadStore.setItem(chapterId, meta);

      onProgress?.({
        chapterId,
        current: pages.length,
        total: pages.length,
        percent: 100
      });

      console.log(`[Offline] Chapter ${chapterNumber} downloaded (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
      return true;
    } catch (err) {
      console.error('[Offline] Download failed:', err);
      return false;
    }
  }

  /**
   * Check if a chapter is downloaded
   */
  async isDownloaded(chapterId: string): Promise<boolean> {
    const meta = await downloadStore.getItem<DownloadedChapter>(chapterId);
    return !!meta;
  }

  /**
   * Get metadata for a downloaded chapter
   */
  async getChapterMeta(chapterId: string): Promise<DownloadedChapter | null> {
    return await downloadStore.getItem<DownloadedChapter>(chapterId);
  }

  /**
   * Get local page URLs for a downloaded chapter
   */
  async getLocalPages(chapterId: string): Promise<string[]> {
    const meta = await downloadStore.getItem<DownloadedChapter>(chapterId);
    if (!meta) return [];

    const pages: string[] = [];
    const folderPath = `${this.basePath}/${meta.mangaId}/${chapterId}`;

    for (let i = 0; i < meta.pageCount; i++) {
      try {
        const result = await Filesystem.getUri({
          path: `${folderPath}/page_${i}.jpg`,
          directory: Directory.Data
        });
        
        // Convert native file URI to webview-compatible URL
        if (Capacitor.isNativePlatform()) {
          pages.push(Capacitor.convertFileSrc(result.uri));
        } else {
          // Web fallback: read as base64 data URL
          const file = await Filesystem.readFile({
            path: `${folderPath}/page_${i}.jpg`,
            directory: Directory.Data
          });
          pages.push(`data:image/jpeg;base64,${file.data}`);
        }
      } catch {
        console.warn(`[Offline] Missing page ${i} for chapter ${chapterId}`);
      }
    }

    return pages;
  }

  /**
   * Delete a downloaded chapter
   */
  async deleteChapter(chapterId: string): Promise<void> {
    const meta = await downloadStore.getItem<DownloadedChapter>(chapterId);
    if (!meta) return;

    try {
      await Filesystem.rmdir({
        path: `${this.basePath}/${meta.mangaId}/${chapterId}`,
        directory: Directory.Data,
        recursive: true
      });
    } catch {
      console.warn('[Offline] Could not delete files for chapter:', chapterId);
    }

    await downloadStore.removeItem(chapterId);
  }

  /**
   * Get all downloaded chapters grouped by manga
   */
  async getDownloadedMangas(): Promise<Record<string, { title: string; cover?: string; chapters: DownloadedChapter[] }>> {
    const grouped: Record<string, { title: string; cover?: string; chapters: DownloadedChapter[] }> = {};

    await downloadStore.iterate<DownloadedChapter, void>((meta) => {
      if (!grouped[meta.mangaId]) {
        grouped[meta.mangaId] = {
          title: meta.mangaTitle,
          cover: meta.coverUrl,
          chapters: []
        };
      }
      grouped[meta.mangaId].chapters.push(meta);
    });

    // Sort chapters by number within each manga
    Object.values(grouped).forEach(manga => {
      manga.chapters.sort((a, b) => parseFloat(a.chapterNumber) - parseFloat(b.chapterNumber));
    });

    return grouped;
  }

  /**
   * Get total storage used by downloads
   */
  async getTotalStorageUsed(): Promise<{ totalBytes: number; totalMB: string; chapterCount: number }> {
    let totalBytes = 0;
    let chapterCount = 0;

    await downloadStore.iterate<DownloadedChapter, void>((meta) => {
      totalBytes += meta.sizeBytes;
      chapterCount++;
    });

    return {
      totalBytes,
      totalMB: (totalBytes / 1024 / 1024).toFixed(1),
      chapterCount
    };
  }

  /**
   * Clear all downloads
   */
  async clearAllDownloads(): Promise<void> {
    // Delete all files
    try {
      await Filesystem.rmdir({
        path: this.basePath,
        directory: Directory.Data,
        recursive: true
      });
    } catch {
      // Folder may not exist
    }
    
    // Clear the index
    await downloadStore.clear();
  }

  // Utility: Convert a Blob to base64 string (without data:xxx prefix)
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.readAsDataURL(blob);
    });
  }
}

export const offlineService = new OfflineService();
