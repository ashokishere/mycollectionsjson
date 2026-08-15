import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  ChevronsRight
} from 'lucide-react';
import { SpiritualBook } from '../data/spiritual_books';

// Set up local bundled PDF.js worker with safe fallbacks
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-assets/pdf.worker.min.mjs';
  } catch (_) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  }
}

interface SearchMatch {
  pageNum: number;
  matchIndex: number;
  snippet: string;
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
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing PDF Engine...');
  const [error, setError] = useState<string | null>(null);

  // View modes: 'canvas' (custom search + zoom) vs 'native' (full-featured browser PDF stream)
  const [viewMode, setViewMode] = useState<'canvas' | 'native'>('canvas');

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<SearchMatch[]>([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState<number>(0);
  const [showSearchPanel, setShowSearchPanel] = useState<boolean>(false);
  const [showThumbnailDrawer, setShowThumbnailDrawer] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Touch swipe support for iPad & mobile
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(book.pdfUrl)}`;

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

  // Fetch and Load PDF Document with standard fonts, cmaps, and wasm decoders configured
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setLoadingProgress('Connecting to spiritual library server...');

    async function loadPdf() {
      try {
        let doc: pdfjsLib.PDFDocumentProxy | null = null;
        let lastErrorMsg = '';

        // Standard configuration object ensuring all CMaps, standard fonts, and image/WASM decoders are loaded
        const baseParams = {
          cMapUrl: `/pdfjs-assets/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `/pdfjs-assets/standard_fonts/`,
          wasmUrl: `/pdfjs-assets/wasm/`,
          imageDecodersUrl: `/pdfjs-assets/image_decoders/`,
          enableXfa: true,
          isEvalSupported: true,
          disableRange: true,
          disableStream: true,
        };

        // Fallback CDN parameters if local static assets are unreachable
        const cdnParams = {
          cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
          wasmUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/wasm/`,
          imageDecodersUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/image_decoders/`,
          enableXfa: true,
          isEvalSupported: true,
          disableRange: true,
          disableStream: true,
        };

        // Strategy 1: High-Speed ArrayBuffer fetch via proxy (robust against Range header issues)
        try {
          setLoadingProgress('Downloading complete book archive...');
          const response = await fetch(proxyUrl);
          if (response.ok) {
            const buf = await response.arrayBuffer();
            if (buf.byteLength > 1000) {
              setLoadingProgress('Rendering book pages...');
              try {
                const loadingTask = pdfjsLib.getDocument({
                  data: new Uint8Array(buf),
                  ...baseParams,
                });
                doc = await loadingTask.promise;
              } catch (localErr: any) {
                console.warn('Local params failed, trying CDN params:', localErr);
                const loadingTask = pdfjsLib.getDocument({
                  data: new Uint8Array(buf),
                  ...cdnParams,
                });
                doc = await loadingTask.promise;
              }
            }
          }
        } catch (e: any) {
          console.warn('Strategy 1 (Buffer fetch) failed, trying URL stream:', e);
          lastErrorMsg = e.message;
        }

        // Strategy 2: URL Stream through backend proxy with Range Request Support
        if (!doc && !isCancelled) {
          try {
            setLoadingProgress('Streaming spiritual book pages...');
            const loadingTask = pdfjsLib.getDocument({
              url: proxyUrl,
              ...baseParams,
            });

            loadingTask.onProgress = (progressData: { loaded: number; total: number }) => {
              if (progressData.total > 0) {
                const pct = Math.round((progressData.loaded / progressData.total) * 100);
                setLoadingProgress(`Downloading book pages (${pct}%)...`);
              } else if (progressData.loaded > 0) {
                const mb = (progressData.loaded / (1024 * 1024)).toFixed(1);
                setLoadingProgress(`Streaming book pages (${mb} MB)...`);
              }
            };

            doc = await loadingTask.promise;
          } catch (e: any) {
            console.warn('Strategy 2 (URL stream) failed:', e);
            lastErrorMsg = e.message;
          }
        }

        // Strategy 3: Direct CORS fetch
        if (!doc && !isCancelled) {
          setLoadingProgress('Trying direct book stream...');
          try {
            const response = await fetch(book.pdfUrl, { mode: 'cors' });
            if (response.ok) {
              const buf = await response.arrayBuffer();
              if (buf.byteLength > 1000) {
                const loadingTask = pdfjsLib.getDocument({
                  data: new Uint8Array(buf),
                  ...cdnParams,
                });
                doc = await loadingTask.promise;
              }
            }
          } catch (e: any) {
            lastErrorMsg = e.message;
          }
        }

        // Strategy 4: Public CORS proxies for static hosting
        if (!doc && !isCancelled) {
          setLoadingProgress('Connecting via gateway...');
          const fallbackProxies = [
            `https://api.allorigins.win/raw?url=${encodeURIComponent(book.pdfUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(book.pdfUrl)}`
          ];

          for (const proxy of fallbackProxies) {
            if (doc || isCancelled) break;
            try {
              const response = await fetch(proxy);
              if (response.ok) {
                const buf = await response.arrayBuffer();
                if (buf.byteLength > 1000) {
                  const loadingTask = pdfjsLib.getDocument({
                    data: new Uint8Array(buf),
                    ...cdnParams,
                  });
                  doc = await loadingTask.promise;
                  break;
                }
              }
            } catch (e: any) {
              lastErrorMsg = e.message;
            }
          }
        }

        if (isCancelled) return;

        if (!doc) {
          throw new Error(lastErrorMsg || 'Unable to stream PDF book over current connection.');
        }

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);

        // Auto-scale to fit width on initial load
        try {
          const firstPage = await doc.getPage(1);
          const initialViewport = firstPage.getViewport({ scale: 1.0 });
          const optimalScale = calculateOptimalScale(initialViewport.width);
          setScale(optimalScale);
        } catch (_) {}

        setLoading(false);
      } catch (err: any) {
        console.error('Failed to load PDF in Canvas Mode:', err);
        if (!isCancelled) {
          // If Canvas rendering encounters a blocker, automatically switch to Native Browser Mode so reading never stops
          setError(err.message || 'Canvas stream interrupted');
          setLoading(false);
          setViewMode('native');
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [book.pdfUrl, proxyUrl, calculateOptimalScale]);

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

  // Perform Keyword Search across entire PDF document
  const handlePerformSearch = async (query: string) => {
    if (!pdfDoc || !query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setShowSearchPanel(true);
    const matches: SearchMatch[] = [];
    const searchTerm = query.trim().toLowerCase();

    try {
      for (let p = 1; p <= pdfDoc.numPages; p++) {
        const page = await pdfDoc.getPage(p);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        const lowerText = pageText.toLowerCase();

        let startIndex = 0;
        let foundIdx = lowerText.indexOf(searchTerm, startIndex);

        while (foundIdx !== -1) {
          const snippetStart = Math.max(0, foundIdx - 40);
          const snippetEnd = Math.min(pageText.length, foundIdx + searchTerm.length + 40);
          let snippet = pageText.slice(snippetStart, snippetEnd).trim();

          if (snippetStart > 0) snippet = '...' + snippet;
          if (snippetEnd < pageText.length) snippet = snippet + '...';

          matches.push({
            pageNum: p,
            matchIndex: matches.length,
            snippet,
          });

          startIndex = foundIdx + searchTerm.length;
          foundIdx = lowerText.indexOf(searchTerm, startIndex);
          
          // Limit total matches to 150 for responsiveness
          if (matches.length >= 150) break;
        }

        if (matches.length >= 150) break;
      }

      setSearchResults(matches);
      setCurrentMatchIdx(0);
      if (matches.length > 0) {
        setCurrentPage(matches[0].pageNum);
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
    setCurrentPage(searchResults[nextIdx].pageNum);
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
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handlePerformSearch(searchQuery);
                }}
                placeholder="Search keywords in book (e.g. Kriya, Devotion)..."
                className="w-full bg-slate-800/80 border border-amber-500/30 rounded-xl py-1.5 pl-9 pr-20 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-all shadow-inner"
              />
              <button
                onClick={() => handlePerformSearch(searchQuery)}
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1 top-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1"
              >
                {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
              </button>
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
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Custom High-Speed Canvas Reader"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">Canvas</span>
              </button>
              <button
                onClick={() => setViewMode('native')}
                className={`px-2 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                  viewMode === 'native' 
                    ? 'bg-amber-500 text-slate-950 shadow-sm' 
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

            {/* Responsive Zoom & Fit Controls */}
            <div className="flex items-center gap-1.5">
              {/* Fit Width Button */}
              <button
                onClick={handleFitWidth}
                className="px-2 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-all cursor-pointer text-[10px] font-semibold flex items-center gap-1 border border-white/10"
                title="Fit Page Width to Screen (Mobile & iPad optimized)"
              >
                <Expand className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline">Fit Width</span>
              </button>

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
                <button onClick={() => setShowSearchPanel(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Mobile Search Input in Drawer */}
              <div className="p-3 border-b border-white/10 md:hidden bg-slate-900/60">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handlePerformSearch(searchQuery);
                    }}
                    placeholder="Search words in book..."
                    className="w-full bg-slate-800 border border-amber-500/30 rounded-xl py-1.5 px-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={() => handlePerformSearch(searchQuery)}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs"
                  >
                    Go
                  </button>
                </div>
              </div>

              <div className="p-3 border-b border-white/5 bg-slate-900/40 text-[10px] text-slate-400">
                {isSearching ? (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Indexing & searching book pages...
                  </div>
                ) : searchResults.length > 0 ? (
                  <span>Found <strong className="text-amber-300">{searchResults.length}</strong> occurrences for &quot;{searchQuery}&quot;</span>
                ) : searchQuery ? (
                  <span>No matches found for &quot;{searchQuery}&quot;</span>
                ) : (
                  <span>Type a keyword in the search bar to find occurrences across all pages.</span>
                )}
              </div>

              <div className="flex-grow overflow-y-auto p-3 space-y-2 custom-scrollbar">
                {searchResults.map((match, idx) => (
                  <div
                    key={idx}
                    onClick={() => jumpToMatch(idx)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      idx === currentMatchIdx
                        ? 'bg-amber-500/20 border-amber-400/80 text-white shadow-md'
                        : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Page {match.pageNum}
                      </span>
                      {idx === currentMatchIdx && (
                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-0.5">
                          Active <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-300 italic font-sans">
                      &quot;{match.snippet}&quot;
                    </p>
                  </div>
                ))}
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

              {error && !loading && (
                <div className="my-auto max-w-md bg-rose-950/40 border border-rose-500/30 p-6 rounded-2xl text-center space-y-4 shadow-2xl">
                  <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">Inline Canvas Stream Blocked</h4>
                    <p className="text-xs text-rose-300/80 mb-4">{error}</p>
                  </div>
                  <div className="flex flex-col gap-2 justify-center">
                    <button
                      onClick={() => setViewMode('native')}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Layers className="w-4 h-4" />
                      Switch to Embedded Browser Reader
                    </button>
                    <a
                      href={book.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-white/10 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open PDF Directly in New Tab
                    </a>
                  </div>
                </div>
              )}

              {/* Full Untruncated Canvas Paper Container */}
              <div 
                className={`relative shadow-2xl rounded-sm sm:rounded-md bg-white border border-slate-300/80 transition-all ${loading || error ? 'hidden' : 'block'} mb-16`}
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
                      Introductory Page
                    </span>
                  )}
                </div>

                {/* Direct Canvas Element - with exact pixel bounds to guarantee zero truncation */}
                <canvas 
                  ref={canvasRef} 
                  className="block bg-white"
                />
              </div>

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

          {/* View Mode 2: Full-Featured Embedded Browser PDF Viewer */}
          {viewMode === 'native' && (
            <div className="flex-grow h-full w-full bg-slate-900 flex flex-col">
              <iframe
                src={proxyUrl}
                title={book.title}
                className="w-full h-full border-0 bg-slate-900"
              />
            </div>
          )}
        </div>

        {/* Footer Page Scrub Bar & Mobile Quick Controller */}
        {pdfDoc && viewMode === 'canvas' && (
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
              {currentPage} / {numPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
