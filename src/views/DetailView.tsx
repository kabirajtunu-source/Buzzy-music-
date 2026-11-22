import React, {useCallback, useEffect, useState} from 'react';
import {ArrowLeft, Play} from 'lucide-react';
import {MediaArtwork} from '../components/MediaArtwork';
import {formatPlayCount, SongRow} from '../components/SongRow';
import {useAuth} from '../context/AuthContext';
import {usePlayer} from '../context/PlayerContext';
import {api} from '../lib/api';
import type {Album, Artist, Playlist, Song} from '../types';

interface DetailViewProps {
  mode: 'playlist' | 'artist' | 'album';
  id: string;
  onBack: () => void;
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  mode,
  id,
  onBack,
  onOpenArtist,
  onOpenAlbum,
}) => {
  const {user, showToast, refreshUserExtras} = useAuth();
  const {playTrack} = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [album, setAlbum] = useState<Album | null>(null);
  const [artistAlbums, setArtistAlbums] = useState<Album[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'playlist') {
        const res = await api.getPlaylist(id);
        setPlaylist(res.playlist);
        setSongs(res.songs);
      } else if (mode === 'artist') {
        const res = await api.getArtist(id);
        setArtist(res.artist);
        setArtistAlbums(res.albums);
        setSongs(res.songs);
      } else {
        const res = await api.getAlbum(id);
        setAlbum(res.album);
        setSongs(res.songs);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, mode, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRemoveFromPlaylist = async (songId: string) => {
    if (!playlist) return;
    try {
      await api.removeSongFromPlaylist(playlist.id, songId);
      setSongs((prev) => prev.filter((s) => s.id !== songId));
      await refreshUserExtras();
      showToast('Removed track from playlist');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not remove track', 'error');
    }
  };

  if (loading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />;
  }

  const title = playlist?.name || artist?.name || album?.title || 'Collection';
  const subtitle = playlist
    ? playlist.description || 'Curated playlist'
    : artist
    ? `${artist.genre} · ${formatPlayCount(artist.monthly_listeners)} monthly listeners`
    : album
    ? `${album.artist_name || 'Artist'} · ${album.release_year} · ${album.language}`
    : '';
  const image = playlist?.cover_url || artist?.image_url || album?.cover_url;
  const canEditPlaylist =
    mode === 'playlist' && playlist && user && (playlist.user_id === user.id || user.role === 'admin');

  return (
    <div className="space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>

      {/* Header Banner */}
      <div className="flex flex-col gap-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1C1630] to-[#111018] p-6 sm:flex-row sm:items-end">
        <div
          className={`h-40 w-40 shrink-0 overflow-hidden border border-white/10 shadow-2xl ${
            mode === 'artist' ? 'rounded-full' : 'rounded-2xl'
          }`}
        >
          <MediaArtwork
            src={image}
            alt={title}
            rounded={mode === 'artist' ? 'rounded-full' : 'rounded-2xl'}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium text-violet-300 capitalize">{mode}</p>
          <h1 className="text-2xl font-extrabold text-white sm:text-4xl">{title}</h1>
          <p className="text-sm text-zinc-300">{subtitle}</p>
          {artist?.bio && <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed pt-1">{artist.bio}</p>}
          {songs.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => playTrack(songs[0], songs)}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Play All ({songs.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tracklist */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Tracks</h2>
        {songs.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-8 text-center text-sm text-zinc-400">
            No tracks in this collection yet. Use the playlist menu on any song to add tracks here.
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
            {songs.map((song, idx) => (
              <SongRow
                key={song.id}
                song={song}
                index={idx}
                contextList={songs}
                onArtistClick={onOpenArtist}
                onRemoveFromPlaylist={canEditPlaylist ? handleRemoveFromPlaylist : undefined}
              />
            ))}
          </div>
        )}
      </section>

      {/* Artist Discography */}
      {mode === 'artist' && artistAlbums.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Albums</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {artistAlbums.map((alb) => (
              <button
                key={alb.id}
                type="button"
                onClick={() => onOpenAlbum(alb.id)}
                className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-3.5 text-left hover:bg-[#191726]"
              >
                <div className="aspect-square w-full overflow-hidden rounded-xl">
                  <MediaArtwork src={alb.cover_url} alt={alb.title} />
                </div>
                <p className="mt-3 truncate text-sm font-semibold text-white">{alb.title}</p>
                <p className="text-xs text-zinc-400">
                  {alb.release_year} · {alb.language}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
