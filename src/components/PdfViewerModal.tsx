import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  ExternalLink, 
  BookOpen, 
  Maximize2, 
  Minimize2, 
  Loader2, 
  LayoutGrid, 
  AlertCircle,
  Sparkles,
  ArrowRight,
  Eye,
  Layers,
  Expand,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw
} from 'lucide-react';
import { SpiritualBook } from '../data/spiritual_books';
import { getBookSearchIndex, searchInBookIndex, BookSearchIndex } from '../utils/searchIndexService';

// Set up reliable PDF.js worker using static asset endpoint
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-assets/pdf.worker.min.mjs';
}

interface SearchMatch {
  pageNum: number;
  snippet: string;
  matchIndex?: number;
}

interface PdfViewerModalProps {
  book: SpiritualBook;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({ book, onClose }) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 850 });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing Spiritual Book Engine...');
  const [error, setError] = useState<string | null>(null);

  // View modes: 'canvas' (High-res scanned pages & images) vs 'text' (clean typography reader) vs 'native' (continuous browser PDF stream)
  const [viewMode, setViewMode] = useState<'canvas' | 'text' | 'native'>('canvas');
  const [nativeEngine, setNativeEngine] = useState<'google' | 'direct'>('google');
  const [bookIndex, setBookIndex] = useState<BookSearchIndex | null>(null);
  const [readerFontSize, setReaderFontSize] = useState<number>(18);
  const [readerTheme, setReaderTheme] = useState<'ivory' | 'white' | 'sepia' | 'dark'>('ivory');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSearchTerm, setActiveSearchTerm] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchProgress, setSearchProgress] = useState<{ current: number; total: number; count: number }>({ current: 0, total: 0, count: 0 });
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(false);
  const [showThumbnailDrawer, setShowThumbnailDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [pageHighlights, setPageHighlights] = useState<{ left: number; top: number; width: number; height: number; str: string }[]>([]);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageTextCacheRef = useRef<Map<number, { text: string; items: any[] }>>(new Map());
  const searchAbortRef = useRef<boolean>(false);
  const [reloadTrigger, setReloadTrigger] = useState<number>(0);

  // Touch swipe support for iPad & mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(book.pdfUrl)}`;
  const googleViewerUrl = `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(book.pdfUrl)}`;

  // Auto-Fit scale calculation for mobile phones and iPads
  const calculateOptimalScale = useCallback((viewportWidth: number) => {
    if (!scrollContainerRef.current && typeof window === 'undefined') return 1.0;
    const containerWidth = scrollContainerRef.current 
      ? scrollContainerRef.current.clientWidth 
      : (window.innerWidth || 800);

    // Provide comfortable horizontal breathing room (mobile: 20px, tablet/desktop: 48px)
    const padding = containerWidth < 640 ? 20 : 48;
    const availableWidth = Math.max(280, containerWidth - padding);
    const fitScale = availableWidth / viewportWidth;

    // On mobile and tablets, default to fit-to-width so no text or last lines are truncated
    return Math.min(2.5, Math.max(0.45, Number(fitScale.toFixed(2))));
  }, []);

  // Fetch and Load PDF Document with standard fonts, cmaps, wasm decoders, and image decoders configured
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setLoadingProgress('Connecting to spiritual library archive...');

    // Eagerly preload static search index for instant offline search (vital for GitHub Pages)
    getBookSearchIndex(book.id).then(index => {
      if (!isCancelled && index) {
        setBookIndex(index);
        if (index.totalPages > 0) {
          setNumPages(prev => (prev === 0 ? index.totalPages : prev));
        }
        // Warm up text cache
        index.pages.forEach(p => {
          if (!pageTextCacheRef.current.has(p.page)) {
            pageTextCacheRef.current.set(p.page, { text: p.text, items: [] });
          }
        });
      }
    }).catch(() => {});

    async function loadPdf() {
      try {
        let doc: pdfjsLib.PDFDocumentProxy | null = null;
        let lastErrorMsg = '';

        // Strategy 1: High-reliability backend stream proxy with progress tracker
        try {
          setLoadingProgress('Downloading complete illustrated book...');
          const response = await fetch(proxyUrl);
          const contentType = response.headers.get('content-type') || '';
          
          if (response.ok && !contentType.includes('text/html')) {
            const contentLength = +(response.headers.get('content-length') || 0);
            let buf: ArrayBuffer;

            if (response.body && contentLength > 0) {
              const reader = response.body.getReader();
              const chunks: Uint8Array[] = [];
              let received = 0;
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                  chunks.push(value);
                  received += value.length;
                  const mb = (received / (1024 * 1024)).toFixed(1);
                  const totalMb = (contentLength / (1024 * 1024)).toFixed(1);
                  const pct = Math.min(99, Math.round((received / contentLength) * 100));
                  if (!isCancelled) {
                    setLoadingProgress(`Downloading book... ${mb}MB / ${totalMb}MB (${pct}%)`);
                  }
                }
              }
              const fullArray = new Uint8Array(received);
              let offset = 0;
              for (const chunk of chunks) {
                fullArray.set(chunk, offset);
                offset += chunk.length;
              }
              buf = fullArray.buffer;
            } else {
              buf = await response.arrayBuffer();
            }

            if (buf.byteLength > 1000) {
              if (!isCancelled) {
                setLoadingProgress('Rendering pages, high-resolution artwork & typography...');
              }
              const loadingTask = pdfjsLib.getDocument({
                data: new Uint8Array(buf),
                cMapUrl: '/pdfjs-assets/cmaps/',
                cMapPacked: true,
                standardFontDataUrl: '/pdfjs-assets/standard_fonts/',
                wasmUrl: '/pdfjs-assets/wasm/',
                imageDecodersUrl: '/pdfjs-assets/image_decoders/',
                enableXfa: true,
                isEvalSupported: true,
                disableRange: true,
                disableStream: true,
              } as any);
              doc = await loadingTask.promise;
            }
          }
        } catch (e: any) {
          console.warn('Strategy 1 (Proxy fetch) failed, checking direct stream:', e);
          lastErrorMsg = e?.message || 'Proxy stream unavailable';
        }

        // Strategy 2: Direct PDF URL stream
        if (!doc && !isCancelled) {
          try {
            setLoadingProgress('Connecting directly to spiritual book repository...');
            const loadingTask = pdfjsLib.getDocument({
              url: book.pdfUrl,
              cMapUrl: '/pdfjs-assets/cmaps/',
              cMapPacked: true,
              standardFontDataUrl: '/pdfjs-assets/standard_fonts/',
              wasmUrl: '/pdfjs-assets/wasm/',
              imageDecodersUrl: '/pdfjs-assets/image_decoders/',
              enableXfa: true,
              isEvalSupported: true,
            } as any);
            doc = await loadingTask.promise;
          } catch (e: any) {
            console.warn('Strategy 2 (Direct stream) failed:', e);
            lastErrorMsg = e?.message || lastErrorMsg;
          }
        }

        if (isCancelled) return;

        if (doc) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          // Auto-scale to fit width on initial load
          try {
            const firstPage = await doc.getPage(1);
            const initialViewport = firstPage.getViewport({ scale: 1.0 });
            const optimalScale = calculateOptimalScale(initialViewport.width);
            setScale(optimalScale);
          } catch (_) {}
        } else {
          setError(lastErrorMsg || 'Could not load PDF document stream');
        }

        setLoading(false);
      } catch (err: any) {
        console.warn('Direct canvas stream error:', err);
        if (!isCancelled) {
          setError(err?.message || 'Failed to render PDF');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [book.pdfUrl, proxyUrl, calculateOptimalScale, reloadTrigger]);

  // Fail-safe PDF.js Canvas Rendering Queue Engine
  const isRenderingRef = useRef<boolean>(false);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const nextRenderRef = useRef<{ pageNum: number; scale: number; rotation: number } | null>(null);

  const performRender = useCallback(async (targetPage: number, targetScale: number, targetRotation: number) => {
    if (!pdfDoc || !canvasRef.current) return;

    // If a render is already in progress, store the new target parameters and cancel current render task
    if (isRenderingRef.current) {
      nextRenderRef.current = { pageNum: targetPage, scale: targetScale, rotation: targetRotation };
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (_) {}
      }
      return;
    }

    isRenderingRef.current = true;

    try {
      const page = await pdfDoc.getPage(targetPage);

      // If another page/scale render request arrived while fetching page object, exit and let finally handle it
      if (nextRenderRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: targetScale, rotation: targetRotation });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      // Update page dimensions in state for DOM layout stability
      setPageDimensions({
        width: Math.ceil(viewport.width),
        height: Math.ceil(viewport.height),
      });

      // High DPI display support for sharp typography and scanned images on Retina / iPad / Mobile
      const outputScale = window.devicePixelRatio || 1;
      
      // Using Math.ceil ensures the canvas is never 1 pixel too short, preventing bottom line truncation
      canvas.width = Math.ceil(viewport.width * outputScale);
      canvas.height = Math.ceil(viewport.height * outputScale);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;

      // Pre-fill canvas with clean white background so transparent scans or text always contrast
      context.save();
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.restore();

      const transform = outputScale !== 1 
        ? [outputScale, 0, 0, outputScale, 0, 0] 
        : undefined;

      const renderContext = {
        canvasContext: context,
        viewport,
        canvas,
        transform,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;
      await task.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Error rendering PDF page:', err);
      }
    } finally {
      renderTaskRef.current = null;
      isRenderingRef.current = false;

      // If a new render request arrived while we were rendering or fetching, process it now
      if (nextRenderRef.current) {
        const next = nextRenderRef.current;
        nextRenderRef.current = null;
        performRender(next.pageNum, next.scale, next.rotation);
      }
    }
  }, [pdfDoc]);

  // Trigger render whenever document, current page, scale, or rotation changes
  useEffect(() => {
    if (!loading && pdfDoc && viewMode === 'canvas') {
      performRender(currentPage, scale, rotation);
    }
  }, [loading, pdfDoc, currentPage, scale, rotation, viewMode, performRender]);

  // Auto-scroll back to top of the page on page change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentPage]);

  // Window resize handler to maintain readability if device orientation changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && pdfDoc) {
        pdfDoc.getPage(currentPage).then(page => {
          const vp = page.getViewport({ scale: 1.0 });
          const optimal = calculateOptimalScale(vp.width);
          setScale(optimal);
        }).catch(() => {});
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pdfDoc, currentPage, calculateOptimalScale]);

  // Keyboard navigation for power reading (Arrow keys, Page Up/Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentPage(p => Math.min(numPages || 1, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(1, p - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        if (numPages) setCurrentPage(numPages);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, onClose]);

  // Touch swipe handling for mobile & tablets
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null || e.changedTouches.length === 0) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Horizontal swipe threshold (> 50px horizontal, and horizontal movement > vertical movement)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        // Swiped left -> Next page
        setCurrentPage(p => Math.min(numPages || 1, p + 1));
      } else {
        // Swiped right -> Previous page
        setCurrentPage(p => Math.max(1, p - 1));
      }
    }

    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  // Fit Width helper
  const handleFitWidth = async () => {
    if (!pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(currentPage);
      const vp = page.getViewport({ scale: 1.0 });
      const optimal = calculateOptimalScale(vp.width);
      setScale(optimal);
    } catch (_) {}
  };

  // Compute bounding box highlights on the current page for active search term
  useEffect(() => {
    if (!pdfDoc || !activeSearchTerm.trim() || viewMode !== 'canvas') {
      setPageHighlights([]);
      return;
    }

    let isCancelled = false;

    async function computePageHighlights() {
      try {
        const page = await pdfDoc!.getPage(currentPage);
        if (isCancelled) return;

        let cached = pageTextCacheRef.current.get(currentPage);
        let items: any[] = [];

        if (cached) {
          items = cached.items;
        } else {
          const textContent = await page.getTextContent();
          items = textContent.items;
          const fullText = items.map((it: any) => it.str || '').join(' ');
          pageTextCacheRef.current.set(currentPage, { text: fullText, items });
        }

        const vp = page.getViewport({ scale, rotation });
        const term = activeSearchTerm.toLowerCase();
        const boxes: { left: number; top: number; width: number; height: number; str: string }[] = [];

        for (const item of items) {
          if (item.str && item.str.toLowerCase().includes(term) && item.transform) {
            const x = item.transform[4];
            const y = item.transform[5];
            const itemH = item.height || 10;
            const itemW = item.width || 40;
            const p1 = vp.convertToViewportPoint(x, y + itemH);
            const p2 = vp.convertToViewportPoint(x + itemW, y);

            const left = Math.min(p1[0], p2[0]);
            const top = Math.min(p1[1], p2[1]);
            const width = Math.max(10, Math.abs(p2[0] - p1[0]));
            const height = Math.max(8, Math.abs(p2[1] - p1[1]));

            boxes.push({ left, top, width, height, str: item.str });
          }
        }

        if (!isCancelled) {
          setPageHighlights(boxes);
        }
      } catch (err) {
        console.warn('Error computing highlights:', err);
      }
    }

    computePageHighlights();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, rotation, activeSearchTerm, viewMode]);

  // Global Ctrl+F / Cmd+F shortcut to open search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setShowSearchPanel(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Streaming Keyword Search across entire PDF document with caching & GitHub Pages offline index support
  const handlePerformSearch = async (query: string) => {
    const searchTerm = query.trim();
    if (!searchTerm) {
      setSearchResults([]);
      setActiveSearchTerm('');
      setPageHighlights([]);
      return;
    }

    setIsSearching(true);
    setShowSearchPanel(true);
    setActiveSearchTerm(searchTerm);
    searchAbortRef.current = false;

    try {
      // Strategy 1: Instant Static Pre-built Search Index (100% works on GitHub Pages, static hosts, offline)
      const index = await getBookSearchIndex(book.id);

      if (index && index.pages && index.pages.length > 0) {
        if (numPages === 0 && index.totalPages > 0) {
          setNumPages(index.totalPages);
        }

        // Cache page texts for instant thumbnail/preview lookups
        index.pages.forEach(p => {
          if (!pageTextCacheRef.current.has(p.page)) {
            pageTextCacheRef.current.set(p.page, { text: p.text, items: [] });
          }
        });

        setSearchProgress({ current: 0, total: index.totalPages, count: 0 });

        const matches = searchInBookIndex(index, searchTerm, (curr, total, count) => {
          setSearchProgress({ current: curr, total, count });
        });

        setSearchResults(matches);
        setSearchProgress({ current: index.totalPages, total: index.totalPages, count: matches.length });
        setCurrentMatchIdx(0);

        if (matches.length > 0) {
          setCurrentPage(matches[0].pageNum);
        }
        return;
      }

      // Strategy 2: Dynamic PDF.js document scanner fallback
      if (pdfDoc) {
        const termLower = searchTerm.toLowerCase();
        const matches: SearchMatch[] = [];
        const totalPages = pdfDoc.numPages;

        setSearchProgress({ current: 0, total: totalPages, count: 0 });

        for (let p = 1; p <= totalPages; p++) {
          if (searchAbortRef.current) break;

          let pageText = '';
          let items: any[] = [];

          // Check if page text is already in memory cache
          const cached = pageTextCacheRef.current.get(p);
          if (cached) {
            pageText = cached.text;
            items = cached.items;
          } else {
            const page = await pdfDoc.getPage(p);
            const textContent = await page.getTextContent();
            items = textContent.items;
            pageText = items.map((item: any) => item.str || '').join(' ');
            pageTextCacheRef.current.set(p, { text: pageText, items });
          }

          const lowerText = pageText.toLowerCase();
          let startIndex = 0;
          let foundIdx = lowerText.indexOf(termLower, startIndex);

          while (foundIdx !== -1) {
            const snippetStart = Math.max(0, foundIdx - 45);
            const snippetEnd = Math.min(pageText.length, foundIdx + termLower.length + 45);
            let snippet = pageText.slice(snippetStart, snippetEnd).trim();

            if (snippetStart > 0) snippet = '...' + snippet;
            if (snippetEnd < pageText.length) snippet = snippet + '...';

            matches.push({
              pageNum: p,
              matchIndex: matches.length,
              snippet,
            });

            startIndex = foundIdx + termLower.length;
            foundIdx = lowerText.indexOf(termLower, startIndex);

            if (matches.length >= 300) break;
          }

          // Periodically update state so results stream live
          if (p % 10 === 0 || p === totalPages || matches.length > 0) {
            setSearchResults([...matches]);
            setSearchProgress({ current: p, total: totalPages, count: matches.length });
            await new Promise(r => setTimeout(r, 0));
          }

          if (matches.length >= 300) break;
        }

        setSearchResults(matches);
        setCurrentMatchIdx(0);
        if (matches.length > 0) {
          setCurrentPage(matches[0].pageNum);
        }
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const jumpToMatch = (index: number) => {
    if (searchResults.length === 0) return;
    const nextIdx = (index + searchResults.length) % searchResults.length;
    setCurrentMatchIdx(nextIdx);
    const targetPage = searchResults[nextIdx].pageNum;
    setCurrentPage(targetPage);
    if (viewMode !== 'canvas') {
      setViewMode('canvas');
    }
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearchTerm('');
    setSearchResults([]);
    setPageHighlights([]);
    searchAbortRef.current = true;
    setIsSearching(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-1 sm:p-3 md:p-6 bg-black/90 backdrop-blur-2xl">
      <div 
        ref={containerRef}
        className="relative w-full max-w-7xl h-[98vh] sm:h-[94vh] bg-slate-950 border border-white/10 rounded-2xl sm:rounded-[28px] shadow-2xl overflow-hidden flex flex-col text-slate-100"
      >
        {/* Top Control Bar */}
        <div className="px-3 sm:px-5 py-2.5 sm:py-3.5 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0 z-20">
          {/* Book Title & Icon */}
          <div className="flex items-center gap-2.5 min-w-0 flex-grow sm:flex-grow-0">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${book.coverGradient} flex items-center justify-center shrink-0 border border-white/20 shadow-md`}>
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5 sm:gap-2">
                <span className="truncate">{book.title}</span>
                <span className="text-[8px] sm:text-[9px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shrink-0">
                  {book.badge}
                </span>
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium truncate">
                {book.author}
              </p>
            </div>
          </div>

          {/* Keyword Search Input (Desktop & Tablets) */}
          <div className="hidden md:flex items-center gap-2 flex-grow max-w-xs lg:max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-amber-400/80" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey && searchResults.length > 0) {
                      jumpToMatch(currentMatchIdx - 1);
                    } else if (searchResults.length > 0 && searchQuery.trim().toLowerCase() === activeSearchTerm.toLowerCase()) {
                      jumpToMatch(currentMatchIdx + 1);
                    } else {
                      handlePerformSearch(searchQuery);
                    }
                  }
                }}
                placeholder="Search words in book (e.g. Kriya, Soul)..."
                className="w-full bg-slate-800/80 border border-amber-500/30 rounded-xl py-1.5 pl-9 pr-24 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
              />
              <div className="absolute right-1 top-1 flex items-center gap-1">
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => handlePerformSearch(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Utilities & View Mode Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
              <button
                onClick={() => setViewMode('canvas')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'canvas' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Scanned Book Pages with original illustrations, photos & typography"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">Scanned</span>
              </button>
              <button
                onClick={() => setViewMode('text')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'text' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Clean Typography Reader with font & theme controls"
              >
                <BookOpen className="w-3 h-3" />
                <span className="hidden sm:inline">Text</span>
              </button>
              <button
                onClick={() => setViewMode('native')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'native' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Continuous Browser View"
              >
                <Layers className="w-3 h-3" />
                <span className="hidden sm:inline">Browser</span>
              </button>
            </div>

            {/* Quick Page Directory Drawer Button */}
            <button
              onClick={() => {
                setShowThumbnailDrawer(!showThumbnailDrawer);
                if (showSearchPanel) setShowSearchPanel(false);
              }}
              className={`px-2 sm:px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                showThumbnailDrawer 
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Table of Contents & Quick Page Directory"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pages</span>
            </button>

            {/* Mobile Search Button */}
            <button
              onClick={() => {
                setShowSearchPanel(!showSearchPanel);
                if (showThumbnailDrawer) setShowThumbnailDrawer(false);
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                showSearchPanel || searchResults.length > 0
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md' 
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
              }`}
              title="Keyword Search across book"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
              {searchResults.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded-full text-[9px]">
                  {searchResults.length}
                </span>
              )}
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all border border-white/10 cursor-pointer hidden sm:block"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <a
              href={book.pdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-all border border-white/10 cursor-pointer hidden md:block"
              title="Download Original PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white rounded-xl transition-all border border-rose-500/20 cursor-pointer"
              title="Close Reader"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reader Secondary Toolbar (Page navigation, Auto-Fit, Zoom, Rotation) */}
        {viewMode === 'canvas' && (
          <div className="px-3 sm:px-5 py-2 bg-slate-900/90 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-10">
            {/* Page Navigation Controls */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1}
                className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer hidden sm:flex items-center"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer flex items-center"
                title="Previous Page (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10 text-[11px] font-bold">
                <span className="hidden sm:inline text-slate-400">Page</span>
                <input
                  type="number"
                  min={1}
                  max={numPages || 1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= numPages) {
                      setCurrentPage(val);
                    }
                  }}
                  className="w-10 sm:w-12 bg-slate-800 text-center text-amber-300 rounded border border-white/10 py-0.5 focus:outline-none focus:border-amber-400 font-mono"
                />
                <span className="text-slate-400">/ {numPages || '...'}</span>
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer flex items-center"
                title="Next Page (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(numPages)}
                disabled={currentPage >= numPages}
                className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer hidden sm:flex items-center"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>

              {/* Quick Jump Suggestion for books whose initial 1-2 pages are blank endpapers */}
              {currentPage <= 2 && numPages > 5 && (
                <button
                  onClick={() => setCurrentPage(3)}
                  className="ml-1 sm:ml-2 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg border border-amber-500/30 text-[9px] sm:text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  title="Jump past introductory flyleaf pages to main text"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Jump to</span> <span>Pg 3</span>
                </button>
              )}
            </div>

            {/* Search Match Quick Switcher */}
            {searchResults.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-xl text-[10px] text-amber-300">
                <span className="font-bold">Match {currentMatchIdx + 1}/{searchResults.length}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => jumpToMatch(currentMatchIdx - 1)}
                    className="p-0.5 hover:bg-amber-500/20 rounded cursor-pointer"
                    title="Previous Match"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => jumpToMatch(currentMatchIdx + 1)}
                    className="p-0.5 hover:bg-amber-500/20 rounded cursor-pointer"
                    title="Next Match"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Responsive Zoom & Fit Controls / Typography Theme Controls */}
            <div className="flex items-center gap-1.5">
              {!pdfDoc && (
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 mr-1">
                  <button
                    onClick={() => setReaderFontSize(s => Math.max(13, s - 2))}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white rounded cursor-pointer"
                    title="Decrease Font Size"
                  >
                    A-
                  </button>
                  <span className="text-[9px] font-mono text-amber-400 font-bold px-1">{readerFontSize}px</span>
                  <button
                    onClick={() => setReaderFontSize(s => Math.min(28, s + 2))}
                    className="px-1.5 py-0.5 text-[10px] font-bold text-slate-300 hover:text-white rounded cursor-pointer"
                    title="Increase Font Size"
                  >
                    A+
                  </button>
                  <div className="w-px h-3 bg-white/20 mx-0.5" />
                  <button
                    onClick={() => setReaderTheme('ivory')}
                    className={`w-3.5 h-3.5 rounded-full bg-[#faf7ee] border cursor-pointer ${readerTheme === 'ivory' ? 'ring-2 ring-amber-400 border-amber-500' : 'border-slate-400'}`}
                    title="Warm Ivory Paper"
                  />
                  <button
                    onClick={() => setReaderTheme('sepia')}
                    className={`w-3.5 h-3.5 rounded-full bg-[#f4ecd8] border cursor-pointer ${readerTheme === 'sepia' ? 'ring-2 ring-amber-400 border-amber-500' : 'border-slate-400'}`}
                    title="Ancient Palm Sepia"
                  />
                  <button
                    onClick={() => setReaderTheme('dark')}
                    className={`w-3.5 h-3.5 rounded-full bg-slate-900 border cursor-pointer ${readerTheme === 'dark' ? 'ring-2 ring-amber-400 border-amber-500' : 'border-slate-400'}`}
                    title="Night Mode"
                  />
                </div>
              )}

              {/* Fit Width Button */}
              {pdfDoc && (
                <button
                  onClick={handleFitWidth}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer text-[10px] font-semibold flex items-center gap-1 border border-white/10"
                  title="Fit Page Width to Screen (Mobile & iPad optimized)"
                >
                  <Expand className="w-3 h-3 text-amber-400" />
                  <span className="hidden sm:inline">Fit Width</span>
                </button>
              )}

              {pdfDoc && (
                <>
                  <button
                    onClick={() => setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono text-slate-300 min-w-[38px] text-center font-bold">
                    {Math.round(scale * 100)}%
                  </span>
                  <button
                    onClick={() => setScale(s => Math.min(3.0, Number((s + 0.15).toFixed(2))))}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setRotation(r => (r + 90) % 360)}
                    className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer ml-0.5"
                    title="Rotate 90°"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Main Workspace Layout (Drawer + Canvas / Native Iframe Workspace) */}
        <div className="flex-grow flex relative overflow-hidden bg-slate-900/60">
          {/* Quick Page Jump Drawer */}
          {showThumbnailDrawer && (
            <div className="w-64 sm:w-72 bg-slate-950 border-r border-white/10 flex flex-col shrink-0 z-30 overflow-hidden shadow-2xl">
              <div className="p-3.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <LayoutGrid className="w-3.5 h-3.5" /> Page Directory
                </div>
                <button onClick={() => setShowThumbnailDrawer(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-2.5 bg-slate-900/40 border-b border-white/5 text-[10px] text-slate-400">
                <span>Select any page to jump immediately:</span>
              </div>

              <div className="flex-grow overflow-y-auto p-3 grid grid-cols-2 gap-2 custom-scrollbar">
                {Array.from({ length: numPages || 0 }, (_, i) => i + 1).map((pNum) => (
                  <button
                    key={pNum}
                    onClick={() => {
                      setCurrentPage(pNum);
                      setShowThumbnailDrawer(false);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      pNum === currentPage 
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md' 
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    <span className="text-[11px] font-mono">Page {pNum}</span>
                    {pNum === 1 && <span className="text-[8px] opacity-75">Cover</span>}
                    {pNum === 2 && <span className="text-[8px] opacity-75">Frontispiece</span>}
                    {pNum === 3 && <span className="text-[8px] opacity-75">Title Page</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Keyword Search Results Drawer */}
          {showSearchPanel && (
            <div className="w-80 sm:w-96 bg-slate-950 border-r border-white/10 flex flex-col shrink-0 z-30 overflow-hidden shadow-2xl">
              <div className="p-3.5 bg-slate-900 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Search Results
                </div>
                <div className="flex items-center gap-1">
                  {searchResults.length > 0 && (
                    <button 
                      onClick={handleClearSearch}
                      className="text-[10px] text-slate-400 hover:text-amber-300 px-2 py-1 bg-white/5 rounded-lg border border-white/10 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button onClick={() => setShowSearchPanel(false)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Mobile Search Input in Drawer */}
              <div className="p-3 border-b border-white/10 md:hidden bg-slate-900/60">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (searchResults.length > 0 && searchQuery.trim().toLowerCase() === activeSearchTerm.toLowerCase()) {
                          jumpToMatch(currentMatchIdx + 1);
                        } else {
                          handlePerformSearch(searchQuery);
                        }
                      }
                    }}
                    placeholder="Search words in book..."
                    className="w-full bg-slate-800 border border-amber-500/30 rounded-xl py-1.5 px-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handlePerformSearch(searchQuery)}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
                  </button>
                </div>
              </div>

              {/* Search Progress & Status */}
              <div className="p-3 border-b border-white/5 bg-slate-900/40 text-[10px] text-slate-400 space-y-1.5">
                {isSearching ? (
                  <div>
                    <div className="flex items-center justify-between text-amber-400 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning page {searchProgress.current} of {searchProgress.total}...
                      </span>
                      <span className="font-mono font-bold text-amber-300">{searchProgress.count} found</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-amber-400 h-1.5 rounded-full transition-all duration-200"
                        style={{ width: `${searchProgress.total ? (searchProgress.current / searchProgress.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="flex items-center justify-between">
                    <span>Found <strong className="text-amber-300 font-bold">{searchResults.length}</strong> matches for &quot;<span className="text-amber-400">{activeSearchTerm}</span>&quot;</span>
                    <span className="text-[9px] text-slate-500">Match {currentMatchIdx + 1} of {searchResults.length}</span>
                  </div>
                ) : activeSearchTerm ? (
                  <span>No matches found for &quot;<span className="text-amber-400">{activeSearchTerm}</span>&quot;. Try a different keyword.</span>
                ) : (
                  <span>Type a keyword above to find exact words and passages across all pages.</span>
                )}
              </div>

              {/* Search Result Matches with Keyword Highlight */}
              <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {searchResults.map((match, idx) => {
                  const isCurrent = idx === currentMatchIdx;
                  // Split snippet to highlight keyword
                  const term = activeSearchTerm.trim().toLowerCase();
                  const snippet = match.snippet;
                  let snippetContent: React.ReactNode = snippet;

                  if (term) {
                    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    const parts = snippet.split(regex);
                    snippetContent = parts.map((part, pIdx) => 
                      part.toLowerCase() === term ? (
                        <mark key={pIdx} className="bg-amber-400/40 text-amber-200 font-bold px-0.5 rounded not-italic">
                          {part}
                        </mark>
                      ) : (
                        <span key={pIdx}>{part}</span>
                      )
                    );
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => jumpToMatch(idx)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                        isCurrent
                          ? 'bg-amber-500/20 border-amber-400/80 text-white shadow-md ring-1 ring-amber-400/40'
                          : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          isCurrent 
                            ? 'bg-amber-500 text-slate-950 border-amber-400' 
                            : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        }`}>
                          Page {match.pageNum}
                        </span>
                        {isCurrent && (
                          <span className="text-[8px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-0.5">
                            Active <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-300 italic font-serif">
                        &quot;{snippetContent}&quot;
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* View Mode 1: Canvas Rendering Engine */}
          {viewMode === 'canvas' && (
            <div 
              ref={scrollContainerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="flex-grow h-full overflow-x-auto overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-5 md:p-8 pb-32 sm:pb-28 custom-scrollbar relative select-none"
            >
              {loading && (
                <div className="my-auto flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
                      <BookOpen className="w-8 h-8 text-amber-400" />
                    </div>
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Preparing {book.title}</h4>
                    <p className="text-xs text-amber-400/90 font-mono">{loadingProgress}</p>
                  </div>
                </div>
              )}

              {error && !loading && viewMode === 'canvas' && (
                <div className="my-auto max-w-md bg-slate-900/90 border border-amber-500/30 p-6 rounded-2xl text-center space-y-4 shadow-2xl backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Direct Scanned Book Stream</h4>
                    <p className="text-xs text-slate-300 mb-2">We encountered a temporary network delay loading the heavy graphical scanned stream.</p>
                    <p className="text-[11px] text-amber-300/80 font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">{error}</p>
                  </div>
                  <div className="flex flex-col gap-2 justify-center pt-2">
                    <button
                      onClick={() => setReloadTrigger(p => p + 1)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Retry Loading Scanned Book (with Images)
                    </button>
                    <button
                      onClick={() => setViewMode('text')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      Read in Clean Text Mode
                    </button>
                    <button
                      onClick={() => setViewMode('native')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Switch to Embedded Browser Reader
                    </button>
                    <a
                      href={book.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-transparent hover:bg-white/5 text-slate-400 hover:text-white text-[11px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Original PDF in New Tab
                    </a>
                  </div>
                </div>
              )}

              {/* Canvas Paper View (Scanned PDF Engine with high-res artwork, photos & typography) */}
              {pdfDoc && (
                <div 
                  className={`relative shadow-2xl rounded-sm sm:rounded-md bg-white border border-slate-300/80 transition-all ${loading ? 'hidden' : 'block'} mb-16`}
                  style={{
                    width: `${pageDimensions.width}px`,
                    minHeight: `${pageDimensions.height}px`,
                    maxWidth: 'none',
                  }}
                >
                  {/* Floating Page Badge on Paper */}
                  <div className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-bold text-amber-300 pointer-events-none flex items-center gap-1.5 shadow-md">
                    <span>Page {currentPage} of {numPages}</span>
                    {currentPage <= 2 && (
                      <span className="text-[8px] font-normal text-slate-300 border-l border-white/20 pl-1.5">
                        Introductory / Illustrated
                      </span>
                    )}
                  </div>

                  {/* Match Counter Badge on Paper if there are search matches on this page */}
                  {pageHighlights.length > 0 && (
                    <div className="absolute top-2 right-2 z-10 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[9px] shadow-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{pageHighlights.length} match{pageHighlights.length > 1 ? 'es' : ''} on this page</span>
                    </div>
                  )}

                  {/* Dynamic Golden Highlight Overlays for Matched Search Words */}
                  {pageHighlights.map((hl, i) => (
                    <div
                      key={i}
                      className="absolute bg-amber-400/40 border-2 border-amber-500 rounded-[2px] pointer-events-none shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse z-10"
                      style={{
                        left: `${hl.left}px`,
                        top: `${hl.top}px`,
                        width: `${hl.width}px`,
                        height: `${hl.height}px`,
                      }}
                      title={hl.str}
                    />
                  ))}

                  {/* Direct Canvas Element */}
                  <canvas 
                    ref={canvasRef} 
                    className="block bg-white"
                  />
                </div>
              )}

              {/* Fallback to text reader inside canvas mode if doc didn't load */}
              {!pdfDoc && !loading && !error && (
                <div className="my-auto max-w-md text-center p-6 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                  <BookOpen className="w-8 h-8 text-amber-400 mx-auto" />
                  <p className="text-sm font-semibold text-white">Ready in Text Mode</p>
                  <button
                    onClick={() => setViewMode('text')}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl cursor-pointer hover:bg-amber-400"
                  >
                    Open Text Reader
                  </button>
                </div>
              )}

              {/* Floating Mobile/Tablet Next & Previous Quick Tap Zones */}
              {!loading && !error && (
                <>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/60 hover:bg-black/80 disabled:opacity-0 text-white rounded-full border border-white/20 shadow-2xl backdrop-blur-md transition-all cursor-pointer hidden sm:flex items-center justify-center z-20"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-5 h-5 text-amber-400" />
                  </button>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    disabled={currentPage >= numPages}
                    className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/60 hover:bg-black/80 disabled:opacity-0 text-white rounded-full border border-white/20 shadow-2xl backdrop-blur-md transition-all cursor-pointer hidden sm:flex items-center justify-center z-20"
                    title="Next Page"
                  >
                    <ChevronRight className="w-5 h-5 text-amber-400" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* View Mode 2: Dedicated Interactive Typography Text Reader */}
          {viewMode === 'text' && (
            <div 
              ref={scrollContainerRef}
              className="flex-grow h-full overflow-x-auto overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-5 md:p-8 pb-32 sm:pb-28 custom-scrollbar relative"
            >
              <div 
                className={`w-full max-w-3xl rounded-2xl border shadow-2xl p-5 sm:p-10 md:p-12 my-2 sm:my-4 transition-all mb-16 select-text ${
                  readerTheme === 'ivory'
                    ? 'bg-[#faf7ee] text-[#2c2824] border-[#e6dcce]'
                    : readerTheme === 'sepia'
                    ? 'bg-[#f4ecd8] text-[#3e2e1d] border-[#ded0b1]'
                    : readerTheme === 'dark'
                    ? 'bg-slate-900 text-slate-100 border-slate-800'
                    : 'bg-white text-slate-900 border-slate-200'
                }`}
                style={{ fontSize: `${readerFontSize}px` }}
              >
                {/* Paper Header with Theme & Font Controls */}
                <div className="border-b border-black/10 dark:border-white/10 pb-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold tracking-wider uppercase text-[11px] text-slate-600 dark:text-slate-300">
                      {book.title}
                    </span>
                  </div>

                  {/* Paper Theme & Typography Controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-black/10 dark:border-white/10">
                      <button
                        onClick={() => setReaderTheme('ivory')}
                        className={`w-4 h-4 rounded-full border ${readerTheme === 'ivory' ? 'ring-2 ring-amber-500 scale-110' : 'opacity-70'}`}
                        style={{ backgroundColor: '#faf7ee', borderColor: '#dcd3c3' }}
                        title="Ivory Paper"
                      />
                      <button
                        onClick={() => setReaderTheme('sepia')}
                        className={`w-4 h-4 rounded-full border ${readerTheme === 'sepia' ? 'ring-2 ring-amber-500 scale-110' : 'opacity-70'}`}
                        style={{ backgroundColor: '#f4ecd8', borderColor: '#d3c19b' }}
                        title="Sepia Paper"
                      />
                      <button
                        onClick={() => setReaderTheme('white')}
                        className={`w-4 h-4 rounded-full border ${readerTheme === 'white' ? 'ring-2 ring-amber-500 scale-110' : 'opacity-70'}`}
                        style={{ backgroundColor: '#ffffff', borderColor: '#d1d5db' }}
                        title="White Paper"
                      />
                      <button
                        onClick={() => setReaderTheme('dark')}
                        className={`w-4 h-4 rounded-full border ${readerTheme === 'dark' ? 'ring-2 ring-amber-500 scale-110' : 'opacity-70'}`}
                        style={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
                        title="Dark Mode"
                      />
                    </div>

                    {/* Font Size */}
                    <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-black/10 dark:border-white/10 text-[10px] font-bold">
                      <button
                        onClick={() => setReaderFontSize(s => Math.max(13, s - 1))}
                        className="hover:text-amber-500 px-1 cursor-pointer"
                        title="Decrease font size"
                      >
                        A-
                      </button>
                      <span className="opacity-50">|</span>
                      <button
                        onClick={() => setReaderFontSize(s => Math.min(28, s + 1))}
                        className="hover:text-amber-500 px-1 cursor-pointer"
                        title="Increase font size"
                      >
                        A+
                      </button>
                    </div>

                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                      Page {currentPage} of {numPages || 1}
                    </span>
                  </div>
                </div>

                {/* Page Text Paragraphs with Golden Highlights */}
                {(() => {
                  const pageData = bookIndex?.pages.find(p => p.page === currentPage) || 
                    (pageTextCacheRef.current.get(currentPage)?.text ? { page: currentPage, text: pageTextCacheRef.current.get(currentPage)!.text } : null);
                  const pageText = pageData?.text || '';
                  const paras = pageText.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);

                  if (paras.length === 0) {
                    return (
                      <div className="text-center py-16 text-slate-400 font-serif italic space-y-3">
                        <BookOpen className="w-8 h-8 text-amber-500/40 mx-auto" />
                        <p>Introductory or Illustrated Section • Page {currentPage}</p>
                        <p className="text-xs font-sans not-italic text-slate-500">
                          Switch to <span className="text-amber-500 font-bold">"Scanned"</span> mode in the top bar to see the original artwork & photos.
                        </p>
                        <div className="pt-2 flex justify-center gap-2">
                          <button
                            onClick={() => setViewMode('canvas')}
                            className="px-4 py-2 bg-amber-500 text-slate-950 font-sans font-bold text-xs rounded-xl cursor-pointer hover:bg-amber-400 shadow-md"
                          >
                            <Eye className="w-3.5 h-3.5 inline mr-1" />
                            View Scanned Illustration
                          </button>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                            className="px-4 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 font-sans font-bold text-xs rounded-xl cursor-pointer hover:bg-black/10 dark:hover:bg-white/10"
                          >
                            Next Page &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="font-serif leading-[1.85] space-y-4">
                      {paras.map((paragraph, pIdx) => {
                        if (!activeSearchTerm.trim()) {
                          return <p key={pIdx} className="text-justify indent-6">{paragraph}</p>;
                        }
                        const term = activeSearchTerm.trim().toLowerCase();
                        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                        const parts = paragraph.split(regex);
                        return (
                          <p key={pIdx} className="text-justify indent-6">
                            {parts.map((part, i) =>
                              part.toLowerCase() === term ? (
                                <mark
                                  key={i}
                                  className="bg-amber-300/80 dark:bg-amber-400/40 text-amber-950 dark:text-amber-100 font-bold px-1 py-0.5 rounded shadow-[0_0_8px_rgba(245,158,11,0.5)] border-b-2 border-amber-600 not-italic inline-block mx-0.5"
                                >
                                  {part}
                                </mark>
                              ) : (
                                <span key={i}>{part}</span>
                              )
                            )}
                          </p>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Paper Footer Navigation */}
                <div className="border-t border-black/10 dark:border-white/10 pt-4 mt-8 flex items-center justify-between text-xs text-slate-500 font-sans">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer flex items-center gap-1 font-semibold transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous
                  </button>
                  <span className="font-mono font-bold tracking-widest text-[11px]">
                    — Page {currentPage} of {numPages || 1} —
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                    disabled={currentPage >= numPages}
                    className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer flex items-center gap-1 font-semibold transition-all"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View Mode 3: Full-Featured Embedded Browser PDF Viewer */}
          {viewMode === 'native' && (
            <div className="flex-grow h-full w-full bg-slate-900 flex flex-col">
              {/* Native Engine Navigation Strip */}
              <div className="px-3 sm:px-4 py-2 bg-slate-950/80 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
                <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-xl border border-white/10">
                  <button
                    onClick={() => setNativeEngine('google')}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                      nativeEngine === 'google'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Universal Cloud PDF Reader with smooth scrolling and zoom"
                  >
                    <Sparkles className="w-3 h-3" />
                    Google Cloud Reader
                  </button>
                  <button
                    onClick={() => setNativeEngine('direct')}
                    className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                      nativeEngine === 'direct'
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Direct PDF Frame Reader"
                  >
                    <Layers className="w-3 h-3" />
                    Direct PDF Stream
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                    title="Open original document in external browser tab"
                  >
                    <ExternalLink className="w-3 h-3 text-amber-400" />
                    Open in New Tab
                  </a>
                  <a
                    href={book.pdfUrl}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] rounded-lg transition-all flex items-center gap-1 cursor-pointer border border-amber-500/30"
                    title="Download complete PDF book file"
                  >
                    <Download className="w-3 h-3" />
                    Download
                  </a>
                </div>
              </div>

              {/* Embedded Document Viewport */}
              <div className="flex-grow w-full h-full relative bg-slate-950">
                <iframe
                  key={nativeEngine}
                  src={nativeEngine === 'google' ? googleViewerUrl : book.pdfUrl}
                  title={book.title}
                  className="w-full h-full border-0 bg-slate-900"
                  allow="fullscreen"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Page Scrub Bar & Mobile Quick Controller */}
        {numPages > 0 && (
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-3 shrink-0 text-[10px] text-slate-400 z-20">
            <span className="truncate hidden md:inline max-w-xs">
              Reading <strong className="text-white">{book.title}</strong>
            </span>

            {/* Mobile Touch Bar */}
            <div className="flex items-center justify-between w-full md:w-auto md:flex-grow md:max-w-lg md:mx-auto gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-200 rounded-lg flex items-center gap-1 font-semibold cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px]">Prev</span>
              </button>

              <div className="flex items-center gap-2 flex-grow mx-1">
                <input
                  type="range"
                  min={1}
                  max={numPages}
                  value={currentPage}
                  onChange={(e) => setCurrentPage(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-200 rounded-lg flex items-center gap-1 font-semibold cursor-pointer shrink-0"
              >
                <span className="text-[10px]">Next</span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            <span className="font-mono text-amber-400 font-bold shrink-0 hidden sm:inline">
              Page {currentPage} of {numPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
