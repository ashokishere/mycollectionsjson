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
  Plus
} from 'lucide-react';
import { type Video } from '../data/videos';

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

export default function TranscriptReader({ videos, activeVideoId, setActiveVideoId, onClose }: TranscriptReaderProps) {
  const [selectedVideoId, setSelectedVideoId] = useState<string>(activeVideoId || 'FkWBsufZvz8');
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Customization controls
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'md' | 'lg' | 'xl'>('base');
  const [paperTheme, setPaperTheme] = useState<'white' | 'sepia' | 'dark' | 'slate'>('sepia');
  const [subSearchQuery, setSubSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Custom manual transcript formatting states
  const [inputRawText, setInputRawText] = useState('');
  const [showFormatterModal, setShowFormatterModal] = useState(false);
  const [formattingProgress, setFormattingProgress] = useState(false);

  const [availableIds, setAvailableIds] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const readingAreaRef = useRef<HTMLDivElement>(null);

  // Load list of available transcripts from public registry once
  useEffect(() => {
    let active = true;
    const fetchAvailable = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}transcripts/available.json`);
        if (response.ok) {
          const ids = await response.json();
          if (active && Array.isArray(ids)) {
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
    }
  }, [activeVideoId]);

  // Load transcript data from static json files dynamically
  useEffect(() => {
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
    return videos.map(v => ({
      ...v,
      hasTranscript: availableIds.includes(v.id)
    }));
  }, [videos, availableIds]);

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
          <blockquote key={idx} className="border-l-4 border-indigo-400 pl-4 py-1 my-4 text-slate-600 font-serif italic text-sm rounded-r-lg bg-black/5 p-3">
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
    <div ref={containerRef} className="flex flex-col lg:flex-row fixed inset-0 w-screen h-screen backdrop-blur-3xl bg-[#090d16]/98 overflow-hidden z-50 animate-in fade-in duration-200">
      
      {/* Side Selector column */}
      <div className="w-full lg:w-80 flex flex-col border-r border-white/5 h-1/3 lg:h-full shrink-0 bg-transparent p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-indigo-400">
            <BookOpen className="w-4 h-4" />
            <h3 className="text-xs font-black uppercase tracking-widest text-white">Pradeep Library</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-2.5 bg-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all"
          >
            Exit Reader
          </button>
        </div>

        {/* List of videos */}
        <div className="flex-grow overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
          {searchableVideos.map((video) => (
            <button
              key={video.id}
              onClick={() => setSelectedVideoId(video.id)}
              className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-3 transition-all ${
                selectedVideoId === video.id
                  ? 'bg-indigo-600/20 border-indigo-500/40 text-white'
                  : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-400'
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
                <p className={`text-[10px] font-extrabold truncate uppercase ${selectedVideoId === video.id ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {video.hasTranscript ? '📖 Reading Ready' : '🕯️ Audio Only'}
                </p>
                <h4 className={`text-xs font-semibold leading-tight truncate mt-0.5 ${selectedVideoId === video.id ? 'text-white' : 'text-slate-300'}`}>
                  {video.title}
                </h4>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Reading View */}
      <div className="flex-grow h-2/3 lg:h-full flex flex-col bg-slate-950/20 relative">
        
        {/* Top toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 px-6 border-b border-white/5 gap-4 shrink-0 bg-slate-900/30">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button 
              onClick={() => {
                setActiveVideoId(selectedVideoId);
                onClose();
              }}
              className="p-2 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl transition-all flex items-center justify-center"
              title="Play Video Companion"
            >
              <Eye className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate leading-tight">
                {currentSelection?.title || 'Reading Panel'}
              </h2>
              <span className="text-[10px] text-slate-500 font-mono">ID: {selectedVideoId}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            {/* Search terms within text */}
            <div className="relative w-44">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              <input 
                type="text"
                placeholder="Find in text..."
                value={subSearchQuery}
                onChange={(e) => setSubSearchQuery(e.target.value)}
                className="w-full bg-white/5 text-xs py-1 pl-7 pr-3 rounded-lg border border-white/10 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
              />
              {subSearchQuery && (
                <button 
                  onClick={() => setSubSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Config Panel */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-4 shrink-0">
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
                    className={`w-4 h-4 rounded-full ${colorMap[theme]} border transition-all ${
                      paperTheme === theme ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-60'
                    }`}
                    title={`${theme} theme`}
                  />
                );
              })}

              <div className="w-px h-4 bg-white/10 mx-2" />

              {/* Font Size Selector */}
              <button
                onClick={() => {
                  const sizes: ('sm' | 'base' | 'md' | 'lg' | 'xl')[] = ['sm', 'base', 'md', 'lg', 'xl'];
                  const curIdx = sizes.indexOf(fontSize);
                  const nextIdx = (curIdx + 1) % sizes.length;
                  setFontSize(sizes[nextIdx]);
                }}
                className="p-1 px-2.5 bg-white/5 border border-white/10 text-[10px] text-slate-300 hover:text-white rounded-lg transition-all flex items-center gap-1 font-bold tracking-wider"
              >
                <Type className="w-3 h-3" />
                {fontSize.toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-grow overflow-y-auto p-6 flex justify-center custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
              <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Opening spiritual records...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center text-rose-400/90 text-center max-w-sm mt-12 bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
              <X className="w-8 h-8 mb-3 text-rose-500" />
              <p className="text-sm font-semibold">{error}</p>
              <button 
                onClick={() => setSelectedVideoId('FkWBsufZvz8')}
                className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-widest"
              >
                Go to Sample
              </button>
            </div>
          ) : !transcript ? (
            // Formatter Screen placeholder when there is no transcript available for selected video
            <div className="flex flex-col items-center justify-center max-w-md text-center mt-12 bg-white/2 border border-white/5 p-8 rounded-[2rem] mx-4 h-fit backdrop-blur-md">
              <div className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center mb-5 text-indigo-400">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400">Custom Reading Lab</h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-2 scale-95">
                There is currently no preloaded transcript for this specific talk. However, you can format any raw lecture text or paste captions directly using our offline formatter instantly!
              </p>
              
              <button 
                onClick={() => setShowFormatterModal(true)}
                className="mt-6 w-full py-3 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white font-bold text-[11px] rounded-xl hover:from-indigo-500 hover:to-fuchsia-500 transition-all shadow-xl shadow-indigo-600/20 hover:scale-[1.01]"
              >
                📚 Formatter & Paste Tool
              </button>
            </div>
          ) : (
            // Full Reading view
            <div className="w-full max-w-3xl flex flex-col h-full">
              {/* Meta stats bar */}
              <div className="flex items-center gap-4 text-slate-500 text-[10px] uppercase font-mono tracking-wider mb-6 shrink-0 border-b border-white/5 pb-4">
                <span>📚 Word count: <strong className="text-slate-300 font-bold">{transcript.wordCount}</strong></span>
                <span>•</span>
                <span>⏳ Reading: <strong className="text-slate-300 font-bold">{Math.round(transcript.wordCount / 180)} mins</strong></span>
                <span>•</span>
                <span className="hidden sm:inline">Attuned successfully</span>
                <div className="ml-auto flex gap-2">
                  <button 
                    onClick={handleCopyText}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3" /> : <Copy className="w-3" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Dynamic reading scroll paper */}
              <div ref={readingAreaRef} className={`w-full p-8 sm:p-12 md:p-16 rounded-[2rem] border shadow-2xl transition-all font-serif ${paperClass} ${fontClass}`}>
                {renderMarkdownWithHighlights(transcript.formattedMarkdown)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Paste & Format Modal Dialog overlay */}
      {showFormatterModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl p-6 flex flex-col max-h-[85vh] shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Local Spiritual Formatter</h3>
              </div>
              <button 
                onClick={() => setShowFormatterModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-4 mb-5 pr-1">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Copy and paste the automated captions from any YouTube video desktop watch page (click 3 dots below title &gt; Show Transcript, select &amp; copy all text), or enter your own spiritual notes. This offline tool structures it into elegant, highly readable paragraphs instantly.
              </p>

              <textarea
                placeholder="Paste the raw subtitles here... (e.g. 'welcome to this session today we will have deep peaceful meditation on divine love...')"
                value={inputRawText}
                onChange={(e) => setInputRawText(e.target.value)}
                className="w-full h-64 bg-slate-950 text-slate-300 font-mono text-xs p-4 rounded-2xl border border-white/5 focus:outline-none focus:border-indigo-500 transition-colors resize-none placeholder:text-slate-700"
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4 shrink-0">
              <button
                onClick={() => setShowFormatterModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleFormatLocally}
                disabled={formattingProgress || !inputRawText.trim()}
                className={`px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center gap-2 shadow-lg ${
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
