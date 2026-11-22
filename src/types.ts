export type UserRole = 'user' | 'admin';
export type MembershipPlan = 'free' | 'premium';
export type RepeatMode = 'off' | 'all' | 'one';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: UserRole;
  plan: MembershipPlan;
  created_at: string;
}

export interface Artist {
  id: string;
  name: string;
  genre: string;
  bio: string;
  image_url: string;
  monthly_listeners: number;
  created_at?: string;
}

export interface Album {
  id: string;
  title: string;
  artist_id: string;
  artist_name?: string;
  release_year: number;
  cover_url: string;
  language: string;
  created_at?: string;
}

export interface Song {
  id: string;
  title: string;
  artist_id: string;
  artist_name: string;
  artist_image?: string;
  album_id: string | null;
  album_title?: string | null;
  duration_sec: number;
  audio_url: string;
  cover_url: string;
  language: string;
  genre: string;
  is_bollywood: number;
  is_featured: number;
  is_trending: number;
  is_new_release: number;
  play_count: number;
  created_at?: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  user_id: string | null;
  cover_url: string;
  is_public: number;
  is_recommended: number;
  song_count?: number;
  created_at?: string;
}

export interface LibraryData {
  likedSongs: Song[];
  recentlyPlayed: Song[];
  playlists: Playlist[];
  offlineDownloads: Song[];
}

export interface AdminAnalytics {
  summary: {
    usersCount: number;
    premiumCount: number;
    songsCount: number;
    artistsCount: number;
    albumsCount: number;
    playlistsCount: number;
    offlineCount: number;
    totalPlays: number;
  };
  languageStats: {
    language: string;
    track_count: number;
    plays: number;
  }[];
  topTracks: Song[];
}

export type ActiveView =
  | {type: 'home'}
  | {type: 'explore'; category?: ExploreCategory}
  | {type: 'search'}
  | {type: 'library'; tab?: 'liked' | 'recent' | 'playlists' | 'offline'}
  | {type: 'premium'}
  | {type: 'profile'}
  | {type: 'admin'}
  | {type: 'playlist'; id: string}
  | {type: 'artist'; id: string}
  | {type: 'album'; id: string};

export type ExploreCategory =
  | 'all'
  | 'hindi'
  | 'english'
  | 'punjabi'
  | 'bhojpuri'
  | 'bollywood'
  | 'trending';
