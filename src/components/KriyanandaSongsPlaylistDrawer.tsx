import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Play,
  Plus,
  Check,
  Trash2,
  ChevronLeft,
  ListMusic,
  Flame,
  Sun,
  Heart,
  Compass,
  Music,
  Disc,
  Volume2,
  Sparkles,
  Shield,
  Droplet,
  Activity,
  Timer,
  Bookmark,
  Smile,
  Zap
} from 'lucide-react';
import { type Video } from '../data/videos';
import devotionalAlbums from '../data/devotional_albums.json';
import { cn } from '../lib/utils';

interface TrackItem {
  id: string;
  title: string;
  desc?: string;
  icon?: string;
  tags?: string[];
}

interface KriyanandaAlbum {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  icon: string;
  tracks: TrackItem[];
}

interface KriyanandaSongsPlaylistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  videos: Video[];
  activeVideoId: string | null;
  onSelectVideo: (videoId: string) => void;
  playlist: Video[];
  onTogglePlaylistItem: (video: Video) => void;
  onPlaySequence: (videosToPlay: Video[], mode: 'replace' | 'append') => void;
  triggerPetals?: () => void;
}

export const KriyanandaSongsPlaylistDrawer: React.FC<KriyanandaSongsPlaylistDrawerProps> = ({
  isOpen,
  onClose,
  videos,
  activeVideoId,
  onSelectVideo,
  playlist,
  onTogglePlaylistItem,
  onPlaySequence,
  triggerPetals
}) => {
  // 5 Dedicated Swamy Kriyananda Albums from data
  const rawAlbums = useMemo(() => {
    return devotionalAlbums.filter(a => 
      (a as any).artist === 'Swami Kriyananda' || a.id.startsWith('kriyananda-')
    );
  }, []);

  // Built list including "All Songs" anthology option at the top
  const albumList = useMemo<KriyanandaAlbum[]>(() => {
    const allTracks: TrackItem[] = [];
    const seen = new Set<string>();

    rawAlbums.forEach(album => {
      if (album.tracks && Array.isArray(album.tracks)) {
        album.tracks.forEach(track => {
          if (!seen.has(track.id)) {
            seen.add(track.id);
            allTracks.push(track as TrackItem);
          }
        });
      }
    });

    const allAnthologyAlbum: KriyanandaAlbum = {
      id: 'kriyananda-all-songs',
      name: 'All Songs Anthology',
      description: 'Complete collection of 75 devotional songs, chants, and melodies by Swami Kriyananda.',
      accentColor: 'amber',
      icon: 'ListMusic',
      tracks: allTracks
    };

    const formattedIndividualAlbums: KriyanandaAlbum[] = rawAlbums.map(a => ({
      id: a.id,
      name: a.name,
      description: a.description || 'Sacred devotional melodies and chants by Swami Kriyananda.',
      accentColor: a.accentColor || 'amber',
      icon: a.icon || 'Music',
      tracks: (a.tracks || []) as TrackItem[]
    }));

    return [allAnthologyAlbum, ...formattedIndividualAlbums];
  }, [rawAlbums]);

  const [activeAlbumId, setActiveAlbumId] = useState<string>('kriyananda-all-songs');
  const [mobileAlbumView, setMobileAlbumView] = useState<'list' | 'tracks'>('list');

  // Reset mobile view to list whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      setMobileAlbumView('list');
    }
  }, [isOpen]);

  const activeAlbum = useMemo(() => {
    return albumList.find(a => a.id === activeAlbumId) || albumList[0];
  }, [albumList, activeAlbumId]);

  const getTrackAsVideo = (track: TrackItem, albumName: string): Video => {
    const found = videos.find(v => v.id === track.id);
    if (found) return found;
    return {
      id: track.id,
      title: track.title,
      url: `https://www.youtube.com/watch?v=${track.id}`,
      tags: track.tags || ['Swami Kriyananda', 'Devotional Album', albumName]
    };
  };

  const handlePlayFresh = () => {
    if (!activeAlbum || !activeAlbum.tracks.length) return;
    const seq = activeAlbum.tracks.map(t => getTrackAsVideo(t, activeAlbum.name));
    onPlaySequence(seq, 'replace');
    onClose();
    triggerPetals?.();
  };

  const handleQueueAlbum = () => {
    if (!activeAlbum || !activeAlbum.tracks.length) return;
    const seq = activeAlbum.tracks.map(t => getTrackAsVideo(t, activeAlbum.name));
    onPlaySequence(seq, 'append');
    triggerPetals?.();
  };

  if (!isOpen) return null;

  // Visual accents matching activeAlbum.accentColor (consistent with Instrumental Albums)
  let accentText = "text-amber-400 group-hover:text-amber-300";
  let bgAccent = "bg-amber-600 hover:bg-amber-500 text-slate-950";
  let ringColor = "group-hover:border-amber-500/40";

  if (activeAlbum.accentColor === "rose") {
    accentText = "text-rose-400 group-hover:text-rose-300";
    bgAccent = "bg-rose-600 hover:bg-rose-500 text-white";
    ringColor = "group-hover:border-rose-500/40";
  } else if (activeAlbum.accentColor === "indigo") {
    accentText = "text-indigo-400 group-hover:text-indigo-300";
    bgAccent = "bg-indigo-600 hover:bg-indigo-500 text-white";
    ringColor = "group-hover:border-indigo-500/40";
  } else if (activeAlbum.accentColor === "cyan") {
    accentText = "text-cyan-400 group-hover:text-cyan-300";
    bgAccent = "bg-cyan-600 hover:bg-cyan-500 text-white";
    ringColor = "group-hover:border-cyan-500/40";
  } else if (activeAlbum.accentColor === "emerald") {
    accentText = "text-emerald-400 group-hover:text-emerald-300";
    bgAccent = "bg-emerald-600 hover:bg-emerald-500 text-white";
    ringColor = "group-hover:border-emerald-500/40";
  } else if (activeAlbum.accentColor === "yellow") {
    accentText = "text-yellow-400 group-hover:text-yellow-300";
    bgAccent = "bg-yellow-600 hover:bg-yellow-500 text-slate-950";
    ringColor = "group-hover:border-yellow-500/40";
  } else if (activeAlbum.accentColor === "fuchsia") {
    accentText = "text-fuchsia-400 group-hover:text-fuchsia-300";
    bgAccent = "bg-fuchsia-600 hover:bg-fuchsia-500 text-white";
    ringColor = "group-hover:border-fuchsia-500/40";
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[55] bg-black/20" onClick={onClose} />
      <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="fixed right-20 top-1/2 -translate-y-1/2 md:w-[680px] w-[350px] max-w-[calc(100vw-120px)] h-[80vh] backdrop-blur-3xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/40">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Swamy Kriyananda Albums</h3>
            <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Devotional Chants, Melodies &amp; Soul Songs</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Master-Detail Combined Content */}
        <div className="flex-grow flex overflow-hidden">
          
          {/* Left Master List: Albums index */}
          <div className={cn(
            "md:w-60 md:border-r border-white/10 flex flex-col shrink-0 overflow-y-auto custom-scrollbar bg-black/10 p-2 gap-1.5 select-none",
            mobileAlbumView === 'tracks' ? "hidden md:flex" : "flex w-full"
          )}>
            <div className="p-2 mb-0.5 hidden md:block">
              <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">Select Album</span>
            </div>
            {albumList.map((album) => {
              const AlbumIcon = {
                Heart,
                Music,
                Compass,
                Sun,
                Flame,
                Smile,
                Sparkles,
                Volume2,
                Disc,
                ListMusic
              }[album.icon] || Music;
              const isActive = activeAlbumId === album.id;
              const trackCount = album.tracks?.length || 0;

              let activeColors = "bg-amber-500/20 text-amber-400 border-amber-500/30";
              if (album.accentColor === "rose") activeColors = "bg-rose-500/20 text-rose-400 border-rose-500/30";
              else if (album.accentColor === "indigo") activeColors = "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
              else if (album.accentColor === "cyan") activeColors = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
              else if (album.accentColor === "emerald") activeColors = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              else if (album.accentColor === "yellow") activeColors = "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
              else if (album.accentColor === "fuchsia") activeColors = "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30";

              return (
                <button
                  key={album.id}
                  onClick={() => {
                    setActiveAlbumId(album.id);
                    setMobileAlbumView('tracks');
                  }}
                  className={cn(
                    "flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border group/item w-full cursor-pointer",
                    isActive 
                      ? activeColors
                      : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <AlbumIcon className={cn("w-3.5 h-3.5 shrink-0 transition-transform group-hover/item:scale-110", isActive ? "" : "text-slate-400")} />
                    <span className="truncate">{album.name}</span>
                  </div>
                  <span className={cn(
                    "text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-1.5",
                    isActive 
                      ? "bg-white/15 text-current" 
                      : "bg-white/5 text-slate-500 group-hover/item:text-slate-300 group-hover/item:bg-white/10"
                  )}>
                    {trackCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right Detail Panel: Album tracks */}
          <div className={cn(
            "flex-grow flex flex-col min-w-0 overflow-hidden",
            mobileAlbumView === 'list' ? "hidden md:flex" : "flex"
          )}>
            {/* On Mobile: Back to listing navigation */}
            {mobileAlbumView === 'tracks' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-black/20 border-b border-white/5 md:hidden shrink-0">
                <button 
                  onClick={() => setMobileAlbumView('list')}
                  className="flex items-center gap-1 text-[9px] font-bold text-amber-400 uppercase tracking-widest py-1 px-2 hover:bg-white/5 rounded-lg transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back to Albums
                </button>
              </div>
            )}

            {/* Album Detail Scroll Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {/* Album Header Card */}
              <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-center shrink-0">
                <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-1", accentText)}>
                  {activeAlbum.name}
                </h4>
                <p className="text-[10px] text-slate-400 leading-relaxed italic mb-3 font-medium">
                  &ldquo;{activeAlbum.description}&rdquo;
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePlayFresh}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                      bgAccent
                    )}
                    title="Start fresh with this album"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Play Fresh ({activeAlbum.tracks?.length || 0})
                  </button>
                  <button
                    onClick={handleQueueAlbum}
                    className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-[10px] font-bold text-white uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
                    title="Queue album to workspace"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Queue
                  </button>
                </div>
              </div>

              {/* Tracks List */}
              <div className="space-y-1.5 pb-4">
                {activeAlbum.tracks.map((track) => {
                  const TrackIcon = {
                    Flame,
                    Sun,
                    Sparkles,
                    Shield,
                    Droplet,
                    Compass,
                    Music,
                    Activity,
                    Timer,
                    Bookmark,
                    Smile,
                    Heart,
                    Zap,
                    Volume2,
                    Disc,
                    ListMusic
                  }[track.icon || 'Music'] || Music;
                  const isInPlaylist = playlist.some(p => p.id === track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => {
                        onSelectVideo(track.id);
                        onClose();
                        triggerPetals?.();
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-left cursor-pointer group hover:border-white/20",
                        activeVideoId === track.id && "bg-white/10 border-white/20",
                        ringColor
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-grow">
                        <div className="w-8.5 h-8.5 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <TrackIcon className={cn("w-4 h-4 transition-transform group-hover:scale-110", accentText)} />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate mb-0.5 group-hover:text-amber-300 transition-colors">
                            {track.title}
                          </p>
                          <p className="text-[9px] text-slate-500 line-clamp-1">
                            {track.desc || 'Devotional chant by Swami Kriyananda.'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const videoObj = getTrackAsVideo(track, activeAlbum.name);
                          onTogglePlaylistItem(videoObj);
                        }}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200 cursor-pointer",
                          isInPlaylist 
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-red-500/20 hover:border-red-500/55 hover:text-red-400" 
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                        )}
                        title={isInPlaylist ? "Remove from Workspace" : "Add to Workspace"}
                      >
                        {isInPlaylist ? (
                          <>
                            <Check className="w-3.5 h-3.5 group-hover:hidden" />
                            <Trash2 className="w-3.5 h-3.5 hidden group-hover:block text-rose-400" />
                          </>
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

      </motion.div>
    </AnimatePresence>
  );
};

export default KriyanandaSongsPlaylistDrawer;
