import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
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
  FileText,
  Type,
  Sun,
  Moon,
  Coffee,
  Check,
  Compass
} from 'lucide-react';
import { SpiritualBook } from '../data/spiritual_books';
import { getBookSearchIndex, searchInBookIndex, BookSearchIndex } from '../utils/searchIndexService';

// Set up local bundled PDF.js worker with fallback to unpkg
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch (_) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
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
  const isAppleDevice = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }, []);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }>({ width: 600, height: 850 });
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Streaming book pages...');
  const [canvasError, setCanvasError] = useState<string | null>(null);

  // View modes: 'native' (instant browser PDF) vs 'reader' (digital text) vs 'canvas' (PDF.js canvas)
  // On iPad/Apple, default to 'native' for instant 0.1s hardware-accelerated Apple WebKit PDF rendering
  const [viewMode, setViewMode] = useState<'native' | 'reader' | 'canvas'>(() => {
    if (typeof window !== 'undefined' && (/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))) {
      return 'native';
    }
    return 'reader';
  });

  const [nativeEngine, setNativeEngine] = useState<'direct' | 'google'>('direct');
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

    const padding = containerWidth < 640 ? 16 : 40;
    const availableWidth = Math.max(280, containerWidth - padding);
    const fitScale = availableWidth / viewportWidth;

    return Math.min(2.0, Math.max(0.45, Number(fitScale.toFixed(2))));
  }, []);

  // Fetch static index + Stream PDF in background
  useEffect(() => {
    let isCancelled = false;
    setIsPdfLoading(true);
    setCanvasError(null);

    // 1. Eagerly load pre-built index for instant text & search
    getBookSearchIndex(book.id).then(index => {
      if (!isCancelled && index) {
        setBookIndex(index);
        if (index.totalPages > 0) {
          setNumPages(prev => (prev === 0 ? index.totalPages : prev));
        }
        index.pages.forEach(p => {
          if (!pageTextCacheRef.current.has(p.page)) {
            pageTextCacheRef.current.set(p.page, { text: p.text, items: [] });
          }
        });
      }
    }).catch(err => {
      console.warn('Index load notice:', err);
    });

    // 2. High-speed progressive range streaming using PDF.js
    async function loadPdf() {
      try {
        setLoadingProgress('Streaming page 1...');
        const loadingTask = pdfjsLib.getDocument({
          url: proxyUrl,
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
          enableXfa: true,
          disableAutoFetch: true, // Only fetch pages on demand for instant speed
          disableStream: false,
          disableRange: false,
          rangeChunkSize: 65536,
        });

        const doc = await loadingTask.promise;

        if (isCancelled) return;

        if (doc) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          try {
            const firstPage = await doc.getPage(1);
            const initialViewport = firstPage.getViewport({ scale: 1.0 });
            const optimalScale = calculateOptimalScale(initialViewport.width);
            setScale(optimalScale);
          } catch (_) {}
        }

        setIsPdfLoading(false);
      } catch (err: any) {
        console.warn('PDF stream loading fallback:', err);
        // Direct stream fallback
        if (!isCancelled) {
          try {
            const directTask = pdfjsLib.getDocument({
              url: book.pdfUrl,
              cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
              cMapPacked: true,
              standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
              disableAutoFetch: true,
            });
            const directDoc = await directTask.promise;
            if (!isCancelled && directDoc) {
              setPdfDoc(directDoc);
              setNumPages(directDoc.numPages);
            }
          } catch (e2) {
            console.warn('Direct PDF.js fallback:', e2);
          }
          setIsPdfLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [book.id, book.pdfUrl, proxyUrl, calculateOptimalScale]);

  // iPadOS/Retina-safe PDF.js Canvas Rendering Queue Engine
  const isRenderingRef = useRef<boolean>(false);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const nextRenderRef = useRef<{ pageNum: number; scale: number; rotation: number } | null>(null);

  const performRender = useCallback(async (targetPage: number, targetScale: number, targetRotation: number) => {
    if (!pdfDoc || !canvasRef.current) return;

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

      if (nextRenderRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: targetScale, rotation: targetRotation });
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return;

      setPageDimensions({
        width: Math.ceil(viewport.width),
        height: Math.ceil(viewport.height),
      });

      const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      const outputScale = Math.min(dpr, 1.5);
      
      canvas.width = Math.ceil(viewport.width * outputScale);
      canvas.height = Math.ceil(viewport.height * outputScale);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;

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
        console.warn('Canvas render notice:', err);
      }
    } finally {
      renderTaskRef.current = null;
      isRenderingRef.current = false;

      if (nextRenderRef.current) {
        const next = nextRenderRef.current;
        nextRenderRef.current = null;
        performRender(next.pageNum, next.scale, next.rotation);
      }
    }
  }, [pdfDoc]);

  // Trigger render when in canvas mode
  useEffect(() => {
    if (!isPdfLoading && pdfDoc && viewMode === 'canvas') {
      performRender(currentPage, scale, rotation);
    }
  }, [isPdfLoading, pdfDoc, currentPage, scale, rotation, viewMode, performRender]);

  // Auto-scroll back to top on page change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentPage]);

  // Window resize handler
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        setCurrentPage(p => Math.min(numPages || 999, p + 1));
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

  // Touch swipe handling for iPad & mobile tablets
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

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
      if (deltaX < 0) {
        setCurrentPage(p => Math.min(numPages || 999, p + 1));
      } else {
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

  // Compute bounding box highlights on the current page for active search term in canvas mode
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
        console.warn('Highlight compute notice:', err);
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

  // Streaming Keyword Search across entire PDF document
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
      // 1. Instant Static Index Search
      const index = await getBookSearchIndex(book.id);

      if (index && index.pages && index.pages.length > 0) {
        if (numPages === 0 && index.totalPages > 0) {
          setNumPages(index.totalPages);
        }

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
          const targetPage = matches[0].pageNum;
          setCurrentPage(targetPage);
        }
        return;
      }

      // 2. Dynamic PDF.js scanner fallback
      if (pdfDoc) {
        const termLower = searchTerm.toLowerCase();
        const matches: SearchMatch[] = [];
        const totalPages = pdfDoc.numPages;

        setSearchProgress({ current: 0, total: totalPages, count: 0 });

        for (let p = 1; p <= totalPages; p++) {
          if (searchAbortRef.current) break;

          let pageText = '';
          let items: any[] = [];

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

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setShowSearchPanel(false);
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

  // Find first page with text for cover jump
  const firstTextPage = useMemo(() => {
    if (!bookIndex?.pages) return 1;
    const found = bookIndex.pages.find(p => p.text && p.text.trim().length > 40);
    return found ? found.page : 1;
  }, [bookIndex]);

  // Current page text for instant reader
  const currentPageData = bookIndex?.pages.find(p => p.page === currentPage) || 
    (pageTextCacheRef.current.get(currentPage)?.text ? { page: currentPage, text: pageTextCacheRef.current.get(currentPage)!.text } : null);
  const currentPageText = currentPageData?.text || '';
  const paragraphs = currentPageText.split(/\n\s*\n|\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div 
      ref={containerRef}
      id="pdf-reader-modal"
      className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center p-0 select-none overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <div className="relative w-full h-full bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Top Header Bar */}
        <div className="px-3 sm:px-5 py-2.5 bg-slate-900 border-b border-white/10 flex items-center justify-between gap-2 shrink-0 z-20">
          {/* Book Info */}
          <div className="flex items-center gap-2.5 min-w-0 max-w-[45%] sm:max-w-none">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs sm:text-sm font-bold text-white truncate">{book.title}</h3>
                <span className="text-[8px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20 hidden md:inline shrink-0">
                  {book.badge}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate hidden sm:block">{book.subtitle || book.author}</p>
            </div>
          </div>

          {/* Quick Match Cycler Bar when search matches are active */}
          {searchResults.length > 0 && (
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-xl text-xs shrink-0">
              <span className="text-[10px] font-bold text-amber-300">
                Match {currentMatchIdx + 1}/{searchResults.length}
              </span>
              <button
                onClick={() => jumpToMatch(currentMatchIdx - 1)}
                className="p-1 hover:bg-amber-500/20 text-amber-300 rounded cursor-pointer"
                title="Previous Match"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => jumpToMatch(currentMatchIdx + 1)}
                className="p-1 hover:bg-amber-500/20 text-amber-300 rounded cursor-pointer"
                title="Next Match"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Center Search Input (Desktop & iPad) */}
          <div className="hidden lg:flex items-center flex-grow max-w-xs mx-3">
            <div className="relative w-full">
              <input
                ref={searchInputRef}
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
                placeholder="Search across all pages..."
                className="w-full bg-slate-800/80 border border-white/10 focus:border-amber-400 rounded-xl py-1.5 pl-8 pr-16 text-xs text-white placeholder-slate-400 focus:outline-none transition-all"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              
              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button 
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-white p-1"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => handlePerformSearch(searchQuery)}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-2 py-0.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
                >
                  {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Find'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Utilities & View Mode Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white/5 p-0.5 rounded-xl border border-white/10 text-[10px] font-bold">
              <button
                onClick={() => setViewMode('native')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'native' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Instant iPad & Cloud PDF Viewer"
              >
                <Layers className="w-3 h-3" />
                <span>PDF Stream</span>
              </button>

              <button
                onClick={() => setViewMode('reader')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'reader' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Instant Text Reader with Highlights"
              >
                <BookOpen className="w-3 h-3" />
                <span>Text Book</span>
              </button>

              <button
                onClick={() => setViewMode('canvas')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'canvas' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Scanned Facsimile"
              >
                <FileText className="w-3 h-3" />
                <span className="hidden sm:inline">Scanned</span>
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
              title="Table of Contents & Page Directory"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pages</span>
            </button>

            {/* Mobile/Tablet Search Button */}
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
              title="Keyword Search"
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

        {/* Secondary Reader Controls Strip */}
        <div className="px-3 sm:px-5 py-1.5 bg-slate-900/90 border-b border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 z-10">
          {/* Page Navigation Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1}
              className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer border border-white/10"
              title="First Page"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer border border-white/10 flex items-center gap-0.5"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline font-bold">Prev</span>
            </button>

            {/* Jump-to-Page Input */}
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-xs">
              <span className="text-[10px] text-slate-400">Page</span>
              <input
                type="number"
                min={1}
                max={numPages || 999}
                value={currentPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && (!numPages || val <= numPages)) {
                    setCurrentPage(val);
                  }
                }}
                className="w-10 sm:w-12 bg-slate-800 text-center font-mono font-bold text-amber-400 rounded py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
              <span className="text-[10px] text-slate-400 font-mono">/ {numPages || '...'}</span>
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(numPages || 999, p + 1))}
              disabled={numPages > 0 && currentPage >= numPages}
              className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer border border-white/10 flex items-center gap-0.5"
              title="Next Page"
            >
              <span className="text-[10px] hidden sm:inline font-bold">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => numPages && setCurrentPage(numPages)}
              disabled={numPages === 0 || currentPage >= numPages}
              className="p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 rounded-lg transition-all cursor-pointer border border-white/10"
              title="Last Page"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* View-Specific Customization Controls */}
          {viewMode === 'reader' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                <button
                  onClick={() => setReaderTheme('ivory')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${readerTheme === 'ivory' ? 'bg-[#faf7ee] text-[#2c2824] font-bold shadow' : 'text-slate-400'}`}
                  title="Ivory Warm Paper"
                >
                  <Coffee className="w-3 h-3" />
                  <span className="hidden sm:inline">Ivory</span>
                </button>
                <button
                  onClick={() => setReaderTheme('sepia')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${readerTheme === 'sepia' ? 'bg-[#f4ecd8] text-[#3e2e1d] font-bold shadow' : 'text-slate-400'}`}
                  title="Sepia Vintage Paper"
                >
                  <Sun className="w-3 h-3" />
                  <span className="hidden sm:inline">Sepia</span>
                </button>
                <button
                  onClick={() => setReaderTheme('dark')}
                  className={`px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer ${readerTheme === 'dark' ? 'bg-slate-800 text-amber-300 font-bold shadow' : 'text-slate-400'}`}
                  title="Dark Meditation Paper"
                >
                  <Moon className="w-3 h-3" />
                  <span className="hidden sm:inline">Night</span>
                </button>
              </div>

              <div className="flex items-center bg-white/5 px-2 py-0.5 rounded-lg border border-white/10 text-[10px] gap-1.5">
                <Type className="w-3 h-3 text-slate-400" />
                <button
                  onClick={() => setReaderFontSize(s => Math.max(14, s - 2))}
                  className="px-1.5 py-0.5 hover:bg-white/10 rounded font-bold cursor-pointer"
                  title="Decrease Font Size"
                >
                  A-
                </button>
                <span className="font-mono text-amber-400">{readerFontSize}px</span>
                <button
                  onClick={() => setReaderFontSize(s => Math.min(28, s + 2))}
                  className="px-1.5 py-0.5 hover:bg-white/10 rounded font-bold cursor-pointer"
                  title="Increase Font Size"
                >
                  A+
                </button>
              </div>
            </div>
          )}

          {viewMode === 'canvas' && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={handleFitWidth}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all border border-white/10 text-[10px] font-bold cursor-pointer flex items-center gap-1"
                title="Fit to Screen Width"
              >
                <Expand className="w-3 h-3" />
                <span>Fit Width</span>
              </button>

              <div className="flex items-center bg-white/5 rounded-lg border border-white/10 text-xs">
                <button
                  onClick={() => setScale(s => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
                  className="p-1 hover:bg-white/10 text-slate-300 rounded-l cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 font-mono text-[10px] text-amber-400 font-bold">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(s => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
                  className="p-1 hover:bg-white/10 text-slate-300 rounded-r cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all border border-white/10 cursor-pointer"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {viewMode === 'native' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10 text-[10px]">
                <button
                  onClick={() => setNativeEngine('direct')}
                  className={`px-2 py-0.5 rounded cursor-pointer font-bold ${nativeEngine === 'direct' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Direct iPad Engine
                </button>
                <button
                  onClick={() => setNativeEngine('google')}
                  className={`px-2 py-0.5 rounded cursor-pointer font-bold ${nativeEngine === 'google' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  Cloud Viewer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Workspace Layout */}
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
                    {pNum === firstTextPage && firstTextPage > 1 && <span className="text-[8px] opacity-75">Chapter 1</span>}
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

              {/* Search Input in Drawer */}
              <div className="p-3 border-b border-white/10 lg:hidden bg-slate-900/60">
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
                        <span className="text-[9px] text-slate-500">Result #{idx + 1}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-200 italic">
                        {snippetContent}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW MODE 1: HARDWARE ACCELERATED DIRECT NATIVE STREAM (Instant 0.1s on iPad & Mobile) */}
          {viewMode === 'native' && (
            <div className="flex-grow h-full w-full bg-slate-950 flex flex-col relative">
              <div className="flex-grow w-full h-full relative bg-slate-950">
                <iframe
                  key={`${nativeEngine}-${currentPage}`}
                  src={nativeEngine === 'google' ? googleViewerUrl : `${proxyUrl}#page=${currentPage}`}
                  title={book.title}
                  className="w-full h-full border-0 bg-slate-900"
                  allow="fullscreen"
                />
              </div>

              {/* Quick Bar at bottom of stream */}
              <div className="p-2 bg-slate-900/90 border-t border-white/10 flex items-center justify-between text-xs px-4">
                <span className="text-[11px] text-slate-400">
                  Native Apple / Cloud PDF Engine • <strong className="text-amber-300">{book.title}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('reader')}
                    className="px-2.5 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg font-bold text-[10px] flex items-center gap-1 border border-amber-500/30 cursor-pointer"
                  >
                    <BookOpen className="w-3 h-3" />
                    Switch to Text Reader
                  </button>
                  <a
                    href={book.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 border border-white/10 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3 text-amber-400" />
                    Full Tab
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: DIGITAL TEXT BOOK READER (Instant 0.05s Load, Typography, Search Highlighting) */}
          {viewMode === 'reader' && (
            <div 
              ref={scrollContainerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="flex-grow h-full overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-5 md:p-8 pb-32 sm:pb-28 custom-scrollbar relative select-text"
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
                {/* Paper Header */}
                <div className="border-b border-black/10 dark:border-white/10 pb-3.5 mb-6 flex flex-wrap items-center justify-between gap-2 text-xs font-sans">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="font-bold tracking-wider uppercase text-[11px] text-slate-600 dark:text-slate-300">
                      {book.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {activeSearchTerm && (
                      <span className="bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[10px] flex items-center gap-1 border border-amber-500/30">
                        <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>
                          {(
                            currentPageText
                              .toLowerCase()
                              .match(new RegExp(activeSearchTerm.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []
                          ).length} match(es) on this page
                        </span>
                      </span>
                    )}
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px]">
                      Page {currentPage} of {numPages || '...'}
                    </span>
                  </div>
                </div>

                {/* Page Content */}
                {paragraphs.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-5">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 mx-auto">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{book.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-sans max-w-md mx-auto">
                        {currentPage === 1 
                          ? 'This is the book cover or visual facsimile page. You can jump directly to Chapter 1 or view the original high-resolution scanned facsimile.' 
                          : `Page ${currentPage} is an illustration or visual plate.`}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                      {firstTextPage > 1 && currentPage < firstTextPage && (
                        <button
                          onClick={() => setCurrentPage(firstTextPage)}
                          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Compass className="w-4 h-4" />
                          Jump to Chapter 1 (Page {firstTextPage}) &rarr;
                        </button>
                      )}

                      <button
                        onClick={() => setViewMode('native')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Layers className="w-4 h-4 text-amber-400" />
                        View Scanned Cover &amp; Original PDF
                      </button>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(numPages || 999, p + 1))}
                        className="px-4 py-2.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        Next Page ({currentPage + 1}) &rarr;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="font-serif leading-[1.85] space-y-4">
                    {paragraphs.map((paragraph, pIdx) => {
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
                                className="bg-amber-300/90 dark:bg-amber-400/40 text-amber-950 dark:text-amber-100 font-bold px-1 py-0.5 rounded shadow-[0_0_8px_rgba(245,158,11,0.5)] border-b-2 border-amber-600 not-italic inline-block mx-0.5"
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
                )}

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
                    — Page {currentPage} of {numPages || '...'} —
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(numPages || 999, p + 1))}
                    disabled={numPages > 0 && currentPage >= numPages}
                    className="px-3 py-1.5 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 cursor-pointer flex items-center gap-1 font-semibold transition-all"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Floating Mobile/Tablet Next & Previous Quick Tap Zones */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="fixed left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/60 hover:bg-black/80 disabled:opacity-0 text-white rounded-full border border-white/20 shadow-2xl backdrop-blur-md transition-all cursor-pointer hidden sm:flex items-center justify-center z-20"
                title="Previous Page"
              >
                <ChevronLeft className="w-5 h-5 text-amber-400" />
              </button>

              <button
                onClick={() => setCurrentPage(p => Math.min(numPages || 999, p + 1))}
                disabled={numPages > 0 && currentPage >= numPages}
                className="fixed right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/60 hover:bg-black/80 disabled:opacity-0 text-white rounded-full border border-white/20 shadow-2xl backdrop-blur-md transition-all cursor-pointer hidden sm:flex items-center justify-center z-20"
                title="Next Page"
              >
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </button>
            </div>
          )}

          {/* VIEW MODE 3: ORIGINAL SCANNED PDF CANVASES */}
          {viewMode === 'canvas' && (
            <div 
              ref={scrollContainerRef}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="flex-grow h-full overflow-x-auto overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-5 md:p-8 pb-32 sm:pb-28 custom-scrollbar relative select-none"
            >
              {isPdfLoading && (
                <div className="my-auto flex flex-col items-center justify-center p-8 text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center animate-pulse">
                      <BookOpen className="w-8 h-8 text-amber-400" />
                    </div>
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin absolute -top-1 -right-1" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Rendering Scanned Book Pages</h4>
                    <p className="text-xs text-amber-400/90 font-mono">{loadingProgress}</p>
                  </div>
                  <button
                    onClick={() => setViewMode('native')}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer hover:bg-amber-400"
                  >
                    View Instant Native Stream Instead &rarr;
                  </button>
                </div>
              )}

              {/* Canvas Paper View */}
              {pdfDoc && !isPdfLoading && (
                <div 
                  className="relative shadow-2xl rounded-sm sm:rounded-md bg-white border border-slate-300/80 transition-all mb-16"
                  style={{
                    width: `${pageDimensions.width}px`,
                    minHeight: `${pageDimensions.height}px`,
                    maxWidth: 'none',
                  }}
                >
                  <div className="absolute top-2 left-2 z-10 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-[9px] font-bold text-amber-300 pointer-events-none flex items-center gap-1.5 shadow-md">
                    <span>Page {currentPage} of {numPages}</span>
                  </div>

                  {pageHighlights.length > 0 && (
                    <div className="absolute top-2 right-2 z-10 bg-amber-500 text-slate-950 px-2.5 py-1 rounded-lg font-bold text-[9px] shadow-lg flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{pageHighlights.length} match{pageHighlights.length > 1 ? 'es' : ''} on this page</span>
                    </div>
                  )}

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

                  <canvas 
                    ref={canvasRef} 
                    className="block bg-white"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Page Scrub Bar & Mobile Quick Controller */}
        {numPages > 0 && (
          <div className="px-3 sm:px-5 py-2 sm:py-2.5 bg-slate-900 border-t border-white/10 flex items-center justify-between gap-3 shrink-0 text-[10px] text-slate-400 z-20">
            <span className="truncate hidden md:inline max-w-xs">
              Reading <strong className="text-white">{book.title}</strong>
            </span>

            {/* Touch-Friendly Scrub Bar */}
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
