import React from 'react';
import {ChevronRight, Play} from 'lucide-react';
import {MediaArtwork} from '../components/MediaArtwork';
import {formatPlayCount, SongRow} from '../components/SongRow';
import {usePlayer} from '../context/PlayerContext';
import type {Album, Artist, ExploreCategory, Playlist, Song} from '../types';

interface HomeViewProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  onNavigateExplore: (category: ExploreCategory) => void;
  onOpenPlaylist: (id: string) => void;
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  songs,
  artists,
  albums,
  playlists,
  onNavigateExplore,
  onOpenPlaylist,
  onOpenArtist,
  onOpenAlbum,
}) => {
  const {playTrack} = usePlayer();

  const featuredSongs = songs.filter((s) => s.is_featured === 1);
  const heroSong = featuredSongs[0] || songs[0];
  const trendingSongs = songs.filter((s) => s.is_trending === 1).slice(0, 6);
  const newReleases = songs.filter((s) => s.is_new_release === 1).slice(0, 4);
  const recommendedPlaylists = playlists.filter((p) => p.is_recommended === 1).slice(0, 4);

  return (
    <div className="space-y-10">
      {/* Featured Hero Showcase */}
      {heroSong && (
        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#13121C]">
          <div className="absolute inset-0">
            <img
              src="/src/assets/images/hero_buzzly_stage_1795351412243.jpg"
              alt="Buzzly Studio Featured Showcase"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#09090D] via-[#09090D]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090D] via-transparent to-transparent" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl space-y-4">
              <p className="text-xs font-medium tracking-wide text-violet-300">
                Featured Release · {heroSong.language} · {heroSong.genre}
              </p>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {heroSong.title}
              </h1>
              <p className="text-sm text-zinc-300 leading-relaxed max-w-md">
                Performed by {heroSong.artist_name}. Stream in studio fidelity or download directly for offline listening across desktop and mobile.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => playTrack(heroSong, featuredSongs.length ? featuredSongs : songs)}
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
                >
                  <Play className="h-4 w-4 fill-white" />
                  <span>Play Featured Track</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateExplore('trending')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-medium text-zinc-100 hover:bg-white/[0.12] transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Explore Trending</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => playTrack(heroSong, songs)}
              className="group hidden sm:flex items-center gap-4 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md p-3 text-left hover:border-violet-500/40 transition-colors shrink-0"
            >
              <div className="h-20 w-20 overflow-hidden rounded-lg">
                <MediaArtwork src={heroSong.cover_url} alt={heroSong.title} rounded="rounded-lg" />
              </div>
              <div className="pr-2">
                <p className="text-xs text-zinc-400">Up First</p>
                <p className="mt-0.5 text-sm font-semibold text-white">{heroSong.title}</p>
                <p className="text-xs text-zinc-400">{heroSong.artist_name}</p>
                <p className="mt-1 font-mono text-[11px] text-violet-300 tabular-nums">
                  {formatPlayCount(heroSong.play_count)} streams
                </p>
              </div>
            </button>
          </div>
        </section>
      )}

      {/* Trending Music */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Trending Music</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Most played tracks across Hindi, Punjabi, English, and Bhojpuri</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateExplore('trending')}
            className="text-xs font-medium text-violet-300 hover:text-violet-200 whitespace-nowrap shrink-0"
          >
            View all
          </button>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
          {trendingSongs.map((song, idx) => (
            <SongRow
              key={song.id}
              song={song}
              index={idx}
              contextList={trendingSongs}
              onArtistClick={onOpenArtist}
            />
          ))}
        </div>
      </section>

      {/* New Releases */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">New Releases</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Fresh singles and studio albums added to Buzzly</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateExplore('all')}
            className="text-xs font-medium text-violet-300 hover:text-violet-200 whitespace-nowrap shrink-0"
          >
            Browse catalog
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {newReleases.map((song) => (
            <div
              key={song.id}
              className="group rounded-2xl border border-white/[0.07] bg-[#13121C] p-3.5 hover:bg-[#191726] transition-colors"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl">
                <MediaArtwork src={song.cover_url} alt={song.title} rounded="rounded-xl" />
                <button
                  type="button"
                  onClick={() => playTrack(song, newReleases)}
                  aria-label={`Play ${song.title}`}
                  className="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-violet-600 text-white shadow-lg opacity-95 sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0 transition-all hover:bg-violet-500"
                >
                  <Play className="h-4 w-4 fill-white translate-x-0.5" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => (song.album_id ? onOpenAlbum(song.album_id) : playTrack(song, newReleases))}
                className="mt-3 block w-full truncate text-left text-sm font-semibold text-white hover:underline"
              >
                {song.title}
              </button>
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                {song.artist_name} · {song.language}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Artists */}
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Popular Artists</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Featured vocalists and producers on Buzzly Music</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {artists.map((artist) => (
            <button
              key={artist.id}
              type="button"
              onClick={() => onOpenArtist(artist.id)}
              className="group flex flex-col items-center rounded-2xl border border-white/[0.07] bg-[#13121C] p-4 text-center hover:bg-[#191726] transition-colors"
            >
              <div className="aspect-square w-24 overflow-hidden rounded-full border border-white/10">
                <MediaArtwork src={artist.image_url} alt={artist.name} rounded="rounded-full" />
              </div>
              <p className="mt-3 w-full truncate text-sm font-semibold text-white group-hover:text-violet-300">
                {artist.name}
              </p>
              <p className="mt-0.5 w-full truncate text-xs text-zinc-400">{artist.genre}</p>
              <p className="mt-1 font-mono text-[11px] text-zinc-500 tabular-nums">
                {formatPlayCount(artist.monthly_listeners)} monthly
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recommended Playlists */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Recommended Playlists</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Curated collections for every mood and language</p>
          </div>
          {albums.length > 0 && (
            <button
              type="button"
              onClick={() => onOpenAlbum(albums[0].id)}
              className="text-xs font-medium text-zinc-400 hover:text-white whitespace-nowrap shrink-0"
            >
              Featured album
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedPlaylists.map((playlist) => (
            <button
              key={playlist.id}
              type="button"
              onClick={() => onOpenPlaylist(playlist.id)}
              className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[#13121C] p-4 text-left hover:bg-[#191726] transition-colors"
            >
              <div className="aspect-square w-full overflow-hidden rounded-xl">
                <MediaArtwork src={playlist.cover_url} alt={playlist.name} rounded="rounded-xl" />
              </div>
              <p className="mt-3 truncate text-sm font-semibold text-white group-hover:text-violet-300">
                {playlist.name}
              </p>
              <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{playlist.description}</p>
              <p className="mt-2 font-mono text-[11px] text-zinc-500 tabular-nums">
                {playlist.song_count ?? 0} tracks
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
