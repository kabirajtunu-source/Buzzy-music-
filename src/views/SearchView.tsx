import React, {useEffect, useState} from 'react';
import {Search as SearchIcon, X} from 'lucide-react';
import {MediaArtwork} from '../components/MediaArtwork';
import {SongRow} from '../components/SongRow';
import {api} from '../lib/api';
import type {Album, Artist, Playlist, Song} from '../types';

interface SearchViewProps {
  allSongs: Song[];
  allArtists: Artist[];
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
  onOpenPlaylist: (id: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  allSongs,
  allArtists,
  onOpenArtist,
  onOpenAlbum,
  onOpenPlaylist,
}) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');
  const [results, setResults] = useState<{
    songs: Song[];
    artists: Artist[];
    albums: Album[];
    playlists: Playlist[];
  }>({songs: [], artists: [], albums: [], playlists: []});
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults({songs: [], artists: [], albums: [], playlists: []});
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      api
        .search(trimmed)
        .then((res) => setResults(res))
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery = query.trim().length > 0;
  const totalMatches =
    results.songs.length + results.artists.length + results.albums.length + results.playlists.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Search</h1>
        <p className="mt-1 text-sm text-zinc-400">Find songs, artists, albums, and curated playlists</p>
      </div>

      {/* Search Input */}
      <div className="relative max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Hindi, Punjabi, English, Bhojpuri, or artist names..."
          className="w-full rounded-xl border border-white/12 bg-[#13121C] py-3.5 pl-11 pr-11 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-400 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="flex flex-wrap gap-2">
          {(['all', 'songs', 'artists', 'albums', 'playlists'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors whitespace-nowrap shrink-0 ${
                filter === tab
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {!hasQuery ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-white mb-3">Quick Searches</h2>
            <div className="flex flex-wrap gap-2">
              {['Aria Kapoor', 'Punjabi', 'Bollywood', 'Midnight', 'Bhojpuri', 'Velvet'].map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => setQuery(term)}
                  className="rounded-lg border border-white/10 bg-[#13121C] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:border-violet-500/40 hover:text-white"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-white mb-3">Top Artists</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              {allArtists.slice(0, 5).map((artist) => (
                <button
                  key={artist.id}
                  type="button"
                  onClick={() => onOpenArtist(artist.id)}
                  className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-3 text-left hover:bg-[#191726] transition-colors"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-xl">
                    <MediaArtwork src={artist.image_url} alt={artist.name} />
                  </div>
                  <p className="mt-2.5 truncate text-sm font-semibold text-white">{artist.name}</p>
                  <p className="truncate text-xs text-zinc-400">{artist.genre}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-semibold text-white mb-3">Popular Tracks</h2>
            <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
              {allSongs.slice(0, 5).map((song, idx) => (
                <SongRow key={song.id} song={song} index={idx} contextList={allSongs} onArtistClick={onOpenArtist} />
              ))}
            </div>
          </div>
        </div>
      ) : searching ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : totalMatches === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center">
          <p className="text-sm font-medium text-zinc-200">No results matching "{query}"</p>
          <p className="mt-1 text-xs text-zinc-400">Check spelling or try searching by language or artist.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {(filter === 'all' || filter === 'songs') && results.songs.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-white">Songs</h2>
              <div className="rounded-2xl border border-white/[0.07] bg-[#12111A]/80 p-2 divide-y divide-white/[0.04]">
                {results.songs.map((song, idx) => (
                  <SongRow
                    key={song.id}
                    song={song}
                    index={idx}
                    contextList={results.songs}
                    onArtistClick={onOpenArtist}
                  />
                ))}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'artists') && results.artists.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-white">Artists</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {results.artists.map((artist) => (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => onOpenArtist(artist.id)}
                    className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-4 text-left hover:bg-[#191726]"
                  >
                    <div className="aspect-square w-20 overflow-hidden rounded-full">
                      <MediaArtwork src={artist.image_url} alt={artist.name} rounded="rounded-full" />
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-white">{artist.name}</p>
                    <p className="truncate text-xs text-zinc-400">{artist.genre}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'albums') && results.albums.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-white">Albums</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {results.albums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => onOpenAlbum(album.id)}
                    className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-4 text-left hover:bg-[#191726]"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl">
                      <MediaArtwork src={album.cover_url} alt={album.title} />
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-white">{album.title}</p>
                    <p className="truncate text-xs text-zinc-400">
                      {album.artist_name} · {album.release_year}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {(filter === 'all' || filter === 'playlists') && results.playlists.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold text-white">Playlists</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {results.playlists.map((pl) => (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => onOpenPlaylist(pl.id)}
                    className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-4 text-left hover:bg-[#191726]"
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl">
                      <MediaArtwork src={pl.cover_url} alt={pl.name} />
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-white">{pl.name}</p>
                    <p className="truncate text-xs text-zinc-400">{pl.song_count ?? 0} tracks</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
