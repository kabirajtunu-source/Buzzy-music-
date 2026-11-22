import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react';
import {api, resolveOfflineAudioSrc} from '../lib/api';
import type {RepeatMode, Song} from '../types';
import {useAuth} from './AuthContext';

interface PlayerContextValue {
  currentTrack: Song | null;
  queue: Song[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  isNowPlayingOpen: boolean;
  isQueueOpen: boolean;
  sponsorNotice: string | null;
  setIsNowPlayingOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
  playTrack: (song: Song, contextList?: Song[]) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (seconds: number) => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (song: Song) => void;
  removeFromQueue: (songId: string) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export const PlayerProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {user, showToast} = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playCounterRef = useRef(0);

  const [currentTrack, setCurrentTrack] = useState<Song | null>(null);
  const [queue, setQueue] = useState<Song[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [sponsorNotice, setSponsorNotice] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    return () => {
      audio.pause();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  const loadAndPlay = useCallback(
    async (song: Song) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      // Free tier subtle audio break banner every 4 tracks
      playCounterRef.current += 1;
      if ((!user || user.plan === 'free') && playCounterRef.current % 4 === 0) {
        setSponsorNotice('Buzzly Free · Upgrade to Premium for uninterrupted ad-free audio');
      } else {
        setSponsorNotice(null);
      }

      setCurrentTrack(song);
      setCurrentTime(0);
      setDuration(song.duration_sec);

      const cachedSrc = await resolveOfflineAudioSrc(song.audio_url);
      if (cachedSrc) {
        objectUrlRef.current = cachedSrc;
        audio.src = cachedSrc;
      } else {
        audio.src = song.audio_url;
      }

      audio.load();
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }

      // Update Media Session API for Android, iOS & Desktop background/lock-screen controls
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: song.title,
          artist: song.artist_name,
          album: song.album_title || 'Buzzly Music',
          artwork: [
            {src: song.cover_url, sizes: '512x512', type: 'image/jpeg'},
          ],
        });
      }

      api.recordPlay(song.id).catch(() => undefined);
    },
    [user]
  );

  const playTrack = useCallback(
    async (song: Song, contextList?: Song[]) => {
      if (contextList && contextList.length > 0) {
        setQueue(contextList);
      } else {
        setQueue((prev) => (prev.some((s) => s.id === song.id) ? prev : [song, ...prev]));
      }
      await loadAndPlay(song);
    },
    [loadAndPlay]
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack]);

  const nextTrack = useCallback(() => {
    if (!currentTrack || queue.length === 0) return;
    if (repeatMode === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => undefined);
      }
      return;
    }

    const idx = queue.findIndex((s) => s.id === currentTrack.id);
    if (isShuffle && queue.length > 1) {
      let randIdx = idx;
      while (randIdx === idx) {
        randIdx = Math.floor(Math.random() * queue.length);
      }
      loadAndPlay(queue[randIdx]);
      return;
    }

    if (idx >= 0 && idx + 1 < queue.length) {
      loadAndPlay(queue[idx + 1]);
    } else if (repeatMode === 'all' && queue.length > 0) {
      loadAndPlay(queue[0]);
    } else {
      setIsPlaying(false);
    }
  }, [currentTrack, isShuffle, loadAndPlay, queue, repeatMode]);

  const prevTrack = useCallback(() => {
    const audio = audioRef.current;
    if (!currentTrack || queue.length === 0) return;
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    const idx = queue.findIndex((s) => s.id === currentTrack.id);
    if (idx > 0) {
      loadAndPlay(queue[idx - 1]);
    } else if (repeatMode === 'all') {
      loadAndPlay(queue[queue.length - 1]);
    } else if (audio) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }
  }, [currentTrack, loadAndPlay, queue, repeatMode]);

  const seekTo = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(seconds, audio.duration || seconds));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    setIsMuted(clamped === 0);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      audioRef.current.muted = clamped === 0;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setIsShuffle((prev) => !prev);
  }, []);

  const cycleRepeat = useCallback(() => {
    setRepeatMode((prev) => (prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'));
  }, []);

  const addToQueue = useCallback(
    (song: Song) => {
      setQueue((prev) => {
        if (prev.some((s) => s.id === song.id)) return prev;
        return [...prev, song];
      });
      showToast(`Added "${song.title}" to queue`);
    },
    [showToast]
  );

  const removeFromQueue = useCallback((songId: string) => {
    setQueue((prev) => prev.filter((s) => s.id !== songId));
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (
        typeof navigator !== 'undefined' &&
        'mediaSession' in navigator &&
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        typeof navigator.mediaSession.setPositionState === 'function'
      ) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: Math.min(audio.currentTime, audio.duration),
          });
        } catch {
          // Ignore transient state errors
        }
      }
    };
    const onLoadedMetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };
    const onEnded = () => nextTrack();
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [nextTrack]);

  // Register Media Session hardware / background playback controls
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    try {
      ms.setActionHandler('play', () => audioRef.current?.play().catch(() => undefined));
      ms.setActionHandler('pause', () => audioRef.current?.pause());
      ms.setActionHandler('previoustrack', prevTrack);
      ms.setActionHandler('nexttrack', nextTrack);
      ms.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') seekTo(details.seekTime);
      });
    } catch {
      // Some browsers reject specific action handlers
    }
  }, [nextTrack, prevTrack, seekTo]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isShuffle,
        repeatMode,
        isNowPlayingOpen,
        isQueueOpen,
        sponsorNotice,
        setIsNowPlayingOpen,
        setIsQueueOpen,
        playTrack,
        togglePlay,
        nextTrack,
        prevTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        removeFromQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
