import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  BookOpen, 
  Search, 
  Type, 
  Copy, 
  Check, 
  Sparkles, 
  ArrowLeft,
  ChevronDown,
  Volume2,
  Bookmark,
  Share2,
  CornerDownRight,
  Eye,
  Settings,
  X,
  Plus,
  ExternalLink
} from 'lucide-react';
import { type Video } from '../data/videos';
import { cn } from '../lib/utils';

// Transcripts are fetched dynamically from the /transcripts/ public folder at runtime

interface TranscriptReaderProps {
  videos: Video[];
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  onClose: () => void;
}

interface TranscriptData {
  id: string;
  title: string;
  url: string;
  formattedMarkdown: string;
  rawText: string;
  wordCount: number;
  fullTranscriptSegments?: Array<{ time: string; text: string }>;
}

/**
 * Beautiful dynamic client-side punctuator and text formatter.
 * Formats transcript captions beautifully and groups them into readable paragraphs Offline.
 */
function formatTranscriptLocally(title: string, rawText: string): string {
  let txt = rawText.replace(/\s+/g, ' ').trim();
  if (!txt) return '';

  const words = txt.split(' ');
  const formattedWords: string[] = [];
  let capitalizeNext = true;

  // Spiritual names and sacred words list for automatic elegant capitalization
  const holyWords = new Set([
    'yogananda', 'yoganandaji', 'guruji', 'guru', 'anandamoy', 'smaranananda', 'giri', 'sannyasi',
    'yss', 'srf', 'god', 'lord', 'father', 'mother', 'divine', 'peace', 'meditation', 'will', 
    'consciousness', 'christ', 'medulla', 'oblongata', 'spirit', 'spiritual', 'joy', 'soul', 'souls',
    'jai', 'india', 'hong-sau', 'kriya', 'yoga', 'pranayama', 'bhakti', 'devotion', 'paramahansa',
    'lahiri', 'mahasaya', 'yukteswar', 'babaji', 'krishna', 'jesus', 'buddha', 'chaitanya', 'shiva',
    'yogaoda'
  ]);

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    if (!word) continue;

    const lowerWord = word.toLowerCase().replace(/[^a-z]/g, '');

    // Normalize pronouns
    if (lowerWord === 'i') {
      word = 'I';
    } else if (lowerWord === 'im') {
      word = "I'm";
    } else if (lowerWord === 'ive') {
      word = "I've";
    } else if (lowerWord === 'id') {
      word = "I'd";
    } else if (lowerWord === 'ill') {
      word = "I'll";
    } else if (holyWords.has(lowerWord)) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    if (capitalizeNext) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
      capitalizeNext = false;
    }

    // Insert natural punctuation marks at common conjunction & pronoun transition terms
    const isTransitionWord = ['but', 'then', 'therefore', 'thus', 'when', 'if', 'he', 'she', 'they', 'we', 'you', 'now', 'so', 'today', 'welcome'].includes(lowerWord);
    const currentSentenceLength = formattedWords.length - (formattedWords.lastIndexOf('.') + 1);

    if (i > 0 && isTransitionWord && currentSentenceLength > 11) {
      const prevIdx = formattedWords.length - 1;
      if (prevIdx >= 0 && !/[.!?]$/.test(formattedWords[prevIdx])) {
        formattedWords[prevIdx] = formattedWords[prevIdx] + '.';
      }
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }

    formattedWords.push(word);

    if (/[.!?]$/.test(word)) {
      capitalizeNext = true;
    }
  }

  // Group text into comfortable paragraph segments
  const rebuiltText = formattedWords.join(' ');
  const sentences = rebuiltText.split(/(?<=[.!?])\s+/);
  
  const paragraphs: string[] = [];
  let currentParagraph: string[] = [];

  sentences.forEach((sentence, sIdx) => {
    currentParagraph.push(sentence);
    if (currentParagraph.length >= 4 || sIdx === sentences.length - 1) {
      paragraphs.push(currentParagraph.join(' '));
      currentParagraph = [];
    }
  });

  const parsedTitle = `# ${title}`;
  const introBlock = `### Devotional Reflection
*Formatted instantly with the offline Pradeep reader*`;

  return [
    parsedTitle,
    introBlock,
    '---',
    ...paragraphs.map(p => p.trim())
  ].join('\n\n');
}

const INITIAL_AVAILABLE_IDS = [
  'FkWBsufZvz8',
  'b-LzFHT3Y2M',
  'Af7bsvHoGDw',
  'THK8N728BMo',
  'NOOhLX4lYdo',
  'LOuNn_KPrqc',
  'w4aXXZw8qZY',
  'BNud4LMtF4Y',
  'Gc0-skd_7Pc',
  'B7pimil_1E4',
  'Uz3_LpRdLF0',
  'bW3hyJWpuRE',
  'UzHb7A0WSrE',
  '9CIbB3Rf5nY',
  'RQ3mY-imSiI',
  'qZQFm856Coc',
  'SsrqB_GwE-8',
  'rghY0MRwbYo',
  'eL54GQXRGvI',
  'Mgd-taUnWtI',
  'KoQZD-5L0t0',
  'hoXoTr7PpcI',
  'kmDfAq0fEM8',
  'Z22edyOsNQc',
  '2G9i65RmG50',
  '-GD2Y2W8b_o',
  'Oq23a2RWZvc',
  'g0ww8GmLsv4',
  '5mJ0PLvGB18',
  'kXpD3uBalaE',
  'K-K93W0LFBQ',
  'tiWtEwC7tgY',
  'JqVVKmLw9_o',
  'tWZJ4LNjwPk',
  'R7YemF9QJFU',
  'OvK-M4l3sr0',
  'sU2icv7IcD0',
  'PF5Eywyk-s8',
  'mmz7vji2tLA',
  'aBVuiALRg-s',
  'fxt0VLnNeO8',
  'xUq1DQPLHRg',
  'xghFntmsTjQ',
  'FP-dNd1xTcs',
  'YfeCVRqwa9Q',
  'Fynaa_dTOqM',
  'QnIMMaYGIf4',
  'N2l6GE_NKDs',
  'fna7IbLoGJo',
  'kUzI0W_JW7I',
  'N20enydosZQ',
  'RCj1eDzNxDU',
  'O62LQLdeV6I',
  'Tw7ILifQ11U',
  'Fklyaxk6tZE',
  'c1NEU9XFFj0',
  'a56Iq9GonTI',
  'WjKp9YdRY6s',
  'MJR06v8qakg',
  'We92WB7ArXk',
  '6FNh1Jac9bo',
  'n99CCcuRQks',
  'UmCVAZd7ovw',
  'c1Tzmwltp_c',
  '2vgST3u1FDI',
  '7XbtxFn00QQ',
  'GnCNvDQcKvk',
  'hpR4niszERQ',
  'ac5uKQsdbsY',
  'rl4ULW_OgtQ',
  '9OvLVXgOAzs',
  'mWUEmPN6W24',
  'QNx_E4yoo4Y',
  'Q8uZVhpjh48',
  'Yx_H0-d1ZWA',
  'LHp3JDJ_zUc',
  'sZCnSnAin68',
  'GeUEkwbCYDY',
  '1Louhg339RQ',
  'TiPcpoQSY5w',
  'cy1J6DU_4A8',
  'uQFI4A5ZYTc',
  'eFgAGes7unk',
  'Sh9yejNuxcE',
  '0MytX8wcyWg',
  'Qhce8SDz6I8',
  'eLfDGUiw0y4',
  'PaNngy76hK4',
  'axJ9zXVdiEM',
  '0vLwGtCl4kY',
  'tZNNSZSku6Q',
  'mAN13n0xImw',
  'b4s24h5OB9Y',
  'bcPWdJ_ImKY',
  'H7DBUDuje_s',
  'K-NWCQOUDlI',
  '9Ec0LDIJWd8',
  'raiq8ofnvRE',
  'BTutIOFVScg',
  'rqnS4by1Onk',
  '7BGXIKp3RWk',
  'srH0gluMeg8',
  'P7jeX5MyR3I',
  'vBAaK0TZWCQ'
];

const parseTimeToSeconds = (timeStr: string): number => {
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
};

function getTranscriptSegments(transcript: TranscriptData): Array<{ time: string; text: string }> {
  if (transcript.fullTranscriptSegments && transcript.fullTranscriptSegments.length > 0) {
    return transcript.fullTranscriptSegments;
  }
  
  // Dynamic fallback: split rawText (or formattedMarkdown if rawText is small) into paragraphs or blocks
  const textSource = transcript.rawText && transcript.rawText.length > 100 
    ? transcript.rawText 
    : transcript.formattedMarkdown.replace(/#.*?\n|###.*?\n|---/g, '').trim();

  // Split by sentences
  const sentences = textSource.split(/(?<=[.!?])\s+/);
  const segments: Array<{ time: string; text: string }> = [];
  
  let currentGroup: string[] = [];
  let currentWordCount = 0;
  let estimatedSeconds = 0;

  sentences.forEach((sentence) => {
    if (!sentence.trim()) return;
    currentGroup.push(sentence);
    currentWordCount += sentence.split(/\s+/).length;
    
    // Group roughly every 3 sentences or 60 words
    if (currentGroup.length >= 3 || currentWordCount >= 60) {
      const minutes = Math.floor(estimatedSeconds / 60);
      const seconds = Math.floor(estimatedSeconds % 60);
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      segments.push({
        time: timeStr,
        text: currentGroup.join(' ').trim()
      });
      
      // Assume average speaking speed of 150 words per minute (2.5 words per second)
      estimatedSeconds += Math.max(12, Math.round(currentWordCount / 2.5));
      currentGroup = [];
      currentWordCount = 0;
    }
  });

  if (currentGroup.length > 0) {
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = Math.floor(estimatedSeconds % 60);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    segments.push({
      time: timeStr,
      text: currentGroup.join(' ').trim()
    });
  }

  return segments;
}

export default function TranscriptReader({ videos, activeVideoId, setActiveVideoId, onClose }: TranscriptReaderProps) {
  const [mobileView, setMobileView] = useState<'list' | 'reading'>(() => {
    return activeVideoId ? 'reading' : 'list';
  });
  const [availableIds, setAvailableIds] = useState<string[]>(() => {
    return (window as any).__cachedAvailableIds || INITIAL_AVAILABLE_IDS;
  });
  const [selectedVideoId, setSelectedVideoId] = useState<string>(() => {
    if (activeVideoId) {
      return activeVideoId;
    }
    return 'FkWBsufZvz8';
  });
  const [transcript, setTranscript] = useState<TranscriptData | null>(() => {
    if (!(window as any).__transcriptCache) {
      (window as any).__transcriptCache = {};
    }
    return (window as any).__transcriptCache[selectedVideoId] || null;
  });
  const [loading, setLoading] = useState(() => {
    // Avoid showing active spinner if transcript is already in the cache!
    if (!(window as any).__transcriptCache) {
      (window as any).__transcriptCache = {};
    }
    return !(window as any).__transcriptCache[selectedVideoId];
  });
  const [error, setError] = useState<string | null>(null);
  
  // Customization controls - restored from localStorage for consistent user experience
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'md' | 'lg' | 'xl'>(() => {
    return (localStorage.getItem('reading_font_size') as 'sm' | 'base' | 'md' | 'lg' | 'xl') || 'base';
  });
  const [paperTheme, setPaperTheme] = useState<'white' | 'sepia' | 'dark' | 'slate'>(() => {
    const saved = localStorage.getItem('reading_paper_theme');
    if (saved) return saved as 'white' | 'sepia' | 'dark' | 'slate';
    const act = document.documentElement.getAttribute('data-theme') || 'default';
    return act === 'white' ? 'white' : 'sepia';
  });
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  
  // New Unabridged Transcript and Search states
  const [viewMode, setViewMode] = useState<'overview' | 'full'>('overview');
  const [highlightedSegmentIdx, setHighlightedSegmentIdx] = useState<number | null>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(0);
  
  // Global search states
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasPrefetchedAll, setHasPrefetchedAll] = useState(false);
  const [pendingSegmentJump, setPendingSegmentJump] = useState<{ segmentIdx: number; time: string } | null>(null);

  // Background fetcher to load and search all 90+ transcripts
  const loadAllTranscripts = async () => {
    setIsLoadingAll(true);
    const idsToFetch = availableIds.filter(id => !(window as any).__transcriptCache[id]);
    
    if (idsToFetch.length === 0) {
      setLoadedCount(availableIds.length);
      setIsLoadingAll(false);
      return;
    }

    let fetchedCount = availableIds.length - idsToFetch.length;
    setLoadedCount(fetchedCount);

    // Fetch in batches of 15 to keep browser responsive
    const chunkSize = 15;
    for (let i = 0; i < idsToFetch.length; i += chunkSize) {
      const chunk = idsToFetch.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (id) => {
          try {
            const response = await fetch(`${import.meta.env.BASE_URL || '/'}transcripts/${id}.json`);
            if (response.ok) {
              const data = await response.json();
              (window as any).__transcriptCache[id] = data;
            }
          } catch (e) {
            console.warn(`Error preloading transcript ${id}:`, e);
          }
        })
      );
      fetchedCount += chunk.length;
      setLoadedCount(fetchedCount);
    }
    
    setIsLoadingAll(false);
  };

  // Derive matches across all loaded transcripts
  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase();
    const results: Array<{
      videoId: string;
      videoTitle: string;
      matches: Array<{
        text: string;
        time: string;
        segmentIdx: number;
      }>;
    }> = [];

    for (const id of availableIds) {
      const data = (window as any).__transcriptCache[id] as TranscriptData | undefined;
      if (!data) continue;

      const segmentsList = getTranscriptSegments(data);
      const matches: Array<{ text: string; time: string; segmentIdx: number }> = [];

      segmentsList.forEach((seg, idx) => {
        if (seg.text.toLowerCase().includes(q)) {
          matches.push({
            text: seg.text,
            time: seg.time,
            segmentIdx: idx
          });
        }
      });

      if (matches.length > 0) {
        results.push({
          videoId: id,
          videoTitle: data.title || videos.find(v => v.id === id)?.title || id,
          matches
        });
      }
    }

    return results;
  }, [globalSearchQuery, availableIds, loadedCount, videos]);

  // Handle opening a global search match and scrolling to it
  const handleSelectSearchResult = (videoId: string, segmentIdx: number, time: string) => {
    // Sync search query in sub text filter
    setSubSearchQuery(globalSearchQuery);
    
    if (selectedVideoId === videoId) {
      setViewMode('full');
      // Briefly let React state apply before scrolling
      setTimeout(() => {
        handleJumpToSegment(segmentIdx);
        handleSeekVideo(time);
      }, 100);
    } else {
      setPendingSegmentJump({ segmentIdx, time });
      setSelectedVideoId(videoId);
      setMobileView('reading');
    }
  };
  
  // Custom manual transcript formatting states
  const [inputRawText, setInputRawText] = useState('');
  const [showFormatterModal, setShowFormatterModal] = useState(false);
  const [formattingProgress, setFormattingProgress] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const readingAreaRef = useRef<HTMLDivElement>(null);

  // Derive segments from the loaded transcript
  const segments = useMemo(() => {
    if (!transcript) return [];
    return getTranscriptSegments(transcript);
  }, [transcript]);

  // Find segments containing the query term
  const matchingSegmentIndices = useMemo(() => {
    if (!subSearchQuery.trim() || segments.length === 0) return [];
    const q = subSearchQuery.toLowerCase();
    return segments
      .map((seg, idx) => seg.text.toLowerCase().includes(q) ? idx : -1)
      .filter(idx => idx !== -1);
  }, [segments, subSearchQuery]);

  // Reset match index and viewmode on search or selection changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [subSearchQuery]);

  useEffect(() => {
    setViewMode('overview');
  }, [selectedVideoId]);

  // Handle seeking the companion player
  const handleSeekVideo = (timeStr: string) => {
    const seconds = parseTimeToSeconds(timeStr);
    
    if (activeVideoId !== selectedVideoId) {
      setActiveVideoId(selectedVideoId);
    }

    const player = (window as any).__ytPlayer;
    if (player) {
      try {
        player.seekTo(seconds, true);
        player.playVideo();
      } catch (e) {
        console.warn("Could not seek companion player:", e);
      }
    }
  };

  // Smoothly scroll to a segment and trigger momentary focus glow
  const handleJumpToSegment = (idx: number) => {
    const element = document.getElementById(`segment-${idx}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedSegmentIdx(idx);
      
      const matchPos = matchingSegmentIndices.indexOf(idx);
      if (matchPos !== -1) {
        setCurrentMatchIndex(matchPos);
      }

      setTimeout(() => {
        setHighlightedSegmentIdx(prev => prev === idx ? null : prev);
      }, 2500);
    }
  };

  // Persist customization choices
  useEffect(() => {
    localStorage.setItem('reading_font_size', fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem('reading_paper_theme', paperTheme);
  }, [paperTheme]);

  // Load list of available transcripts from public registry once
  useEffect(() => {
    if ((window as any).__cachedAvailableIds) {
      setAvailableIds((window as any).__cachedAvailableIds);
      return;
    }
    let active = true;
    const fetchAvailable = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}transcripts/available.json`);
        if (response.ok) {
          const ids = await response.json();
          if (active && Array.isArray(ids)) {
            (window as any).__cachedAvailableIds = ids;
            setAvailableIds(ids);
          }
        }
      } catch (err) {
        console.warn('Could not load transcripts registry list:', err);
      }
    };
    fetchAvailable();
    return () => {
      active = false;
    };
  }, []);

  // Auto-align selected video with App's active video
  useEffect(() => {
    if (activeVideoId) {
      setSelectedVideoId(activeVideoId);
      setMobileView('reading');
    }
  }, [activeVideoId]);

  // Load transcript data from static json files dynamically with instant response cache
  useEffect(() => {
    if (!(window as any).__transcriptCache) {
      (window as any).__transcriptCache = {};
    }
    const cache = (window as any).__transcriptCache;

    // Check if we can instantly serve from memory cache without spin!
    if (cache[selectedVideoId]) {
      setTranscript(cache[selectedVideoId]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setTranscript(null);

    const loadDynamicTranscript = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}transcripts/${selectedVideoId}.json`);
        if (!response.ok) {
          throw new Error('Transcript not preloaded');
        }
        const data = await response.json();
        if (active) {
          cache[selectedVideoId] = data; // Keep in universal cache
          setTranscript(data);
        }
      } catch (err) {
        if (active) {
          console.log(`No preloaded transcript found for ${selectedVideoId}, local formatter is available.`);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDynamicTranscript();

    return () => {
      active = false;
    };
  }, [selectedVideoId]);

  // Trigger jump and seek when pendingSegmentJump and transcript is ready
  useEffect(() => {
    if (transcript && !loading && pendingSegmentJump) {
      const { segmentIdx, time } = pendingSegmentJump;
      setPendingSegmentJump(null);
      setViewMode('full');
      setTimeout(() => {
        handleJumpToSegment(segmentIdx);
        handleSeekVideo(time);
      }, 200);
    }
  }, [transcript, loading, pendingSegmentJump]);

  // Format instantly on the client side with our smart layout machine
  const handleFormatLocally = () => {
    if (!inputRawText.trim()) return;

    setFormattingProgress(true);
    try {
      const currentVideo = videos.find(v => v.id === selectedVideoId) || { title: "Spiritual Reading", url: "" };
      const formattedHTML = formatTranscriptLocally(currentVideo.title, inputRawText);
      
      const mockData: TranscriptData = {
        id: selectedVideoId,
        title: currentVideo.title,
        url: currentVideo.url,
        formattedMarkdown: formattedHTML,
        rawText: inputRawText,
        wordCount: formattedHTML.split(/\s+/).length
      };

      setTranscript(mockData);
      setShowFormatterModal(false);
      setInputRawText('');
    } catch (err: any) {
      console.error(err);
      alert(`Formatting failed: ${err.message || err}`);
    } finally {
      setFormattingProgress(false);
    }
  };

  const handleCopyText = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript.formattedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // List of videos with metadata highlighting transcripts status
  const searchableVideos = useMemo(() => {
    const filtered = videos.filter(v => availableIds.includes(v.id));
    const hasSelected = filtered.some(v => v.id === selectedVideoId);
    
    if (!hasSelected && selectedVideoId) {
      const selectedVideo = videos.find(v => v.id === selectedVideoId);
      if (selectedVideo) {
        return [
          { ...selectedVideo, hasTranscript: false },
          ...filtered.map(v => ({ ...v, hasTranscript: true }))
        ];
      }
    }
    
    return filtered.map(v => ({
      ...v,
      hasTranscript: true
    }));
  }, [videos, availableIds, selectedVideoId]);

  // Simple word-by-word text highlighter for search matches inside unabridged segments
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const q = query.toLowerCase();
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, idx) => 
      part.toLowerCase() === q 
        ? <mark key={idx} className="bg-amber-300 text-slate-900 rounded-[2px] px-0.5 font-bold shadow-sm">{part}</mark> 
        : part
    );
  };

  // Handle Keyword Highlight and rendering for custom Markdown
  const renderMarkdownWithHighlights = (rawMd: string) => {
    if (!rawMd) return null;

    const lines = rawMd.split('\n');
    let isInList = false;

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Bold text replacement helper
      const formatBoldAndHighlights = (text: string) => {
        let regex = /\*\*(.*?)\*\*/g;
        let parts = [];
        let lastIdx = 0;
        let match;

        // Extract bold segments
        const boldExtacted: Array<{ text: string; isBold: boolean }> = [];
        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIdx) {
            boldExtacted.push({ text: text.substring(lastIdx, match.index), isBold: false });
          }
          boldExtacted.push({ text: match[1], isBold: true });
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) {
          boldExtacted.push({ text: text.substring(lastIdx), isBold: false });
        }

        if (boldExtacted.length === 0) {
          boldExtacted.push({ text, isBold: false });
        }

        // Apply Search Term highlights across all segments
        return boldExtacted.map((seg, sIdx) => {
          if (!subSearchQuery.trim()) {
            return seg.isBold ? <strong key={sIdx} className="font-bold text-theme-accent">{seg.text}</strong> : seg.text;
          }

          const q = subSearchQuery.toLowerCase();
          const words = seg.text.split(new RegExp(`(${q})`, 'gi'));

          return (
            <span key={sIdx} className={seg.isBold ? "font-bold text-theme-accent" : ""}>
              {words.map((w, wIdx) => 
                w.toLowerCase() === q 
                  ? <mark key={wIdx} className="bg-amber-300 text-slate-900 rounded-[2px] px-0.5 font-bold shadow-sm">{w}</mark> 
                  : w
              )}
            </span>
          );
        });
      };

      // Header level 1
      if (trimmed.startsWith('# ')) {
        isInList = false;
        return (
          <h1 key={idx} className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-8 mb-4 border-b border-black/10 pb-2">
            {formatBoldAndHighlights(trimmed.substring(2))}
          </h1>
        );
      }

      // Header level 3
      if (trimmed.startsWith('### ')) {
        isInList = false;
        return (
          <h3 key={idx} className="text-base sm:text-lg font-bold tracking-tight text-indigo-700/90 mt-6 mb-3 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-500 shrink-0" />
            {formatBoldAndHighlights(trimmed.substring(4))}
          </h3>
        );
      }

      // Blockquotes
      if (trimmed.startsWith('> ')) {
        isInList = false;
        return (
          <blockquote key={idx} className="border-l-4 border-indigo-400 pl-4 py-2 my-4 opacity-85 font-serif italic text-sm rounded-r-lg bg-current/5 p-3">
            {formatBoldAndHighlights(trimmed.substring(2))}
          </blockquote>
        );
      }

      // Bullet lists
      if (trimmed.startsWith('* ')) {
        isInList = true;
        return (
          <li key={idx} className="ml-6 list-disc mb-2 leading-relaxed">
            {formatBoldAndHighlights(trimmed.substring(2))}
          </li>
        );
      }

      // Separators
      if (trimmed === '---') {
        isInList = false;
        return <hr key={idx} className="my-8 border-t border-black/15" />;
      }

      // Regular paragraph
      if (trimmed) {
        isInList = false;
        return (
          <p key={idx} className="mb-5 leading-relaxed font-serif">
            {formatBoldAndHighlights(trimmed)}
          </p>
        );
      }

      isInList = false;
      return null;
    });
  };

  // Font class selection
  const fontClass = {
    sm: 'text-xs',
    base: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }[fontSize];

  // Paper Themes
  const paperClass = {
    white: 'bg-white text-slate-800 border-slate-200/50 shadow-white/5',
    sepia: 'bg-[#faf6eb] text-[#433422] border-[#eae0cc] shadow-[#eae0cc]/10',
    dark: 'bg-[#18181b] text-zinc-100 border-zinc-800 shadow-zinc-950/20',
    slate: 'bg-[#0f172a] text-slate-200 border-slate-800 shadow-slate-950/25'
  }[paperTheme];

  const currentSelection = videos.find(v => v.id === selectedVideoId);

  return (
    <div ref={containerRef} className="flex flex-col md:flex-row fixed inset-0 w-screen h-screen h-[100dvh] backdrop-blur-3xl bg-theme-bg/98 overflow-hidden z-50 animate-in fade-in duration-200">
      
      {/* Side Selector column */}
      <div className={cn(
        "w-full md:w-80 flex flex-col border-r border-theme-border h-full shrink-0 bg-transparent p-5",
        mobileView === 'list' ? 'flex animate-in slide-in-from-left duration-200' : 'hidden md:flex'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-theme-accent">
            <BookOpen className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest text-theme-text">Readings Lab</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 bg-theme-surface hover:bg-rose-500/10 text-theme-text-muted hover:text-rose-500 hover:border-rose-500/20 border border-transparent text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
          >
            Exit Reader
          </button>
        </div>

        {/* Global transcript search input */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text-muted/50" />
          <input
            type="text"
            placeholder="Search all transcripts..."
            value={globalSearchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setGlobalSearchQuery(val);
              if (val.trim() && !hasPrefetchedAll) {
                setHasPrefetchedAll(true);
                loadAllTranscripts();
              }
            }}
            className="w-full bg-theme-surface text-xs py-2 pl-9 pr-8 rounded-xl border border-theme-border focus:outline-none focus:border-theme-accent transition-all placeholder:text-theme-text-muted/40 text-theme-text shadow-sm"
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live scanning progress bar */}
        {isLoadingAll && (
          <div className="mb-4 px-1 text-[10px] text-theme-text-muted/85 flex flex-col gap-1.5 animate-pulse bg-theme-accent/5 p-2 rounded-xl border border-theme-accent/10">
            <div className="flex items-center justify-between font-mono">
              <span className="flex items-center gap-1.5 font-bold text-theme-accent">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-theme-accent animate-ping" />
                Scanning: {loadedCount}/{availableIds.length} loaded
              </span>
              <span>{Math.round((loadedCount / availableIds.length) * 100)}%</span>
            </div>
            <div className="w-full bg-theme-border/40 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-theme-accent h-full rounded-full transition-all duration-300" 
                style={{ width: `${(loadedCount / availableIds.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* List of videos or search results */}
        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
          {globalSearchQuery.trim() ? (
            globalSearchResults.length === 0 ? (
              <div className="text-center py-10 px-4 text-theme-text-muted/60 text-xs font-serif italic">
                {isLoadingAll ? (
                  <p className="animate-pulse">Loading and scanning 90+ records for "{globalSearchQuery}"...</p>
                ) : (
                  <p>No matches found in any lecture transcript.</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[10px] font-extrabold text-theme-accent/80 uppercase tracking-widest px-1">
                  Found in {globalSearchResults.length} {globalSearchResults.length === 1 ? 'lecture' : 'lectures'}:
                </p>
                {globalSearchResults.map((res) => (
                  <div key={res.videoId} className="bg-theme-surface/30 border border-theme-border/40 rounded-2xl p-2.5 space-y-2">
                    <h4 className="text-[11px] font-bold text-theme-text leading-tight pb-1 border-b border-theme-border/25">
                      📚 {res.videoTitle}
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
                      {res.matches.map((match, mIdx) => (
                        <button
                          key={mIdx}
                          onClick={() => {
                            handleSelectSearchResult(res.videoId, match.segmentIdx, match.time);
                          }}
                          className="w-full text-left p-2 rounded-xl bg-theme-surface/50 hover:bg-theme-accent/10 border border-theme-border/30 hover:border-theme-accent/30 text-[11px] transition-all cursor-pointer group flex gap-2 items-start"
                        >
                          <span className="font-mono text-[9px] bg-theme-accent/10 text-theme-accent px-1.5 py-0.5 rounded shrink-0 group-hover:bg-theme-accent group-hover:text-white transition-colors">
                            {match.time}
                          </span>
                          <p className="text-theme-text-muted group-hover:text-theme-text leading-relaxed font-serif line-clamp-3">
                            {highlightText(match.text, globalSearchQuery)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            searchableVideos.map((video) => (
              <button
                key={video.id}
                onClick={() => {
                  setSelectedVideoId(video.id);
                  setMobileView('reading');
                }}
                className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-3 transition-all ${
                  selectedVideoId === video.id
                    ? 'bg-theme-accent/20 border-theme-accent text-theme-text shadow-sm'
                    : 'bg-theme-surface border-transparent hover:bg-theme-surface/80 text-theme-text-muted'
                }`}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-950 relative">
                  <img 
                    src={`https://img.youtube.com/vi/${video.id}/default.jpg`} 
                    alt="" 
                    className="w-full h-full object-cover opacity-80"
                  />
                </div>
                <div className="min-w-0 flex-grow">
                  <p className={`text-[10px] font-extrabold truncate uppercase ${selectedVideoId === video.id ? 'text-theme-accent' : 'text-theme-text-muted/65'}`}>
                    {video.hasTranscript ? '📖 Reading Ready' : '⚡ Custom Formatter Lab'}
                  </p>
                  <h4 className={`text-xs font-semibold leading-tight mt-0.5 ${selectedVideoId === video.id ? 'text-theme-text font-bold' : 'text-theme-text/80'}`}>
                    {video.title}
                  </h4>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Reading View */}
      <div className={cn(
        "flex-grow h-full flex flex-col bg-theme-bg/10 relative",
        mobileView === 'reading' ? 'flex animate-in slide-in-from-right duration-200' : 'hidden md:flex'
      )}>
        
        {/* Top toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 border-b border-theme-border gap-4 shrink-0 bg-theme-surface/30">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Mobile Navigation Back to Selector List */}
            <button 
              onClick={() => setMobileView('list')}
              className="md:hidden p-2 border border-theme-border hover:bg-theme-surface text-theme-text rounded-xl transition-all flex items-center justify-center bg-theme-surface/50 shrink-0"
              title="Back to Readings List"
            >
              <ArrowLeft className="w-4 h-4 text-theme-accent" />
            </button>

            <button 
              onClick={() => {
                setActiveVideoId(selectedVideoId);
                onClose();
              }}
              className="p-2 border border-theme-border hover:bg-theme-surface text-theme-text rounded-xl transition-all flex items-center justify-center bg-theme-surface/50 shrink-0"
              title="Play Video Companion"
            >
              <Eye className="w-4 h-4 text-theme-accent" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-theme-text truncate leading-tight animate-fade-in">
                {currentSelection?.title || 'Reading Panel'}
              </h2>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-theme-text-muted/60 font-mono">ID: {selectedVideoId}</span>
                <span className="text-theme-border text-[10px]">•</span>
                <a 
                  href={`https://www.youtube.com/watch?v=${selectedVideoId}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-theme-accent hover:text-theme-accent/80 hover:underline flex items-center gap-0.5 font-bold tracking-wider uppercase transition-colors"
                  title="Open this lecture video directly on YouTube in a new tab"
                >
                  Watch Video <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {/* Search terms within text */}
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-theme-text-muted/50" />
              <input 
                type="text"
                placeholder="Find in text..."
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                className="w-full bg-theme-surface text-xs py-1 pl-7 pr-3 rounded-lg border border-theme-border focus:outline-none focus:border-theme-accent transition-colors placeholder:text-theme-text-muted/40 text-theme-text"
              />
              {subSearchQuery && (
                <button 
                  onClick={() => setSubSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Config Panel */}
            <div className="flex items-center gap-1.5 border-l border-theme-border pl-4 shrink-0">
              {/* Paper Theme Selectors */}
              {(['sepia', 'white', 'slate', 'dark'] as const).map((theme) => {
                const colorMap = {
                  white: 'bg-white',
                  sepia: 'bg-[#faf6eb]',
                  slate: 'bg-[#0f172a]',
                  dark: 'bg-[#18181b]'
                };
                return (
                  <button
                    key={theme}
                    onClick={() => setPaperTheme(theme)}
                    className={`w-4 h-4 rounded-full ${colorMap[theme]} border border-theme-border/50 transition-all ${
                      paperTheme === theme ? 'ring-2 ring-theme-accent ring-offset-2 ring-offset-theme-bg scale-110 shadow-sm' : 'opacity-60 hover:opacity-100'
                    }`}
                    title={`${theme} theme`}
                  />
                );
              })}

              <div className="w-px h-4 bg-theme-border mx-2" />

              {/* Font Size Selector */}
              <button
                onClick={() => {
                  const sizes: ('sm' | 'base' | 'md' | 'lg' | 'xl')[] = ['sm', 'base', 'md', 'lg', 'xl'];
                  const curIdx = sizes.indexOf(fontSize);
                  const nextIdx = (curIdx + 1) % sizes.length;
                  setFontSize(sizes[nextIdx]);
                }}
                className="p-1 px-2.5 bg-theme-surface border border-theme-border text-[10px] text-theme-text-muted hover:text-theme-text rounded-lg transition-all flex items-center gap-1 font-bold tracking-wider mr-2"
              >
                <Type className="w-3 h-3 text-theme-accent" />
                {fontSize.toUpperCase()}
              </button>

              {/* Direct Exit Close Button */}
              <button 
                onClick={onClose}
                className="p-2 border border-theme-border hover:bg-rose-500/10 text-theme-text-muted hover:text-rose-500 hover:border-rose-500/20 rounded-xl transition-all flex items-center justify-center bg-theme-surface/50 shrink-0"
                title="Exit Reader"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-grow overflow-y-auto p-6 flex justify-center custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-theme-accent border-t-transparent animate-spin mb-4" />
              <p className="text-xs text-theme-text-muted uppercase tracking-widest font-mono">Opening spiritual records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-rose-500/90 text-center max-w-sm mt-12 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
              <X className="w-8 h-8 mb-3 text-rose-500" />
              <p className="text-sm font-semibold">{error}</p>
              <button 
                onClick={() => setSelectedVideoId('FkWBsufZvz8')}
                className="mt-4 text-xs font-bold text-theme-accent uppercase tracking-widest"
              >
                Go to Sample
              </button>
            </div>
          ) : !transcript ? (
            // Formatter Screen placeholder when there is no transcript available for selected video
            <div className="flex flex-col items-center justify-center max-w-md text-center mt-12 bg-theme-surface border border-theme-border p-8 rounded-[2rem] mx-4 h-fit backdrop-blur-md">
              <div className="w-12 h-12 bg-theme-accent/10 border border-theme-accent/20 rounded-2xl flex items-center justify-center mb-5 text-theme-accent">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-theme-accent">Custom Reading Lab</h3>
              <p className="text-xs text-theme-text-muted leading-relaxed mt-2 scale-95">
                There is currently no preloaded transcript for this specific talk. However, you can format any raw lecture text or paste captions directly using our offline formatter instantly!
              </p>
              
              <button 
                onClick={() => setShowFormatterModal(true)}
                className="mt-6 w-full py-3 bg-theme-accent text-white font-bold text-[11px] rounded-xl hover:opacity-90 transition-all shadow-md hover:scale-[1.01]"
              >
                📚 Formatter & Paste Tool
              </button>
            </div>
          ) : (
            // Full Reading view
            <div className="w-full max-w-3xl flex flex-col h-full">
              {/* Meta stats bar */}
              <div className="flex items-center gap-4 text-theme-text-muted/80 text-[10px] uppercase font-mono tracking-wider mb-6 shrink-0 border-b border-theme-border pb-4 flex-wrap">
                <span>📚 Word count: <strong className="text-theme-text font-bold">{viewMode === 'overview' ? Math.round(transcript.wordCount * 0.6) : transcript.wordCount}</strong></span>
                <span>•</span>
                <span>⏳ Reading: <strong className="text-theme-text font-bold">{viewMode === 'overview' ? Math.max(2, Math.round((transcript.wordCount * 0.6) / 180)) : Math.round(transcript.wordCount / 180)} mins</strong></span>
                <span>•</span>
                <a 
                  href={`https://www.youtube.com/watch?v=${selectedVideoId}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-theme-accent hover:text-theme-accent/80 hover:underline flex items-center gap-1 font-bold"
                  title="Direct URL to the video on YouTube"
                >
                  🎥 Direct Video URL <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
                <div className="ml-auto flex gap-2">
                  <button 
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-theme-text-muted hover:text-theme-text transition-colors"
                  >
                    {copied ? <Check className="w-3" /> : <Copy className="w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Segmented Mode Switch */}
              <div className="flex items-center bg-theme-surface/50 border border-theme-border/80 p-1 rounded-xl mb-6 shrink-0 backdrop-blur-md">
                <button
                  onClick={() => setViewMode('overview')}
                  className={cn(
                    "flex-1 py-2 text-center text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer",
                    viewMode === 'overview'
                      ? "bg-theme-accent text-white shadow-md scale-[1.01]"
                      : "text-theme-text-muted hover:text-theme-text"
                  )}
                >
                  📖 High-Level Overview
                </button>
                <button
                  onClick={() => setViewMode('full')}
                  className={cn(
                    "flex-1 py-2 text-center text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    viewMode === 'full'
                      ? "bg-theme-accent text-white shadow-md scale-[1.01]"
                      : "text-theme-text-muted hover:text-theme-text"
                  )}
                >
                  📜 Full Transcript
                  <span className={cn(
                    "text-[8px] font-mono px-1 rounded uppercase tracking-normal",
                    viewMode === 'full' ? "bg-white/20 text-white" : "bg-theme-border text-theme-text-muted"
                  )}>
                    Unabridged
                  </span>
                </button>
              </div>

              {/* Keyword Search Locator Panel */}
              {subSearchQuery.trim() && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-3 px-4 mb-6 rounded-2xl bg-theme-accent/5 border border-theme-accent/20 text-xs text-theme-text gap-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-theme-accent shrink-0 animate-pulse" />
                    <span>
                      Found <strong className="text-theme-accent">{matchingSegmentIndices.length}</strong> {matchingSegmentIndices.length === 1 ? 'match' : 'matches'} in the unabridged transcript.
                    </span>
                  </div>
                  {matchingSegmentIndices.length > 0 && (
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                      {/* Matching timestamps badges list */}
                      <div className="flex items-center gap-1.5 overflow-x-auto max-w-[180px] sm:max-w-[260px] no-scrollbar shrink-0 py-0.5">
                        {matchingSegmentIndices.map((idx, mIdx) => (
                          <button
                            key={idx}
                            onClick={() => handleJumpToSegment(idx)}
                            className={cn(
                              "p-0.5 px-1.5 font-mono text-[10px] rounded border transition-all shrink-0 cursor-pointer",
                              currentMatchIndex === mIdx
                                ? "bg-theme-accent border-theme-accent text-white font-bold"
                                : "bg-theme-surface border-theme-border text-theme-text-muted hover:text-theme-text"
                            )}
                          >
                            {segments[idx].time}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            const prevIdx = (currentMatchIndex - 1 + matchingSegmentIndices.length) % matchingSegmentIndices.length;
                            setCurrentMatchIndex(prevIdx);
                            handleJumpToSegment(matchingSegmentIndices[prevIdx]);
                          }}
                          className="p-1 px-2 bg-theme-surface hover:bg-theme-surface/80 text-theme-text-muted hover:text-theme-text rounded-md border border-theme-border font-bold text-[10px] cursor-pointer"
                        >
                          Prev
                        </button>
                        <button
                          onClick={() => {
                            const nextIdx = (currentMatchIndex + 1) % matchingSegmentIndices.length;
                            setCurrentMatchIndex(nextIdx);
                            handleJumpToSegment(matchingSegmentIndices[nextIdx]);
                          }}
                          className="p-1 px-2 bg-theme-surface hover:bg-theme-surface/80 text-theme-text-muted hover:text-theme-text rounded-md border border-theme-border font-bold text-[10px] cursor-pointer"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic reading scroll paper */}
              <div ref={readingAreaRef} className={`w-full p-8 sm:p-12 md:p-16 rounded-[2rem] border shadow-2xl transition-all font-serif ${paperClass} ${fontClass}`}>
                {viewMode === 'overview' ? (
                  <>
                    {renderMarkdownWithHighlights(transcript.formattedMarkdown)}
                    
                    {/* Bottom inline expand full transcript CTA */}
                    <div className="mt-12 pt-8 border-t border-theme-border/50 text-center">
                      <p className="text-xs opacity-75 mb-4 font-serif italic">
                        Want to read the complete word-for-word lecture without omissions?
                      </p>
                      <button
                        onClick={() => {
                          setViewMode('full');
                          // Smooth scroll to top of reading container
                          readingAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className="px-6 py-3 bg-theme-accent text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:opacity-95 hover:scale-[1.01] transition-all shadow-md inline-flex items-center gap-2 cursor-pointer border border-transparent"
                      >
                        <BookOpen className="w-4 h-4" />
                        Expand Full Transcript
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    {segments.map((seg, idx) => {
                      const isHighlighted = highlightedSegmentIdx === idx;
                      const hasMatches = subSearchQuery.trim() && seg.text.toLowerCase().includes(subSearchQuery.toLowerCase());
                      const isCurrentMatch = subSearchQuery.trim() && matchingSegmentIndices[currentMatchIndex] === idx;

                      return (
                        <div 
                          key={idx}
                          id={`segment-${idx}`}
                          className={cn(
                            "flex gap-4 p-5 rounded-2xl border transition-all duration-300 relative",
                            isHighlighted 
                              ? "bg-amber-500/10 border-amber-500/40 shadow-lg scale-[1.01] ring-1 ring-amber-500/10" 
                              : "bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5",
                            hasMatches && !isHighlighted && "border-theme-accent/20 bg-theme-accent/5",
                            isCurrentMatch && "ring-1 ring-theme-accent"
                          )}
                        >
                          {/* Timeline timestamp marker */}
                          <div className="flex flex-col items-center shrink-0">
                            <button
                              onClick={() => {
                                handleSeekVideo(seg.time);
                                setHighlightedSegmentIdx(idx);
                                setTimeout(() => setHighlightedSegmentIdx(null), 2500);
                              }}
                              className={cn(
                                "p-1.5 px-2.5 bg-theme-surface border border-theme-border hover:border-theme-accent text-theme-text-muted hover:text-theme-text rounded-lg transition-all flex items-center gap-1.5 font-mono text-[10px] font-semibold cursor-pointer shadow-sm active:scale-95",
                                isHighlighted && "bg-theme-accent text-white border-theme-accent hover:bg-theme-accent hover:text-white"
                              )}
                              title="Click to play companion video at this timestamp"
                            >
                              <Volume2 className="w-3.5 h-3.5 shrink-0" />
                              {seg.time}
                            </button>
                          </div>

                          {/* Segment Transcript text */}
                          <div className="flex-grow min-w-0 pt-0.5">
                            <p className="leading-relaxed font-serif text-[15px] opacity-90">
                              {highlightText(seg.text, subSearchQuery)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Paste & Format Modal Dialog overlay */}
      {showFormatterModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-theme-bg border border-theme-border rounded-3xl w-full max-w-2xl p-6 flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-theme-border pb-3">
              <div className="flex items-center gap-2 text-theme-accent">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest text-theme-text">Local Spiritual Formatter</h3>
              </div>
              <button 
                onClick={() => setShowFormatterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 mb-5 pr-1">
              <p className="text-[11px] text-theme-text-muted/80 leading-relaxed">
                Copy and paste the automated captions from any YouTube video desktop watch page (click 3 dots below title &gt; Show Transcript, select &amp; copy all text), or enter your own spiritual notes. This offline tool structures it into elegant, highly readable paragraphs instantly.
              </p>

              <textarea
                placeholder="Paste the raw subtitles here... (e.g. 'welcome to this session today we will have deep peaceful meditation on divine love...')"
                value={inputRawText}
                onChange={(e) => setInputRawText(e.target.value)}
                className="w-full h-64 bg-theme-surface text-theme-text font-mono text-xs p-4 rounded-2xl border border-theme-border focus:outline-none focus:border-theme-accent transition-colors resize-none placeholder:text-theme-text-muted/40"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-theme-border pt-4 shrink-0">
              <button
                onClick={() => setShowFormatterModal(false)}
                className="px-4 py-2 bg-theme-surface hover:bg-theme-surface/80 text-theme-text-muted hover:text-theme-text text-xs font-bold uppercase tracking-wider rounded-xl transition-all border border-theme-border"
              >
                Cancel
              </button>
              <button
                onClick={handleFormatLocally}
                disabled={formattingProgress || !inputRawText.trim()}
                className={`px-5 py-2.5 bg-theme-accent hover:opacity-90 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg ${
                  (!inputRawText.trim() || formattingProgress) && 'opacity-40 cursor-not-allowed'
                }`}
              >
                {formattingProgress ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Structuring locally...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Attune & Format Text
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
