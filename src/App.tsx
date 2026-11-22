import React, {useCallback, useEffect, useState} from 'react';
import {
  Compass,
  Crown,
  Disc3,
  Home,
  Library,
  Search,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import {motion} from 'motion/react';
import {AuthModal} from './components/AuthModal';
import {MusicPlayerBar} from './components/MusicPlayerBar';
import {OfflineIndicator, PWAInstallButton} from './components/PWAInstallButton';
import {AuthProvider, useAuth} from './context/AuthContext';
import {PlayerProvider, usePlayer} from './context/PlayerContext';
import {api} from './lib/api';
import type {ActiveView, Album, Artist, ExploreCategory, Playlist, Song} from './types';
import {AdminDashboardView} from './views/AdminDashboardView';
import {DetailView} from './views/DetailView';
import {ExploreView} from './views/ExploreView';
import {HomeView} from './views/HomeView';
import {LibraryView} from './views/LibraryView';
import {PremiumView} from './views/PremiumView';
import {ProfileView} from './views/ProfileView';
import {SearchView} from './views/SearchView';

const BuzzlyShell: React.FC = () => {
  const {user, userPlaylists, openAuthModal, toast} = useAuth();
  const {currentTrack} = usePlayer();

  const [view, setView] = useState<ActiveView>({type: 'home'});
  const [history, setHistory] = useState<ActiveView[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCatalog = useCallback(async () => {
    try {
      const data = await api.getCatalog();
      setSongs(data.songs);
      setArtists(data.artists);
      setAlbums(data.albums);
      setPlaylists(data.playlists);
    } catch {
      // Offline mode falls back to previously loaded state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const navigateTo = useCallback(
    (next: ActiveView) => {
      setHistory((prev) => [...prev.slice(-10), view]);
      setView(next);
      window.scrollTo({top: 0, behavior: 'smooth'});
    },
    [view]
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        setView({type: 'home'});
        return [];
      }
      const last = prev[prev.length - 1];
      setView(last);
      return prev.slice(0, -1);
    });
  }, []);

  const navItems: {id: ActiveView['type']; label: string; icon: React.FC<{className?: string}>}[] = [
    {id: 'home', label: 'Home', icon: Home},
    {id: 'explore', label: 'Explore', icon: Compass},
    {id: 'search', label: 'Search', icon: Search},
    {id: 'library', label: 'Library', icon: Library},
    {id: 'premium', label: 'Premium', icon: Crown},
  ];

  const viewTitleMap: Record<ActiveView['type'], string> = {
    home: 'Home',
    explore: 'Explore',
    search: 'Search',
    library: 'Library',
    premium: 'Membership',
    profile: 'Profile',
    admin: 'Admin Studio',
    playlist: 'Playlist',
    artist: 'Artist',
    album: 'Album',
  };

  return (
    <div className="min-h-screen buzzly-ambient-bg text-[#F5F4FA] flex flex-col md:flex-row">
      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 w-60 flex-col justify-between border-r border-white/[0.08] bg-[#0B0A11]/95 backdrop-blur-xl px-4 py-5">
        <div className="space-y-6 overflow-y-auto pr-1">
          <button
            type="button"
            onClick={() => navigateTo({type: 'home'})}
            className="flex items-center gap-2.5 px-2 text-left whitespace-nowrap shrink-0"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-lg shadow-violet-600/20">
              <Disc3 className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-white">
              Buzzly Music
            </span>
          </button>

          <nav className="space-y-1" aria-label="Main navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = view.type === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    item.id === 'explore'
                      ? navigateTo({type: 'explore', category: 'all'})
                      : navigateTo({type: item.id as 'home' | 'search' | 'library' | 'premium'})
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-violet-600/20 text-white'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-violet-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => navigateTo({type: 'admin'})}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  view.type === 'admin'
                    ? 'bg-violet-600/20 text-white'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100'
                }`}
              >
                <Shield className={`h-4 w-4 shrink-0 ${view.type === 'admin' ? 'text-violet-400' : ''}`} />
                <span>Admin Studio</span>
              </button>
            )}
          </nav>

          {/* Playlists quick list */}
          <div className="border-t border-white/[0.08] pt-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-zinc-400">Playlists</span>
              <button
                type="button"
                onClick={() => navigateTo({type: 'library', tab: 'playlists'})}
                className="text-xs text-violet-400 hover:text-violet-300"
              >
                Manage
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(userPlaylists.length > 0 ? userPlaylists : playlists.slice(0, 4)).map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => navigateTo({type: 'playlist', id: pl.id})}
                  className={`block w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                    view.type === 'playlist' && view.id === pl.id
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                  }`}
                >
                  {pl.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`space-y-2.5 pt-4 ${currentTrack ? 'pb-20' : ''}`}>
          <OfflineIndicator />
          <PWAInstallButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-60 flex flex-col min-w-0">
        {/* Top Bar Contract: 3 clean zones separated by gap-8 */}
        <header className="flex items-center justify-between gap-8 border-b border-white/[0.07] bg-[#0B0A11]/80 backdrop-blur-md px-4 sm:px-8 py-3.5">
          {/* Zone 1: Brand on mobile / Breadcrumb on desktop */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigateTo({type: 'home'})}
              className="md:hidden font-display text-base font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
            >
              Buzzly Music
            </button>
            <span className="hidden md:inline text-sm font-semibold text-zinc-200 whitespace-nowrap shrink-0">
              Buzzly / {viewTitleMap[view.type]}
            </span>
          </div>

          {/* Zone 2: Concise single-line navigation links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <button
              type="button"
              onClick={() => navigateTo({type: 'explore', category: 'hindi'})}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Hindi
            </button>
            <button
              type="button"
              onClick={() => navigateTo({type: 'explore', category: 'punjabi'})}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Punjabi
            </button>
            <button
              type="button"
              onClick={() => navigateTo({type: 'explore', category: 'english'})}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              English
            </button>
            <button
              type="button"
              onClick={() => navigateTo({type: 'explore', category: 'bhojpuri'})}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Bhojpuri
            </button>
            <button
              type="button"
              onClick={() => navigateTo({type: 'explore', category: 'bollywood'})}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Bollywood
            </button>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <button
                type="button"
                onClick={() => navigateTo({type: 'profile'})}
                className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/[0.1] transition-colors whitespace-nowrap shrink-0"
              >
                <UserIcon className="h-3.5 w-3.5 text-violet-400" />
                <span className="max-w-[120px] truncate">{user.name}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 transition-colors whitespace-nowrap shrink-0"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        {/* Mobile Offline Banner */}
        <div className="md:hidden px-4 pt-2 empty:hidden">
          <OfflineIndicator />
        </div>

        {/* Viewport Content */}
        <main
          className={`mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8 ${
            currentTrack ? 'pb-36 md:pb-28' : 'pb-24 md:pb-12'
          }`}
        >
          {loading ? (
            <div className="space-y-6">
              <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
              <div className="h-48 animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
          ) : (
            <motion.div
              key={`${view.type}-${'id' in view ? view.id : 'category' in view ? view.category : ''}`}
              initial={{opacity: 0, y: 6}}
              animate={{opacity: 1, y: 0}}
              transition={{duration: 0.16, ease: [0.16, 1, 0.3, 1]}}
            >
              {view.type === 'home' && (
                <HomeView
                  songs={songs}
                  artists={artists}
                  albums={albums}
                  playlists={playlists}
                  onNavigateExplore={(category: ExploreCategory) => navigateTo({type: 'explore', category})}
                  onOpenPlaylist={(id) => navigateTo({type: 'playlist', id})}
                  onOpenArtist={(id) => navigateTo({type: 'artist', id})}
                  onOpenAlbum={(id) => navigateTo({type: 'album', id})}
                />
              )}

              {view.type === 'explore' && (
                <ExploreView
                  initialCategory={view.category}
                  fallbackSongs={songs}
                  onOpenArtist={(id) => navigateTo({type: 'artist', id})}
                />
              )}

              {view.type === 'search' && (
                <SearchView
                  allSongs={songs}
                  allArtists={artists}
                  onOpenArtist={(id) => navigateTo({type: 'artist', id})}
                  onOpenAlbum={(id) => navigateTo({type: 'album', id})}
                  onOpenPlaylist={(id) => navigateTo({type: 'playlist', id})}
                />
              )}

              {view.type === 'library' && (
                <LibraryView
                  initialTab={view.tab}
                  onOpenPlaylist={(id) => navigateTo({type: 'playlist', id})}
                  onOpenArtist={(id) => navigateTo({type: 'artist', id})}
                />
              )}

              {view.type === 'premium' && <PremiumView />}

              {view.type === 'profile' && (
                <ProfileView
                  onOpenAdmin={() => navigateTo({type: 'admin'})}
                  onOpenPremium={() => navigateTo({type: 'premium'})}
                />
              )}

              {view.type === 'admin' && (
                <AdminDashboardView
                  songs={songs}
                  artists={artists}
                  albums={albums}
                  playlists={playlists}
                  onRefreshCatalog={loadCatalog}
                />
              )}

              {(view.type === 'playlist' || view.type === 'artist' || view.type === 'album') && (
                <DetailView
                  mode={view.type}
                  id={view.id}
                  onBack={goBack}
                  onOpenArtist={(id) => navigateTo({type: 'artist', id})}
                  onOpenAlbum={(id) => navigateTo({type: 'album', id})}
                />
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Fixed 56px height) */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 grid h-14 grid-cols-5 items-center border-t border-white/[0.08] bg-[#0B0A11]/95 backdrop-blur-xl"
      >
        {[
          {id: 'home' as const, label: 'Home', icon: Home},
          {id: 'explore' as const, label: 'Explore', icon: Compass},
          {id: 'search' as const, label: 'Search', icon: Search},
          {id: 'library' as const, label: 'Library', icon: Library},
          {id: 'profile' as const, label: 'Profile', icon: UserIcon},
        ].map((item) => {
          const Icon = item.icon;
          const active = view.type === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                item.id === 'explore'
                  ? navigateTo({type: 'explore', category: 'all'})
                  : navigateTo({type: item.id})
              }
              className={`flex h-full flex-col items-center justify-center gap-0.5 ${
                active ? 'text-violet-400' : 'text-zinc-400'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <MusicPlayerBar onOpenPremium={() => navigateTo({type: 'premium'})} />
      <AuthModal />

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-50 rounded-xl border px-4 py-2.5 text-xs font-medium shadow-2xl ${
            toast.tone === 'error'
              ? 'border-rose-500/40 bg-rose-950/95 text-rose-100'
              : 'border-violet-500/40 bg-[#181426]/95 text-violet-100'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PlayerProvider>
        <BuzzlyShell />
      </PlayerProvider>
    </AuthProvider>
  );
}
