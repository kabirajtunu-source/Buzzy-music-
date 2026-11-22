import React, {useCallback, useEffect, useState} from 'react';
import {BarChart3, Disc3, ListMusic, Plus, Shield, Trash2, Upload, Users} from 'lucide-react';
import {formatPlayCount} from '../components/SongRow';
import {useAuth} from '../context/AuthContext';
import {api} from '../lib/api';
import type {AdminAnalytics, Album, Artist, Playlist, Song, User} from '../types';

interface AdminDashboardViewProps {
  songs: Song[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
  onRefreshCatalog: () => Promise<void>;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  songs,
  artists,
  albums,
  playlists,
  onRefreshCatalog,
}) => {
  const {user, adminExists, passcodeConfigured, claimAdmin, showToast} = useAuth();
  const [tab, setTab] = useState<'analytics' | 'songs' | 'artists' | 'playlists' | 'users'>('analytics');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [passcode, setPasscode] = useState('');

  // New Song Form
  const [songTitle, setSongTitle] = useState('');
  const [songArtistId, setSongArtistId] = useState(artists[0]?.id || '');
  const [songAlbumId, setSongAlbumId] = useState('');
  const [songLang, setSongLang] = useState('Hindi');
  const [songGenre, setSongGenre] = useState('Bollywood Hits');
  const [songDuration, setSongDuration] = useState(48);
  const [songAudioUrl, setSongAudioUrl] = useState('');
  const [songCoverUrl, setSongCoverUrl] = useState('/src/assets/images/cover_midnight_raga_1795351412436.jpg');
  const [songTrending, setSongTrending] = useState(true);
  const [songFeatured, setSongFeatured] = useState(false);
  const [songBollywood, setSongBollywood] = useState(true);
  const [songNew, setSongNew] = useState(true);
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // New Artist Form
  const [artistName, setArtistName] = useState('');
  const [artistGenre, setArtistGenre] = useState('');
  const [artistBio, setArtistBio] = useState('');
  const [artistImage, setArtistImage] = useState('/src/assets/images/artist_aria_kapoor_1795351413429.jpg');

  // New Album Form
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumArtistId, setAlbumArtistId] = useState(artists[0]?.id || '');
  const [albumYear, setAlbumYear] = useState(2026);
  const [albumLang, setAlbumLang] = useState('Hindi');

  // New Playlist Form
  const [plName, setPlName] = useState('');
  const [plDesc, setPlDesc] = useState('');

  useEffect(() => {
    if (!songArtistId && artists[0]) setSongArtistId(artists[0].id);
    if (!albumArtistId && artists[0]) setAlbumArtistId(artists[0].id);
  }, [artists, songArtistId, albumArtistId]);

  const loadAdminData = useCallback(async () => {
    if (user?.role !== 'admin') return;
    try {
      const [aData, uData] = await Promise.all([api.adminAnalytics(), api.adminGetUsers()]);
      setAnalytics(aData);
      setUsers(uData.users);
    } catch {
      // Ignore transient error
    }
  }, [user?.role]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/[0.08] bg-[#13121C] p-8 text-center space-y-4">
        <Shield className="mx-auto h-10 w-10 text-violet-400" />
        <h1 className="text-xl font-bold text-white">Admin Access Required</h1>
        {!user ? (
          <p className="text-sm text-zinc-400">Sign in first to claim or access the Buzzly Admin Dashboard.</p>
        ) : !adminExists || passcodeConfigured ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await claimAdmin(passcode);
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'Claim failed', 'error');
              }
            }}
            className="space-y-3"
          >
            <p className="text-xs text-zinc-400">
              {!adminExists
                ? 'No admin has been claimed yet. Activate Admin privileges for your account below.'
                : 'Enter the server ADMIN_PASSCODE to unlock Admin tools.'}
            </p>
            {passcodeConfigured && (
              <input
                type="password"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="ADMIN_PASSCODE"
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3.5 py-2 text-sm text-white"
              />
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Claim Admin Dashboard
            </button>
          </form>
        ) : (
          <p className="text-sm text-zinc-400">
            Your account does not have administrator privileges. Contact an existing admin to promote your account.
          </p>
        )}
      </div>
    );
  }

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAudio(true);
    try {
      const res = await api.adminUploadFile(file);
      setSongAudioUrl(res.url);
      showToast(`Uploaded ${res.filename}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleCreateSong = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminCreateSong({
        title: songTitle,
        artist_id: songArtistId,
        album_id: songAlbumId || null,
        language: songLang,
        genre: songGenre,
        duration_sec: songDuration,
        audio_url: songAudioUrl || undefined,
        cover_url: songCoverUrl,
        is_trending: songTrending,
        is_featured: songFeatured,
        is_bollywood: songBollywood,
        is_new_release: songNew,
      });
      setSongTitle('');
      setSongAudioUrl('');
      await Promise.all([onRefreshCatalog(), loadAdminData()]);
      showToast('Song published to catalog');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create song', 'error');
    }
  };

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminCreateArtist({
        name: artistName,
        genre: artistGenre,
        bio: artistBio,
        image_url: artistImage,
      });
      setArtistName('');
      setArtistGenre('');
      setArtistBio('');
      await Promise.all([onRefreshCatalog(), loadAdminData()]);
      showToast('Artist added');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add artist', 'error');
    }
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminCreateAlbum({
        title: albumTitle,
        artist_id: albumArtistId,
        release_year: albumYear,
        language: albumLang,
      });
      setAlbumTitle('');
      await Promise.all([onRefreshCatalog(), loadAdminData()]);
      showToast('Album created');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create album', 'error');
    }
  };

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.adminCreatePlaylist({name: plName, description: plDesc});
      setPlName('');
      setPlDesc('');
      await Promise.all([onRefreshCatalog(), loadAdminData()]);
      showToast('Recommended playlist published');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create playlist', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Admin Studio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage tracks, artists, albums, curated playlists, users, and streaming analytics
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/[0.08] pb-4">
        {[
          {id: 'analytics' as const, label: 'Analytics', icon: BarChart3},
          {id: 'songs' as const, label: 'Songs', icon: Disc3},
          {id: 'artists' as const, label: 'Artists & Albums', icon: Users},
          {id: 'playlists' as const, label: 'Playlists', icon: ListMusic},
          {id: 'users' as const, label: 'Users', icon: Shield},
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

      {tab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-4">
              <p className="text-xs text-zinc-400">Total Streams</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                {formatPlayCount(analytics.summary.totalPlays)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-4">
              <p className="text-xs text-zinc-400">Registered Users</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                {analytics.summary.usersCount}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-violet-300 tabular-nums">
                {analytics.summary.premiumCount} Premium
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-4">
              <p className="text-xs text-zinc-400">Catalog Tracks</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                {analytics.summary.songsCount}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                {analytics.summary.artistsCount} artists · {analytics.summary.albumsCount} albums
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-4">
              <p className="text-xs text-zinc-400">Offline Caches</p>
              <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
                {analytics.summary.offlineCount}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-zinc-400 tabular-nums">
                {analytics.summary.playlistsCount} playlists
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-5">
              <h2 className="text-sm font-bold text-white mb-4">Streams by Language</h2>
              <div className="space-y-3">
                {analytics.languageStats.map((stat) => {
                  const max = Math.max(...analytics.languageStats.map((s) => s.plays), 1);
                  const pct = Math.round((stat.plays / max) * 100);
                  return (
                    <div key={stat.language} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-zinc-200">
                          {stat.language} ({stat.track_count} tracks)
                        </span>
                        <span className="font-mono text-zinc-400 tabular-nums">{formatPlayCount(stat.plays)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full bg-violet-500" style={{width: `${pct}%`}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-5">
              <h2 className="text-sm font-bold text-white mb-4">Top Performing Tracks</h2>
              <div className="divide-y divide-white/[0.06]">
                {analytics.topTracks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-medium text-white">{t.title}</p>
                      <p className="truncate text-xs text-zinc-400">
                        {t.artist_name} · {t.language}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-violet-300 tabular-nums shrink-0">
                      {formatPlayCount(t.play_count)} plays
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'songs' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateSong} className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Upload or Add New Song</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Song Title</label>
                <input
                  type="text"
                  required
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="e.g. Dil Ki Awaaz"
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Artist</label>
                <select
                  value={songArtistId}
                  onChange={(e) => setSongArtistId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                >
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Album (optional)</label>
                <select
                  value={songAlbumId}
                  onChange={(e) => setSongAlbumId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                >
                  <option value="">Single</option>
                  {albums.map((alb) => (
                    <option key={alb.id} value={alb.id}>
                      {alb.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Language</label>
                <select
                  value={songLang}
                  onChange={(e) => setSongLang(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                >
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Bhojpuri">Bhojpuri</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Genre</label>
                <input
                  type="text"
                  required
                  value={songGenre}
                  onChange={(e) => setSongGenre(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Duration (sec)</label>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  value={songDuration}
                  onChange={(e) => setSongDuration(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-zinc-400">
                  Audio File Upload (.mp3, .wav, .ogg) or Leave Empty for Built-in Studio Audio
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.1]">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingAudio ? 'Uploading...' : 'Upload Audio File'}</span>
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.m4a"
                      onChange={handleAudioFileUpload}
                      className="hidden"
                    />
                  </label>
                  <input
                    type="text"
                    value={songAudioUrl}
                    onChange={(e) => setSongAudioUrl(e.target.value)}
                    placeholder="/uploads/... or leave blank for auto-stream"
                    className="flex-1 min-w-[200px] rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-400">Cover Artwork</label>
                <select
                  value={songCoverUrl}
                  onChange={(e) => setSongCoverUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                >
                  <option value="/src/assets/images/cover_midnight_raga_1795351412436.jpg">Midnight Raga</option>
                  <option value="/src/assets/images/cover_punjabi_anthem_1795351411887.jpg">Amber Pulse</option>
                  <option value="/src/assets/images/cover_velvet_frequency_1795351412420.jpg">Velvet Prism</option>
                  <option value="/src/assets/images/cover_folk_riverfront_1795351411959.jpg">Riverfront Lanterns</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1 text-xs text-zinc-300">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={songTrending} onChange={(e) => setSongTrending(e.target.checked)} className="accent-violet-500" />
                Trending
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={songFeatured} onChange={(e) => setSongFeatured(e.target.checked)} className="accent-violet-500" />
                Featured
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={songBollywood} onChange={(e) => setSongBollywood(e.target.checked)} className="accent-violet-500" />
                Bollywood Hits
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={songNew} onChange={(e) => setSongNew(e.target.checked)} className="accent-violet-500" />
                New Release
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              <span>Publish Song</span>
            </button>
          </form>

          <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#13121C]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.08] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Track</th>
                  <th className="px-4 py-3">Artist</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3 text-right">Plays</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-zinc-200">
                {songs.map((s) => (
                  <tr key={s.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-medium">{s.title}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.artist_name}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.language}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{formatPlayCount(s.play_count)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={async () => {
                          await api.adminDeleteSong(s.id);
                          await Promise.all([onRefreshCatalog(), loadAdminData()]);
                          showToast('Song deleted');
                        }}
                        className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400"
                        aria-label={`Delete ${s.title}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'artists' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <form onSubmit={handleCreateArtist} className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-5 space-y-3">
              <h2 className="text-sm font-bold text-white">Add Artist</h2>
              <input
                type="text"
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                placeholder="Artist Name"
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                required
                value={artistGenre}
                onChange={(e) => setArtistGenre(e.target.value)}
                placeholder="Primary Genre (e.g. Hindi Indie)"
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
              />
              <textarea
                rows={2}
                value={artistBio}
                onChange={(e) => setArtistBio(e.target.value)}
                placeholder="Short artist biography"
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
              />
              <select
                value={artistImage}
                onChange={(e) => setArtistImage(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
              >
                <option value="/src/assets/images/artist_aria_kapoor_1795351413429.jpg">Portrait A</option>
                <option value="/src/assets/images/artist_kabir_gill_1795351412862.jpg">Portrait B</option>
                <option value="/src/assets/images/artist_elena_vance_1795351411668.jpg">Portrait C</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Add Artist
              </button>
            </form>

            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] divide-y divide-white/[0.05]">
              {artists.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{a.name}</p>
                    <p className="text-xs text-zinc-400">{a.genre}</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.adminDeleteArtist(a.id);
                      await Promise.all([onRefreshCatalog(), loadAdminData()]);
                      showToast('Artist removed');
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-400"
                    aria-label={`Delete ${a.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleCreateAlbum} className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-5 space-y-3">
              <h2 className="text-sm font-bold text-white">Add Album</h2>
              <input
                type="text"
                required
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="Album Title"
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={albumArtistId}
                  onChange={(e) => setAlbumArtistId(e.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
                >
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={albumYear}
                  onChange={(e) => setAlbumYear(Number(e.target.value))}
                  className="rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white font-mono"
                />
              </div>
              <select
                value={albumLang}
                onChange={(e) => setAlbumLang(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
              >
                <option value="Hindi">Hindi</option>
                <option value="English">English</option>
                <option value="Punjabi">Punjabi</option>
                <option value="Bhojpuri">Bhojpuri</option>
              </select>
              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
              >
                Create Album
              </button>
            </form>

            <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] divide-y divide-white/[0.05]">
              {albums.map((alb) => (
                <div key={alb.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{alb.title}</p>
                    <p className="text-xs text-zinc-400">
                      {alb.artist_name} · {alb.release_year} · {alb.language}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.adminDeleteAlbum(alb.id);
                      await Promise.all([onRefreshCatalog(), loadAdminData()]);
                      showToast('Album removed');
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-400"
                    aria-label={`Delete ${alb.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'playlists' && (
        <div className="space-y-6">
          <form onSubmit={handleCreatePlaylist} className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-5 space-y-3 max-w-xl">
            <h2 className="text-sm font-bold text-white">Create Recommended Playlist</h2>
            <input
              type="text"
              required
              value={plName}
              onChange={(e) => setPlName(e.target.value)}
              placeholder="Playlist Name"
              className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
            />
            <input
              type="text"
              value={plDesc}
              onChange={(e) => setPlDesc(e.target.value)}
              placeholder="Description"
              className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3 py-2 text-sm text-white"
            />
            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500"
            >
              Publish Playlist
            </button>
          </form>

          <div className="rounded-2xl border border-white/[0.08] bg-[#13121C] divide-y divide-white/[0.05]">
            {playlists.map((pl) => (
              <div key={pl.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-white">{pl.name}</p>
                  <p className="text-xs text-zinc-400">
                    {pl.song_count ?? 0} tracks · {pl.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await api.adminDeletePlaylist(pl.id);
                    await Promise.all([onRefreshCatalog(), loadAdminData()]);
                    showToast('Playlist deleted');
                  }}
                  className="p-2 text-zinc-400 hover:text-rose-400"
                  aria-label={`Delete ${pl.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#13121C]">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/[0.08] text-zinc-400">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-zinc-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.plan}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={async () => {
                        await api.adminUpdateUser(u.id, {
                          plan: u.plan === 'premium' ? 'free' : 'premium',
                        });
                        await loadAdminData();
                        showToast(`Updated ${u.name}'s plan`);
                      }}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs hover:bg-white/[0.1]"
                    >
                      Toggle Plan
                    </button>
                    {u.id !== user.id && (
                      <button
                        type="button"
                        onClick={async () => {
                          await api.adminUpdateUser(u.id, {
                            role: u.role === 'admin' ? 'user' : 'admin',
                          });
                          await loadAdminData();
                          showToast(`Updated ${u.name}'s role`);
                        }}
                        className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs text-violet-200 hover:bg-violet-500/20"
                      >
                        {u.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
