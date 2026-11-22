import React, {useState} from 'react';
import {
  Check,
  Download,
  Heart,
  ListPlus,
  Pause,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {usePlayer} from '../context/PlayerContext';
import type {Song} from '../types';
import {MediaArtwork} from './MediaArtwork';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatPlayCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

interface SongRowProps {
  song: Song;
  index?: number;
  contextList?: Song[];
  onArtistClick?: (artistId: string) => void;
  onRemoveFromPlaylist?: (songId: string) => void;
}

export const SongRow: React.FC<SongRowProps> = ({
  song,
  index,
  contextList,
  onArtistClick,
  onRemoveFromPlaylist,
}) => {
  const {likedIds, offlineIds, userPlaylists, toggleLike, toggleOfflineDownload, addSongToPlaylist, showToast} =
    useAuth();
  const {currentTrack, isPlaying, playTrack, togglePlay, addToQueue} = usePlayer();
  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isCurrent = currentTrack?.id === song.id;
  const isActivelyPlaying = isCurrent && isPlaying;
  const isLiked = likedIds.has(song.id);
  const isOffline = offlineIds.has(song.id);

  const handlePlayToggle = () => {
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(song, contextList);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await toggleOfflineDownload(song);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors ${
        isCurrent ? 'bg-violet-500/12' : 'hover:bg-white/[0.04]'
      }`}
    >
      {/* Index / Play button */}
      <button
        type="button"
        onClick={handlePlayToggle}
        className="flex h-11 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label={isActivelyPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {isActivelyPlaying ? (
          <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
            <span className="h-4 w-1 rounded-full bg-violet-400 animate-eq-1" />
            <span className="h-3 w-1 rounded-full bg-violet-400 animate-eq-2" />
            <span className="h-4 w-1 rounded-full bg-violet-400 animate-eq-3" />
          </span>
        ) : (
          <>
            {typeof index === 'number' && (
              <span className={`font-mono text-xs tabular-nums group-hover:hidden ${isCurrent ? 'text-violet-400' : 'text-zinc-500'}`}>
                {String(index + 1).padStart(2, '0')}
              </span>
            )}
            <span className={typeof index === 'number' ? 'hidden group-hover:inline-flex' : 'inline-flex'}>
              {isCurrent && isPlaying ? <Pause className="h-4 w-4 text-violet-400" /> : <Play className="h-4 w-4 text-white" />}
            </span>
          </>
        )}
      </button>

      {/* Cover Art */}
      <button
        type="button"
        onClick={handlePlayToggle}
        className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-white/[0.08]"
        aria-label={`Play ${song.title}`}
      >
        <MediaArtwork src={song.cover_url} alt={song.title} rounded="rounded-lg" />
      </button>

      {/* Title & Artist + Unboxed Metadata */}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={handlePlayToggle}
          className={`block w-full truncate text-left text-sm font-medium ${
            isCurrent ? 'text-violet-300' : 'text-zinc-100'
          }`}
        >
          {song.title}
        </button>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-400 truncate">
          {onArtistClick ? (
            <button
              type="button"
              onClick={() => onArtistClick(song.artist_id)}
              className="hover:text-zinc-200 hover:underline truncate"
            >
              {song.artist_name}
            </button>
          ) : (
            <span className="truncate">{song.artist_name}</span>
          )}
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{song.language}</span>
          <span className="hidden sm:inline" aria-hidden="true">·</span>
          <span className="hidden sm:inline truncate">{song.genre}</span>
        </div>
      </div>

      {/* Play count (Desktop) */}
      <div className="hidden lg:block w-20 text-right font-mono text-xs text-zinc-500 tabular-nums">
        {formatPlayCount(song.play_count)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => toggleLike(song.id)}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            isLiked ? 'text-violet-400 hover:text-violet-300' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          aria-label={isLiked ? `Unlike ${song.title}` : `Like ${song.title}`}
          title={isLiked ? 'Liked' : 'Like song'}
        >
          <Heart className={`h-4 w-4 ${isLiked ? 'fill-violet-400' : ''}`} />
        </button>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
            isOffline ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-200'
          }`}
          aria-label={isOffline ? `Remove offline copy of ${song.title}` : `Download ${song.title} for offline listening`}
          title={isOffline ? 'Downloaded offline' : 'Download offline'}
        >
          {isOffline ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setPlaylistMenuOpen((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label={`Add ${song.title} to playlist or queue`}
            title="Add to playlist / queue"
          >
            <ListPlus className="h-4 w-4" />
          </button>

          {playlistMenuOpen && (
            <div
              className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-white/10 bg-[#171622] p-1.5 shadow-2xl"
              onMouseLeave={() => setPlaylistMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  addToQueue(song);
                  setPlaylistMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-zinc-200 hover:bg-white/[0.06]"
              >
                <Plus className="h-3.5 w-3.5 text-violet-400" />
                <span>Add to Play Queue</span>
              </button>

              <div className="my-1 border-t border-white/[0.06]" />
              <div className="px-3 py-1 text-[11px] font-medium text-zinc-500">Add to Playlist</div>
              {userPlaylists.length === 0 ? (
                <div className="px-3 py-2 text-xs text-zinc-500">Create a playlist in Library first</div>
              ) : (
                userPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={async () => {
                      await addSongToPlaylist(pl.id, song.id);
                      setPlaylistMenuOpen(false);
                    }}
                    className="block w-full truncate rounded-lg px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/[0.06]"
                  >
                    {pl.name}
                  </button>
                ))
              )}

              {onRemoveFromPlaylist && (
                <>
                  <div className="my-1 border-t border-white/[0.06]" />
                  <button
                    type="button"
                    onClick={() => {
                      onRemoveFromPlaylist(song.id);
                      setPlaylistMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove from Playlist</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <span className="w-11 text-right font-mono text-xs text-zinc-500 tabular-nums">
          {formatDuration(song.duration_sec)}
        </span>
      </div>
    </div>
  );
};
