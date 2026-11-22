import type {
  AdminAnalytics,
  Album,
  Artist,
  ExploreCategory,
  LibraryData,
  MembershipPlan,
  Playlist,
  Song,
  User,
} from '../types';

// Keep Bearer token strictly in memory — never in localStorage or sessionStorage.
let memoryBearerToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryBearerToken = token;
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'BuzzlyWeb');
  if (memoryBearerToken) {
    headers.set('Authorization', `Bearer ${memoryBearerToken}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as {error?: string})?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const OFFLINE_CACHE_NAME = 'buzzly-offline-audio-v1';

export async function cacheTrackForOffline(song: Song): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await cache.add(song.audio_url);
  if (song.cover_url) {
    await cache.add(song.cover_url).catch(() => undefined);
  }
}

export async function removeTrackFromOfflineCache(song: Song): Promise<void> {
  if (typeof caches === 'undefined') return;
  const cache = await caches.open(OFFLINE_CACHE_NAME);
  await cache.delete(song.audio_url);
}

export async function resolveOfflineAudioSrc(audioUrl: string): Promise<string | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const match = await cache.match(audioUrl);
    if (!match) return null;
    const blob = await match.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

export const api = {
  getMe: () =>
    apiFetch<{
      user: User | null;
      adminExists: boolean;
      passcodeConfigured: boolean;
      googleClientId: string | null;
    }>('/api/auth/me'),

  googleLogin: async (idToken: string) => {
    const res = await apiFetch<{user: User; token: string}>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({idToken}),
    });
    setAuthToken(res.token);
    return res.user;
  },

  logout: async () => {
    await apiFetch<{ok: boolean}>('/api/auth/logout', {method: 'POST'});
    setAuthToken(null);
  },

  updateProfile: (name: string, avatar_url: string | null) =>
    apiFetch<{user: User}>('/api/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify({name, avatar_url}),
    }),

  claimAdmin: (passcode: string) =>
    apiFetch<{user: User}>('/api/auth/claim-admin', {
      method: 'POST',
      body: JSON.stringify({passcode}),
    }),

  getCatalog: () =>
    apiFetch<{
      songs: Song[];
      artists: Artist[];
      albums: Album[];
      playlists: Playlist[];
      likedSongIds: string[];
      offlineSongIds: string[];
    }>('/api/catalog'),

  explore: (category: ExploreCategory) =>
    apiFetch<{songs: Song[]; category: string}>(`/api/explore?category=${encodeURIComponent(category)}`),

  search: (q: string) =>
    apiFetch<{songs: Song[]; artists: Artist[]; albums: Album[]; playlists: Playlist[]}>(
      `/api/search?q=${encodeURIComponent(q)}`
    ),

  getArtist: (id: string) =>
    apiFetch<{artist: Artist; albums: Album[]; songs: Song[]}>(`/api/artists/${encodeURIComponent(id)}`),

  getAlbum: (id: string) =>
    apiFetch<{album: Album; songs: Song[]}>(`/api/albums/${encodeURIComponent(id)}`),

  getPlaylist: (id: string) =>
    apiFetch<{playlist: Playlist; songs: Song[]}>(`/api/playlists/${encodeURIComponent(id)}`),

  recordPlay: (songId: string) =>
    apiFetch<{ok: boolean}>(`/api/songs/${encodeURIComponent(songId)}/play`, {method: 'POST'}),

  getLibrary: () => apiFetch<LibraryData>('/api/library'),

  toggleLike: (songId: string) =>
    apiFetch<{liked: boolean}>(`/api/library/likes/${encodeURIComponent(songId)}`, {method: 'POST'}),

  markOfflineDownloaded: (songId: string) =>
    apiFetch<{downloaded: boolean}>(`/api/library/offline/${encodeURIComponent(songId)}`, {method: 'POST'}),

  removeOfflineDownloaded: (songId: string) =>
    apiFetch<{downloaded: boolean}>(`/api/library/offline/${encodeURIComponent(songId)}`, {method: 'DELETE'}),

  createPlaylist: (name: string, description: string, cover_url?: string) =>
    apiFetch<{playlist: Playlist}>('/api/playlists', {
      method: 'POST',
      body: JSON.stringify({name, description, cover_url}),
    }),

  deletePlaylist: (id: string) =>
    apiFetch<{ok: boolean}>(`/api/playlists/${encodeURIComponent(id)}`, {method: 'DELETE'}),

  addSongToPlaylist: (playlistId: string, songId: string) =>
    apiFetch<{ok: boolean}>(`/api/playlists/${encodeURIComponent(playlistId)}/songs`, {
      method: 'POST',
      body: JSON.stringify({songId}),
    }),

  removeSongFromPlaylist: (playlistId: string, songId: string) =>
    apiFetch<{ok: boolean}>(
      `/api/playlists/${encodeURIComponent(playlistId)}/songs/${encodeURIComponent(songId)}`,
      {method: 'DELETE'}
    ),

  subscribePlan: (plan: MembershipPlan) =>
    apiFetch<{user: User}>('/api/membership/subscribe', {
      method: 'POST',
      body: JSON.stringify({plan}),
    }),

  // Admin endpoints
  adminAnalytics: () => apiFetch<AdminAnalytics>('/api/admin/analytics'),

  adminUploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch<{url: string; filename: string}>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });
  },

  adminCreateSong: (payload: {
    title: string;
    artist_id: string;
    album_id?: string | null;
    language: string;
    genre: string;
    duration_sec: number;
    audio_url?: string;
    cover_url?: string;
    is_bollywood?: boolean;
    is_featured?: boolean;
    is_trending?: boolean;
    is_new_release?: boolean;
  }) =>
    apiFetch<{song: Song}>('/api/admin/songs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminUpdateSong: (
    id: string,
    payload: Partial<{
      title: string;
      language: string;
      genre: string;
      is_bollywood: boolean;
      is_featured: boolean;
      is_trending: boolean;
      is_new_release: boolean;
    }>
  ) =>
    apiFetch<{song: Song}>(`/api/admin/songs/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  adminDeleteSong: (id: string) =>
    apiFetch<{ok: boolean}>(`/api/admin/songs/${encodeURIComponent(id)}`, {method: 'DELETE'}),

  adminCreateArtist: (payload: {
    name: string;
    genre: string;
    bio: string;
    image_url?: string;
    monthly_listeners?: number;
  }) =>
    apiFetch<{artist: Artist}>('/api/admin/artists', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminDeleteArtist: (id: string) =>
    apiFetch<{ok: boolean}>(`/api/admin/artists/${encodeURIComponent(id)}`, {method: 'DELETE'}),

  adminCreateAlbum: (payload: {
    title: string;
    artist_id: string;
    release_year: number;
    language: string;
    cover_url?: string;
  }) =>
    apiFetch<{album: Album}>('/api/admin/albums', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminDeleteAlbum: (id: string) =>
    apiFetch<{ok: boolean}>(`/api/admin/albums/${encodeURIComponent(id)}`, {method: 'DELETE'}),

  adminCreatePlaylist: (payload: {name: string; description: string; cover_url?: string}) =>
    apiFetch<{playlist: Playlist}>('/api/admin/playlists', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminDeletePlaylist: (id: string) =>
    apiFetch<{ok: boolean}>(`/api/admin/playlists/${encodeURIComponent(id)}`, {method: 'DELETE'}),

  adminGetUsers: () => apiFetch<{users: User[]}>('/api/admin/users'),

  adminUpdateUser: (id: string, payload: Partial<{role: 'user' | 'admin'; plan: MembershipPlan}>) =>
    apiFetch<{user: User}>(`/api/admin/users/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};
