import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'buzzly.db');
export const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'premium')),
      google_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS artists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      genre TEXT NOT NULL,
      bio TEXT NOT NULL,
      image_url TEXT NOT NULL,
      monthly_listeners INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS albums (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      release_year INTEGER NOT NULL,
      cover_url TEXT NOT NULL,
      language TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      artist_id TEXT NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
      album_id TEXT REFERENCES albums(id) ON DELETE SET NULL,
      duration_sec INTEGER NOT NULL,
      audio_url TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      language TEXT NOT NULL,
      genre TEXT NOT NULL,
      is_bollywood INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_trending INTEGER NOT NULL DEFAULT 0,
      is_new_release INTEGER NOT NULL DEFAULT 0,
      play_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      cover_url TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      is_recommended INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playlist_songs (
      playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
      song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      position INTEGER NOT NULL DEFAULT 0,
      added_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (playlist_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS liked_songs (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, song_id)
    );

    CREATE TABLE IF NOT EXISTS recently_played (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      played_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offline_downloads (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      song_id TEXT NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
      downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, song_id)
    );
  `);

  const artistCount = (db.prepare('SELECT COUNT(*) as count FROM artists').get() as {count: number}).count;
  if (artistCount === 0) {
    seedCatalog();
  }
}

function seedCatalog() {
  const insertArtist = db.prepare(`
    INSERT INTO artists (id, name, genre, bio, image_url, monthly_listeners)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertAlbum = db.prepare(`
    INSERT INTO albums (id, title, artist_id, release_year, cover_url, language)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const insertSong = db.prepare(`
    INSERT INTO songs (
      id, title, artist_id, album_id, duration_sec, audio_url, cover_url,
      language, genre, is_bollywood, is_featured, is_trending, is_new_release, play_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPlaylist = db.prepare(`
    INSERT INTO playlists (id, name, description, user_id, cover_url, is_public, is_recommended)
    VALUES (?, ?, ?, NULL, ?, 1, ?)
  `);
  const insertPlaylistSong = db.prepare(`
    INSERT INTO playlist_songs (playlist_id, song_id, position)
    VALUES (?, ?, ?)
  `);

  const ARTISTS = [
    [
      'art-aria',
      'Aria Kapoor',
      'Hindi / Bollywood Acoustic',
      'Mumbai-based vocalist blending classical Hindustani motifs with nocturnal analog production.',
      '/src/assets/images/artist_aria_kapoor_1795351413429.jpg',
      4820000,
    ],
    [
      'art-kabir',
      'Kabir Gill',
      'Punjabi Hip-Hop & Bhangra',
      'Producer and lyricist pairing heavy 808 percussion with traditional Punjabi folk hooks.',
      '/src/assets/images/artist_kabir_gill_1795351412862.jpg',
      6150000,
    ],
    [
      'art-elena',
      'Elena Vance',
      'English Electronic Pop',
      'London-born singer crafting crystalline synth-pop and late-night velvet anthems.',
      '/src/assets/images/artist_elena_vance_1795351411668.jpg',
      5390000,
    ],
    [
      'art-rohan',
      'Rohan Verma',
      'Bollywood & Hindi Lo-Fi',
      'Film composer known for rain-drenched acoustic arrangements and sweeping string ballads.',
      '/src/assets/images/cover_midnight_raga_1795351412436.jpg',
      3740000,
    ],
    [
      'art-suman',
      'Suman Tiwari',
      'Bhojpuri Folk Fusion',
      'Modernizing eastern folk storytelling with warm acoustic grooves and riverfront percussion.',
      '/src/assets/images/cover_folk_riverfront_1795351411959.jpg',
      2910000,
    ],
  ] as const;

  const ALBUMS = [
    ['alb-midnight-raga', 'Midnight Raga', 'art-aria', 2026, '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 'Hindi'],
    ['alb-amber-pulse', 'Amber Pulse', 'art-kabir', 2026, '/src/assets/images/cover_punjabi_anthem_1795351411887.jpg', 'Punjabi'],
    ['alb-velvet-freq', 'Velvet Frequency', 'art-elena', 2026, '/src/assets/images/cover_velvet_frequency_1795351412420.jpg', 'English'],
    ['alb-monsoon-tape', 'Monsoon Tapes', 'art-rohan', 2025, '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 'Hindi'],
    ['alb-ghat-lanterns', 'Ghat Lanterns', 'art-suman', 2026, '/src/assets/images/cover_folk_riverfront_1795351411959.jpg', 'Bhojpuri'],
  ] as const;

  const SONGS = [
    ['song-1', 'Chaand Ni Raat', 'art-aria', 'alb-midnight-raga', 48, '/api/audio/chaand-ni-raat.wav', '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 'Hindi', 'Bollywood Soul', 1, 1, 1, 1, 1842000],
    ['song-2', 'Pind Di Hawa', 'art-kabir', 'alb-amber-pulse', 44, '/api/audio/pind-di-hawa.wav', '/src/assets/images/cover_punjabi_anthem_1795351411887.jpg', 'Punjabi', 'Punjabi Pop', 0, 1, 1, 1, 2415000],
    ['song-3', 'Midnight Velvet', 'art-elena', 'alb-velvet-freq', 48, '/api/audio/midnight-velvet.wav', '/src/assets/images/cover_velvet_frequency_1795351412420.jpg', 'English', 'Synth Pop', 0, 1, 1, 0, 1980000],
    ['song-4', 'Ganga Kinare', 'art-suman', 'alb-ghat-lanterns', 45, '/api/audio/ganga-kinare.wav', '/src/assets/images/cover_folk_riverfront_1795351411959.jpg', 'Bhojpuri', 'Folk Fusion', 0, 0, 1, 1, 1120000],
    ['song-5', 'Baarish Echoes', 'art-rohan', 'alb-monsoon-tape', 45, '/api/audio/baarish-echoes.wav', '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 'Hindi', 'Hindi Lo-Fi', 1, 0, 1, 0, 1590000],
    ['song-6', 'Ishq Ka Safar', 'art-aria', 'alb-midnight-raga', 50, '/api/audio/ishq-ka-safar.wav', '/src/assets/images/artist_aria_kapoor_1795351413429.jpg', 'Hindi', 'Bollywood Romantic', 1, 0, 1, 1, 2230000],
    ['song-7', 'Amber Bhangra', 'art-kabir', 'alb-amber-pulse', 42, '/api/audio/amber-bhangra.wav', '/src/assets/images/cover_punjabi_anthem_1795351411887.jpg', 'Punjabi', 'Bhangra Beats', 0, 0, 1, 0, 1675000],
    ['song-8', 'Glass Horizon', 'art-elena', 'alb-velvet-freq', 46, '/api/audio/glass-horizon.wav', '/src/assets/images/cover_velvet_frequency_1795351412420.jpg', 'English', 'Indie Electronic', 0, 0, 0, 1, 980000],
    ['song-9', 'Mehfil-e-Shab', 'art-rohan', 'alb-monsoon-tape', 46, '/api/audio/mehfil-e-shab.wav', '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 'Hindi', 'Bollywood Classic', 1, 0, 0, 0, 1340000],
    ['song-10', 'Patiala Nights', 'art-kabir', 'alb-amber-pulse', 46, '/api/audio/patiala-nights.wav', '/src/assets/images/artist_kabir_gill_1795351412862.jpg', 'Punjabi', 'Urban Punjabi', 0, 0, 1, 1, 1890000],
    ['song-11', 'Static Bloom', 'art-elena', 'alb-velvet-freq', 44, '/api/audio/static-bloom.wav', '/src/assets/images/artist_elena_vance_1795351411668.jpg', 'English', 'Alt Pop', 0, 0, 0, 1, 865000],
    ['song-12', 'Sawan Jhoola', 'art-suman', 'alb-ghat-lanterns', 44, '/api/audio/sawan-jhoola.wav', '/src/assets/images/cover_folk_riverfront_1795351411959.jpg', 'Bhojpuri', 'Bhojpuri Folk', 0, 0, 0, 1, 945000],
    ['song-13', 'Neon Afterglow', 'art-elena', 'alb-velvet-freq', 45, '/api/audio/neon-afterglow.wav', '/src/assets/images/cover_velvet_frequency_1795351412420.jpg', 'English', 'Dance Pop', 0, 0, 1, 0, 1450000],
    ['song-14', 'Desh Matiya', 'art-suman', 'alb-ghat-lanterns', 42, '/api/audio/desh-matiya.wav', '/src/assets/images/cover_folk_riverfront_1795351411959.jpg', 'Bhojpuri', 'Bhojpuri Acoustic', 0, 0, 0, 0, 790000],
    ['song-15', 'Sitara Glow', 'art-aria', 'alb-midnight-raga', 47, '/api/audio/sitara-glow.wav', '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 'Hindi', 'Bollywood Hits', 1, 0, 1, 1, 2050000],
    ['song-16', 'Aurora Drive', 'art-elena', 'alb-velvet-freq', 46, '/api/audio/aurora-drive.wav', '/src/assets/images/cover_velvet_frequency_1795351412420.jpg', 'English', 'Dreamwave', 0, 0, 0, 1, 1110000],
  ] as const;

  const PLAYLISTS = [
    ['pl-bollywood-night', 'Late Night Bollywood', 'Warm acoustic film ballads and midnight Hindi favorites.', '/src/assets/images/cover_midnight_raga_1795351412436.jpg', 1],
    ['pl-punjabi-drive', 'Punjabi Highway Drive', 'High-energy dhol grooves and urban Punjabi basslines.', '/src/assets/images/cover_punjabi_anthem_1795351411887.jpg', 1],
    ['pl-velvet-english', 'Synth & Velvet', 'Crisp English electronic pop and nocturnal focus tracks.', '/src/assets/images/cover_velvet_frequency_1795351412420.jpg', 1],
    ['pl-bhojpuri-roots', 'Riverfront Folk & Roots', 'Authentic Bhojpuri acoustic rhythms and regional storytelling.', '/src/assets/images/cover_folk_riverfront_1795351411959.jpg', 1],
  ] as const;

  const PLAYLIST_LINKS = [
    ['pl-bollywood-night', 'song-1', 0],
    ['pl-bollywood-night', 'song-5', 1],
    ['pl-bollywood-night', 'song-6', 2],
    ['pl-bollywood-night', 'song-9', 3],
    ['pl-bollywood-night', 'song-15', 4],
    ['pl-punjabi-drive', 'song-2', 0],
    ['pl-punjabi-drive', 'song-7', 1],
    ['pl-punjabi-drive', 'song-10', 2],
    ['pl-velvet-english', 'song-3', 0],
    ['pl-velvet-english', 'song-8', 1],
    ['pl-velvet-english', 'song-11', 2],
    ['pl-velvet-english', 'song-13', 3],
    ['pl-velvet-english', 'song-16', 4],
    ['pl-bhojpuri-roots', 'song-4', 0],
    ['pl-bhojpuri-roots', 'song-12', 1],
    ['pl-bhojpuri-roots', 'song-14', 2],
  ] as const;

  const runSeed = db.transaction(() => {
    for (const a of ARTISTS) insertArtist.run(...a);
    for (const alb of ALBUMS) insertAlbum.run(...alb);
    for (const s of SONGS) insertSong.run(...s);
    for (const p of PLAYLISTS) insertPlaylist.run(...p);
    for (const pl of PLAYLIST_LINKS) insertPlaylistSong.run(...pl);
  });
  runSeed();
}
