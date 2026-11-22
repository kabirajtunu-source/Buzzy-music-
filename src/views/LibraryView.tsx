import React, {useCallback, useEffect, useState} from 'react';
import {Clock, Download, Heart, ListMusic, Play, Plus, Trash2} from 'lucide-react';
import {MediaArtwork} from '../components/MediaArtwork';
import {SongRow} from '../components/SongRow';
import {useAuth} from '../context/AuthContext';
import {usePlayer} from '../context/PlayerContext';
import {api} from '../lib/api';
import type {LibraryData} from '../types';

interface LibraryViewProps {
  initialTab?: 'liked' | 'recent' | 'playlists' | 'offline';
  onOpenPlaylist: (id: string) => void;
  onOpenArtist: (id: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  initialTab = 'liked',
  onOpenPlaylist,
  onOpenArtist,
}) => {
  const {user, openAuthModal, createPlaylist, refreshUserExtras, showToast} = useAuth();
  const {playTrack} = usePlayer();
  const [tab, setTab] = useState<'liked' | 'recent' | 'playlists' | 'offline'>(initialTab);
  const [library, setLibrary] = useState<LibraryData>({
    likedSongs: [],
    recentlyPlayed: [],
    playlists: [],
    offlineDownloads: [],
  });
  const [loading, setLoading] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [newPlDesc, setNewPlDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadLibrary = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await api.getLibrary();
      setLibrary(data);
    } catch {
      // Ignore transient error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadLibrary();
  }, [loadLibrary]);

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlName.trim()) return;
    const pl = await createPlaylist(newPlName.trim(), newPlDesc.trim());
    if (pl) {
      setNewPlName('');
      setNewPlDesc('');
      setShowCreateForm(false);
      await loadLibrary();
    }
  };

  const handleDeletePlaylist = async (id: string) => {
    try {
      await api.deletePlaylist(id);
      await refreshUserExtras();
      await loadLibrary();
      showToast('Playlist deleted');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete playlist', 'error');
    }
  };

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center max-w-lg mx-auto mt-8">
        <ListMusic className="mx-auto h-10 w-10 text-violet-400" />
        <h1 className="mt-4 text-xl font-bold text-white">Your Personal Music Library</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in with your Google account to save Liked Songs, view your Recently Played history, build custom playlists, and download tracks for offline listening.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Your Library</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {library.likedSongs.length} liked · {library.playlists.length} playlists ·{' '}
            {library.offlineDownloads.length} offline
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTab('playlists');
            setShowCreateForm(true);
          }}
          className="inline-flex items-center gap-2 self-start rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-4">
        {[
          {id: 'liked' as const, label: 'Liked Songs', icon: Heart},
          {id: 'recent' as const, label: 'Recently Played', icon: Clock},
          {id: 'playlists' as const, label: 'Playlists', icon: ListMusic},
          {id: 'offline' as const, label: 'Offline Downloads', icon: Download},
        ].map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {showCreateForm && tab === 'playlists' && (
        <form
          onSubmit={handleCreatePlaylist}
          className="rounded-2xl border border-violet-500/30 bg-[#151322] p-5 space-y-3 max-w-xl"
        >
          <h2 className="text-sm font-semibold text-white">Create New Playlist</h2>
          <input
            type="text"
            required
            maxLength={80}
            value={newPlName}
            onChange={(e) => setNewPlName(e.target.value)}
            placeholder="Playlist name (e.g. Monsoon Drive)"
            className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
          <input
            type="text"
            maxLength={240}
            value={newPlDesc}
            onChange={(e) => setNewPlDesc(e.target.value)}
            placeholder="Short description (optional)"
            className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-xl bg-white/[0.06] px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : tab === 'liked' ? (
        library.likedSongs.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center">
            <p className="text-sm font-medium text-zinc-200">No liked songs yet</p>
            <p className="mt-1 text-xs text-zinc-400">Tap the heart icon on any track to save it here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => playTrack(library.likedSongs[0], library.likedSongs)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>Play Liked Songs</span>
            </button>
            <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
              {library.likedSongs.map((song, idx) => (
                <SongRow
                  key={song.id}
                  song={song}
                  index={idx}
                  contextList={library.likedSongs}
                  onArtistClick={onOpenArtist}
                />
              ))}
            </div>
          </div>
        )
      ) : tab === 'recent' ? (
        library.recentlyPlayed.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center">
            <p className="text-sm font-medium text-zinc-200">No listening history yet</p>
            <p className="mt-1 text-xs text-zinc-400">Tracks you play will appear here chronologically.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
            {library.recentlyPlayed.map((song, idx) => (
              <SongRow
                key={`${song.id}-${idx}`}
                song={song}
                index={idx}
                contextList={library.recentlyPlayed}
                onArtistClick={onOpenArtist}
              />
            ))}
          </div>
        )
      ) : tab === 'playlists' ? (
        library.playlists.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center">
            <p className="text-sm font-medium text-zinc-200">You haven't created any playlists yet</p>
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Create Your First Playlist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {library.playlists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[#13121C] p-3.5"
              >
                <button
                  type="button"
                  onClick={() => onOpenPlaylist(pl.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                    <MediaArtwork src={pl.cover_url} alt={pl.name} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white hover:text-violet-300">{pl.name}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {pl.song_count ?? 0} tracks · {pl.description || 'Personal playlist'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeletePlaylist(pl.id)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-rose-500/10 hover:text-rose-400"
                  aria-label={`Delete playlist ${pl.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )
      ) : library.offlineDownloads.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center">
          <p className="text-sm font-medium text-zinc-200">No offline downloads saved</p>
          <p className="mt-1 text-xs text-zinc-400">
            Click the download icon next to any song to cache it in your browser for offline playback.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            Stored in device cache ({user.plan === 'free' ? `${library.offlineDownloads.length}/3 Free limit` : 'Unlimited Premium'}).
          </p>
          <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
            {library.offlineDownloads.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                contextList={library.offlineDownloads}
                onArtistClick={onOpenArtist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
