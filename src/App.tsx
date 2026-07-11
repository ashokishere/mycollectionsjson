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
  ChevronUp,
  ChevronDown,
  X,
  PlusCircle,
  History,
  ListVideo,
  Sparkles,
  Bookmark,
  Star,
  Zap,
  Info,
  Clock,
  Timer,
  Compass,
  Heart,
  Flame,
  Sun,
  Music,
  Activity,
  Droplet,
  Smile,
  Shield,
  Check,
  CheckSquare,
  BookOpen,
  Map,
  GripVertical,
  Volume2,
  Download,
  Calendar,
  Upload,
  Lock,
  Unlock,
  Settings,
  AlertCircle,
  Database
} from 'lucide-react';
import { initialVideos, type Video } from './data/videos';
import messagesData from './data/messages.json';
import favoritesData from './data/favorite_playlists.json';
import devotionalAlbums from './data/devotional_albums.json';
import instrumentalAlbums from './data/instrumental_albums.json';
import calendarData from './data/india_365_day_calendar_2026_with_saints_merged.json';
import { cn } from './lib/utils';
import TranscriptReader from './components/TranscriptReader';

const LOTUS_IMAGE_URL = "https://images.unsplash.com/photo-1542631221-396af3702505?q=80&w=600&auto=format&fit=crop";

const getProxiedImageUrl = (url?: string): string => {
  if (!url) return LOTUS_IMAGE_URL;
  if (url.includes('upload.wikimedia.org') || url.includes('wikimedia') || url.includes('wikipedia')) {
    let filename = url.substring(url.lastIndexOf('/') + 1);
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }
    const resolvedUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}`;
    return `https://wsrv.nl/?url=${encodeURIComponent(resolvedUrl)}&w=400&fit=cover`;
  }
  return url;
};

// Static Pilgrim Tour data
const VIRTUAL_TOURS: Video[] = [
  {
    id: "tour-international-headquarters",
    title: "International Headquarters Virtual Tour",
    url: "https://virtual-tours.yogananda.org/convocation/international-headquarters/?_gl=1*1buvibn*_ga*MTUyMTEyNTIwMC4xNzc0NzI0NTY0*_ga_W6LR31323D*czE3ODA0NTczNzAkbzEyJGcxJHQxNzgwNDU3NDY0JGo1NyRsMCRoMA..",
    tags: ["Virtual Pilgrimage Tours", "Pilgrimage", "SRF", "Mount Washington"]
  },
  {
    id: "tour-srf-lake-shrine",
    title: "SRF Lake Shrine Virtual Tour",
    url: "https://virtual-tours.yogananda.org/convocation/srf-lake-shrine/?_gl=1*4jm8cl*_ga*MTUyMTEyNTIwMC4xNzc0NzI0NTY0*_ga_W6LR31323D*czE3ODA0NTczNzAkbzEyJGcxJHQxNzgwNDU3NDY5JGo1MiRsMCRoMA..",
    tags: ["Virtual Pilgrimage Tours", "Pilgrimage", "SRF", "Lake Shrine"]
  },
  {
    id: "tour-hollywood-temple",
    title: "Hollywood Temple Virtual Tour",
    url: "https://virtual-tours.yogananda.org/convocation/hollywood-temple/?_gl=1*1l14o66*_ga*MTUyMTEyNTIwMC4xNzc0NzI0NTY0*_ga_W6LR31323D*czE3ODA0NTczNzAkbzEyJGcxJHQxNzgwNDU3NTQ5JGo2MCRsMCRoMA..",
    tags: ["Virtual Pilgrimage Tours", "Pilgrimage", "SRF", "Hollywood"]
  },
  {
    id: "tour-encinitas-hermitage",
    title: "Encinitas Hermitage Virtual Tour",
    url: "https://virtual-tours.yogananda.org/convocation/encinitas-hermitage/?_gl=1*1k3oe5y*_ga*MTUyMTEyNTIwMC4xNzc0NzI0NTY0*_ga_W6LR31323D*czE3ODA0NTczNzAkbzEyJGcxJHQxNzgwNDU3NTY5JGowMCRsMCRoMA..",
    tags: ["Virtual Pilgrimage Tours", "Pilgrimage", "SRF", "Encinitas"]
  }
];

// Static Affirmations data
const AFFIRMATIONS_TOURS: Video[] = [
  {
    id: "1hEhGN4PVo4",
    title: "“I Give You My Soul Call” | A Guided Meditation",
    url: "https://www.youtube.com/shorts/1hEhGN4PVo4",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "AR2ErMaUXwQ",
    title: "Stillness: Basic Principle of Meditation",
    url: "https://www.youtube.com/shorts/AR2ErMaUXwQ",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "RfPTtczIcX0",
    title: "Guided Meditation on Peace",
    url: "https://www.youtube.com/shorts/RfPTtczIcX0",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "WUhOL9qUBXg",
    title: "Guided Affirmation on Psychological Success",
    url: "https://www.youtube.com/shorts/WUhOL9qUBXg",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "CHdjOkUbBNs",
    title: "“The Cosmic Sphere of Love” | An Affirmation by Paramahansa Yogananda",
    url: "https://www.youtube.com/shorts/CHdjOkUbBNs",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "F69o_9IMbmA",
    title: "Cultivating Gratitude in Daily Life",
    url: "https://www.youtube.com/shorts/F69o_9IMbmA",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "GZ2zgmN52WI",
    title: "A Simple Technique to Overcome Fear",
    url: "https://www.youtube.com/shorts/GZ2zgmN52WI",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "6fGRQiTzMHY",
    title: "Guided Affirmation on Living Fearlessly",
    url: "https://www.youtube.com/shorts/6fGRQiTzMHY",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "-kwNgpLEwr0",
    title: "Yogananda Said: God Is Already Yours",
    url: "https://www.youtube.com/shorts/-kwNgpLEwr0",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "aSbehuyZc2g",
    title: "Divine Power of Materializing Our Thoughts",
    url: "https://www.youtube.com/shorts/aSbehuyZc2g",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "_g84PpyH0EY",
    title: "Guided Meditation on Expanding Love",
    url: "https://www.youtube.com/shorts/_g84PpyH0EY",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "nBAoVX9hcKg",
    title: "Guided Affirmation on Inner Peace",
    url: "https://www.youtube.com/shorts/nBAoVX9hcKg",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "zviwboz_WkQ",
    title: "Change Your Life by Whispering to God",
    url: "https://www.youtube.com/shorts/zviwboz_WkQ",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "7KpZ3zQKIAQ",
    title: "“The Eternal Life of God” | An Affirmation by Paramahansa Yogananda",
    url: "https://www.youtube.com/shorts/7KpZ3zQKIAQ",
    tags: ["Affirmations", "Shorts"]
  },
  {
    id: "-Mxf7alEQjw",
    title: "Overcoming Fear With Divine Vibrations | Brother Chidananda",
    url: "https://www.youtube.com/watch?v=-Mxf7alEQjw",
    tags: ["Affirmations", "With Coach", "Shorts"]
  }
];

// Static Spiritual Wisdom teachings data
const WISDOM_TEACHINGS: Video[] = [
  {
    id: "v6WX4LXOyZU",
    title: "Paramahansa Yogananda on the Dream-Nature of the World",
    url: "https://www.youtube.com/watch?v=v6WX4LXOyZU",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "aHPNZdAFLdA",
    title: "Paramahansa Yogananda on Kriya Yoga — The Greatest Proof of God",
    url: "https://www.youtube.com/watch?v=aHPNZdAFLdA",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "7MuoGZ0yx20",
    title: "Paramahansa Yogananda on Kriya Yoga — The Key to Heaven",
    url: "https://www.youtube.com/watch?v=7MuoGZ0yx20",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "ZXPdmWX8VB4",
    title: "Paramahansa Yogananda on Thinking of Nothing But God for One Day",
    url: "https://www.youtube.com/watch?v=ZXPdmWX8VB4",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "l2KMm9mxTFo",
    title: "Paramahansa Yogananda on Finding Happiness Within",
    url: "https://www.youtube.com/watch?v=l2KMm9mxTFo",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "NShLqqJNBKQ",
    title: "Paramahansa Yogananda on Karma",
    url: "https://www.youtube.com/watch?v=NShLqqJNBKQ",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "rdc5khxI0Hw",
    title: "Paramahansa Yogananda on How to Destroy Suffering by Its Roots",
    url: "https://www.youtube.com/watch?v=rdc5khxI0Hw",
    tags: ["Wisdom", "Teachings"]
  },
  {
    id: "krd41uFL2s4",
    title: "Paramahansa Yogananda on Loving God",
    url: "https://www.youtube.com/watch?v=krd41uFL2s4",
    tags: ["Wisdom", "Teachings"]
  }
];

// Helper to extract YouTube ID from URL
const getYoutubeId = (urlPath: string) => {
  const url = urlPath.trim();
  if (url.length === 11 && !url.includes('/') && !url.includes('.') && !url.includes(':')) return url;
  
  // Support YouTube Shorts: extract the segment right after "/shorts/"
  const shortsIndex = url.indexOf('/shorts/');
  if (shortsIndex !== -1) {
    const startIdx = shortsIndex + 8;
    const segments = url.substring(startIdx).split(/[\?\#\&]/);
    const potentialId = segments[0];
    if (potentialId.length === 11) {
      return potentialId;
    }
  }

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

// Unified function to get high-fidelity thumbnails
const getVideoThumbnail = (video: Video) => {
  if (video.id.startsWith('tour-') || !getYoutubeId(video.url)) {
    if (video.id.includes('headquarters')) {
      return "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=320&auto=format&fit=crop&q=60";
    } else if (video.id.includes('lake-shrine')) {
      return "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=320&auto=format&fit=crop&q=60";
    } else if (video.id.includes('hollywood')) {
      return "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=320&auto=format&fit=crop&q=60";
    } else if (video.id.includes('encinitas')) {
      return "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=320&auto=format&fit=crop&q=60";
    }
    return "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=320&auto=format&fit=crop&q=60";
  }
  const yid = getYoutubeId(video.url);
  return `https://img.youtube.com/vi/${yid}/mqdefault.jpg`;
};

export default function App() {
  const [videos, setVideos] = useState<Video[]>(() => {
    // Generate Video objects for devotional albums' tracks dynamically
    const albumTracks: Video[] = [];
    devotionalAlbums.forEach(album => {
      if (album.tracks && Array.isArray(album.tracks)) {
        album.tracks.forEach(track => {
          albumTracks.push({
            id: track.id,
            title: track.title,
            url: `https://www.youtube.com/watch?v=${track.id}`,
            tags: ["Devotional Chants", "Spiritual Album", album.name]
          });
        });
      }
    });

    // Generate Video objects for instrumental albums' tracks dynamically
    const instrumentalTracks: Video[] = [];
    instrumentalAlbums.forEach(album => {
      if (album.tracks && Array.isArray(album.tracks)) {
        album.tracks.forEach(track => {
          instrumentalTracks.push({
            id: track.id,
            title: track.title,
            url: `https://www.youtube.com/watch?v=${track.id}`,
            tags: ["Instrumental", "Spiritual Album", album.name]
          });
        });
      }
    });

    const savedVideosStr = localStorage.getItem('custom_videos_db');
    let baseVideos = initialVideos;
    if (savedVideosStr) {
      try {
        const parsed = JSON.parse(savedVideosStr);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseVideos = parsed;
        }
      } catch (e) {
        console.error("Failed to parse custom_videos_db from localStorage");
      }
    }

    const all = [...VIRTUAL_TOURS, ...AFFIRMATIONS_TOURS, ...WISDOM_TEACHINGS, ...albumTracks, ...instrumentalTracks, ...baseVideos];
    const seen = new Set<string>();
    return all.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
  });
  const [isVirtualToursOpen, setIsVirtualToursOpen] = useState(false);
  const [isAffirmationsOpen, setIsAffirmationsOpen] = useState(false);
  const [isWisdomOpen, setIsWisdomOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('Compassion');
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [playerInitId, setPlayerInitId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<Video[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDataPanelOpen, setIsDataPanelOpen] = useState(false);
  const [isTopicOpen, setIsTopicOpen] = useState(false);
  const [topicSearchQuery, setTopicSearchQuery] = useState('');
  const [rawInput, setRawInput] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [showPetals, setShowPetals] = useState(false);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>(() => localStorage.getItem('app_theme') || 'default');
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isOceanLoveOpen, setIsOceanLoveOpen] = useState(false);
  const [activeAlbumId, setActiveAlbumId] = useState<string>("ocean-of-love");
  const [mobileAlbumView, setMobileAlbumView] = useState<'list' | 'tracks'>('list');
  
  const [isInstrumentalOpen, setIsInstrumentalOpen] = useState(false);
  const [activeInstrumentalAlbumId, setActiveInstrumentalAlbumId] = useState<string>("instrumental-the-divine-gypsy");
  const [mobileInstrumentalAlbumView, setMobileInstrumentalAlbumView] = useState<'list' | 'tracks'>('list');
  
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Admin Area State
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [isStaticMode, setIsStaticMode] = useState(false);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [holyDaySaints, setHolyDaySaints] = useState<any[]>([]);
  const [isHolyDayPopupOpen, setIsHolyDayPopupOpen] = useState(false);
  const [calendarSearchQuery, setCalendarSearchQuery] = useState('');
  const [testDateStr, setTestDateStr] = useState<string>(''); // Simulated date 'YYYY-MM-DD'

  // Helper to match saints on a specific date (matching MM-DD)
  const getSaintsForDate = useCallback((dateObj: Date) => {
    const currentMonth = dateObj.getMonth() + 1; // 1-indexed
    const currentDay = dateObj.getDate();

    return (calendarData.saints_list || []).filter((saint: any) => {
      // 1. Check if direct date matches (MM-DD)
      if (saint.date) {
        const parts = saint.date.split('-');
        if (parts.length === 3) {
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (m === currentMonth && d === currentDay) return true;
        }
      }

      // 2. Check if birth_date matches (MM-DD)
      if (saint.birth_date && saint.birth_date !== 'various') {
        const parts = saint.birth_date.split(' / ');
        for (const part of parts) {
          const dParts = part.split('-');
          if (dParts.length === 3) {
            const m = parseInt(dParts[1], 10);
            const d = parseInt(dParts[2], 10);
            if (m === currentMonth && d === currentDay) return true;
          }
        }
      }

      // 3. Check if death_date matches (MM-DD)
      if (saint.death_date && saint.death_date !== 'various') {
        const parts = saint.death_date.split(' / ');
        for (const part of parts) {
          const dParts = part.split('-');
          if (dParts.length === 3) {
            const m = parseInt(dParts[1], 10);
            const d = parseInt(dParts[2], 10);
            if (m === currentMonth && d === currentDay) return true;
          }
        }
      }

      return false;
    });
  }, []);

  // Check for today's Holy Day Saints on mount
  useEffect(() => {
    const matches = getSaintsForDate(new Date());
    if (matches.length > 0) {
      setHolyDaySaints(matches);
      setIsHolyDayPopupOpen(true);
    }
  }, [getSaintsForDate]);

  // Handle manual simulated date triggers
  const handleSimulateDate = useCallback((dateString: string) => {
    if (!dateString) return;
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      const testDate = new Date(year, month, day);
      
      const matches = getSaintsForDate(testDate);
      if (matches.length > 0) {
        setHolyDaySaints(matches);
        setIsHolyDayPopupOpen(true);
      }
    }
  }, [getSaintsForDate]);

  // Find videos in database related to a saint
  const findRelatedVideosForSaint = useCallback((saint: any) => {
    if (!saint) return [];
    const nameLower = saint.name.toLowerCase();
    const traditionLower = (saint.tradition || '').toLowerCase();
    
    const searchName = nameLower
      .replace(/\s*\(.*?\)\s*/g, '')
      .replace('swami ', '')
      .replace('paramahansa ', '')
      .replace('sri ', '')
      .trim();

    return videos.filter((v: Video) => {
      const titleLower = v.title.toLowerCase();
      const tagsLower = (v.tags || []).join(' ').toLowerCase();
      
      return (
        titleLower.includes(searchName) ||
        tagsLower.includes(searchName) ||
        titleLower.includes(traditionLower) ||
        tagsLower.includes(traditionLower)
      );
    });
  }, [videos]);

  // Reset mobile album view to main listing when opening albums drawer
  useEffect(() => {
    if (isOceanLoveOpen) {
      setMobileAlbumView('list');
    }
  }, [isOceanLoveOpen]);

  useEffect(() => {
    if (isInstrumentalOpen) {
      setMobileInstrumentalAlbumView('list');
    }
  }, [isInstrumentalOpen]);
  const [isFloatingControlsVisible, setIsFloatingControlsVisible] = useState(true);
  const [visibleCount, setVisibleCount] = useState(24);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  // Reset pagination on search or tag modifications to keep browser snappy
  useEffect(() => {
    setVisibleCount(24);
  }, [searchQuery, selectedTags]);

  // Prefetch list of available transcripts on app startup for instant load
  useEffect(() => {
    const prefetchAvailable = async () => {
      if ((window as any).__cachedAvailableIds) return;
      try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}transcripts/available.json`);
        if (response.ok) {
          const ids = await response.json();
          if (Array.isArray(ids)) {
            (window as any).__cachedAvailableIds = ids;
          }
        }
      } catch (err) {
        // Silent error for optional prefetch
      }
    };
    prefetchAvailable();
  }, []);

  // Prefetch the active video's transcript in the background so it loads instantly when clicked!
  useEffect(() => {
    if (!activeVideoId) return;

    const prefetchTranscript = async () => {
      if (!(window as any).__transcriptCache) {
        (window as any).__transcriptCache = {};
      }
      const cache = (window as any).__transcriptCache;
      if (cache[activeVideoId]) return;

      try {
        const response = await fetch(`${import.meta.env.BASE_URL || '/'}transcripts/${activeVideoId}.json`);
        if (response.ok) {
          const data = await response.json();
          cache[activeVideoId] = data;
        }
      } catch (err) {
        // Silent error for optional prefetch
      }
    };

    prefetchTranscript();
  }, [activeVideoId]);

  const petalConfigs = useMemo(() => {
    if (!showPetals) return [];
    // We target around 35 petals - which creates a beautiful, lush overlay without killing mobile GPUs
    const count = 35;
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
    return Array.from({ length: count }).map((_, i) => {
      const isJasmine = i % 2 === 0;
      const startX = Math.random() * screenWidth;
      const duration = 12 + Math.random() * 18;
      const swayAmount = 100 + Math.random() * 220;
      const size = isJasmine ? (12 + Math.random() * 10) : (18 + Math.random() * 15);
      const zIndex = i % 10;
      const blur = zIndex < 3 ? 'blur(1px)' : zIndex > 7 ? 'blur(0.5px)' : 'none';
      const delay = Math.random() * 8;
      const initialY = screenHeight + 150;
      const initialRotateX = Math.random() * 360;
      const initialRotateY = Math.random() * 360;
      const initialRotateZ = Math.random() * 360;
      
      return {
        id: i,
        isJasmine,
        startX,
        duration,
        swayAmount,
        size,
        zIndex,
        blur,
        delay,
        initialY,
        initialRotateX,
        initialRotateY,
        initialRotateZ,
      };
    });
  }, [showPetals]);

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

  const addAlbumSequence = (albumId: string) => {
    let album: any = devotionalAlbums.find(a => a.id === albumId);
    if (!album) {
      album = instrumentalAlbums.find((a: any) => a.id === albumId);
    }
    if (!album) return;

    const orderedVideos: Video[] = [];
    album.tracks.forEach((track: any) => {
      const found = videos.find(v => v.id === track.id);
      if (found) {
        orderedVideos.push(found);
      }
    });

    setPlaylist(prev => {
      const newItems = orderedVideos.filter(v => !prev.some(p => p.id === v.id));
      const updated = [...prev, ...newItems];
      localStorage.setItem('laughter_bubble_playlist', JSON.stringify(updated));
      return updated;
    });
    
    triggerPetals();
  };

  const addAlbumSingleVideo = (videoId: string) => {
    let found = videos.find(v => v.id === videoId);
    if (!found) {
      // Look up and construct Video from devotionalAlbums as secondary fallback
      for (const album of devotionalAlbums) {
        const track = album.tracks.find((t: any) => t.id === videoId);
        if (track) {
          found = {
            id: track.id,
            title: track.title,
            url: `https://www.youtube.com/watch?v=${track.id}`,
            tags: ["Devotional Chants", "Spiritual Album", album.name]
          };
          break;
        }
      }
    }
    if (!found) {
      // Look up and construct Video from instrumentalAlbums as tertiary fallback
      for (const album of instrumentalAlbums) {
        const track: any = album.tracks.find((t: any) => t.id === videoId);
        if (track) {
          found = {
            id: track.id,
            title: track.title,
            url: `https://www.youtube.com/watch?v=${track.id}`,
            tags: ["Instrumental", "Spiritual Album", album.name]
          };
          break;
        }
      }
    }
    if (!found) return;

    setPlaylist(prev => {
      if (prev.some(p => p.id === videoId)) return prev;
      const updated = [...prev, found];
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

  // Load playlist from local storage & admin auth state
  useEffect(() => {
    const saved = localStorage.getItem('laughter_bubble_playlist') || localStorage.getItem('zenstream_playlist');
    if (saved) {
      try {
        setPlaylist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved playlist');
      }
    }

    if (localStorage.getItem('admin_auth_token') === 'true') {
      setIsAdminAuthenticated(true);
    }
    
    // Fetch live-updated catalog from server
    fetchLiveVideos();
    fetchRemoteData();
  }, []);

  // Helper to update active database state and local backups
  const applyNewCustomVideos = (customVideos: Video[]) => {
    localStorage.setItem('custom_videos_db', JSON.stringify(customVideos));

    const albumTracks: Video[] = [];
    devotionalAlbums.forEach(album => {
      if (album.tracks && Array.isArray(album.tracks)) {
        album.tracks.forEach(track => {
          albumTracks.push({
            id: track.id,
            title: track.title,
            url: `https://www.youtube.com/watch?v=${track.id}`,
            tags: ["Devotional Chants", "Spiritual Album", album.name]
          });
        });
      }
    });

    const instrumentalTracks: Video[] = [];
    instrumentalAlbums.forEach(album => {
      if (album.tracks && Array.isArray(album.tracks)) {
        album.tracks.forEach(track => {
          instrumentalTracks.push({
            id: track.id,
            title: track.title,
            url: `https://www.youtube.com/watch?v=${track.id}`,
            tags: ["Instrumental", "Spiritual Album", album.name]
          });
        });
      }
    });

    const all = [...VIRTUAL_TOURS, ...AFFIRMATIONS_TOURS, ...WISDOM_TEACHINGS, ...albumTracks, ...instrumentalTracks, ...customVideos];
    const seen = new Set<string>();
    const filtered = all.filter(v => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });
    setVideos(filtered);
  };

  // Custom client-side CSV parser to handle quotes, commas, and newlines safely
  const parseClientCSV = (content: string): string[][] => {
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentCell = "";
    let insideQuotes = false;
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = content[i + 1];
      
      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip next quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentLine.push(currentCell);
        currentCell = "";
      } else if ((char === "\r" || char === "\n") && !insideQuotes) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        currentLine.push(currentCell);
        lines.push(currentLine);
        currentLine = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    if (currentCell || currentLine.length > 0) {
      currentLine.push(currentCell);
      lines.push(currentLine);
    }
    return lines;
  };

  const processCsvData = (parsedRows: string[][]): Video[] => {
    if (parsedRows.length === 0) {
      throw new Error("CSV file is empty");
    }

    // Header detection
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(parsedRows.length, 20); i++) {
      const row = parsedRows[i];
      if (row && row.length >= 2) {
        const hasKeys = row.some(cell => {
          const c = String(cell || "").toLowerCase();
          return c === "videoid" || c === "id" || c.includes("video") || c.includes("title") || c.includes("url") || c.includes("link") || c.includes("topic");
        });
        if (hasKeys) {
          headerRowIndex = i;
          break;
        }
      }
    }

    const headerRow = parsedRows[headerRowIndex];
    let idIdx = 0, titleIdx = 1, urlIdx = 2, tagsIdx = 3;

    if (headerRow) {
      headerRow.forEach((cell, idx) => {
        const c = String(cell || "").toLowerCase();
        if (c === "videoid" || c === "id" || c.includes("video id") || c === "video") idIdx = idx;
        else if (c.includes("title")) titleIdx = idx;
        else if (c.includes("url") || c.includes("link") || c.includes("youtube")) urlIdx = idx;
        else if (c.includes("tag") || c.includes("theme") || c.includes("category") || c.includes("topic")) tagsIdx = idx;
      });
    }

    const videoMap: Record<string, Video> = {};

    parsedRows.forEach((row, rowIndex) => {
      if (rowIndex <= headerRowIndex) return;
      if (!row || row.length < 2) return;
      
      const id = String(row[idIdx] || "").trim();
      if (!id || id.toLowerCase() === "id" || id.toLowerCase() === "videoid" || id === "#NAME?" || id === "#REF!" || id === "#VALUE!") return;
      
      const title = String(row[titleIdx] || "").trim().replace(/‚Äú|‚Äù/g, '"').replace(/‚Äò|‚Äô/g, "'").replace(/‚Äî/g, "—");
      const url = String(row[urlIdx] || "").trim();
      if (!url) return;
      
      const rawTagsString = String(row[tagsIdx] || "");
      const rawTags = rawTagsString.split(/[|,;]/).map(t => t.trim()).filter(t => t !== "");
      
      const normalizedTags = Array.from(new Set(rawTags.map(t => {
        const lower = t.toLowerCase();
        if (lower === "engilish" || lower === "english") return "English";
        if (lower === "hindi") return "Hindi";
        if (lower === "tamil") return "Tamil";
        if (lower === "bengali") return "Bengali";
        if (lower === "telugu") return "Telugu";
        if (lower === "nepali") return "Nepali";
        if (lower.includes("autobigraphy") || lower.includes("yoig")) return "Autobiography of a Yogi";
        return t;
      })));

      videoMap[id] = { id, title, url, tags: normalizedTags };
    });

    return Object.values(videoMap);
  };

  const exportActiveCsv = () => {
    // Filter out non-custom pre-bundled videos to get the clean Database.csv
    const customOnly = videos.filter(v => {
      const isVirtual = VIRTUAL_TOURS.some(vt => vt.id === v.id);
      const isAffirmation = AFFIRMATIONS_TOURS.some(at => at.id === v.id);
      const isWisdom = WISDOM_TEACHINGS.some(wt => wt.id === v.id);
      const isAlbum = v.tags?.includes("Spiritual Album") || v.tags?.includes("Devotional Chants");
      return !isVirtual && !isAffirmation && !isWisdom && !isAlbum;
    });

    const headers = ["VideoID", "Title", "URL", "Topic"];
    const csvRows = [headers.join(",")];

    customOnly.forEach(v => {
      const id = v.id;
      const title = v.title;
      const url = v.url;
      const tagsStr = v.tags ? v.tags.join(" | ") : "";

      const row = [id, title, url, tagsStr].map(val => {
        const s = String(val || "");
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      });
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Database.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fetch real-time live videos list from Express server
  const fetchLiveVideos = async () => {
    try {
      const res = await fetch(`/api/videos?t=${Date.now()}`);
      const contentType = res.headers.get('content-type');
      if (res.ok && contentType && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          applyNewCustomVideos(data);
          setIsStaticMode(false);
          return true;
        }
      } else {
        setIsStaticMode(true);
      }
    } catch (err) {
      console.error("Express server offline, switching to Static Mode (localStorage backup):", err);
      setIsStaticMode(true);
    }

    // Static mode fallback
    const saved = localStorage.getItem('custom_videos_db');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (Array.isArray(data) && data.length > 0) {
          applyNewCustomVideos(data);
          return true;
        }
      } catch (e) {
        console.error("Failed to parse custom_videos_db from local backup");
      }
    }
    return false;
  };

  const verifyAdminPasscode = async () => {
    setAdminError(null);
    const trimmedPasscode = adminPasscode.trim();

    // 1. Local offline verification check for static environments (GitHub Pages)
    if (isStaticMode || trimmedPasscode === 'sadhana' || trimmedPasscode === 'yogananda2026') {
      if (trimmedPasscode === 'sadhana' || trimmedPasscode === 'yogananda2026') {
        setIsAdminAuthenticated(true);
        localStorage.setItem('admin_auth_token', 'true');
        setAdminPasscode('');
        return;
      }
    }

    // 2. Otherwise try Express server verify endpoint
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: adminPasscode })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdminAuthenticated(true);
        localStorage.setItem('admin_auth_token', 'true');
        setAdminPasscode('');
      } else {
        setAdminError(data.message || 'Invalid Admin Passcode');
      }
    } catch (err) {
      if (trimmedPasscode === 'sadhana' || trimmedPasscode === 'yogananda2026') {
        setIsAdminAuthenticated(true);
        localStorage.setItem('admin_auth_token', 'true');
        setAdminPasscode('');
        setIsStaticMode(true);
      } else {
        setAdminError('Server communication error');
      }
    }
  };

  const handleDatabaseUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'csv' | 'xlsx') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setAdminError(null);
    setUploadSuccess(null);
    setUploadProgress(`Processing and syncing ${file.name}...`);

    // If running in static/offline mode or CSV upload, we handle entirely client-side
    if (isStaticMode || type === 'csv') {
      if (type === 'xlsx') {
        setAdminError("Notice: For static/offline mode (GitHub Pages), please convert your Excel sheet to CSV (File > Save As > CSV) and upload it here. CSV is 100% supported in-browser!");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }

      try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const text = e.target?.result;
          if (typeof text !== 'string') {
            setAdminError("Failed to read file contents");
            setIsUploading(false);
            setUploadProgress(null);
            return;
          }

          try {
            const parsedRows = parseClientCSV(text);
            const customVideos = processCsvData(parsedRows);
            
            if (customVideos.length === 0) {
              setAdminError("No valid video records found in CSV file.");
            } else {
              applyNewCustomVideos(customVideos);
              setUploadSuccess(`Success! Synced ${customVideos.length} videos from CSV into browser database storage.`);
            }
          } catch (parseErr: any) {
            setAdminError(`Parsing error: ${parseErr?.message || parseErr}`);
          } finally {
            setIsUploading(false);
            setUploadProgress(null);
          }
        };

        reader.onerror = () => {
          setAdminError("File reading failed");
          setIsUploading(false);
          setUploadProgress(null);
        };

        reader.readAsText(file);
        return;
      } catch (err) {
        setAdminError("Client side parsing error");
        setIsUploading(false);
        setUploadProgress(null);
        return;
      }
    }

    // Server-Side Sync
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/admin/upload/${type}`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadSuccess(data.message || 'Database updated successfully!');
        setUploadProgress(null);
        await fetchLiveVideos();
      } else {
        setAdminError(data.error || 'Failed to update database');
        setUploadProgress(null);
      }
    } catch (err) {
      setAdminError('Network error during upload');
      setUploadProgress(null);
    } finally {
      setIsUploading(false);
    }
  };

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

  const visibleVideos = useMemo(() => {
    return filteredVideos.slice(0, visibleCount);
  }, [filteredVideos, visibleCount]);

  const activeVideo = useMemo(() => {
    return (videos.find(v => v.id === activeVideoId) || playlist.find(v => v.id === activeVideoId)) || null;
  }, [videos, playlist, activeVideoId]);

  const nonQueuedFilteredCount = useMemo(() => {
    return filteredVideos.filter(v => !playlist.some(p => p.id === v.id)).length;
  }, [filteredVideos, playlist]);

  const addAllFilteredToPlaylist = () => {
    const toAdd = filteredVideos.filter(v => !playlist.some(p => p.id === v.id));
    if (toAdd.length === 0) return;
    
    setPlaylist(prev => {
      const newList = [...prev, ...toAdd];
      if (prev.length === 0 && newList.length > 0 && !activeVideoId) {
        setActiveVideoId(newList[0].id);
        triggerPetals();
      }
      return newList;
    });
  };

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

  const addAllAffirmationsToPlaylist = () => {
    setPlaylist(prev => {
      const updated = [...prev];
      let addedAny = false;
      AFFIRMATIONS_TOURS.forEach(video => {
        if (!updated.some(v => v.id === video.id)) {
          updated.push(video);
          addedAny = true;
        }
      });
      return updated;
    });
  };

  const addAllPilgrimagesToPlaylist = () => {
    setPlaylist(prev => {
      const updated = [...prev];
      let addedAny = false;
      VIRTUAL_TOURS.forEach(video => {
        if (!updated.some(v => v.id === video.id)) {
          updated.push(video);
          addedAny = true;
        }
      });
      return updated;
    });
  };

  const addAllWisdomToPlaylist = () => {
    setPlaylist(prev => {
      const updated = [...prev];
      let addedAny = false;
      WISDOM_TEACHINGS.forEach(video => {
        if (!updated.some(v => v.id === video.id)) {
          updated.push(video);
          addedAny = true;
        }
      });
      return updated;
    });
  };

  const movePlaylistItem = (index: number, direction: 'up' | 'down') => {
    setPlaylist(prev => {
      const updated = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= updated.length) return prev;
      
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      
      localStorage.setItem('laughter_bubble_playlist', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    setPlaylist(prev => {
      const updated = [...prev];
      const [movedItem] = updated.splice(draggedIndex, 1);
      updated.splice(index, 0, movedItem);
      localStorage.setItem('laughter_bubble_playlist', JSON.stringify(updated));
      return updated;
    });
    setDraggedIndex(null);
    setDragOverIndex(null);
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
    (window as any).__ytPlayer = event.target;
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
    <div className="min-h-screen font-sans flex flex-col md:flex-row overflow-hidden text-theme-text">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-theme-bg">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-theme-accent/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[120px] opacity-30" />
      </div>

      {/* Sidebar/Navigation (Mobile: Bottom, Desktop: Left) */}
      <aside className={cn(
        "w-full md:w-80 flex-shrink-0 h-auto md:h-screen backdrop-blur-2xl bg-theme-surface border-r border-theme-border z-20 flex flex-col p-6 transition-all duration-300",
        isReaderOpen && "hidden md:hidden pointer-events-none"
      )}>
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
                { id: 'default', color: 'bg-[#020617]', bgValue: '#020617', label: 'D' },
                { id: 'golden', color: 'bg-[#2d1e05]', bgValue: '#2d1e05', label: 'G' },
                { id: 'white', color: 'bg-white', bgValue: '#ffffff', label: 'W' },
                { id: 'sky', color: 'bg-[#082f49]', bgValue: '#082f49', label: 'S' },
                { id: 'opal', color: 'bg-[#064e3b]', bgValue: '#064e3b', label: 'O' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTheme(t.id)}
                  className={cn(
                    "w-full h-7 rounded-lg flex items-center justify-center text-[8.5px] font-bold transition-all",
                    currentTheme === t.id 
                      ? "ring-2 ring-theme-accent ring-offset-2 ring-offset-theme-bg scale-95" 
                      : "hover:scale-105 opacity-80 hover:opacity-100"
                  )}
                  style={{ backgroundColor: t.bgValue }}
                  title={t.id === 'white' ? 'White Theme' : `${t.id.charAt(0).toUpperCase() + t.id.slice(1)} Theme`}
                >
                  <div 
                    className={cn(
                      "w-full h-full rounded-lg flex items-center justify-center border transition-all", 
                      t.id === 'white' 
                        ? "border-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.2)] bg-gradient-to-b from-white to-amber-50/50" 
                        : "border-theme-border/30",
                      t.color
                    )}
                  >
                    <span 
                      className={cn(
                        "font-extrabold text-[9px] tracking-wide",
                        t.id === 'white' ? "theme-toggle-btn-label-white font-black" : "theme-toggle-btn-label"
                      )}
                    >
                      {t.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {lastSynced && (
              <div className="text-[8px] text-slate-500 font-mono tracking-wider ml-1">
                Last updated: {lastSynced}
              </div>
            )}

            {/* View Switcher Tabs */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => setIsReaderOpen(false)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                  !isReaderOpen 
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-lg" 
                    : "bg-white/5 border-transparent text-slate-400 hover:text-white"
                )}
              >
                <Play className="w-3 h-3 fill-current shrink-0" />
                Visuals
              </button>
              <button
                onClick={() => setIsReaderOpen(true)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border",
                  isReaderOpen 
                    ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400 shadow-lg" 
                    : "bg-white/5 border-transparent text-slate-400 hover:text-white"
                )}
              >
                <BookOpen className="w-3 h-3 shrink-0" />
                Readings
              </button>
            </div>
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
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-h-0 bg-transparent z-10 p-4 sm:p-8 overflow-y-auto custom-scrollbar">
        {isReaderOpen ? (
          <TranscriptReader
            videos={videos}
            activeVideoId={activeVideoId}
            setActiveVideoId={setActiveVideoId}
            onClose={() => setIsReaderOpen(false)}
          />
        ) : (
          <>
            {/* Top Filter Bar */}
        <div className="sticky top-0 flex flex-col lg:flex-row lg:items-center gap-4 mb-8 bg-theme-bg/80 backdrop-blur-xl p-4 z-30 rounded-2xl border border-theme-border shrink-0 shadow-xl">
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
            <div className="flex items-center gap-3 pl-4 border-l border-theme-border flex-wrap sm:flex-nowrap">
              {nonQueuedFilteredCount > 0 ? (
                <button
                  onClick={addAllFilteredToPlaylist}
                  className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest hover:text-emerald-300 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                  title="Add all matching visuals to playlist"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  Select All ({nonQueuedFilteredCount})
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1.5 whitespace-nowrap">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  All Added
                </span>
              )}
              <button 
                onClick={() => { setSelectedTags([]); setSearchQuery('Compassion'); setTopicSearchQuery(''); }}
                className="text-[10px] text-theme-accent font-bold uppercase tracking-widest hover:text-white transition-colors pl-4 border-l border-theme-border whitespace-nowrap"
              >
                Reset All
              </button>
            </div>
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
            {activeVideo && (activeVideo.id.startsWith('tour-') || !getYoutubeId(activeVideo.url)) ? (
              <iframe
                src={activeVideo.url}
                title={activeVideo.title}
                className="absolute inset-0 w-full h-full border-0 bg-slate-950"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : playerInitId ? (
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
            ) : null}
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
                      <button 
                        onClick={() => {
                          setActiveVideoId(activeVideo.id);
                          setIsReaderOpen(true);
                        }}
                        className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500 hover:border-indigo-500 text-indigo-400 hover:text-white font-bold text-[10px] rounded-lg transition-all shadow-md cursor-pointer"
                        title="Read transcript/material for this video"
                      >
                        <BookOpen className="w-3 h-3" />
                        Read Transcript
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

          {/* Filter Status & Select All bar */}
          {(selectedTags.length > 0 || (searchQuery && searchQuery.trim().toLowerCase() !== 'compassion')) && filteredVideos.length > 0 && (
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 px-5 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-md gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">
                  {filteredVideos.length} Visual{filteredVideos.length === 1 ? '' : 's'} Match {selectedTags.length > 0 ? 'Selected Filters' : 'Search Query'}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {nonQueuedFilteredCount > 0 ? (
                  <button
                    onClick={addAllFilteredToPlaylist}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white font-bold text-[10px] rounded-xl transition-all shadow-lg active:scale-[0.98]"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    Select All / Add {nonQueuedFilteredCount} to Playlist
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 px-4 py-1.5 bg-white/5 text-slate-500 font-bold text-[10px] rounded-xl border border-white/5">
                    <Check className="w-3.5 h-3.5" />
                    All {filteredVideos.length} Added to Workspace
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Video Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
            <AnimatePresence>
              {visibleVideos.map((video) => (
                <motion.div
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
                      src={getVideoThumbnail(video)} 
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
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex gap-1.5 overflow-hidden whitespace-nowrap">
                        {video.tags.slice(0, 2).map((tag, idx) => (
                          <span key={`${tag}-${idx}`} className="text-[9px] text-slate-400 font-medium">#{tag}</span>
                        ))}
                        <span className="text-[9px] text-slate-600 font-medium">• 4K</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideoId(video.id);
                          setIsReaderOpen(true);
                        }}
                        className="px-2 py-0.5 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/20 text-indigo-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
                        title="Read transcript/material for this video"
                      >
                        <BookOpen className="w-2.5 h-2.5" />
                        Read
                      </button>
                    </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredVideos.length > visibleCount && (
            <div className="flex justify-center -mt-12 mb-24 pb-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 24)}
                className="px-8 py-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:border-white/20 flex items-center gap-2 shadow-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                Load More Visuals
              </button>
            </div>
          )}

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
                "A tiny bubble of laughter, I am become the Sea of Mirth Itself!"
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
          </>
        )}
      </main>

      {/* Right Sidebar: Workspace/Playlist */}
      <aside className={cn(
        "hidden lg:flex w-72 flex-shrink-0 h-screen backdrop-blur-2xl bg-white/2 border-l border-white/10 z-20 flex-col p-6 overflow-hidden transition-all duration-300",
        isReaderOpen && "lg:hidden pointer-events-none"
      )}>
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
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, index)}
                    onDragOver={(e: any) => handleDragOver(e, index)}
                    onDragEnd={() => handleDragEnd()}
                    onDrop={(e: any) => handleDrop(e, index)}
                    className={cn(
                      "group relative flex items-center gap-2 p-2 rounded-2xl border transition-all cursor-grab active:cursor-grabbing overflow-hidden",
                      activeVideoId === video.id 
                        ? "bg-indigo-600/20 border-indigo-500/50" 
                        : "bg-white/5 border-transparent hover:border-white/10",
                      draggedIndex === index && "opacity-40 border-dashed border-indigo-500/40 bg-slate-900/50 scale-[0.97]",
                      dragOverIndex === index && draggedIndex !== index && "border-indigo-400/80 bg-indigo-500/10 scale-[1.02] shadow-lg shadow-indigo-500/5"
                    )}
                    onClick={() => setActiveVideoId(video.id)}
                  >
                    <div className="flex items-center justify-center p-0.5" title="Drag to reorder">
                      <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                    <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900 border border-white/5">
                      <img 
                        src={getVideoThumbnail(video)} 
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
                    <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        disabled={index === 0}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePlaylistItem(index, 'up');
                        }}
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-all",
                          index === 0 && "opacity-10 pointer-events-none"
                        )}
                        title="Move Up"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        disabled={index === playlist.length - 1}
                        onClick={(e) => {
                          e.stopPropagation();
                          movePlaylistItem(index, 'down');
                        }}
                        className={cn(
                          "w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-all",
                          index === playlist.length - 1 && "opacity-10 pointer-events-none"
                        )}
                        title="Move Down"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveVideoId(video.id);
                          setIsReaderOpen(true);
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-450 hover:bg-white/5 transition-all cursor-pointer"
                        title="Read Transcript / Text"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromPlaylist(video.id); }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
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
        {playlist.length > 0 && !isReaderOpen && (
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
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setPlaylist([]);
                  setActiveVideoId(null);
                  localStorage.removeItem('laughter_bubble_playlist');
                  localStorage.removeItem('zenstream_playlist');
                }}
                className="p-2.5 bg-white/5 border border-white/10 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                title="Clear Workspace"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextInPlaylist}
                className="px-6 py-2 bg-white text-slate-900 rounded-xl text-xs font-black shadow-lg hover:bg-slate-200 transition-all flex items-center gap-2 whitespace-nowrap"
              >
                {playlist.findIndex(v => v.id === activeVideoId) === -1 ? "START PLAYING" : "NEXT CLIP"}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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

      {/* Admin Control Center Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/90 backdrop-blur-xl"
              onClick={() => setIsAdminModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-2xl backdrop-blur-3xl bg-slate-900/85 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-left"
            >
              <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black uppercase tracking-wider text-white">Admin Control Center</h2>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">Database Master Interface</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdminModalOpen(false)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-white" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto custom-scrollbar space-y-6 pr-1">
                {!isAdminAuthenticated ? (
                  /* PASSWORD SCREEN */
                  <div className="py-8 max-w-sm mx-auto text-center space-y-6">
                    <div className="w-16 h-16 bg-slate-850 border border-white/10 rounded-2xl flex items-center justify-center mx-auto shadow-inner text-slate-400">
                      <Lock className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Authorization Required</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Please provide the admin passcode to unlock the file database manager.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="relative">
                        <input 
                          type="password"
                          placeholder="Passcode"
                          value={adminPasscode}
                          onChange={(e) => setAdminPasscode(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') verifyAdminPasscode();
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-center text-sm tracking-widest text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                        />
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      </div>

                      {adminError && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs justify-center font-semibold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{adminError}</span>
                        </div>
                      )}

                      <button
                        onClick={verifyAdminPasscode}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                      >
                        Authorize Console
                      </button>
                    </div>
                  </div>
                ) : (
                  /* CONTROL AREA */
                  <div className="space-y-6">
                    {/* SYSTEM STATE ALERT */}
                    {isStaticMode ? (
                      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3.5 items-start">
                        <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
                          <Check className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 text-left">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">Static Fallback Mode Enabled</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            All spreadsheet edits and database updates are processed 100% in-browser. Your custom video library is saved securely in your browser's Local Storage (perfect for GitHub Pages)!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3.5 items-start">
                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                          <Unlock className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5 text-left">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">Full-Stack Server Mode Enabled</h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Connected to the Express server filesystem. Spreadsheet uploads are written directly to the server database for persistent, shared, team-wide usage.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* TWO COLUMN GRID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* DOWNLOAD & BACKUP BLOCK */}
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                          <Download className="w-4 h-4 text-sky-400" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Database Backups</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal text-left">
                          Download templates or backup your live custom library directly.
                        </p>

                        <div className="space-y-2.5 pt-2">
                          {isStaticMode ? (
                            <button 
                              onClick={exportActiveCsv}
                              className="w-full flex items-center justify-between p-3 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-200 hover:text-white transition-all text-xs font-semibold cursor-pointer group"
                            >
                              <span className="flex items-center gap-2.5">
                                <span className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg group-hover:scale-105 transition-transform font-mono text-[9px] font-black uppercase">EXPORT</span>
                                Backup Custom CSV
                              </span>
                              <Download className="w-3.5 h-3.5 text-indigo-400" />
                            </button>
                          ) : (
                            <>
                              <a 
                                href="/api/admin/download/xlsx" 
                                download="Database.xlsx"
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-white/5 hover:border-sky-500/20 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer group"
                              >
                                <span className="flex items-center gap-2.5">
                                  <span className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg group-hover:scale-105 transition-transform font-mono text-[9px] font-black uppercase">XLSX</span>
                                  Database.xlsx
                                </span>
                                <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                              </a>

                              <a 
                                href="/api/admin/download/csv" 
                                download="Database.csv"
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 hover:bg-slate-950 border border-white/5 hover:border-emerald-500/20 text-slate-300 hover:text-white transition-all text-xs font-semibold cursor-pointer group"
                              >
                                <span className="flex items-center gap-2.5">
                                  <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:scale-105 transition-transform font-mono text-[9px] font-black uppercase">CSV</span>
                                  Database.csv
                                </span>
                                <Download className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                              </a>
                            </>
                          )}

                          {/* Fallback Static Template Links always accessible */}
                          <div className="pt-2 border-t border-white/5 space-y-1.5">
                            <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 text-left">Default Templates:</span>
                            <div className="flex gap-2">
                              <a 
                                href="/Database.csv" 
                                download="Database_Template.csv"
                                className="flex-1 text-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] text-slate-400 hover:text-white transition-colors"
                              >
                                Template.csv
                              </a>
                              <a 
                                href="/Database.xlsx" 
                                download="Database_Template.xlsx"
                                className="flex-1 text-center py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] text-slate-400 hover:text-white transition-colors"
                              >
                                Template.xlsx
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* UPLOAD BLOCK */}
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-4">
                        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                          <Upload className="w-4 h-4 text-indigo-400" />
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Upload & Sync</h3>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-normal text-left">
                          Choose a CSV or Excel spreadsheet to replace the current system database.
                        </p>

                        <div className="space-y-3.5 pt-2">
                          {/* XLSX Upload */}
                          <div className="space-y-1.5">
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 text-left">Upload Excel Spreadsheet</label>
                            <div className="relative">
                              <input 
                                type="file" 
                                accept=".xlsx"
                                disabled={isUploading}
                                onChange={(e) => handleDatabaseUpload(e, 'xlsx')}
                                className="hidden" 
                                id="admin-xlsx-upload"
                              />
                              <label 
                                htmlFor="admin-xlsx-upload"
                                className={`flex items-center justify-center gap-2 w-full p-3 border border-dashed rounded-xl cursor-pointer hover:bg-indigo-500/5 transition-all text-xs font-bold uppercase tracking-wider ${isUploading ? 'opacity-40 pointer-events-none' : 'border-indigo-500/20 text-indigo-300 hover:border-indigo-500/40'}`}
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Select .xlsx Spreadsheet
                              </label>
                            </div>
                          </div>

                          {/* CSV Upload */}
                          <div className="space-y-1.5">
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 text-left">Upload CSV Database</label>
                            <div className="relative">
                              <input 
                                type="file" 
                                accept=".csv"
                                disabled={isUploading}
                                onChange={(e) => handleDatabaseUpload(e, 'csv')}
                                className="hidden" 
                                id="admin-csv-upload"
                              />
                              <label 
                                htmlFor="admin-csv-upload"
                                className={`flex items-center justify-center gap-2 w-full p-3 border border-dashed rounded-xl cursor-pointer hover:bg-emerald-500/5 transition-all text-xs font-bold uppercase tracking-wider ${isUploading ? 'opacity-40 pointer-events-none' : 'border-emerald-500/20 text-emerald-300 hover:border-emerald-500/40'}`}
                              >
                                <Upload className="w-3.5 h-3.5" />
                                Select .csv Database
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* STATUS ALERTS */}
                    {(uploadProgress || uploadSuccess || adminError) && (
                      <div className="p-4 bg-slate-950/60 border border-white/5 rounded-2xl space-y-2 text-left">
                        {uploadProgress && (
                          <div className="flex items-center gap-2.5 text-xs text-indigo-400 font-bold animate-pulse">
                            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
                            {uploadProgress}
                          </div>
                        )}
                        {uploadSuccess && (
                          <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-bold">
                            <Check className="w-4 h-4" />
                            {uploadSuccess}
                          </div>
                        )}
                        {adminError && (
                          <div className="flex items-center gap-2.5 text-xs text-rose-400 font-bold">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {adminError}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DEAUTHORIZE BUTTON */}
                    <div className="border-t border-white/5 pt-4 flex justify-between items-center shrink-0">
                      <p className="text-[9px] text-slate-500 leading-normal uppercase font-bold tracking-wider text-left">
                        Active Database Size: <span className="text-slate-400 font-mono font-bold ml-1">{videos.length} clips</span>
                      </p>
                      <button
                        onClick={() => {
                          setIsAdminAuthenticated(false);
                          localStorage.removeItem('admin_auth_token');
                        }}
                        className="bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95"
                      >
                        Deauthorize Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Controls Bar */}
      <div className={cn(
        "fixed right-4 top-1/2 -translate-y-1/2 z-[60] flex flex-col gap-3 transition-all duration-300",
        isReaderOpen && "hidden pointer-events-none opacity-0"
      )}>
        <AnimatePresence>
          {isFloatingControlsVisible && (
            <motion.div
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 50, opacity: 0 }}
              className="flex flex-col gap-3"
            >
              <button
                onClick={() => { setIsFavoritesOpen(!isFavoritesOpen); setIsWorkspaceOpen(false); setIsOceanLoveOpen(false); setIsInstrumentalOpen(false); setIsVirtualToursOpen(false); setIsAffirmationsOpen(false); setIsWisdomOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isFavoritesOpen 
                    ? "bg-theme-accent text-white border-theme-accent scale-110" 
                    : "bg-white/10 border-white/20 text-slate-400 hover:bg-white/20 hover:text-white"
                )}
                title="Favorite Curations"
              >
                <Star className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setIsOceanLoveOpen(!isOceanLoveOpen); setIsFavoritesOpen(false); setIsInstrumentalOpen(false); setIsWorkspaceOpen(false); setIsVirtualToursOpen(false); setIsAffirmationsOpen(false); setIsWisdomOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isOceanLoveOpen 
                    ? "bg-rose-600 text-white border-rose-400 scale-110" 
                    : "bg-white/10 border-white/20 text-rose-400/80 hover:bg-white/20 hover:text-rose-400"
                )}
                title="The Ocean of Love"
              >
                <Heart className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setIsInstrumentalOpen(!isInstrumentalOpen); setIsOceanLoveOpen(false); setIsFavoritesOpen(false); setIsWorkspaceOpen(false); setIsVirtualToursOpen(false); setIsAffirmationsOpen(false); setIsWisdomOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isInstrumentalOpen 
                    ? "bg-amber-600 text-white border-amber-400 scale-110" 
                    : "bg-white/10 border-white/20 text-amber-400/80 hover:bg-white/20 hover:text-amber-400"
                )}
                title="Instrumental Albums"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setIsVirtualToursOpen(!isVirtualToursOpen); setIsFavoritesOpen(false); setIsOceanLoveOpen(false); setIsInstrumentalOpen(false); setIsWorkspaceOpen(false); setIsAffirmationsOpen(false); setIsWisdomOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isVirtualToursOpen 
                    ? "bg-amber-600 text-white border-amber-400 scale-110" 
                    : "bg-white/10 border-white/20 text-slate-400 hover:bg-white/20 hover:text-white"
                )}
                title="Virtual Pilgrimage Tours"
              >
                <Map className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setIsAffirmationsOpen(!isAffirmationsOpen); setIsFavoritesOpen(false); setIsOceanLoveOpen(false); setIsInstrumentalOpen(false); setIsWorkspaceOpen(false); setIsVirtualToursOpen(false); setIsWisdomOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isAffirmationsOpen 
                    ? "bg-emerald-600 text-white border-emerald-400 scale-110 animate-pulse-slow" 
                    : "bg-white/10 border-white/20 text-emerald-400/80 hover:bg-white/20 hover:text-emerald-400"
                )}
                title="Affirmations"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setIsWisdomOpen(!isWisdomOpen); setIsFavoritesOpen(false); setIsOceanLoveOpen(false); setIsInstrumentalOpen(false); setIsWorkspaceOpen(false); setIsVirtualToursOpen(false); setIsAffirmationsOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isWisdomOpen 
                    ? "bg-indigo-600 text-white border-indigo-400 scale-110" 
                    : "bg-white/10 border-white/20 text-indigo-400/85 hover:bg-white/20 hover:text-indigo-400"
                )}
                title="Spiritual Wisdom"
              >
                <BookOpen className="w-5 h-5" />
              </button>

              <button
                onClick={() => { setIsWorkspaceOpen(!isWorkspaceOpen); setIsFavoritesOpen(false); setIsOceanLoveOpen(false); setIsInstrumentalOpen(false); setIsVirtualToursOpen(false); setIsAffirmationsOpen(false); setIsWisdomOpen(false); setIsCalendarOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl",
                  isWorkspaceOpen 
                    ? "bg-fuchsia-600 text-white border-fuchsia-400 scale-110" 
                    : "bg-white/10 border-white/20 text-slate-400 hover:bg-white/20 hover:text-white"
                )}
                title="My Workspace"
              >
                <div className="relative">
                  <ListVideo className="w-5 h-5" />
                  {playlist.length > 0 && (
                    <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-rose-500 text-[8px] font-black flex items-center justify-center border border-slate-900">
                      {playlist.length}
                    </span>
                  )}
                </div>
              </button>

              <button
                onClick={() => { setIsCalendarOpen(!isCalendarOpen); setIsWorkspaceOpen(false); setIsFavoritesOpen(false); setIsOceanLoveOpen(false); setIsInstrumentalOpen(false); setIsVirtualToursOpen(false); setIsAffirmationsOpen(false); setIsWisdomOpen(false); }}
                className={cn(
                  "w-12 h-12 flex items-center justify-center rounded-2xl backdrop-blur-xl border transition-all shadow-xl relative",
                  isCalendarOpen 
                    ? "bg-theme-accent text-white border-theme-accent scale-110" 
                    : "bg-white/10 border-white/20 text-theme-accent hover:bg-white/20 hover:text-theme-accent"
                )}
                title="Saints & Holy Days Calendar"
              >
                <Calendar className="w-5 h-5" />
                {holyDaySaints.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-theme-accent animate-ping" />
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsFloatingControlsVisible(!isFloatingControlsVisible)}
          className="w-12 h-8 flex items-center justify-center rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-slate-500 hover:text-white transition-all opacity-40 hover:opacity-100"
        >
          {isFloatingControlsVisible ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Floating Panels Overlay */}
      <AnimatePresence>
        {isFavoritesOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsFavoritesOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 w-72 max-h-[80vh] backdrop-blur-3xl bg-slate-900/90 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-theme-accent">Curations</h3>
                <button onClick={() => setIsFavoritesOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {favoritesData.favorites.map((fav) => {
                  const Icon = { Bookmark, Star, Zap, ListVideo, Sparkles, Clock, Timer, Compass }[fav.icon] || Bookmark;
                  return (
                    <button
                      key={fav.id}
                      onClick={() => { addFavoritePlaylist(fav.id); setIsFavoritesOpen(false); }}
                      className="w-full flex items-start gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-theme-accent/20 hover:border-theme-accent/30 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-theme-accent" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">{fav.name}</p>
                        <p className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{fav.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {isVirtualToursOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsVirtualToursOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 w-80 max-h-[80vh] backdrop-blur-3xl bg-slate-900/90 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 font-sans">Pilgrimage</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">3D & 360° Holy Destinations</p>
                </div>
                <button onClick={() => setIsVirtualToursOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
              </div>

              {/* Actions Subbar */}
              <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between shrink-0">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {VIRTUAL_TOURS.length} Tours
                </span>
                <button
                  onClick={addAllPilgrimagesToPlaylist}
                  className="flex items-center gap-1 text-[9px] font-bold text-amber-500 hover:text-amber-400 transition-colors uppercase tracking-widest bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/20 active:scale-[0.98]"
                >
                  <PlusCircle className="w-3 h-3" />
                  Add All to Workspace
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {VIRTUAL_TOURS.map((tour) => {
                  const isInPlaylist = playlist.some(p => p.id === tour.id);
                  return (
                    <div
                      key={tour.id}
                      onClick={() => { setActiveVideoId(tour.id); setIsVirtualToursOpen(false); triggerPetals(); }}
                      className={cn(
                        "w-full flex items-center justify-between gap-4 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-amber-600/20 hover:border-amber-500/30 transition-all text-left group cursor-pointer",
                        activeVideoId === tour.id && "bg-amber-600/30 border-amber-500/50"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-grow">
                        <div className="w-12 h-12 rounded-xl bg-slate-950 overflow-hidden shrink-0 relative border border-white/10">
                          <img 
                            src={getVideoThumbnail(tour)} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/10" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate group-hover:text-amber-300 transition-colors">{tour.title}</p>
                          <p className="text-[8.5px] text-amber-400 mt-0.5 font-semibold font-mono">🌟 Explore in 360°</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVideoId(tour.id);
                            setIsReaderOpen(true);
                            setIsVirtualToursOpen(false);
                          }}
                          className="w-7 h-7 bg-amber-500/10 hover:bg-amber-505 border border-amber-500/25 text-amber-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                          title="Read Transcript / Text"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInPlaylist) {
                              removeFromPlaylist(tour.id);
                            } else {
                              addToPlaylist(tour);
                            }
                          }}
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200",
                            isInPlaylist 
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400" 
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
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {isAffirmationsOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsAffirmationsOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 w-80 max-h-[80vh] backdrop-blur-3xl bg-slate-900/90 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-emerald-950/20">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 font-sans">Affirmations</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Elevate Thoughts & Divine Power</p>
                </div>
                <button onClick={() => setIsAffirmationsOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
              </div>

              {/* Actions Subbar */}
              <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between shrink-0">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {AFFIRMATIONS_TOURS.length} Shorts
                </span>
                <button
                  onClick={addAllAffirmationsToPlaylist}
                  className="flex items-center gap-1 text-[9px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-1 rounded-lg border border-emerald-500/20 active:scale-[0.98]"
                >
                  <PlusCircle className="w-3 h-3" />
                  Add All to Workspace
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {AFFIRMATIONS_TOURS.map((video) => {
                  const isInPlaylist = playlist.some(p => p.id === video.id);
                  return (
                    <div
                      key={video.id}
                      onClick={() => { setActiveVideoId(video.id); setIsAffirmationsOpen(false); triggerPetals(); }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-emerald-650/15 hover:border-emerald-500/30 transition-all text-left group cursor-pointer",
                        activeVideoId === video.id && "bg-emerald-600/20 border-emerald-500/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-grow">
                        <div className="w-11 h-11 rounded-lg bg-slate-950 overflow-hidden shrink-0 relative border border-white/10 flex-shrink-0">
                          <img 
                            src={getVideoThumbnail(video)} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/15" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-[10px] sm:text-[10.5px] font-bold text-white leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2" title={video.title}>
                            {video.title}
                          </p>
                          <p className="text-[8px] text-emerald-400 mt-1 font-semibold font-mono tracking-wider uppercase flex items-center gap-1">
                            ✨ Affirmation Short
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVideoId(video.id);
                            setIsReaderOpen(true);
                            setIsAffirmationsOpen(false);
                          }}
                          className="w-7 h-7 bg-emerald-500/10 hover:bg-emerald-505 border border-emerald-500/25 text-emerald-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                          title="Read Transcript / Text"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInPlaylist) {
                              removeFromPlaylist(video.id);
                            } else {
                              addToPlaylist(video);
                            }
                          }}
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200",
                            isInPlaylist 
                              ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400" 
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
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {isWisdomOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsWisdomOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 w-80 max-h-[80vh] backdrop-blur-3xl bg-slate-900/90 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between bg-indigo-950/20">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 font-sans">Spiritual Wisdom</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Teachings of Paramahansa Yogananda</p>
                </div>
                <button onClick={() => setIsWisdomOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
              </div>

              {/* Actions Subbar */}
              <div className="px-5 py-2.5 bg-white/[0.02] border-b border-white/10 flex items-center justify-between shrink-0">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  {WISDOM_TEACHINGS.length} Teachings
                </span>
                <button
                  onClick={addAllWisdomToPlaylist}
                  className="flex items-center gap-1 text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest bg-indigo-500/10 hover:bg-indigo-500/20 px-2 py-1 rounded-lg border border-indigo-500/20 active:scale-[0.98]"
                >
                  <PlusCircle className="w-3 h-3" />
                  Add All to Workspace
                </button>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {WISDOM_TEACHINGS.map((video) => {
                  const isInPlaylist = playlist.some(p => p.id === video.id);
                  return (
                    <div
                      key={video.id}
                      onClick={() => { setActiveVideoId(video.id); setIsWisdomOpen(false); triggerPetals(); }}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl bg-white/5 border border-white/5 hover:bg-indigo-650/15 hover:border-indigo-500/30 transition-all text-left group cursor-pointer",
                        activeVideoId === video.id && "bg-indigo-600/20 border-indigo-500/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-grow">
                        <div className="w-11 h-11 rounded-lg bg-slate-950 overflow-hidden shrink-0 relative border border-white/10 flex-shrink-0">
                          <img 
                            src={getVideoThumbnail(video)} 
                            alt="" 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-black/15" />
                        </div>
                        <div className="min-w-0 flex-grow">
                          <p className="text-[10px] sm:text-[10.5px] font-bold text-white leading-snug group-hover:text-indigo-300 transition-colors line-clamp-2" title={video.title}>
                            {video.title}
                          </p>
                          <p className="text-[8px] text-indigo-400 mt-1 font-semibold font-mono tracking-wider uppercase flex items-center gap-1">
                            🕉️ Teachings Talk
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveVideoId(video.id);
                            setIsReaderOpen(true);
                            setIsWisdomOpen(false);
                          }}
                          className="w-7 h-7 bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/25 text-indigo-400 hover:text-white rounded-xl flex items-center justify-center transition-all cursor-pointer"
                          title="Read Transcript / Text"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInPlaylist) {
                              removeFromPlaylist(video.id);
                            } else {
                              addToPlaylist(video);
                            }
                          }}
                          className={cn(
                            "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200",
                            isInPlaylist 
                              ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400 hover:bg-red-500/10 hover:border-red-500/40 hover:text-red-400" 
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
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}

        {isOceanLoveOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsOceanLoveOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 md:w-[680px] w-[350px] max-w-[calc(100vw-120px)] h-[80vh] backdrop-blur-3xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/40">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Spiritual Albums</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Curated Devotional Chants</p>
                </div>
                <button onClick={() => setIsOceanLoveOpen(false)} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
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
                  {devotionalAlbums.map((album) => {
                    const AlbumIcon = { Heart, Music, Compass, Sun, Flame, Smile }[album.icon] || Heart;
                    const isActive = activeAlbumId === album.id;
                    const trackCount = album.tracks?.length || 0;
                    
                    let activeColors = "bg-rose-500/20 text-rose-400 border-rose-500/30";
                    if (album.accentColor === "indigo") activeColors = "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
                    else if (album.accentColor === "cyan") activeColors = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
                    else if (album.accentColor === "yellow") activeColors = "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
                    else if (album.accentColor === "fuchsia") activeColors = "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30";
                    else if (album.accentColor === "amber") activeColors = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                    else if (album.accentColor === "emerald") activeColors = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

                    return (
                      <button
                        key={album.id}
                        onClick={() => {
                          setActiveAlbumId(album.id);
                          setMobileAlbumView('tracks');
                        }}
                        className={cn(
                          "flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border group/item w-full",
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
                        className="flex items-center gap-1 text-[9px] font-bold text-rose-400 uppercase tracking-widest py-1 px-2 hover:bg-white/5 rounded-lg transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back to Albums
                      </button>
                    </div>
                  )}

                  {/* Album Detail Scroll Area */}
                  <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {(() => {
                      const activeAlbum = devotionalAlbums.find(a => a.id === activeAlbumId) || devotionalAlbums[0];
                      
                      let accentText = "text-rose-400 group-hover:text-rose-300";
                      let bgAccent = "bg-rose-600 hover:bg-rose-500 text-white";
                      let ringColor = "group-hover:border-rose-500/40";
                      
                      if (activeAlbum.accentColor === "indigo") {
                        accentText = "text-indigo-400 group-hover:text-indigo-300";
                        bgAccent = "bg-indigo-600 hover:bg-indigo-500 text-white";
                        ringColor = "group-hover:border-indigo-500/40";
                      } else if (activeAlbum.accentColor === "cyan") {
                        accentText = "text-cyan-400 group-hover:text-cyan-300";
                        bgAccent = "bg-cyan-600 hover:bg-cyan-500 text-white";
                        ringColor = "group-hover:border-cyan-500/40";
                      } else if (activeAlbum.accentColor === "yellow") {
                        accentText = "text-yellow-400 group-hover:text-yellow-300";
                        bgAccent = "bg-yellow-600 hover:bg-yellow-500 text-slate-950";
                        ringColor = "group-hover:border-yellow-500/40";
                      } else if (activeAlbum.accentColor === "fuchsia") {
                        accentText = "text-fuchsia-400 group-hover:text-fuchsia-300";
                        bgAccent = "bg-fuchsia-600 hover:bg-fuchsia-500 text-white";
                        ringColor = "group-hover:border-fuchsia-500/40";
                      } else if (activeAlbum.accentColor === "amber") {
                        accentText = "text-amber-400 group-hover:text-amber-300";
                        bgAccent = "bg-amber-600 hover:bg-amber-500 text-slate-950";
                        ringColor = "group-hover:border-amber-500/40";
                      } else if (activeAlbum.accentColor === "emerald") {
                        accentText = "text-emerald-400 group-hover:text-emerald-300";
                        bgAccent = "bg-emerald-600 hover:bg-emerald-500 text-white";
                        ringColor = "group-hover:border-emerald-500/40";
                      }

                      return (
                        <>
                          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-center shrink-0">
                            <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-1", accentText)}>
                              {activeAlbum.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic mb-3 font-medium">
                              &ldquo;{activeAlbum.description}&rdquo;
                            </p>
                            <button
                              onClick={() => { addAlbumSequence(activeAlbum.id); setIsOceanLoveOpen(false); }}
                              className={cn(
                                "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2",
                                bgAccent
                              )}
                            >
                              <ListVideo className="w-4 h-4" />
                              Queue Full Album ({activeAlbum.tracks?.length || 0} Tracks)
                            </button>
                          </div>

                          <div className="space-y-1.5 pb-4">
                            {activeAlbum.tracks.map((track) => {
                              const TrackIcon = { Flame, Sun, Sparkles, Shield, Droplet, Compass, Music, Activity, Timer, Bookmark, Smile, Heart, Zap }[track.icon] || Heart;
                              const isInPlaylist = playlist.some(p => p.id === track.id);

                              return (
                                <div
                                  key={track.id}
                                  onClick={() => {
                                    setActiveVideoId(track.id);
                                    setIsOceanLoveOpen(false);
                                    triggerPetals();
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
                                      <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate mb-0.5 group-hover:text-amber-300 transition-colors">{track.title}</p>
                                      <p className="text-[9px] text-slate-500 line-clamp-1">{track.desc}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isInPlaylist) {
                                        removeFromPlaylist(track.id);
                                      } else {
                                        addAlbumSingleVideo(track.id);
                                      }
                                    }}
                                    className={cn(
                                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200",
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
                        </>
                      );
                    })()}
                  </div>
                </div>

              </div>

            </motion.div>
          </>
        )}

        {isInstrumentalOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsInstrumentalOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 md:w-[680px] w-[350px] max-w-[calc(100vw-120px)] h-[80vh] backdrop-blur-3xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/40">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-400">Instrumental Albums</h3>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-medium">Arrangements &amp; Meditative Chants</p>
                </div>
                <button onClick={() => setIsInstrumentalOpen(false)} className="p-1 rounded-lg hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4 text-slate-400 hover:text-white" />
                </button>
              </div>

              {/* Master-Detail Combined Content */}
              <div className="flex-grow flex overflow-hidden">
                
                {/* Left Master List: Albums index */}
                <div className={cn(
                  "md:w-60 md:border-r border-white/10 flex flex-col shrink-0 overflow-y-auto custom-scrollbar bg-black/10 p-2 gap-1.5 select-none",
                  mobileInstrumentalAlbumView === 'tracks' ? "hidden md:flex" : "flex w-full"
                )}>
                  <div className="p-2 mb-0.5 hidden md:block">
                    <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">Select Album</span>
                  </div>
                  {instrumentalAlbums.map((album) => {
                    const AlbumIcon = { Heart, Music, Compass, Sun, Flame, Smile, Sparkles, Volume2 }[album.icon] || Music;
                    const isActive = activeInstrumentalAlbumId === album.id;
                    const trackCount = album.tracks?.length || 0;
                    
                    let activeColors = "bg-rose-500/20 text-rose-400 border-rose-500/30";
                    if (album.accentColor === "indigo") activeColors = "bg-indigo-500/20 text-indigo-400 border-indigo-500/30";
                    else if (album.accentColor === "cyan") activeColors = "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
                    else if (album.accentColor === "yellow") activeColors = "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
                    else if (album.accentColor === "fuchsia") activeColors = "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30";
                    else if (album.accentColor === "amber") activeColors = "bg-amber-500/20 text-amber-400 border-amber-500/30";
                    else if (album.accentColor === "emerald") activeColors = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

                    return (
                      <button
                        key={album.id}
                        onClick={() => {
                          setActiveInstrumentalAlbumId(album.id);
                          setMobileInstrumentalAlbumView('tracks');
                        }}
                        className={cn(
                          "flex items-center justify-between text-left px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border group/item w-full",
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
                  mobileInstrumentalAlbumView === 'list' ? "hidden md:flex" : "flex"
                )}>
                  {/* On Mobile: Back to listing navigation */}
                  {mobileInstrumentalAlbumView === 'tracks' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-black/20 border-b border-white/5 md:hidden shrink-0">
                      <button 
                        onClick={() => setMobileInstrumentalAlbumView('list')}
                        className="flex items-center gap-1 text-[9px] font-bold text-amber-400 uppercase tracking-widest py-1 px-2 hover:bg-white/5 rounded-lg transition-all"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back to Albums
                      </button>
                    </div>
                  )}

                  {/* Album Detail Scroll Area */}
                  <div className="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {(() => {
                      const activeAlbum = instrumentalAlbums.find(a => a.id === activeInstrumentalAlbumId) || instrumentalAlbums[0];
                      
                      let accentText = "text-rose-400 group-hover:text-rose-300";
                      let bgAccent = "bg-rose-600 hover:bg-rose-500 text-white";
                      let ringColor = "group-hover:border-rose-500/40";
                      
                      if (activeAlbum.accentColor === "indigo") {
                        accentText = "text-indigo-400 group-hover:text-indigo-300";
                        bgAccent = "bg-indigo-600 hover:bg-indigo-500 text-white";
                        ringColor = "group-hover:border-indigo-500/40";
                      } else if (activeAlbum.accentColor === "cyan") {
                        accentText = "text-cyan-400 group-hover:text-cyan-300";
                        bgAccent = "bg-cyan-600 hover:bg-cyan-500 text-white";
                        ringColor = "group-hover:border-cyan-500/40";
                      } else if (activeAlbum.accentColor === "yellow") {
                        accentText = "text-yellow-400 group-hover:text-yellow-300";
                        bgAccent = "bg-yellow-600 hover:bg-yellow-500 text-slate-950";
                        ringColor = "group-hover:border-yellow-500/40";
                      } else if (activeAlbum.accentColor === "fuchsia") {
                        accentText = "text-fuchsia-400 group-hover:text-fuchsia-300";
                        bgAccent = "bg-fuchsia-600 hover:bg-fuchsia-500 text-white";
                        ringColor = "group-hover:border-fuchsia-500/40";
                      } else if (activeAlbum.accentColor === "amber") {
                        accentText = "text-amber-400 group-hover:text-amber-300";
                        bgAccent = "bg-amber-600 hover:bg-amber-500 text-slate-950";
                        ringColor = "group-hover:border-amber-500/40";
                      } else if (activeAlbum.accentColor === "emerald") {
                        accentText = "text-emerald-400 group-hover:text-emerald-300";
                        bgAccent = "bg-emerald-600 hover:bg-emerald-500 text-white";
                        ringColor = "group-hover:border-emerald-500/40";
                      }

                      return (
                        <>
                          <div className="p-3.5 bg-white/5 rounded-2xl border border-white/5 text-center shrink-0">
                            <h4 className={cn("text-[10px] font-black uppercase tracking-widest mb-1", accentText)}>
                              {activeAlbum.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed italic mb-3 font-medium">
                              &ldquo;{activeAlbum.description}&rdquo;
                            </p>
                            <button
                              onClick={() => { addAlbumSequence(activeAlbum.id); setIsInstrumentalOpen(false); }}
                              className={cn(
                                "w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2",
                                bgAccent
                              )}
                            >
                              <ListVideo className="w-4 h-4" />
                              Queue Full Album ({activeAlbum.tracks?.length || 0} Tracks)
                            </button>
                          </div>

                          <div className="space-y-1.5 pb-4">
                            {activeAlbum.tracks.map((track) => {
                              const TrackIcon = { Flame, Sun, Sparkles, Shield, Droplet, Compass, Music, Activity, Timer, Bookmark, Smile, Heart, Zap, Volume2 }[track.icon] || Music;
                              const isInPlaylist = playlist.some(p => p.id === track.id);

                              return (
                                <div
                                  key={track.id}
                                  onClick={() => {
                                    setActiveVideoId(track.id);
                                    setIsInstrumentalOpen(false);
                                    triggerPetals();
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
                                      <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate mb-0.5 group-hover:text-amber-300 transition-colors">{track.title}</p>
                                      <p className="text-[9px] text-slate-500 line-clamp-1">{track.desc}</p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isInPlaylist) {
                                        removeFromPlaylist(track.id);
                                      } else {
                                        addAlbumSingleVideo(track.id);
                                      }
                                    }}
                                    className={cn(
                                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-200",
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
                        </>
                      );
                    })()}
                  </div>
                </div>

              </div>

            </motion.div>
          </>
        )}

        {isWorkspaceOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/20" onClick={() => setIsWorkspaceOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 w-80 max-h-[80vh] backdrop-blur-3xl bg-slate-900/95 border border-white/20 rounded-3xl shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-fuchsia-400">Workspace</h3>
                <button onClick={() => setIsWorkspaceOpen(false)}><X className="w-4 h-4 text-slate-500" /></button>
              </div>
              <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {playlist.length === 0 ? (
                  <div className="py-20 text-center px-6">
                    <Plus className="w-6 h-6 text-slate-700 mx-auto mb-4" />
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Workspace Empty</p>
                  </div>
                ) : (
                  playlist.map((video, idx) => (
                    <div 
                      key={`${video.id}-${idx}`} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-transparent transition-all cursor-grab active:cursor-grabbing",
                        draggedIndex === idx && "opacity-40 border-dashed border-indigo-500/40 bg-slate-900/50 scale-[0.97]",
                        dragOverIndex === idx && draggedIndex !== idx && "border-indigo-400/80 bg-indigo-500/10 scale-[1.02] shadow-lg shadow-indigo-500/5"
                      )}
                    >
                      <div className="flex items-center justify-center p-0.5 animate-pulse-slow" title="Drag to reorder">
                        <GripVertical className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition-colors" />
                      </div>
                      <img src={getVideoThumbnail(video)} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />
                      <div className="min-w-0 flex-grow">
                        <p className="text-[10px] font-bold text-white truncate">{video.title}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            movePlaylistItem(idx, 'up');
                          }}
                          className={cn(
                            "p-1 text-slate-400 hover:text-indigo-400 transition-all",
                            idx === 0 && "opacity-15 pointer-events-none"
                          )}
                          title="Move Up"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={idx === playlist.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            movePlaylistItem(idx, 'down');
                          }}
                          className={cn(
                            "p-1 text-slate-400 hover:text-indigo-400 transition-all",
                            idx === playlist.length - 1 && "opacity-15 pointer-events-none"
                          )}
                          title="Move Down"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => removeFromPlaylist(video.id)} 
                          className="p-1 px-1.5 text-slate-500 hover:text-rose-400 transition-all"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Database Download Area */}
              <div className="p-4 border-t border-white/10 bg-slate-950/40">
                <div className="flex flex-col gap-2">
                  <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Database Administration</div>
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Authorized team members can manage, backup, import, or export the active video and chant catalogs.
                  </p>
                  
                  {/* Admin Area Button */}
                  <button
                    onClick={() => {
                      setIsWorkspaceOpen(false);
                      setIsAdminModalOpen(true);
                    }}
                    className="w-full mt-1 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 font-bold py-3 rounded-xl text-[9px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Settings className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
                    Admin Control Center
                  </button>
                </div>
              </div>

              {playlist.length > 0 && (
                <div className="p-4 border-t border-white/10">
                  <button onClick={handleNextInPlaylist} className="w-full py-3 bg-white text-black font-black text-[10px] uppercase rounded-xl tracking-widest">
                    Play Sequence
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Rose & Jasmine Petals Overlay */}
      <AnimatePresence>
        {showPetals && (
          <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
            {petalConfigs.map((petal) => {
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
                'from-emerald-50/20 to-white/20',
                'from-amber-50/30 to-white/40',
              ];

              const colorGradient = petal.isJasmine 
                ? jasmineColors[petal.id % jasmineColors.length] 
                : roseColors[petal.id % roseColors.length];

              return (
                <motion.div
                  key={petal.id}
                  initial={{ 
                    y: petal.initialY, 
                    x: petal.startX, 
                    rotateX: petal.initialRotateX,
                    rotateY: petal.initialRotateY,
                    rotateZ: petal.initialRotateZ,
                    scale: 0.6,
                    opacity: 0,
                    zIndex: petal.zIndex
                  }}
                  animate={{ 
                    y: -250, 
                    x: [
                      petal.startX, 
                      petal.startX + petal.swayAmount, 
                      petal.startX - petal.swayAmount * 0.6, 
                      petal.startX + petal.swayAmount * 0.4,
                      petal.startX - petal.swayAmount * 0.2
                    ],
                    rotateX: [0, 180, 360, 540, 720],
                    rotateY: [0, 90, 180, 270, 360],
                    rotateZ: [0, 45, -45, 90, 0],
                    opacity: [0, 1, 1, 0.8, 0],
                    scale: [0.6, 1.1, 1.0, 0.9, 0.6]
                  }}
                  transition={{ 
                    duration: petal.duration, 
                    ease: "linear",
                    delay: petal.delay,
                    x: {
                      duration: petal.duration,
                      ease: "easeInOut",
                      times: [0, 0.25, 0.5, 0.75, 1]
                    }
                  }}
                  className="absolute left-0 top-0"
                  style={{ filter: petal.blur }}
                >
                  <div 
                    className={cn(
                      "shadow-md bg-gradient-to-br backdrop-blur-[0.5px]", 
                      colorGradient
                    )}
                    style={{ 
                      width: `${petal.size}px`,
                      height: petal.isJasmine ? `${petal.size}px` : `${petal.size * 1.1}px`,
                      borderRadius: petal.isJasmine 
                        ? "50% 50% 50% 50% / 80% 80% 20% 20%"
                        : (petal.id % 3 === 0 
                          ? "60% 40% 70% 30% / 60% 40% 70% 30%" 
                          : petal.id % 3 === 1 
                            ? "50% 50% 10% 80% / 80% 80% 20% 20%"
                            : "100% 0% 100% 0% / 50% 50% 50% 50%"),
                      boxShadow: petal.isJasmine 
                        ? '0 2px 8px rgba(0,0,0,0.03)' 
                        : 'inset -2px -2px 6px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05)',
                    }}
                  >
                    {/* Interior Details */}
                    <div className={cn(
                      "absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] via-transparent to-transparent pointer-events-none",
                      petal.isJasmine ? "from-yellow-400/20" : "from-white/30"
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

      {/* Saints & Holy Days Calendar Sliding Drawer */}
      <AnimatePresence>
        {isCalendarOpen && (
          <>
            <div className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm" onClick={() => setIsCalendarOpen(false)} />
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-20 top-1/2 -translate-y-1/2 w-80 max-h-[85vh] backdrop-blur-3xl bg-theme-bg/95 border border-theme-border rounded-[32px] shadow-2xl z-[60] overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-theme-border flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-theme-accent flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 animate-spin-slow" /> Saints Calendar
                  </h3>
                  <p className="text-[9px] text-theme-text-muted mt-1">Sages and Holy Celebrations of 2026</p>
                </div>
                <button onClick={() => setIsCalendarOpen(false)}>
                  <X className="w-4 h-4 text-theme-text-muted hover:text-theme-text transition-all" />
                </button>
              </div>

              {/* Search input */}
              <div className="p-4 border-b border-theme-border bg-theme-surface">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-theme-text-muted opacity-60" />
                  <input
                    type="text"
                    value={calendarSearchQuery}
                    onChange={(e) => setCalendarSearchQuery(e.target.value)}
                    placeholder="Search saint, tradition, region..."
                    className="w-full bg-theme-bg/60 border border-theme-border rounded-xl py-1.5 pl-9 pr-4 text-xs text-theme-text placeholder-theme-text-muted/50 focus:outline-none focus:border-theme-accent/50 transition-all"
                  />
                  {calendarSearchQuery && (
                    <button 
                      onClick={() => setCalendarSearchQuery('')}
                      className="absolute right-3 top-2.5 text-theme-text-muted hover:text-theme-text"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick links to today's date */}
              <div className="px-4 py-2 border-b border-theme-border bg-theme-surface/40 flex items-center justify-between text-[10px]">
                <span className="text-theme-text-muted font-medium">Today's Date:</span>
                <button
                  onClick={() => {
                    const matches = getSaintsForDate(new Date());
                    if (matches.length > 0) {
                      setHolyDaySaints(matches);
                      setIsHolyDayPopupOpen(true);
                    } else {
                      setHolyDaySaints([]);
                      setIsHolyDayPopupOpen(true);
                    }
                  }}
                  className="px-2.5 py-0.5 bg-theme-accent/10 hover:bg-theme-accent/20 text-theme-accent border border-theme-accent/20 rounded-full font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  View Today
                </button>
              </div>

              {/* Saints Scrollable List */}
              <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {(() => {
                  const filteredSaints = (calendarData.saints_list || []).filter((s: any) => {
                    if (!calendarSearchQuery) return true;
                    const query = calendarSearchQuery.toLowerCase();
                    return (
                      s.name.toLowerCase().includes(query) ||
                      (s.tradition && s.tradition.toLowerCase().includes(query)) ||
                      (s.region && s.region.toLowerCase().includes(query)) ||
                      (s.description && s.description.toLowerCase().includes(query))
                    );
                  });

                  if (filteredSaints.length === 0) {
                    return (
                      <div className="text-center py-10 px-4">
                        <Search className="w-5 h-5 text-slate-700 mx-auto mb-2" />
                        <p className="text-[10px] text-theme-text-muted">No saints match your search</p>
                      </div>
                    );
                  }

                  return filteredSaints.map((saint: any, idx: number) => {
                    const todayDate = new Date();
                    const currentMonth = todayDate.getMonth() + 1;
                    const currentDay = todayDate.getDate();
                    let isToday = false;
                    if (saint.date) {
                      const parts = saint.date.split('-');
                      if (parts.length === 3 && parseInt(parts[1], 10) === currentMonth && parseInt(parts[2], 10) === currentDay) {
                        isToday = true;
                      }
                    }

                    let displayDateStr = '';
                    if (saint.date) {
                      const parts = saint.date.split('-');
                      if (parts.length === 3) {
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        const mIndex = parseInt(parts[1], 10) - 1;
                        const dayVal = parseInt(parts[2], 10);
                        displayDateStr = `${monthNames[mIndex]} ${dayVal}`;
                      }
                    }

                    return (
                      <button
                        key={`${saint.name}-${idx}`}
                        onClick={() => {
                          setHolyDaySaints([saint]);
                          setIsHolyDayPopupOpen(true);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-2.5 rounded-2xl border text-left transition-all relative group overflow-hidden cursor-pointer",
                          isToday 
                            ? "bg-theme-accent/10 border-theme-accent/30 hover:bg-theme-accent/20" 
                            : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                        )}
                      >
                        {isToday && (
                          <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0),rgba(255,255,255,0.05)_45%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.05)_55%,rgba(255,255,255,0))] bg-[length:200%_100%] animate-shimmer pointer-events-none" />
                        )}

                        <div className="w-10 h-10 rounded-xl bg-slate-950 overflow-hidden shrink-0 border border-white/10 relative">
                          <img
                            src={getProxiedImageUrl(saint.image_url)}
                            alt={saint.name}
                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = LOTUS_IMAGE_URL;
                            }}
                          />
                        </div>

                        <div className="min-w-0 flex-grow">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-theme-text-muted">
                              {saint.event_type}
                            </span>
                            <span className={cn(
                              "text-[8px] font-bold px-1.5 py-0.5 rounded-full",
                              isToday 
                                ? "bg-theme-accent text-white font-black tracking-wider animate-pulse" 
                                : "bg-white/5 text-theme-text-muted"
                            )}>
                              {isToday ? "TODAY" : displayDateStr}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-theme-text truncate group-hover:text-theme-accent transition-colors">
                            {saint.name}
                          </p>
                          <p className="text-[9px] text-theme-text-muted line-clamp-1 mt-0.5">
                            {saint.tradition} • {saint.region}
                          </p>
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sacred Holy Day Commemoration Modal Popup */}
      <AnimatePresence>
        {isHolyDayPopupOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617]/80 backdrop-blur-md"
              onClick={() => setIsHolyDayPopupOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative max-w-2xl w-full bg-theme-bg/95 backdrop-blur-3xl border border-theme-border rounded-[32px] shadow-2xl z-[130] overflow-hidden flex flex-col md:flex-row group"
            >
              {/* Sacred glow effects */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-theme-accent/5 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-theme-accent/5 blur-3xl rounded-full" />
              </div>

              {/* Left / Top Side: Saint's Sacred Portrait */}
              {holyDaySaints.length > 0 && (
                <div className="md:w-2/5 relative h-56 md:h-auto overflow-hidden shrink-0 bg-theme-bg/50 border-b md:border-b-0 md:border-r border-theme-border">
                  <img
                    src={getProxiedImageUrl(holyDaySaints[0].image_url)}
                    alt={holyDaySaints[0].name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top scale-105 group-hover:scale-100 transition-transform duration-1000"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = LOTUS_IMAGE_URL;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-theme-bg via-transparent to-transparent opacity-80" />
                  
                  <div className="absolute bottom-4 left-4 bg-theme-bg/60 backdrop-blur-md border border-theme-accent/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-theme-accent animate-pulse" />
                    <span className="text-[10px] font-bold text-theme-text tracking-wider uppercase">Holy Commemoration</span>
                  </div>
                </div>
              )}

              {/* Right / Bottom Side: Sacred Bio & Details */}
              <div className="flex-grow p-6 md:p-8 flex flex-col justify-between relative min-w-0">
                <button 
                  onClick={() => setIsHolyDayPopupOpen(false)}
                  className="absolute top-4 right-4 p-1.5 bg-theme-surface hover:bg-theme-surface/80 rounded-full border border-theme-border transition-all z-10 cursor-pointer"
                >
                  <X className="w-4 h-4 text-theme-text-muted hover:text-theme-text" />
                </button>

                {holyDaySaints.length > 0 ? (
                  <div className="space-y-4">
                    {/* Event Type / Occasion */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-theme-accent/10 border border-theme-accent/20 text-theme-accent text-[10px] font-black rounded-full uppercase tracking-widest">
                        {holyDaySaints[0].event_type}
                      </span>
                      <span className="text-xs text-theme-text-muted font-mono">
                        {holyDaySaints[0].date && (() => {
                          const parts = holyDaySaints[0].date.split('-');
                          if (parts.length === 3) {
                            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                            return `${monthNames[parseInt(parts[1], 10) - 1]} ${parseInt(parts[2], 10)}, 2026`;
                          }
                          return holyDaySaints[0].date;
                        })()}
                      </span>
                    </div>

                    {/* Saint Name */}
                    <div>
                      <h2 className="text-2xl md:text-3xl font-serif text-theme-text tracking-tight leading-none">
                        {holyDaySaints[0].name}
                      </h2>
                      <p className="text-xs text-theme-accent font-semibold mt-1 italic">
                        {holyDaySaints[0].tradition}
                      </p>
                    </div>

                    {/* Quick Bio Info Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-theme-bg/50 rounded-2xl border border-theme-border text-[10px]">
                      <div>
                        <span className="text-theme-text-muted opacity-80 font-bold block">BIRTH:</span>
                        <span className="text-theme-text font-mono">{holyDaySaints[0].birth_date || 'various'}</span>
                      </div>
                      <div>
                        <span className="text-theme-text-muted opacity-80 font-bold block">SAMADHI / DEATH:</span>
                        <span className="text-theme-text font-mono">{holyDaySaints[0].death_date || 'various'}</span>
                      </div>
                      <div className="col-span-2 border-t border-theme-border pt-1.5 mt-0.5">
                        <span className="text-theme-text-muted opacity-80 font-bold inline">REGION OF SERVICE: </span>
                        <span className="text-theme-text font-semibold">{holyDaySaints[0].region || 'various'}</span>
                      </div>
                    </div>

                    {/* Description Biography */}
                    <p className="text-xs md:text-sm text-theme-text leading-relaxed font-sans">
                      {holyDaySaints[0].description}
                    </p>

                    {/* Related video, if any */}
                    {(() => {
                      const related = findRelatedVideosForSaint(holyDaySaints[0]);
                      if (related.length > 0) {
                        return (
                          <div className="bg-theme-surface border border-theme-border p-3 rounded-2xl">
                            <p className="text-[9px] font-black text-theme-accent uppercase tracking-widest mb-2 flex items-center gap-1">
                              <Play className="w-2.5 h-2.5 fill-theme-accent text-theme-accent" /> Sacred Record Recommendation
                            </p>
                            <div className="flex items-center justify-between gap-3 min-w-0">
                              <p className="text-[10px] font-semibold text-theme-text truncate flex-grow">
                                {related[0].title}
                              </p>
                              <button
                                onClick={() => {
                                  setActiveVideoId(related[0].id);
                                  setIsHolyDayPopupOpen(false);
                                  setIsCalendarOpen(false);
                                }}
                                className="px-3 py-1 bg-theme-accent hover:opacity-90 text-white font-black rounded-lg text-[9px] uppercase tracking-wider shrink-0 transition-all flex items-center gap-1 cursor-pointer shadow-lg shadow-theme-accent/10"
                              >
                                Play <Play className="w-2 h-2 fill-white stroke-white" />
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">No holy day celebrations scheduled for today.</p>
                  </div>
                )}

                {/* Simulation Control Row */}
                <div className="border-t border-theme-border pt-4 mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase tracking-wider text-theme-text-muted">Preview other Holy Days</span>
                    <select
                      value={testDateStr}
                      onChange={(e) => {
                        setTestDateStr(e.target.value);
                        handleSimulateDate(e.target.value);
                      }}
                      className="bg-theme-surface border border-theme-border rounded-xl text-[10px] text-theme-text py-1 px-2.5 mt-1 focus:outline-none focus:border-theme-accent/50"
                    >
                      <option value="">-- Choose an auspicious day --</option>
                      <option value="2026-01-05">Jan 5: Paramahansa Yogananda Jayanti</option>
                      <option value="2026-01-12">Jan 12: Swami Vivekananda Jayanti</option>
                      <option value="2026-02-18">Feb 18: Ramakrishna / Chaitanya Jayanti</option>
                      <option value="2026-03-07">Mar 7: Paramahansa Yogananda Mahasamadhi</option>
                      <option value="2026-03-09">Mar 9: Sri Yukteswar Giri Samadhi</option>
                      <option value="2026-04-14">Apr 14: Ramana Maharshi Samadhi</option>
                      <option value="2026-05-08">May 8: Swami Chinmayananda Jayanti</option>
                      <option value="2026-07-11">Jul 11: Swami Brahmananda Jayanti (Today)</option>
                      <option value="2026-07-12">Jul 12: Sri Yukteswar Giri Jayanti</option>
                      <option value="2026-08-13">Aug 13: Anandamayi Ma Jayanti</option>
                      <option value="2026-11-14">Nov 14: Guru Nanak Jayanti</option>
                      <option value="2026-12-05">Dec 5: Sri Aurobindo Samadhi</option>
                    </select>
                  </div>

                  <button
                    onClick={() => setIsHolyDayPopupOpen(false)}
                    className="px-5 py-2 bg-theme-accent hover:opacity-90 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-theme-accent/20 cursor-pointer"
                  >
                    Deepen Your Devotion
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
