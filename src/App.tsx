/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Plus, 
  Trash2, 
  Search, 
  Tag as TagIcon, 
  ChevronRight, 
  ChevronLeft,
  X,
  PlusCircle,
  Database,
  History,
  ListVideo,
  RefreshCw,
  Sparkles,
  Bookmark,
  Star,
  Zap,
  Info,
  Clock,
  Timer,
  Compass
} from 'lucide-react';
import { initialVideos, type Video } from './data/videos';
import messagesData from './data/messages.json';
import favoritesData from './data/favorite_playlists.json';
import { cn } from './lib/utils';

// Helper to extract YouTube ID from URL
const getYoutubeId = (urlPath: string) => {
  const url = urlPath.trim();
  if (url.length === 11 && !url.includes('/') && !url.includes('.') && !url.includes(':')) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function App() {
  const [videos, setVideos] = useState<Video[]>(initialVideos);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('Compassion');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playerInitId, setPlayerInitId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<Video[]>([]);
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [showPetals, setShowPetals] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(() => localStorage.getItem('app_theme') || 'default');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem('app_theme', currentTheme);
  }, [currentTheme]);

  const triggerPetals = useCallback(() => {
    setShowPetals(true);
    setTimeout(() => setShowPetals(false), 30000);
  }, []);

  const addFavoritePlaylist = (favoriteId: string) => {
    const favorite = favoritesData.favorites.find(f => f.id === favoriteId);
    if (!favorite) return;

    const videosToLink = videos.filter(v => favorite.videoIds.includes(v.id));
    
    // Add only if not already in playlist to avoid duplicates if desired, 
    // but usually "add to playlist" means append.
    setPlaylist(prev => {
      const newItems = videosToLink.filter(v => !prev.some(p => p.id === v.id));
      const updated = [...prev, ...newItems];
      localStorage.setItem('laughter_bubble_playlist', JSON.stringify(updated));
      return updated;
    });
    
    triggerPetals();
  };

  const triggerSurprise = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * messagesData.messages.length);
    setActiveMessage(messagesData.messages[randomIndex]);
    triggerPetals();
  }, [triggerPetals]);

  useEffect(() => {
    // Initial popup on load
    const timer = setTimeout(() => {
      triggerSurprise();
    }, 1500);
    return () => clearTimeout(timer);
  }, [triggerSurprise]);

  const REMOTE_URL = '/Database.xlsx';

  const playerRef = useRef<HTMLDivElement>(null);
  const playerInstance = useRef<any>(null);

  // Load playlist from local storage
  useEffect(() => {
    const saved = localStorage.getItem('laughter_bubble_playlist') || localStorage.getItem('zenstream_playlist');
    if (saved) {
      try {
        setPlaylist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved playlist');
      }
    }
    
    // Initial fetch from remote
    fetchRemoteData();
  }, []);

  // Auto-scroll to player when video changes
  useEffect(() => {
    if (activeVideoId && playerRef.current) {
      playerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeVideoId]);

  const fetchRemoteData = async () => {
    setIsSyncing(true);
    // In "No-Database" mode, sync is just a UI feedback as data is pre-bundled
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced(new Date().toLocaleTimeString());
      triggerPetals();
    }, 800);
  };

  const parseRawData = () => {
    // Legacy support for manual input if needed
    const lines = rawInput.split('\n').filter(line => line.trim() !== '');
    const newVideos: Video[] = [];
    lines.forEach(line => {
      const parts = line.split(/[,\t|]/).map(p => p.trim());
      if (parts.length >= 3) {
        newVideos.push({
          id: parts[0],
          title: parts[1],
          url: parts[2],
          tags: parts[3] ? parts[3].split(/[|;]/).map(t => t.trim()) : []
        });
      }
    });

    if (newVideos.length > 0) {
      setVideos(prev => [...prev, ...newVideos]);
    }
    setRawInput('');
    setIsDataPanelOpen(false);
  };

  // Save playlist to local storage
  useEffect(() => {
    localStorage.setItem('laughter_bubble_playlist', JSON.stringify(playlist));
  }, [playlist]);

  // Derived data
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    videos.forEach(v => {
      if (Array.isArray(v.tags)) {
        v.tags.forEach(t => {
          if (t && t.trim()) tags.add(t.trim());
        });
      }
    });
    return Array.from(tags).sort();
  }, [videos]);

  // Categorized tags
  const categorizedTags = useMemo(() => {
    const speakers = new Set<string>();
    const languages = new Set<string>();
    const years = new Set<string>();
    const general = new Set<string>();

    const langList = [
      'English', 'Hindi', 'Tamil', 'Bengali', 'Telugu', 'Nepali', 'Malayalam', 'Kannada', 
      'Marathi', 'Gujarati', 'Punjabi', 'Odia', 'Sanskrit', 'Spanish', 'German', 
      'French', 'Italian', 'Portuguese', 'Russian', 'Japanese', 'Chinese'
    ];

    allTags.forEach(tag => {
      const lowerTag = tag.toLowerCase();
      if (tag.match(/^\d{4}$/)) {
        years.add(tag);
      } else if (langList.some(l => lowerTag === l.toLowerCase())) {
        languages.add(tag);
      } else if (
        tag.startsWith('Swami') || 
        tag.startsWith('Brother') || 
        tag.startsWith('Sri') || 
        tag.startsWith('Sister') ||
        lowerTag.includes('brahmani')
      ) {
        speakers.add(tag);
      } else {
        // Fallback for everything else goes to general Topics
        general.add(tag);
      }
    });

    return { 
      speakers: Array.from(speakers), 
      languages: Array.from(languages), 
      years: Array.from(years), 
      general: Array.from(general) 
    };
  }, [allTags]);

  const filteredVideos = useMemo(() => {
    // "Compassion" is an informational default that doesn't trigger filtering
    const effectiveSearch = searchQuery.trim().toLowerCase() === 'compassion' ? '' : searchQuery;

    return videos.filter(v => {
      const matchesSearch = !effectiveSearch || 
                           v.title.toLowerCase().includes(effectiveSearch.toLowerCase()) || 
                           v.tags.some(t => t.toLowerCase().includes(effectiveSearch.toLowerCase()));
      
      const matchesTags = selectedTags.length === 0 || (() => {
        const groups: Record<string, string[]> = { speakers: [], languages: [], years: [], general: [] };
        selectedTags.forEach(t => {
          if (categorizedTags.speakers.includes(t)) groups.speakers.push(t);
          else if (categorizedTags.languages.includes(t)) groups.languages.push(t);
          else if (categorizedTags.years.includes(t)) groups.years.push(t);
          else groups.general.push(t);
        });

        // AND between categories, OR within categories
        return Object.entries(groups).every(([_, tagsInGroup]) => 
          tagsInGroup.length === 0 || tagsInGroup.some(t => v.tags.includes(t))
        );
      })();

      return matchesSearch && matchesTags;
    });
  }, [videos, searchQuery, selectedTags, categorizedTags]);

  const activeVideo = useMemo(() => {
    return (videos.find(v => v.id === activeVideoId) || playlist.find(v => v.id === activeVideoId)) || null;
  }, [videos, playlist, activeVideoId]);

  // Handle first player initialization
  useEffect(() => {
    if (activeVideoId && !playerInitId) {
      const yid = getYoutubeId(activeVideo?.url || '');
      if (yid) setPlayerInitId(yid);
    }
  }, [activeVideoId, activeVideo, playerInitId]);

  // Actions
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addToPlaylist = (video: Video) => {
    if (!playlist.find(v => v.id === video.id)) {
      setPlaylist(prev => {
        const newList = [...prev, video];
        // If this is the first video added and nothing is currently active, start playing it
        if (newList.length === 1 && !activeVideoId) {
          setActiveVideoId(video.id);
          triggerPetals();
        }
        return newList;
      });
    }
  };

  const removeFromPlaylist = (id: string) => {
    setPlaylist(prev => prev.filter(v => v.id !== id));
  };

  const playlistRef = useRef<Video[]>([]);
  const activeVideoIdRef = useRef<string | null>(null);
  const videosRef = useRef<Video[]>([]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    activeVideoIdRef.current = activeVideoId;
  }, [activeVideoId]);

  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);

  const handleNextInPlaylist = useCallback(() => {
    const currentPlaylist = playlistRef.current;
    const currentId = activeVideoIdRef.current;
    
    if (currentPlaylist.length === 0) return;
    
    const currentIndex = currentPlaylist.findIndex(v => v.id === currentId);
    let nextVideo = null;
    
    if (currentIndex === -1) {
      nextVideo = currentPlaylist[0];
    } else if (currentIndex < currentPlaylist.length - 1) {
      nextVideo = currentPlaylist[currentIndex + 1];
    } else {
      // Loop back to start
      nextVideo = currentPlaylist[0];
    }
    
    if (nextVideo) {
      const nextId = nextVideo.id;
      setActiveVideoId(nextId);
      triggerPetals();
      
      // We rely on the useEffect below to call loadVideoById
      // which preserves fullscreen mode on the same iframe instance.
    }
  }, [triggerPetals]);

  const onPlayerReady = (event: any) => {
    playerInstance.current = event.target;
    event.target.playVideo();
  };

  const onPlayerStateChange = (event: any) => {
    // states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    if (event.data === 5 || event.data === -1) {
      event.target.playVideo();
    }
    
    if (event.data === 0) {
      handleNextInPlaylist();
    }
  };

  // Stable transition handler to preserve fullscreen and ensure play
  useEffect(() => {
    if (activeVideoId && playerInstance.current && playerInitId) {
      const yid = getYoutubeId(activeVideo?.url || '');
      if (yid) {
        try {
          // Check if the player is already showing this video
          const currentYid = playerInstance.current.getVideoData?.().video_id;
          if (currentYid !== yid) {
            playerInstance.current.loadVideoById({
              videoId: yid,
              startSeconds: 0,
              suggestedQuality: 'hd1080'
            });
            playerInstance.current.playVideo();
          }
        } catch (e) {
          console.error('Sequence navigation error:', e);
        }
      }
    }
  }, [activeVideoId, playerInitId, activeVideo]);

  // Force play safety effect
  useEffect(() => {
    if (activeVideoId && playerInstance.current) {
      const timer = setTimeout(() => {
        try {
          const state = playerInstance.current.getPlayerState();
          if (state !== 1 && state !== 3) {
            playerInstance.current.playVideo();
          }
        } catch (e) {}
      }, 1500); 
      return () => clearTimeout(timer);
    }
  }, [activeVideoId]);


  return (
    <div className="min-h-screen font-sans flex flex-col md:flex-row overflow-hidden text-slate-50">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-theme-bg">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-theme-accent/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] opacity-30" />
      </div>

      {/* Sidebar/Navigation (Mobile: Bottom, Desktop: Left) */}
      <aside className="w-full md:w-80 flex-shrink-0 h-auto md:h-screen backdrop-blur-2xl bg-theme-surface border-r border-theme-border z-20 flex flex-col p-6">
        <div className="flex flex-col gap-6 mb-10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-theme-accent to-fuchsia-500 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-white fill-current" />
              </div>
              <h1 className="text-lg font-light tracking-tight text-theme-text leading-tight opacity-90">
                A Tiny Bubble of Laughter…
              </h1>
            </div>
            
            <button 
              onClick={triggerPetals}
              className="p-2 bg-theme-accent/10 hover:bg-theme-accent/20 text-theme-accent rounded-lg transition-all"
              title="Experience Peace"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-1 bg-theme-surface rounded-xl border border-theme-border">
              {[
                { id: 'default', color: 'bg-[#020617]', label: 'D' },
                { id: 'golden', color: 'bg-[#2d1e05]', label: 'G' },
                { id: 'white', color: 'bg-white', label: 'W' },
                { id: 'sky', color: 'bg-[#082f49]', label: 'S' },
                { id: 'opal', color: 'bg-[#064e3b]', label: 'O' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTheme(t.id)}
                  className={cn(
                    "w-full h-7 rounded-lg flex items-center justify-center text-[8px] font-bold transition-all",
                    currentTheme === t.id 
                      ? "ring-2 ring-theme-accent ring-offset-2 ring-offset-theme-bg scale-95" 
                      : "hover:scale-105 opacity-60 hover:opacity-100"
                  )}
                  style={{ backgroundColor: t.id === 'white' ? '#ffffff' : undefined }}
                  title={t.id}
                >
                  <div className={cn("w-full h-full rounded-lg flex items-center justify-center border border-theme-border", t.color)}>
                    <span className={t.id === 'white' ? 'text-black' : 'text-white'}>{t.label}</span>
                  </div>
                </button>
              ))}
            </div>

            <button 
              onClick={fetchRemoteData}
              disabled={isSyncing}
              className={cn(
                "flex items-center gap-2 w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/10 hover:text-white transition-all transition-colors",
                isSyncing && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isSyncing && "animate-spin text-theme-accent")} />
              {isSyncing ? "Syncing..." : "Sync Library"}
            </button>
            {lastSynced && (
              <div className="text-[8px] text-slate-500 font-mono tracking-wider ml-1">
                Last updated: {lastSynced}
              </div>
            )}
          </div>
        </div>

        <div className="flex-grow flex flex-col min-h-0 space-y-8 overflow-y-auto scrollbar-hide pr-1">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-400 mb-4 px-2">Search Keyword</div>
            <div className="relative group mb-6 px-2">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-theme-text-muted group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                placeholder="Compassion"
                className="w-full bg-theme-surface border border-theme-border rounded-full py-1.5 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-theme-accent/50 transition-all placeholder:text-theme-text-muted"
                value={searchQuery}
                onFocus={(e) => { if (e.target.value.toLowerCase() === 'compassion') setSearchQuery(''); }}
                onBlur={(e) => { if (!e.target.value.trim()) setSearchQuery('Compassion'); }}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Structured Metadata Filters */}
            <div className="space-y-6 px-2 pb-10">
              {categorizedTags.speakers.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Speakers</div>
                    {selectedTags.some(t => categorizedTags.speakers.includes(t)) && (
                      <button 
                        onClick={() => setSelectedTags(prev => prev.filter(t => !categorizedTags.speakers.includes(t)))}
                        className="text-[9px] text-indigo-400 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 max-h-64 overflow-y-auto scrollbar-hide">
                    {categorizedTags.speakers.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "text-left px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all",
                          selectedTags.includes(tag) 
                            ? "bg-theme-accent/20 text-theme-accent border border-theme-accent/30" 
                            : "text-slate-400 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {categorizedTags.languages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Language</div>
                    {selectedTags.some(t => categorizedTags.languages.includes(t)) && (
                      <button 
                        onClick={() => setSelectedTags(prev => prev.filter(t => !categorizedTags.languages.includes(t)))}
                        className="text-[9px] text-indigo-400 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categorizedTags.languages.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-medium border transition-all",
                          selectedTags.includes(tag) 
                            ? "bg-theme-accent border-theme-accent text-white"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {categorizedTags.years.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">Year</div>
                    {selectedTags.some(t => categorizedTags.years.includes(t)) && (
                      <button 
                        onClick={() => setSelectedTags(prev => prev.filter(t => !categorizedTags.years.includes(t)))}
                        className="text-[9px] text-indigo-400 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {categorizedTags.years.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-mono transition-all",
                          selectedTags.includes(tag) 
                            ? "bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30" 
                            : "bg-white/5 text-slate-500 hover:text-white"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

            <button 
              onClick={() => setIsDataPanelOpen(true)}
              className="mt-6 flex items-center justify-center gap-2 w-full py-2.5 bg-white/5 border border-dashed border-white/20 rounded-xl text-[10px] text-slate-400 hover:bg-white/10 transition-all uppercase tracking-widest font-bold"
            >
              <Database className="w-3.5 h-3.5" />
              Manage Library
            </button>
          </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-h-0 bg-transparent z-10 p-8 overflow-y-auto custom-scrollbar">
        {/* Top Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8 bg-theme-bg/40 backdrop-blur-md p-4 z-30 rounded-2xl border border-theme-border shrink-0">
          <div className="flex-grow flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsTopicOpen(!isTopicOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all",
                  selectedTags.some(t => categorizedTags.general.includes(t))
                    ? "bg-theme-accent border-theme-accent text-white shadow-lg shadow-theme-accent/20"
                    : "bg-theme-surface border-theme-border text-theme-text-muted hover:text-white"
                )}
              >
                <TagIcon className="w-3.5 h-3.5" />
                Topics
                <ChevronRight className={cn("w-3 h-3 transition-transform", isTopicOpen && "rotate-90")} />
              </button>

              <AnimatePresence>
                {isTopicOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsTopicOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-72 max-h-[60vh] flex flex-col backdrop-blur-3xl bg-slate-900/95 border border-white/10 rounded-2xl shadow-2xl z-50"
                    >
                      <div className="p-4 border-b border-white/5 space-y-3">
                        <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold flex justify-between items-center">
                          Select Topics
                          {selectedTags.some(t => categorizedTags.general.includes(t)) && (
                            <button 
                              onClick={() => setSelectedTags(prev => prev.filter(t => !categorizedTags.general.includes(t)))}
                              className="text-indigo-400 hover:text-white transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="relative group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                          <input 
                            type="text" 
                            placeholder="Find topics..."
                            autoFocus
                            className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
                            value={topicSearchQuery}
                            onChange={(e) => setTopicSearchQuery(e.target.value)}
                          />
                        </div>
                      </div>
                      
                      <div className="flex-grow overflow-y-auto p-2 grid grid-cols-1 gap-1 custom-scrollbar max-h-80">
                        {categorizedTags.general
                          .filter(tag => tag.toLowerCase().includes(topicSearchQuery.toLowerCase()))
                          .map(tag => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all group",
                                selectedTags.includes(tag)
                                  ? "bg-indigo-600/20 text-indigo-400"
                                  : "text-slate-300 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              <span className="truncate pr-2">{tag}</span>
                              {selectedTags.includes(tag) ? (
                                <Plus className="w-3 h-3 rotate-45 shrink-0" />
                              ) : (
                                <PlusCircle className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-slate-500" />
                              )}
                            </button>
                          ))}
                        {categorizedTags.general.filter(tag => tag.toLowerCase().includes(topicSearchQuery.toLowerCase())).length === 0 && (
                          <div className="py-8 text-center text-[10px] text-slate-600 uppercase tracking-widest">
                            No topics found
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="h-8 w-px bg-white/5 hidden lg:block" />

            <div className="flex-grow flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {selectedTags.length > 0 ? (
                selectedTags.map(tag => (
                  <button 
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-full text-[10px] font-bold whitespace-nowrap group hover:bg-indigo-600/40 transition-colors"
                  >
                    {tag}
                    <X className="w-2.5 h-2.5 group-hover:text-white" />
                  </button>
                ))
              ) : (
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold px-2">No Active Filters</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-white/5">
            <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold hidden xl:block">Curations</div>
            <div className="flex items-center gap-2">
              {favoritesData.favorites.map((fav) => {
                const Icon = {
                  Bookmark,
                  Star,
                  Zap,
                  ListVideo,
                  Sparkles,
                  Clock,
                  Timer,
                  Compass
                }[fav.icon] || Bookmark;

                return (
                  <div key={fav.id} className="relative group/fav">
                    <button
                      onClick={() => addFavoritePlaylist(fav.id)}
                      className="p-2 bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-400 border border-white/10 rounded-xl transition-all"
                      title={`Add ${fav.name} to playlist`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </button>
                    
                    {/* Hover Details */}
                    <div className="absolute right-0 top-full mt-2 w-64 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover/fav:opacity-100 group-hover/fav:translate-y-0 transition-all z-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-[10px] font-bold text-white uppercase tracking-wider">{fav.name}</h4>
                          <p className="text-[9px] text-slate-500 mt-0.5">{fav.description}</p>
                        </div>
                        <Plus className="w-3 h-3 text-theme-accent" />
                      </div>
                      <div className="space-y-1.5">
                        {fav.videoIds.map(vidId => {
                          const v = videos.find(video => video.id === vidId);
                          return v ? (
                            <div key={vidId} className="flex items-center gap-2 text-[9px] text-slate-400">
                              <div className="w-1 h-1 rounded-full bg-theme-accent/50" />
                              <span className="truncate">{v.title}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(selectedTags.length > 0 || (searchQuery && searchQuery !== 'Compassion')) && (
            <button 
              onClick={() => { setSelectedTags([]); setSearchQuery('Compassion'); setTopicSearchQuery(''); }}
              className="text-[10px] text-theme-accent font-bold uppercase tracking-widest hover:text-white transition-colors px-4 border-l border-theme-border"
            >
              Reset All
            </button>
          )}
        </div>

        <div 
          ref={playerRef}
          className={cn(
            "transition-all duration-700 ease-in-out shrink-0 w-full",
            activeVideoId ? "h-auto opacity-100 mb-8" : "h-0 opacity-0 pointer-events-none"
          )}
        >
          <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 max-h-[60vh]">
            {playerInitId && (
              <YouTube
                videoId={playerInitId}
                onEnd={handleNextInPlaylist}
                onReady={onPlayerReady}
                onStateChange={onPlayerStateChange}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 1,
                    mute: 0,
                    controls: 1,
                    modestbranding: 1,
                    rel: 0,
                    enablejsapi: 1,
                  },
                }}
                className="absolute inset-0 w-full h-full"
              />
            )}
          </div>
        </div>

        {/* Info & Browse Section */}
        <div className="flex-grow overflow-y-auto scrollbar-hide pr-2">
          <AnimatePresence mode="wait">
            {activeVideo && (
              <motion.div 
                key={activeVideo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 px-2 group"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="max-w-3xl">
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2 group-hover:text-indigo-400 transition-colors">
                      {activeVideo.title}
                    </h2>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => addToPlaylist(activeVideo)}
                        className="flex items-center gap-2 px-4 py-1.5 bg-theme-accent text-white font-bold text-[10px] rounded-lg hover:bg-theme-accent/80 transition-all shadow-lg shadow-theme-accent/20"
                      >
                        <PlusCircle className="w-3 h-3" />
                        Add to Workspace
                      </button>
                      <div className="flex gap-1.5">
                        {activeVideo.tags.slice(0, 3).map((tag, idx) => (
                          <span key={`${tag}-${idx}`} className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            <AnimatePresence>
              {filteredVideos.map((video) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={video.id}
                  className={cn(
                    "group relative backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col h-fit cursor-pointer transition-all",
                    activeVideoId === video.id ? "ring-1 ring-indigo-500" : "hover:bg-white/10"
                  )}
                  onClick={() => setActiveVideoId(video.id)}
                >
                  <div className="aspect-video bg-slate-900 rounded-xl mb-4 overflow-hidden relative">
                    <img 
                      src={`https://img.youtube.com/vi/${getYoutubeId(video.url)}/mqdefault.jpg`} 
                      alt={video.title}
                      className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    {/* Add to playlist button overlay */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); addToPlaylist(video); }}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/40 sm:bg-white/10 backdrop-blur-md border border-white/30 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-white/20 z-10"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                      <h3 className="font-semibold text-xs text-white mb-1 line-clamp-1 group-hover:text-theme-accent transition-colors">
                    {video.title}
                  </h3>
                    <div className="flex gap-1.5 overflow-hidden whitespace-nowrap">
                      {video.tags.slice(0, 2).map((tag, idx) => (
                        <span key={`${tag}-${idx}`} className="text-[9px] text-slate-400 font-medium">#{tag}</span>
                      ))}
                      <span className="text-[9px] text-slate-600 font-medium">• 4K</span>
                    </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredVideos.length === 0 && (
            <div className="h-64 flex flex-col items-center justify-center text-slate-600 border border-dashed border-white/5 rounded-3xl bg-white/2 backdrop-blur-sm">
              <Search className="w-8 h-8 mb-4 opacity-10" />
              <p className="text-sm">No visuals matching your criteria</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedTags([]); }}
                className="mt-4 text-xs font-bold text-indigo-400 uppercase tracking-widest"
              >
                Reset Search
              </button>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <footer className="mt-auto pt-20 pb-10 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold tracking-widest text-white">A Tiny Bubble of Laughter…</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                Inspired by the teachings of Paramhansa Yogananda, this library is dedicated to sharing the light of spiritual wisdom through film and song.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Resources</h4>
              <ul className="space-y-2">
                <li><a href="https://yogananda.org" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-indigo-500/20 underline-offset-4">Self-Realization Fellowship</a></li>
                <li><a href="https://ananda.org" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-indigo-500/20 underline-offset-4">Ananda Worldwide</a></li>
                <li><a href="https://yoganandaharmony.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-indigo-500/20 underline-offset-4">Yogananda Harmony</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-400">Gift of Giving</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://yogananda.org/gift-of-giving" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-rose-300 transition-colors group">
                    Donate to SRF
                  </a>
                </li>
                <li>
                  <a href="https://yssofindia.org/donate" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-rose-300 transition-colors group">
                    Donate to YSS
                  </a>
                </li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">Spiritual Wisdom</h4>
              <p className="text-xs text-slate-500 italic leading-relaxed">
                "I am a tiny bubble of laughter, I have become the ocean of Laughter Itself."
              </p>
              <div className="flex gap-4 pt-2">
                <Sparkles className="w-4 h-4 text-indigo-500/40" />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
            <div className="text-[9px] text-slate-600 font-medium tracking-widest">
              © {new Date().getFullYear()} A Tiny Bubble of Laughter… • Spiritual Library
            </div>
            <div className="flex gap-6">
              <button className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest">Privacy</button>
              <button className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest">Terms</button>
              <button className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors uppercase tracking-widest font-mono">v2.1.0</button>
            </div>
          </div>
        </footer>
      </main>

      {/* Right Sidebar: Workspace/Playlist */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 h-screen backdrop-blur-2xl bg-white/2 border-l border-white/10 z-20 flex-col p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-sm font-bold uppercase tracking-widest text-theme-text">Workspace</h2>
            <span className="text-[9px] text-theme-accent font-bold uppercase tracking-widest mt-0.5">My Sequence</span>
          </div>
          <div className="flex items-center gap-2">
            {playlist.length > 0 && (
              <button 
                onClick={() => {
                  setPlaylist([]);
                  localStorage.removeItem('laughter_bubble_playlist');
                  localStorage.removeItem('zenstream_playlist');
                }}
                className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Clear Workspace"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {playlist.length > 0 && (
              <button 
                onClick={handleNextInPlaylist}
                className="p-2 bg-theme-accent rounded-lg text-white hover:bg-theme-accent/80 transition-all shadow-lg shadow-theme-accent/20"
                title="Play Sequence"
              >
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
            <div className="p-2 bg-white/5 rounded-lg text-slate-400">
              <ListVideo className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex-grow flex flex-col min-h-0 space-y-2 overflow-y-auto custom-scrollbar pr-1">
          {playlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-white/5 rounded-[2rem] bg-white/2">
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-5 h-5 text-slate-600" />
              </div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-1">Queue is empty</p>
              <p className="text-[9px] text-slate-600 leading-relaxed capitalize">Add clips from the library to build your sequence</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {playlist.map((video, index) => (
                  <motion.div
                    key={`${video.id}-${index}`}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group relative flex items-center gap-3 p-2 rounded-2xl border transition-all cursor-pointer overflow-hidden",
                      activeVideoId === video.id 
                        ? "bg-indigo-600/20 border-indigo-500/50" 
                        : "bg-white/5 border-transparent hover:border-white/10"
                    )}
                    onClick={() => setActiveVideoId(video.id)}
                  >
                    <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-white/5">
                      <img 
                        src={`https://img.youtube.com/vi/${getYoutubeId(video.url)}/default.jpg`} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className={cn(
                        "text-[10px] font-bold truncate leading-tight transition-colors",
                        activeVideoId === video.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                      )}>
                        {video.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[8px] text-slate-600 font-mono uppercase">YTID: {video.id}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromPlaylist(video.id); }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    
                    {activeVideoId === video.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {playlist.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/5 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Items</span>
              <span className="text-xs font-mono font-bold text-indigo-400">{playlist.length}</span>
            </div>
            <button 
              onClick={() => {
                setPlaylist([]);
                localStorage.removeItem('laughter_bubble_playlist');
                localStorage.removeItem('zenstream_playlist');
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-white/10 text-[10px] text-slate-500 font-bold uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Workspace
            </button>
          </div>
        )}
      </aside>

      {/* Playlist Floating Bar */}
      <AnimatePresence>
        {playlist.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl h-16 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl z-40 flex items-center px-4 gap-4"
          >
            <div className="flex -space-x-4 overflow-hidden px-2">
              {playlist.slice(0, 3).map((v, i) => (
                <div 
                  key={v.id} 
                  className={cn(
                    "inline-block h-10 w-10 rounded-lg ring-4 ring-[#020617] flex items-center justify-center text-[10px] font-bold text-white",
                    i === 0 ? "bg-indigo-500" : i === 1 ? "bg-fuchsia-500" : "bg-emerald-500"
                  )}
                >
                  {v.id.substring(0, 2).toUpperCase()}
                </div>
              ))}
              {playlist.length > 3 && (
                <div className="inline-block h-10 w-10 rounded-lg ring-4 ring-[#020617] bg-slate-800 flex items-center justify-center text-[10px] text-slate-400 font-bold">
                  +{playlist.length - 3}
                </div>
              )}
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="flex-1 min-w-0">
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Active Playlist</div>
              <div className="text-xs font-bold truncate text-white">
                {playlist.find(v => v.id === activeVideoId)?.title || "Select video to play"}
              </div>
            </div>
            <button 
              onClick={handleNextInPlaylist}
              className="px-6 py-2 bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg hover:bg-slate-200 transition-all flex items-center gap-2"
            >
              {playlist.findIndex(v => v.id === activeVideoId) === -1 ? "START PLAYING" : "NEXT CLIP"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Raw Data Management Modal */}
      <AnimatePresence>
        {isDataPanelOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-xl"
              onClick={() => setIsDataPanelOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl backdrop-blur-3xl bg-white/5 rounded-[32px] p-8 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Import Library Data</h2>
                  <p className="text-xs text-slate-400">Expand your collective with CSV formatted data.</p>
                </div>
                <button 
                  onClick={() => setIsDataPanelOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative mb-8">
                <textarea 
                  className="w-full h-80 bg-white/5 border border-white/10 rounded-2xl p-6 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-700"
                  placeholder={`1PrQ25KkCdU, "Title Here", https://link.com, Tag1|Tag2`}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                />
                <div className="absolute top-4 right-4 text-[10px] uppercase font-bold text-slate-600">
                  Buffer
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={parseRawData}
                  disabled={!rawInput.trim()}
                  className="flex-grow bg-white text-slate-950 font-bold py-3.5 rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-30 uppercase tracking-widest text-xs"
                >
                  Sync to Collective
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rose & Jasmine Petals Overlay */}
      <AnimatePresence>
        {showPetals && (
          <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
            {[...Array(120)].map((_, i) => {
              const isJasmine = i % 2 === 0;
              const roseColors = [
                'from-rose-500/90 to-rose-300/40', 
                'from-pink-500/80 to-pink-200/30', 
                'from-red-400/70 to-rose-200/20', 
                'from-rose-400/60 to-white/20',
                'from-fuchsia-400/70 to-rose-300/30',
              ];
              const jasmineColors = [
                'from-white to-slate-100/40',
                'from-cream-50 to-white/30',
                'from-emerald-50/20 to-white/20', // Hint of green for the stem base
                'from-amber-50/30 to-white/40',
              ];

              const colorGradient = isJasmine 
                ? jasmineColors[i % jasmineColors.length] 
                : roseColors[i % roseColors.length];

              const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
              const startX = Math.random() * screenWidth;
              const duration = 12 + Math.random() * 18; // Even slower and longer
              const swayAmount = 100 + Math.random() * 250;
              const size = isJasmine ? (12 + Math.random() * 12) : (20 + Math.random() * 20);
              const zIndex = i % 10;
              const blur = zIndex < 3 ? 'blur(1px)' : zIndex > 7 ? 'blur(0.5px)' : 'none';
              
              return (
                <motion.div
                  key={i}
                  initial={{ 
                    y: typeof window !== 'undefined' ? window.innerHeight + 150 : 1200, 
                    x: startX, 
                    rotateX: Math.random() * 360,
                    rotateY: Math.random() * 360,
                    rotateZ: Math.random() * 360,
                    scale: 0.4 + Math.random() * 0.4,
                    opacity: 0,
                    zIndex: zIndex
                  }}
                  animate={{ 
                    y: -250, 
                    x: [
                      startX, 
                      startX + swayAmount, 
                      startX - swayAmount * 0.6, 
                      startX + swayAmount * 0.4,
                      startX - swayAmount * 0.2
                    ],
                    rotateX: [0, 180, 360, 540, 720],
                    rotateY: [0, 90, 180, 270, 360],
                    rotateZ: [0, 45, -45, 90, 0],
                    opacity: [0, 1, 1, 0.8, 0],
                    scale: [0.5, 1.2, 1.1, 0.9, 0.6]
                  }}
                  transition={{ 
                    duration: duration, 
                    ease: "linear",
                    delay: Math.random() * 10,
                    x: {
                      duration: duration,
                      ease: "easeInOut",
                      times: [0, 0.25, 0.5, 0.75, 1]
                    }
                  }}
                  className="absolute left-0 top-0"
                  style={{ filter: blur }}
                >
                  <div 
                    className={cn(
                      "shadow-md bg-gradient-to-br backdrop-blur-[0.5px]", 
                      colorGradient
                    )}
                    style={{ 
                      width: `${size}px`,
                      height: isJasmine ? `${size}px` : `${size * (0.8 + Math.random() * 0.4)}px`,
                      borderRadius: isJasmine 
                        ? "50% 50% 50% 50% / 80% 80% 20% 20%" // More flower-like for jasmine
                        : (i % 3 === 0 
                          ? "60% 40% 70% 30% / 60% 40% 70% 30%" 
                          : i % 3 === 1 
                            ? "50% 50% 10% 80% / 80% 80% 20% 20%"
                            : "100% 0% 100% 0% / 50% 50% 50% 50%"),
                      transform: `rotate(${Math.random() * 180}deg)`,
                      boxShadow: isJasmine 
                        ? '0 2px 8px rgba(0,0,0,0.03)' 
                        : 'inset -2px -2px 6px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Interior Details */}
                    <div className={cn(
                      "absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent pointer-events-none",
                      isJasmine ? "from-yellow-400/20" : "from-white/30"
                    )} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>

      {/* Surprise Message Modal */}
      <AnimatePresence>
        {activeMessage && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setActiveMessage(null)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl text-center group overflow-hidden"
            >
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-fuchsia-500/10 blur-3xl rounded-full" />
              </div>
              
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-6" />
              <p className="text-lg md:text-xl font-medium text-white italic leading-relaxed mb-8">
                "{activeMessage}"
              </p>
              <button
                onClick={() => setActiveMessage(null)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all"
              >
                Deepen Your Peace
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
