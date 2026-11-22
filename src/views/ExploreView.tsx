import React, {useEffect, useState} from 'react';
import {Play} from 'lucide-react';
import {SongRow} from '../components/SongRow';
import {usePlayer} from '../context/PlayerContext';
import {api} from '../lib/api';
import type {ExploreCategory, Song} from '../types';

const CATEGORIES: {id: ExploreCategory; label: string; subtitle: string}[] = [
  {id: 'all', label: 'All Tracks', subtitle: 'Complete multi-language catalog'},
  {id: 'hindi', label: 'Hindi Songs', subtitle: 'Soulful acoustic & modern Hindi'},
  {id: 'english', label: 'English Songs', subtitle: 'Synth-pop, indie & dreamwave'},
  {id: 'punjabi', label: 'Punjabi Songs', subtitle: 'Bhangra rhythms & urban bass'},
  {id: 'bhojpuri', label: 'Bhojpuri Songs', subtitle: 'Authentic folk & riverfront grooves'},
  {id: 'bollywood', label: 'Bollywood Hits', subtitle: 'Cinema classics & chart-toppers'},
  {id: 'trending', label: 'Trending Music', subtitle: 'Highest-streamed tracks right now'},
];

interface ExploreViewProps {
  initialCategory?: ExploreCategory;
  fallbackSongs: Song[];
  onOpenArtist: (id: string) => void;
}

export const ExploreView: React.FC<ExploreViewProps> = ({
  initialCategory = 'all',
  fallbackSongs,
  onOpenArtist,
}) => {
  const {playTrack} = usePlayer();
  const [category, setCategory] = useState<ExploreCategory>(initialCategory);
  const [songs, setSongs] = useState<Song[]>(fallbackSongs);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .explore(category)
      .then((res) => {
        if (active) setSongs(res.songs);
      })
      .catch(() => {
        if (active) setSongs(fallbackSongs);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, fallbackSongs]);

  const currentMeta = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{currentMeta.label}</h1>
          <p className="mt-1 text-sm text-zinc-400">{currentMeta.subtitle}</p>
        </div>

        {songs.length > 0 && (
          <button
            type="button"
            onClick={() => playTrack(songs[0], songs)}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="h-4 w-4 fill-white" />
            <span>Play All ({songs.length})</span>
          </button>
        )}
      </div>

      {/* Interactive Category Segmented Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
        {CATEGORIES.map((cat) => {
          const active = cat.id === category;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      ) : songs.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-10 text-center">
          <p className="text-sm font-medium text-zinc-200">No tracks found in {currentMeta.label} yet.</p>
          <p className="mt-1 text-xs text-zinc-400">Try switching categories or upload a new song from Admin.</p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
};
