export interface IndexedPage {
  page: number;
  text: string;
}

export interface BookSearchIndex {
  id: string;
  totalPages: number;
  pages: IndexedPage[];
}

export interface SearchMatchItem {
  pageNum: number;
  snippet: string;
  matchIndex?: number;
}

// In-memory cache for book search indexes
const searchIndexCache = new Map<string, BookSearchIndex>();
const loadingPromises = new Map<string, Promise<BookSearchIndex | null>>();

/**
 * Resolves base URL safe path for static assets on GitHub Pages or custom base paths.
 */
function getAssetPath(relativePath: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${cleanBase}${cleanRelative}`;
}

/**
 * Fetches and caches the pre-built full text search index for a spiritual book.
 */
export async function getBookSearchIndex(bookId: string): Promise<BookSearchIndex | null> {
  if (searchIndexCache.has(bookId)) {
    return searchIndexCache.get(bookId)!;
  }

  if (loadingPromises.has(bookId)) {
    return loadingPromises.get(bookId)!;
  }

  const loadPromise = (async () => {
    try {
      const url = getAssetPath(`search_indexes/${bookId}.json`);
      const res = await fetch(url);
      if (!res.ok) {
        // Try fallback relative path without leading slash
        const fallbackRes = await fetch(`./search_indexes/${bookId}.json`);
        if (!fallbackRes.ok) return null;
        const data: BookSearchIndex = await fallbackRes.json();
        searchIndexCache.set(bookId, data);
        return data;
      }
      const data: BookSearchIndex = await res.json();
      searchIndexCache.set(bookId, data);
      return data;
    } catch (err) {
      console.warn(`Could not load pre-built search index for ${bookId}:`, err);
      return null;
    } finally {
      loadingPromises.delete(bookId);
    }
  })();

  loadingPromises.set(bookId, loadPromise);
  return loadPromise;
}

/**
 * Performs lightning-fast client-side keyword search over indexed pages.
 */
export function searchInBookIndex(
  index: BookSearchIndex,
  query: string,
  onProgress?: (current: number, total: number, matchesCount: number) => void
): SearchMatchItem[] {
  const term = query.trim().toLowerCase();
  if (!term || !index || !index.pages) return [];

  const matches: SearchMatchItem[] = [];
  const total = index.pages.length;

  for (let i = 0; i < total; i++) {
    const pageItem = index.pages[i];
    const pageText = pageItem.text || '';
    const lowerText = pageText.toLowerCase();

    let startIndex = 0;
    let foundIdx = lowerText.indexOf(term, startIndex);

    while (foundIdx !== -1) {
      const snippetStart = Math.max(0, foundIdx - 45);
      const snippetEnd = Math.min(pageText.length, foundIdx + term.length + 45);
      let snippet = pageText.slice(snippetStart, snippetEnd).trim();

      if (snippetStart > 0) snippet = '...' + snippet;
      if (snippetEnd < pageText.length) snippet = snippet + '...';

      matches.push({
        pageNum: pageItem.page,
        snippet,
        matchIndex: foundIdx,
      });

      startIndex = foundIdx + term.length;
      foundIdx = lowerText.indexOf(term, startIndex);

      if (matches.length >= 300) break;
    }

    if (onProgress && (i % 50 === 0 || i === total - 1)) {
      onProgress(i + 1, total, matches.length);
    }

    if (matches.length >= 300) break;
  }

  return matches;
}
