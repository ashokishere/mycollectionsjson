import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Shuffle, 
  Repeat, 
  Volume2, 
  VolumeX, 
  Search, 
  PlusCircle, 
  Trash2, 
  Music, 
  Disc, 
  Sparkles, 
  Sliders, 
  ChevronRight, 
  X, 
  ArrowLeft, 
  Tag, 
  User, 
  Info,
  ExternalLink,
  Globe,
  Plus,
  AlertCircle,
  Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import harmoniesData from '../data/harmonies_audio.json';

export interface AudioTrack {
  id: string;
  title: string;
  url: string;
  speaker: string;
  tradition: string;
  category: string;
  description: string;
  isCustom?: boolean;
}

interface AudioPlayerSectionProps {
  onClose: () => void;
}

// Predefined tracks loaded from separate JSON database
const INITIAL_TRACKS: AudioTrack[] = harmoniesData.tracks;

export function getDirectAudioUrl(url: string): string {
  if (!url) return "";
  const trimmedUrl = url.trim();
  
  // Only proxy Google Drive links because they require server-side cookie/warning bypasses.
  // Standard public direct audio URLs (like yoganandaharmony.com) are streamed directly 
  // by the browser to avoid Cloud IP blocks/rate-limiting on shared web hosts.
  const isDrive = trimmedUrl.includes("drive.google.com") || trimmedUrl.includes("docs.google.com");
  if (isDrive) {
    return `/api/audio-proxy?url=${encodeURIComponent(trimmedUrl)}`;
  }
  
  return trimmedUrl;
}

export default function AudioPlayerSection({ onClose }: AudioPlayerSectionProps) {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("All");
  
  // Player states
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isLooping, setIsLooping] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  
  // Custom Track Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newSpeaker, setNewSpeaker] = useState("");
  const [newTradition, setNewTradition] = useState("YSS/SRF");
  const [newCategory, setNewCategory] = useState("Yoganandas Song Sung by Kriyananda");
  const [newDescription, setNewDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and load tracks from localStorage
  useEffect(() => {
    const savedCustom = localStorage.getItem('custom_audios_db');
    let customTracks: AudioTrack[] = [];
    if (savedCustom) {
      try {
        customTracks = JSON.parse(savedCustom);
      } catch (e) {
        console.error("Failed to parse custom_audios_db");
      }
    }
    
    // Auto-cleanup any Google Drive links or "Chrismas/Christmas Meditation/Mediation" titles
    const cleanedCustomTracks = customTracks.filter(track => {
      if (!track || !track.url) return false;
      const isGoogleLink = track.url.includes("drive.google.com") || track.url.includes("docs.google.com");
      const titleLower = (track.title || "").toLowerCase();
      const isChristmasMeditation = 
        titleLower.includes("chrismas") || 
        titleLower.includes("christmas") ||
        titleLower.includes("mediation") ||
        titleLower.includes("meditation");
      return !isGoogleLink && !isChristmasMeditation;
    });

    // If tracks were cleaned up, update local storage
    if (cleanedCustomTracks.length !== customTracks.length) {
      localStorage.setItem('custom_audios_db', JSON.stringify(cleanedCustomTracks));
    }

    // Merge predefined with custom ones
    const allTracks = [...INITIAL_TRACKS];
    cleanedCustomTracks.forEach(customTrack => {
      // Avoid duplicate IDs
      if (!allTracks.some(t => t.id === customTrack.id)) {
        allTracks.push({ ...customTrack, isCustom: true });
      }
    });
    
    setTracks(allTracks);
    
    // Try to restore previous volume
    const savedVolume = localStorage.getItem('audio_player_volume');
    if (savedVolume) {
      const v = parseFloat(savedVolume);
      if (!isNaN(v)) setVolume(v);
    }
  }, []);

  const currentTrack = useMemo(() => {
    if (tracks.length === 0) return null;
    return tracks[currentTrackIndex] || tracks[0];
  }, [tracks, currentTrackIndex]);

  // Handle source changes
  useEffect(() => {
    setPlayError(null);
    if (audioRef.current && currentTrack) {
      const directUrl = getDirectAudioUrl(currentTrack.url);
      audioRef.current.src = directUrl;
      audioRef.current.load();
      audioRef.current.playbackRate = playbackRate;
      
      if (isPlaying) {
        audioRef.current.play().catch(e => {
          console.warn("Autoplay blocked by browser. Click Play to listen.", e);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrack]);

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space to toggle play/pause when not in inputs
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // Audio event bindings
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const onAudioEnded = () => {
    handleNextTrack();
  };

  const onAudioError = (e: any) => {
    const errCode = audioRef.current?.error?.code;
    const errMsg = audioRef.current?.error?.message;
    console.error(`Audio tag error (code: ${errCode}): ${errMsg}`);
    setPlayError("Could not load audio. Please make sure the link is accessible and your network connection is stable.");
    setIsPlaying(false);
  };

  // Player controls
  const togglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.error("Failed to play audio:", err?.message || String(err));
      });
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value;
    }
    if (value > 0) {
      setIsMuted(false);
    }
    localStorage.setItem('audio_player_volume', String(value));
  };

  const toggleMute = () => {
    if (audioRef.current) {
      const targetMute = !isMuted;
      audioRef.current.muted = targetMute;
      setIsMuted(targetMute);
    }
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const playTrack = (index: number) => {
    if (index >= 0 && index < tracks.length) {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  const handleNextTrack = () => {
    if (tracks.length <= 1) {
      // Loop single track if it's the only one
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        if (isPlaying) audioRef.current.play();
      }
      return;
    }

    if (isLooping) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (isShuffled) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      const nextIndex = (currentTrackIndex + 1) % tracks.length;
      setCurrentTrackIndex(nextIndex);
    }
    setIsPlaying(true);
  };

  const handlePrevTrack = () => {
    if (tracks.length <= 1) return;
    
    if (isShuffled) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      setCurrentTrackIndex(randomIndex);
    } else {
      const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
      setCurrentTrackIndex(prevIndex);
    }
    setIsPlaying(true);
  };

  // Filter Categories & Speakers
  const categories = useMemo(() => {
    const cats = new Set(tracks.map(t => t.category));
    return ["All", ...Array.from(cats)];
  }, [tracks]);

  const speakers = useMemo(() => {
    const spks = new Set(tracks.map(t => t.speaker));
    return ["All", ...Array.from(spks)];
  }, [tracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return tracks.filter(t => {
      const matchesSearch = 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.speaker.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.tradition.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "All" || t.category === selectedCategory;
      const matchesSpeaker = selectedSpeaker === "All" || t.speaker === selectedSpeaker;
      
      return matchesSearch && matchesCategory && matchesSpeaker;
    });
  }, [tracks, searchQuery, selectedCategory, selectedSpeaker]);

  // Handle adding custom tracks
  const handleAddTrack = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!newTitle.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!newUrl.trim()) {
      setFormError("Audio URL is required.");
      return;
    }
    if (!newSpeaker.trim()) {
      setFormError("Speaker/Author is required.");
      return;
    }

    const lowerTitle = newTitle.toLowerCase();
    const lowerUrl = newUrl.toLowerCase();
    
    if (lowerUrl.includes("drive.google.com") || lowerUrl.includes("docs.google.com")) {
      setFormError("Google Drive and Google Docs links are not supported due to file-size limits and virus warning screens. Please use direct direct audio URLs (e.g., .mp3 or .m4a files hosted on public sites).");
      return;
    }

    if (lowerTitle.includes("chrismas") || lowerTitle.includes("christmas") || lowerTitle.includes("mediation") || lowerTitle.includes("meditation")) {
      setFormError("Christmas Meditation audio tracks hosted on Google Drive are no longer supported. Please add different tracks using direct direct audio links.");
      return;
    }

    const uniqueId = "custom-audio-" + Date.now();
    const newTrack: AudioTrack = {
      id: uniqueId,
      title: newTitle.trim(),
      url: newUrl.trim(),
      speaker: newSpeaker.trim(),
      tradition: newTradition.trim() || "General",
      category: newCategory.trim() || "Chanting",
      description: newDescription.trim() || "Devotional audio track.",
      isCustom: true
    };

    // Save to State
    const updatedTracks = [...tracks, newTrack];
    setTracks(updatedTracks);

    // Save to LocalStorage
    const customOnly = updatedTracks.filter(t => t.isCustom);
    localStorage.setItem('custom_audios_db', JSON.stringify(customOnly));

    // Reset Form
    setNewTitle("");
    setNewUrl("");
    setNewSpeaker("");
    setNewDescription("");
    setFormSuccess("Audio track successfully added to your list!");
    
    // Auto play the new track
    setTimeout(() => {
      const idx = updatedTracks.findIndex(t => t.id === uniqueId);
      if (idx !== -1) {
        setCurrentTrackIndex(idx);
        setIsPlaying(true);
      }
    }, 500);

    // Auto hide success message
    setTimeout(() => {
      setFormSuccess("");
      setShowAddForm(false);
    }, 3000);
  };

  // Delete custom track
  const handleDeleteTrack = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent playing
    
    const confirmDelete = window.confirm("Are you sure you want to delete this custom audio track?");
    if (!confirmDelete) return;

    const updatedTracks = tracks.filter(t => t.id !== trackId);
    setTracks(updatedTracks);

    const customOnly = updatedTracks.filter(t => t.isCustom);
    localStorage.setItem('custom_audios_db', JSON.stringify(customOnly));

    // If deleting current playing track, reset current track index
    if (currentTrack?.id === trackId) {
      setIsPlaying(false);
      setCurrentTrackIndex(0);
    } else {
      // Adjust index if necessary
      const currentTrackIndexBefore = currentTrackIndex;
      const indexInNew = updatedTracks.findIndex(t => t.id === currentTrack?.id);
      if (indexInNew !== -1) {
        setCurrentTrackIndex(indexInNew);
      } else {
        setCurrentTrackIndex(0);
      }
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="flex flex-col h-full text-slate-100 bg-transparent">
      {/* Invisible HTML5 Audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onAudioEnded}
        onError={onAudioError}
      />

      {/* Header Bar */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all border border-transparent hover:border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-indigo-400" />
              Devotional Audios
            </h2>
            <p className="text-xs text-slate-400">Stream spiritual chants, instructions, and divine discourses</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={cn(
            "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border",
            showAddForm 
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400" 
              : "bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600/20"
          )}
        >
          {showAddForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showAddForm ? "Cancel Add" : "Add Audio Link"}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-grow flex flex-col lg:flex-row gap-6 min-h-0 overflow-y-auto lg:overflow-hidden pb-8">
        
        {/* Left Side: Audio List & Add Form */}
        <div className="w-full lg:w-[400px] flex flex-col shrink-0 min-h-[400px] lg:h-full overflow-y-auto lg:overflow-hidden space-y-4">
          
          {/* Add Custom Audio Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden bg-slate-900/60 border border-white/10 rounded-2xl p-4 shrink-0 shadow-xl"
              >
                <form onSubmit={handleAddTrack} className="space-y-3">
                  <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                    <PlusCircle className="w-3.5 h-3.5" />
                    New Devotional Audio
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Paramahansa Yogananda Cosmic Chant"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Audio URL</label>
                    <input 
                      type="text" 
                      placeholder="https://example.com/audio.mp3"
                      className="w-full bg-slate-950/80 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Speaker</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Swami Kriyananda"
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newSpeaker}
                        onChange={(e) => setNewSpeaker(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Category</label>
                      <select 
                        className="w-full bg-slate-950/80 border border-white/10 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                      >
                        <option value="Yoganandas Song Sung by Kriyananda">Yoganandas Song Sung by Kriyananda</option>
                        <option value="Kriyananda Songs">Kriyananda Songs</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase font-black tracking-wider mb-1">Description</label>
                    <textarea 
                      placeholder="Brief details about this spiritual track..."
                      rows={2}
                      className="w-full bg-slate-950/80 border border-white/10 rounded-lg py-1 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                    />
                  </div>

                  {formError && (
                    <div className="text-[10px] text-rose-400 font-semibold bg-rose-950/30 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                      {formError}
                    </div>
                  )}

                  {formSuccess && (
                    <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/30 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                      {formSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                  >
                    Add Audio Track
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search and Filters Block */}
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-4 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search audios, speakers..."
                className="w-full bg-slate-950/60 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Category selection */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => {
                const isYogananda = cat === "Yoganandas Song Sung by Kriyananda";
                const isKriyananda = cat === "Kriyananda Songs";
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-full text-[9px] font-bold tracking-wider transition-all border flex items-center gap-1.5",
                      selectedCategory === cat 
                        ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400" 
                        : "bg-white/5 border-transparent text-slate-400 hover:text-white"
                    )}
                  >
                    {isYogananda && <Flame className="w-3 h-3 text-amber-400 shrink-0" />}
                    {isKriyananda && <Music className="w-3 h-3 text-sky-400 shrink-0" />}
                    {cat === "All" && <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />}
                    {!isYogananda && !isKriyananda && cat !== "All" && <Disc className="w-3 h-3 shrink-0" />}
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Track List Container */}
          <div className="flex-grow overflow-y-auto pr-1 scrollbar-thin space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
              Available Recordings ({filteredTracks.length})
            </div>

            {filteredTracks.length === 0 ? (
              <div className="text-center py-10 bg-slate-900/10 border border-dashed border-white/5 rounded-2xl">
                <Music className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <div className="text-xs text-slate-500 font-semibold">No recordings match search</div>
              </div>
            ) : (
              filteredTracks.map((track) => {
                const globalIndex = tracks.findIndex(t => t.id === track.id);
                const isActive = currentTrack?.id === track.id;
                const isYoganandaTrack = track.category === "Yoganandas Song Sung by Kriyananda";
                
                return (
                  <div
                    key={track.id}
                    onClick={() => playTrack(globalIndex)}
                    className={cn(
                      "group relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer",
                      isActive 
                        ? "bg-indigo-600/10 border-indigo-500/30" 
                        : "bg-slate-900/20 border-white/5 hover:bg-slate-900/40 hover:border-white/10"
                    )}
                  >
                    {/* Animated sound equalizer bar when playing */}
                    <div className="mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center bg-slate-950/50 border border-white/5">
                      {isActive && isPlaying ? (
                        <div className="flex items-end gap-0.5 h-3">
                          <span className="w-0.5 bg-indigo-400 animate-[pulse_1s_infinite_100ms] h-full" />
                          <span className="w-0.5 bg-indigo-400 animate-[pulse_0.8s_infinite_200ms] h-2/3" />
                          <span className="w-0.5 bg-indigo-400 animate-[pulse_1.2s_infinite_300ms] h-5/6" />
                        </div>
                      ) : isYoganandaTrack ? (
                        <Flame className={cn("w-3.5 h-3.5", isActive ? "text-amber-400" : "text-amber-400/60 group-hover:text-amber-400")} />
                      ) : (
                        <Music className={cn("w-3.5 h-3.5", isActive ? "text-indigo-400" : "text-sky-400/60 group-hover:text-sky-400")} />
                      )}
                    </div>

                    <div className="flex-grow min-w-0">
                      <div className={cn(
                        "text-xs font-bold truncate leading-tight",
                        isActive ? "text-indigo-400" : "text-slate-200 group-hover:text-white"
                      )}>
                        {track.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-0.5">
                          <User className="w-2.5 h-2.5 text-slate-500" />
                          {track.speaker}
                        </span>
                        <span className="text-slate-600">•</span>
                        <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          {track.category}
                        </span>
                      </div>
                    </div>

                    {/* Delete button for custom ones */}
                    {track.isCustom && (
                      <button
                        onClick={(e) => handleDeleteTrack(track.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition-all ml-1 shrink-0"
                        title="Delete custom track"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Giant Player Interface */}
        <div className="flex-grow flex flex-col h-full min-w-0">
          
          {currentTrack ? (
            <div className="flex-grow flex flex-col bg-slate-900/30 border border-white/5 rounded-3xl p-6 lg:p-8 justify-between relative overflow-hidden h-full">
              
              {/* Background gradient blur */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

              {/* Playback Error Warning */}
              {playError && (
                <div className="absolute top-4 left-4 right-4 bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-2xl text-xs text-rose-300 font-medium leading-relaxed shadow-lg flex gap-2.5 text-left z-30 animate-pulse">
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-200">Playback Failed</p>
                    <p className="text-[11px] opacity-90">{playError}</p>
                  </div>
                </div>
              )}

              {/* Top Meta info */}
              <div className="flex flex-col items-center text-center mt-4 z-10 space-y-4">
                
                {/* Visual Disk / Spinning Wheel */}
                <div className="relative w-44 h-44 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/5 rounded-full border border-white/5 shadow-2xl scale-105" />
                  
                  {/* Glowing halo when playing */}
                  {isPlaying && (
                    <div className="absolute inset-2 bg-indigo-500/5 rounded-full animate-ping opacity-60" />
                  )}

                  {/* Glassmorphic Central Disc */}
                  <motion.div 
                    animate={isPlaying ? { rotate: 360 } : {}}
                    transition={isPlaying ? { repeat: Infinity, duration: 12, ease: "linear" } : {}}
                    className={cn(
                      "w-36 h-36 rounded-full border border-white/10 bg-slate-950/60 backdrop-blur-md flex items-center justify-center shadow-inner relative z-10",
                      isPlaying && "shadow-[0_0_25px_rgba(99,102,241,0.2)]"
                    )}
                  >
                    {/* Concentric rings to look like a sacred chakra or vinyl */}
                    <div className="absolute inset-3 border border-dashed border-white/5 rounded-full" />
                    <div className="absolute inset-6 border border-white/5 rounded-full" />
                    <div className="absolute inset-10 border border-dashed border-white/5 rounded-full" />
                    <div className="absolute inset-14 border border-white/5 rounded-full" />
                    
                    <Disc className={cn(
                      "w-12 h-12 transition-colors duration-500",
                      isPlaying ? "text-indigo-400 animate-pulse" : "text-slate-500"
                    )} />
                  </motion.div>
                </div>

                <div className="max-w-xl space-y-1.5">
                  <span className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold uppercase text-[9px] px-2.5 py-0.5 rounded-full tracking-widest">
                    <Sparkles className="w-2.5 h-2.5" />
                    {currentTrack.tradition} • {currentTrack.category}
                  </span>
                  <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-white leading-tight">
                    {currentTrack.title}
                  </h3>
                  <div className="text-sm font-semibold text-slate-300 flex items-center justify-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    {currentTrack.speaker}
                  </div>
                </div>

                {/* Description Box */}
                <div className="max-w-md bg-white/5 border border-white/5 p-3 rounded-2xl text-[11px] text-slate-400 font-medium leading-relaxed shadow-sm flex gap-2 text-left">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    {currentTrack.description}
                  </div>
                </div>
              </div>

              {/* Player control controls & progress */}
              <div className="w-full z-10 space-y-5 mt-8 max-w-2xl mx-auto">
                
                {/* Custom Seek Progress Slider */}
                <div className="space-y-1">
                  <div className="relative group">
                    <input 
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={currentTime}
                      onChange={(e) => handleSeek(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 hover:h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Core buttons */}
                <div className="flex items-center justify-between gap-4">
                  {/* Loop & Shuffle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsLooping(!isLooping)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all border border-transparent",
                        isLooping 
                          ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                      title="Loop Current"
                    >
                      <Repeat className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsShuffled(!isShuffled)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all border border-transparent",
                        isShuffled 
                          ? "bg-indigo-600/10 text-indigo-400 border-indigo-500/20" 
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                      title="Shuffle Queue"
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playing core buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevTrack}
                      className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/5"
                      title="Previous Track"
                    >
                      <SkipBack className="w-4 h-4 fill-current" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-full transition-all shadow-xl shadow-indigo-600/20 hover:scale-105 active:scale-95 flex items-center justify-center border border-indigo-400/20"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 fill-current translate-x-0.5" />
                      )}
                    </button>

                    <button
                      onClick={handleNextTrack}
                      className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/5"
                      title="Next Track"
                    >
                      <SkipForward className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Speed Playback Rate Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/5 px-2.5 py-1 rounded-xl shrink-0">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      className="bg-transparent text-[10px] text-slate-200 font-bold uppercase tracking-wider focus:outline-none cursor-pointer"
                      value={playbackRate}
                      onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    >
                      <option value="0.75" className="bg-slate-900 text-white">0.75x</option>
                      <option value="1.0" className="bg-slate-900 text-white">1.0x (Normal)</option>
                      <option value="1.25" className="bg-slate-900 text-white">1.25x</option>
                      <option value="1.5" className="bg-slate-900 text-white">1.5x</option>
                      <option value="2.0" className="bg-slate-900 text-white">2.0x</option>
                    </select>
                  </div>
                </div>

                {/* Volume bar & next up label */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs text-slate-400">
                  {/* Volume Control */}
                  <div className="flex items-center gap-2.5 w-full sm:w-48">
                    <button 
                      onClick={toggleMute}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-indigo-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input 
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    />
                  </div>

                  {/* Next Up Info */}
                  <div className="flex items-center gap-1.5 truncate max-w-xs font-medium">
                    <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black shrink-0">Next Up:</span>
                    <span className="text-[11px] text-slate-300 truncate">
                      {tracks[(currentTrackIndex + 1) % tracks.length]?.title || "None"}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-grow flex items-center justify-center border border-dashed border-white/5 rounded-3xl p-8 bg-slate-900/10">
              <div className="text-center">
                <Music className="w-12 h-12 text-slate-600 mx-auto mb-3 opacity-50" />
                <div className="text-sm text-slate-400 font-bold">Select a recording to start playing</div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
