import React from 'react';
import {
  ChevronDown,
  Heart,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {usePlayer} from '../context/PlayerContext';
import {MediaArtwork} from './MediaArtwork';
import {formatDuration} from './SongRow';

export const MusicPlayerBar: React.FC<{onOpenPremium: () => void}> = ({onOpenPremium}) => {
  const {likedIds, toggleLike} = useAuth();
  const {
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
    removeFromQueue,
  } = usePlayer();

  if (!currentTrack) return null;

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const isLiked = likedIds.has(currentTrack.id);

  return (
    <>
      {/* Queue Side Drawer */}
      {isQueueOpen && (
        <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-sm flex-col border-l border-white/10 bg-[#111019]/95 backdrop-blur-xl shadow-2xl pb-24">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Up Next</h3>
              <p className="text-xs text-zinc-400">{queue.length} tracks in queue</p>
            </div>
            <button
              type="button"
              onClick={() => setIsQueueOpen(false)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close queue"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {queue.map((item) => {
              const active = item.id === currentTrack.id;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                    active ? 'bg-violet-500/15' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => playTrack(item)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                      <MediaArtwork src={item.cover_url} alt={item.title} rounded="rounded-lg" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${active ? 'text-violet-300' : 'text-zinc-100'}`}>
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-zinc-400">{item.artist_name}</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromQueue(item.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:text-rose-400"
                    aria-label={`Remove ${item.title} from queue`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Full-Screen Now Playing Sheet (Mobile & Desktop) */}
      {isNowPlayingOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1E1335] via-[#100E18] to-[#08080C] p-5 sm:p-8 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-between">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsNowPlayingOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 hover:bg-white/[0.08]"
                aria-label="Minimize player"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-xs font-medium text-zinc-400">Now Playing</p>
                <p className="text-xs font-semibold text-zinc-200">{currentTrack.album_title || 'Buzzly Single'}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNowPlayingOpen(false);
                  setIsQueueOpen(true);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 hover:bg-white/[0.08]"
                aria-label="Open queue"
              >
                <ListMusic className="h-5 w-5" />
              </button>
            </div>

            <div className="my-6 flex flex-col items-center">
              <div className="aspect-square w-full max-w-xs overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                <MediaArtwork src={currentTrack.cover_url} alt={currentTrack.title} rounded="rounded-2xl" />
              </div>

              <div className="mt-6 flex w-full items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-white">{currentTrack.title}</h2>
                  <p className="mt-0.5 truncate text-sm text-zinc-400">
                    {currentTrack.artist_name} · {currentTrack.language}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleLike(currentTrack.id)}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isLiked ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Toggle like"
                >
                  <Heart className={`h-5 w-5 ${isLiked ? 'fill-violet-400' : ''}`} />
                </button>
              </div>

              {/* Scrubber */}
              <div className="mt-6 w-full">
                <input
                  type="range"
                  min={0}
                  max={duration || currentTrack.duration_sec}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => seekTo(Number(e.target.value))}
                  aria-label="Seek track progress"
                  className="h-1.5 w-full cursor-pointer accent-violet-500"
                />
                <div className="mt-1.5 flex justify-between font-mono text-xs text-zinc-400 tabular-nums">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration || currentTrack.duration_sec)}</span>
                </div>
              </div>

              {/* Main Controls */}
              <div className="mt-6 flex w-full items-center justify-between px-2">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isShuffle ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Toggle shuffle"
                >
                  <Shuffle className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={prevTrack}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white hover:bg-white/[0.06]"
                  aria-label="Previous track"
                >
                  <SkipBack className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/30 hover:bg-violet-500 transition-transform active:scale-95"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="h-7 w-7" /> : <Play className="h-7 w-7 translate-x-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={nextTrack}
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white hover:bg-white/[0.06]"
                  aria-label="Next track"
                >
                  <SkipForward className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={cycleRepeat}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    repeatMode !== 'off' ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-label="Cycle repeat mode"
                >
                  {repeatMode === 'one' ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {sponsorNotice ? (
              <button
                type="button"
                onClick={() => {
                  setIsNowPlayingOpen(false);
                  onOpenPremium();
                }}
                className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-center text-xs text-violet-200 hover:bg-violet-500/20"
              >
                {sponsorNotice}
              </button>
            ) : (
              <div className="h-4" />
            )}
          </div>
        </div>
      )}

      {/* Desktop Fixed Bottom Player Bar */}
      <div className="hidden md:flex fixed bottom-0 left-0 right-0 z-40 h-20 items-center justify-between gap-6 border-t border-white/[0.08] bg-[#0D0C14]/95 backdrop-blur-xl px-5">
        {/* Track Info */}
        <div className="flex w-72 min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setIsNowPlayingOpen(true)}
            className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-white/10"
            aria-label="Expand player"
          >
            <MediaArtwork src={currentTrack.cover_url} alt={currentTrack.title} rounded="rounded-lg" />
          </button>
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setIsNowPlayingOpen(true)}
              className="block w-full truncate text-left text-sm font-semibold text-white hover:underline"
            >
              {currentTrack.title}
            </button>
            <p className="truncate text-xs text-zinc-400">{currentTrack.artist_name}</p>
          </div>
          <button
            type="button"
            onClick={() => toggleLike(currentTrack.id)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              isLiked ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Like current track"
          >
            <Heart className={`h-4 w-4 ${isLiked ? 'fill-violet-400' : ''}`} />
          </button>
        </div>

        {/* Center Controls + Progress */}
        <div className="flex max-w-xl flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                isShuffle ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label="Shuffle"
              title="Shuffle"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={prevTrack}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-200 hover:text-white"
              aria-label="Previous track"
              title="Previous"
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-500 transition-transform active:scale-95"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-0.5" />}
            </button>
            <button
              type="button"
              onClick={nextTrack}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-200 hover:text-white"
              aria-label="Next track"
              title="Next"
            >
              <SkipForward className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                repeatMode !== 'off' ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
              }`}
              aria-label="Repeat"
              title={`Repeat: ${repeatMode}`}
            >
              {repeatMode === 'one' ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex w-full items-center gap-2.5">
            <span className="w-10 text-right font-mono text-[11px] text-zinc-400 tabular-nums">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min={0}
              max={duration || currentTrack.duration_sec}
              step={0.5}
              value={currentTime}
              onChange={(e) => seekTo(Number(e.target.value))}
              aria-label="Track progress"
              className="h-1 flex-1 cursor-pointer accent-violet-500"
            />
            <span className="w-10 font-mono text-[11px] text-zinc-400 tabular-nums">
              {formatDuration(duration || currentTrack.duration_sec)}
            </span>
          </div>
        </div>

        {/* Volume, Queue & Expand */}
        <div className="flex w-72 items-center justify-end gap-2">
          {sponsorNotice && (
            <button
              type="button"
              onClick={onOpenPremium}
              className="mr-1 truncate text-[11px] font-medium text-violet-300 hover:underline max-w-[110px]"
              title={sponsorNotice}
            >
              Go Ad-Free
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isQueueOpen ? 'text-violet-400' : 'text-zinc-400 hover:text-white'
            }`}
            aria-label="Toggle queue"
            title="Queue"
          >
            <ListMusic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={isMuted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Volume"
            className="w-20 cursor-pointer accent-violet-500"
          />
          <button
            type="button"
            onClick={() => setIsNowPlayingOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            aria-label="Full screen player"
            title="Expand player"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Compact Mini-Player docked cleanly above bottom tab bar (12px height progress + 48px bar) */}
      <div className="md:hidden fixed bottom-[56px] left-2 right-2 z-30 overflow-hidden rounded-xl border border-white/10 bg-[#171522]/95 backdrop-blur-xl shadow-xl">
        <div className="flex h-12 items-center justify-between gap-2 px-2.5">
          <button
            type="button"
            onClick={() => setIsNowPlayingOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg">
              <MediaArtwork src={currentTrack.cover_url} alt={currentTrack.title} rounded="rounded-lg" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{currentTrack.title}</p>
              <p className="truncate text-[11px] text-zinc-400">{currentTrack.artist_name}</p>
            </div>
          </button>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => toggleLike(currentTrack.id)}
              className={`flex h-10 w-10 items-center justify-center ${
                isLiked ? 'text-violet-400' : 'text-zinc-400'
              }`}
              aria-label="Like track"
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-violet-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-10 w-10 items-center justify-center text-white"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={nextTrack}
              className="flex h-10 w-10 items-center justify-center text-zinc-300"
              aria-label="Next track"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="h-0.5 w-full bg-white/10">
          <div className="h-full bg-violet-500 transition-all duration-150" style={{width: `${progressPct}%`}} />
        </div>
      </div>
    </>
  );
};
