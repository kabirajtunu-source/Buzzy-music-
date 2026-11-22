import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import {createServer as createViteServer} from 'vite';
import {getOrGenerateWav} from './server/audioGen.ts';
import {
  type AuthedRequest,
  clearSessionCookie,
  createSession,
  hashToken,
  optionalAuth,
  requireAdmin,
  requireAuth,
  setSessionCookie,
} from './server/auth.ts';
import {db, initDatabase} from './server/db.ts';

const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseAppConfig = fs.existsSync(firebaseConfigPath)
  ? (JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8')) as {apiKey?: string; projectId?: string})
  : {};

dotenv.config();
initDatabase();

const app = express();
const PORT = 3000;
const uploadsDir = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(uploadsDir, {recursive: true});

app.set('trust proxy', 1);
app.use(express.json({limit: '2mb'}));
app.use(cookieParser());

function isValidSafeUrl(value: unknown, allowEmpty = false): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return allowEmpty;
  if (trimmed.startsWith('/api/') || trimmed.startsWith('/src/assets/') || trimmed.startsWith('/uploads/')) {
    return !trimmed.includes('..');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const ALLOWED_AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a']);
const ALLOWED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: {fileSize: 20 * 1024 * 1024},
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_AUDIO_EXTS.has(ext) || ALLOWED_IMAGE_EXTS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file format'));
    }
  },
});

app.get('/uploads/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  const resolved = path.resolve(uploadsDir, filename);
  if (!resolved.startsWith(uploadsDir + path.sep) || !fs.existsSync(resolved)) {
    res.status(404).json({error: 'File not found'});
    return;
  }
  res.sendFile(resolved);
});

// Legal procedural audio stream with HTTP Range support for smooth seeking & mobile playback
app.get('/api/audio/:slug', (req, res) => {
  const slug = path.basename(req.params.slug);
  const wav = getOrGenerateWav(slug);
  const total = wav.length;
  const range = req.headers.range;

  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
      return;
    }
    const start = match[1] ? parseInt(match[1], 10) : 0;
    const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
    if (start >= total || start > end) {
      res.status(416).setHeader('Content-Range', `bytes */${total}`).end();
      return;
    }
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', end - start + 1);
    res.end(wav.subarray(start, end + 1));
    return;
  }

  res.setHeader('Content-Length', total);
  res.end(wav);
});

const SONG_SELECT = `
  SELECT s.*, a.name AS artist_name, a.image_url AS artist_image,
         alb.title AS album_title
  FROM songs s
  JOIN artists a ON a.id = s.artist_id
  LEFT JOIN albums alb ON alb.id = s.album_id
`;

// ---------------- AUTH ROUTES ----------------

app.get('/api/auth/me', optionalAuth, (req: AuthedRequest, res) => {
  const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as {c: number}).c;
  res.json({
    user: req.user || null,
    adminExists: adminCount > 0,
    passcodeConfigured: Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0),
    googleClientId: firebaseAppConfig.apiKey || null,
  });
});

app.post('/api/auth/google', async (req, res) => {
  const idToken = typeof req.body?.idToken === 'string' ? req.body.idToken.trim() : '';
  const firebaseApiKey = firebaseAppConfig.apiKey;
  if (!firebaseApiKey) {
    res.status(501).json({error: 'Google Sign-In is not configured on this server'});
    return;
  }
  if (!idToken) {
    res.status(400).json({error: 'Missing Google ID token'});
    return;
  }

  try {
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({idToken}),
      }
    );
    if (!verifyRes.ok) {
      res.status(401).json({error: 'Invalid Google sign-in token'});
      return;
    }

    const payload = (await verifyRes.json()) as {
      users?: {
        localId?: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
        photoUrl?: string;
        providerUserInfo?: {providerId?: string}[];
      }[];
    };

    const gUser = payload.users?.[0];
    const hasGoogleProvider = gUser?.providerUserInfo?.some((p) => p.providerId === 'google.com');
    if (!gUser || !gUser.email || !gUser.localId || !gUser.emailVerified || !hasGoogleProvider) {
      res.status(401).json({error: 'Verified Google account is required'});
      return;
    }

    const email = gUser.email.toLowerCase();
    const name = (gUser.displayName || email.split('@')[0]).slice(0, 80);
    const picture = isValidSafeUrl(gUser.photoUrl) ? gUser.photoUrl : null;

    let userRow = db
      .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE email = ?')
      .get(email) as {id: string} | undefined;

    if (!userRow) {
      const id = `usr-${crypto.randomUUID()}`;
      db.prepare(
        `INSERT INTO users (id, name, email, avatar_url, role, plan, google_id) VALUES (?, ?, ?, ?, 'user', 'free', ?)`
      ).run(id, name, email, picture, gUser.localId);
      userRow = db
        .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE id = ?')
        .get(id) as {id: string};
    } else {
      db.prepare(
        'UPDATE users SET google_id = COALESCE(google_id, ?), avatar_url = COALESCE(avatar_url, ?) WHERE id = ?'
      ).run(gUser.localId, picture, userRow.id);
      userRow = db
        .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE id = ?')
        .get(userRow.id) as {id: string};
    }

    const {token, expiresAt} = createSession(userRow.id);
    setSessionCookie(res, token, expiresAt);
    res.json({user: userRow, token});
  } catch {
    res.status(500).json({error: 'Could not verify Google sign-in'});
  }
});

app.post('/api/auth/logout', (req: AuthedRequest, res) => {
  const authHeader = req.headers.authorization;
  const token =
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) || req.cookies?.buzzly_session;
  if (typeof token === 'string' && token.length > 0) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token));
  }
  clearSessionCookie(res);
  res.json({ok: true});
});

app.patch('/api/auth/profile', requireAuth, (req: AuthedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : req.user!.name;
  const avatarUrl =
    req.body?.avatar_url === null || req.body?.avatar_url === ''
      ? null
      : typeof req.body?.avatar_url === 'string'
      ? req.body.avatar_url.trim()
      : req.user!.avatar_url;

  if (name.length < 2 || name.length > 80) {
    res.status(400).json({error: 'Name must be between 2 and 80 characters'});
    return;
  }
  if (avatarUrl !== null && !isValidSafeUrl(avatarUrl)) {
    res.status(400).json({error: 'Invalid avatar URL'});
    return;
  }

  db.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?').run(name, avatarUrl, req.user!.id);
  const updated = db
    .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE id = ?')
    .get(req.user!.id);
  res.json({user: updated});
});

app.post('/api/auth/claim-admin', requireAuth, (req: AuthedRequest, res) => {
  const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
  const envPasscode = process.env.ADMIN_PASSCODE?.trim() || '';
  const adminCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as {c: number}).c;

  if (envPasscode.length > 0) {
    const a = Buffer.from(passcode);
    const b = Buffer.from(envPasscode);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(403).json({error: 'Invalid admin passcode'});
      return;
    }
  } else if (adminCount > 0 && req.user!.role !== 'admin') {
    res.status(403).json({error: 'An admin already exists. Ask an existing admin to promote your account.'});
    return;
  }

  db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(req.user!.id);
  const updated = db
    .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE id = ?')
    .get(req.user!.id);
  res.json({user: updated});
});

// ---------------- PUBLIC CATALOG, EXPLORE & SEARCH ----------------

app.get('/api/catalog', optionalAuth, (req: AuthedRequest, res) => {
  const songs = db.prepare(`${SONG_SELECT} ORDER BY s.play_count DESC`).all();
  const artists = db.prepare('SELECT * FROM artists ORDER BY monthly_listeners DESC').all();
  const albums = db
    .prepare(
      `SELECT alb.*, a.name AS artist_name FROM albums alb JOIN artists a ON a.id = alb.artist_id ORDER BY alb.release_year DESC`
    )
    .all();
  const playlists = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS song_count
       FROM playlists p
       WHERE p.is_public = 1
       ORDER BY p.is_recommended DESC, p.created_at DESC`
    )
    .all();

  let likedSongIds: string[] = [];
  let offlineSongIds: string[] = [];
  if (req.user) {
    likedSongIds = (
      db.prepare('SELECT song_id FROM liked_songs WHERE user_id = ?').all(req.user.id) as {song_id: string}[]
    ).map((r) => r.song_id);
    offlineSongIds = (
      db.prepare('SELECT song_id FROM offline_downloads WHERE user_id = ?').all(req.user.id) as {song_id: string}[]
    ).map((r) => r.song_id);
  }

  res.json({songs, artists, albums, playlists, likedSongIds, offlineSongIds});
});

app.get('/api/explore', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.toLowerCase() : 'all';
  let songs;
  if (category === 'hindi') {
    songs = db.prepare(`${SONG_SELECT} WHERE LOWER(s.language) = 'hindi' ORDER BY s.play_count DESC`).all();
  } else if (category === 'english') {
    songs = db.prepare(`${SONG_SELECT} WHERE LOWER(s.language) = 'english' ORDER BY s.play_count DESC`).all();
  } else if (category === 'punjabi') {
    songs = db.prepare(`${SONG_SELECT} WHERE LOWER(s.language) = 'punjabi' ORDER BY s.play_count DESC`).all();
  } else if (category === 'bhojpuri') {
    songs = db.prepare(`${SONG_SELECT} WHERE LOWER(s.language) = 'bhojpuri' ORDER BY s.play_count DESC`).all();
  } else if (category === 'bollywood') {
    songs = db.prepare(`${SONG_SELECT} WHERE s.is_bollywood = 1 ORDER BY s.play_count DESC`).all();
  } else if (category === 'trending') {
    songs = db.prepare(`${SONG_SELECT} WHERE s.is_trending = 1 ORDER BY s.play_count DESC`).all();
  } else {
    songs = db.prepare(`${SONG_SELECT} ORDER BY s.play_count DESC`).all();
  }
  res.json({songs, category});
});

app.get('/api/search', (req, res) => {
  const raw = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  if (!raw) {
    res.json({songs: [], artists: [], albums: [], playlists: []});
    return;
  }
  const term = `%${raw}%`;
  const songs = db
    .prepare(
      `${SONG_SELECT} WHERE s.title LIKE ? OR a.name LIKE ? OR s.genre LIKE ? OR s.language LIKE ? ORDER BY s.play_count DESC LIMIT 25`
    )
    .all(term, term, term, term);
  const artists = db
    .prepare('SELECT * FROM artists WHERE name LIKE ? OR genre LIKE ? ORDER BY monthly_listeners DESC LIMIT 12')
    .all(term, term);
  const albums = db
    .prepare(
      `SELECT alb.*, a.name AS artist_name FROM albums alb JOIN artists a ON a.id = alb.artist_id WHERE alb.title LIKE ? OR a.name LIKE ? LIMIT 12`
    )
    .all(term, term);
  const playlists = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS song_count
       FROM playlists p
       WHERE p.is_public = 1 AND (p.name LIKE ? OR p.description LIKE ?)
       LIMIT 12`
    )
    .all(term, term);

  res.json({songs, artists, albums, playlists});
});

app.get('/api/artists/:id', (req, res) => {
  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(req.params.id);
  if (!artist) {
    res.status(404).json({error: 'Artist not found'});
    return;
  }
  const albums = db.prepare('SELECT * FROM albums WHERE artist_id = ? ORDER BY release_year DESC').all(req.params.id);
  const songs = db.prepare(`${SONG_SELECT} WHERE s.artist_id = ? ORDER BY s.play_count DESC`).all(req.params.id);
  res.json({artist, albums, songs});
});

app.get('/api/albums/:id', (req, res) => {
  const album = db
    .prepare(
      `SELECT alb.*, a.name AS artist_name FROM albums alb JOIN artists a ON a.id = alb.artist_id WHERE alb.id = ?`
    )
    .get(req.params.id);
  if (!album) {
    res.status(404).json({error: 'Album not found'});
    return;
  }
  const songs = db.prepare(`${SONG_SELECT} WHERE s.album_id = ? ORDER BY s.created_at ASC`).all(req.params.id);
  res.json({album, songs});
});

app.get('/api/playlists/:id', optionalAuth, (req: AuthedRequest, res) => {
  const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id) as
    | {id: string; user_id: string | null; is_public: number}
    | undefined;
  if (!playlist) {
    res.status(404).json({error: 'Playlist not found'});
    return;
  }
  if (!playlist.is_public && playlist.user_id !== req.user?.id && req.user?.role !== 'admin') {
    res.status(403).json({error: 'Private playlist'});
    return;
  }
  const songs = db
    .prepare(
      `${SONG_SELECT}
       JOIN playlist_songs ps ON ps.song_id = s.id
       WHERE ps.playlist_id = ?
       ORDER BY ps.position ASC, ps.added_at ASC`
    )
    .all(req.params.id);
  res.json({playlist, songs});
});

app.post('/api/songs/:id/play', optionalAuth, (req: AuthedRequest, res) => {
  const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(req.params.id);
  if (!song) {
    res.status(404).json({error: 'Song not found'});
    return;
  }
  db.prepare('UPDATE songs SET play_count = play_count + 1 WHERE id = ?').run(req.params.id);
  if (req.user) {
    db.prepare('DELETE FROM recently_played WHERE user_id = ? AND song_id = ?').run(req.user.id, req.params.id);
    db.prepare('INSERT INTO recently_played (id, user_id, song_id) VALUES (?, ?, ?)').run(
      `rp-${crypto.randomUUID()}`,
      req.user.id,
      req.params.id
    );
  }
  res.json({ok: true});
});

// ---------------- USER LIBRARY, PLAYLISTS & MEMBERSHIP ----------------

app.get('/api/library', requireAuth, (req: AuthedRequest, res) => {
  const likedSongs = db
    .prepare(
      `${SONG_SELECT}
       JOIN liked_songs ls ON ls.song_id = s.id
       WHERE ls.user_id = ?
       ORDER BY ls.created_at DESC`
    )
    .all(req.user!.id);

  const recentlyPlayed = db
    .prepare(
      `${SONG_SELECT}
       JOIN recently_played rp ON rp.song_id = s.id
       WHERE rp.user_id = ?
       ORDER BY rp.played_at DESC
       LIMIT 30`
    )
    .all(req.user!.id);

  const playlists = db
    .prepare(
      `SELECT p.*, (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) AS song_count
       FROM playlists p
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`
    )
    .all(req.user!.id);

  const offlineDownloads = db
    .prepare(
      `${SONG_SELECT}
       JOIN offline_downloads od ON od.song_id = s.id
       WHERE od.user_id = ?
       ORDER BY od.downloaded_at DESC`
    )
    .all(req.user!.id);

  res.json({likedSongs, recentlyPlayed, playlists, offlineDownloads});
});

app.post('/api/library/likes/:songId', requireAuth, (req: AuthedRequest, res) => {
  const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(req.params.songId);
  if (!song) {
    res.status(404).json({error: 'Song not found'});
    return;
  }
  const existing = db
    .prepare('SELECT 1 FROM liked_songs WHERE user_id = ? AND song_id = ?')
    .get(req.user!.id, req.params.songId);
  if (existing) {
    db.prepare('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?').run(req.user!.id, req.params.songId);
    res.json({liked: false});
  } else {
    db.prepare('INSERT INTO liked_songs (user_id, song_id) VALUES (?, ?)').run(req.user!.id, req.params.songId);
    res.json({liked: true});
  }
});

app.post('/api/library/offline/:songId', requireAuth, (req: AuthedRequest, res) => {
  const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(req.params.songId);
  if (!song) {
    res.status(404).json({error: 'Song not found'});
    return;
  }
  const existing = db
    .prepare('SELECT 1 FROM offline_downloads WHERE user_id = ? AND song_id = ?')
    .get(req.user!.id, req.params.songId);
  if (!existing) {
    const count = (
      db.prepare('SELECT COUNT(*) as c FROM offline_downloads WHERE user_id = ?').get(req.user!.id) as {c: number}
    ).c;
    if (req.user!.plan === 'free' && count >= 3) {
      res.status(403).json({
        error: 'Free plan supports up to 3 offline songs. Upgrade to Buzzly Premium for unlimited offline downloads.',
      });
      return;
    }
    db.prepare('INSERT INTO offline_downloads (user_id, song_id) VALUES (?, ?)').run(
      req.user!.id,
      req.params.songId
    );
  }
  res.json({downloaded: true});
});

app.delete('/api/library/offline/:songId', requireAuth, (req: AuthedRequest, res) => {
  db.prepare('DELETE FROM offline_downloads WHERE user_id = ? AND song_id = ?').run(
    req.user!.id,
    req.params.songId
  );
  res.json({downloaded: false});
});

app.post('/api/playlists', requireAuth, (req: AuthedRequest, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 240) : '';
  const coverUrl = isValidSafeUrl(req.body?.cover_url)
    ? req.body.cover_url.trim()
    : '/src/assets/images/cover_velvet_frequency_1795351412420.jpg';
  const isPublic = req.body?.is_public === false ? 0 : 1;

  if (name.length < 1 || name.length > 80) {
    res.status(400).json({error: 'Playlist name must be between 1 and 80 characters'});
    return;
  }

  const id = `pl-${crypto.randomUUID()}`;
  db.prepare(
    `INSERT INTO playlists (id, name, description, user_id, cover_url, is_public, is_recommended)
     VALUES (?, ?, ?, ?, ?, ?, 0)`
  ).run(id, name, description, req.user!.id, coverUrl, isPublic);

  const playlist = db
    .prepare('SELECT *, 0 AS song_count FROM playlists WHERE id = ?')
    .get(id);
  res.status(201).json({playlist});
});

app.delete('/api/playlists/:id', requireAuth, (req: AuthedRequest, res) => {
  const pl = db.prepare('SELECT id, user_id FROM playlists WHERE id = ?').get(req.params.id) as
    | {id: string; user_id: string | null}
    | undefined;
  if (!pl) {
    res.status(404).json({error: 'Playlist not found'});
    return;
  }
  if (pl.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({error: 'You cannot delete this playlist'});
    return;
  }
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ok: true});
});

app.post('/api/playlists/:id/songs', requireAuth, (req: AuthedRequest, res) => {
  const songId = typeof req.body?.songId === 'string' ? req.body.songId : '';
  const pl = db.prepare('SELECT id, user_id FROM playlists WHERE id = ?').get(req.params.id) as
    | {id: string; user_id: string | null}
    | undefined;
  if (!pl) {
    res.status(404).json({error: 'Playlist not found'});
    return;
  }
  if (pl.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({error: 'You cannot edit this playlist'});
    return;
  }
  const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId);
  if (!song) {
    res.status(404).json({error: 'Song not found'});
    return;
  }
  const posRow = db
    .prepare('SELECT COALESCE(MAX(position), -1) + 1 AS nextPos FROM playlist_songs WHERE playlist_id = ?')
    .get(req.params.id) as {nextPos: number};

  db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(
    req.params.id,
    songId,
    posRow.nextPos
  );
  res.json({ok: true});
});

app.delete('/api/playlists/:id/songs/:songId', requireAuth, (req: AuthedRequest, res) => {
  const pl = db.prepare('SELECT id, user_id FROM playlists WHERE id = ?').get(req.params.id) as
    | {id: string; user_id: string | null}
    | undefined;
  if (!pl) {
    res.status(404).json({error: 'Playlist not found'});
    return;
  }
  if (pl.user_id !== req.user!.id && req.user!.role !== 'admin') {
    res.status(403).json({error: 'You cannot edit this playlist'});
    return;
  }
  db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(
    req.params.id,
    req.params.songId
  );
  res.json({ok: true});
});

app.post('/api/membership/subscribe', requireAuth, (req: AuthedRequest, res) => {
  const plan = req.body?.plan === 'premium' ? 'premium' : req.body?.plan === 'free' ? 'free' : null;
  if (!plan) {
    res.status(400).json({error: 'Invalid plan'});
    return;
  }
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, req.user!.id);
  const updated = db
    .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE id = ?')
    .get(req.user!.id);
  res.json({user: updated});
});

// ---------------- ADMIN DASHBOARD ROUTES ----------------

app.get('/api/admin/analytics', requireAdmin, (_req, res) => {
  const usersCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as {c: number}).c;
  const premiumCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE plan = 'premium'").get() as {c: number}).c;
  const songsCount = (db.prepare('SELECT COUNT(*) as c FROM songs').get() as {c: number}).c;
  const artistsCount = (db.prepare('SELECT COUNT(*) as c FROM artists').get() as {c: number}).c;
  const albumsCount = (db.prepare('SELECT COUNT(*) as c FROM albums').get() as {c: number}).c;
  const playlistsCount = (db.prepare('SELECT COUNT(*) as c FROM playlists').get() as {c: number}).c;
  const offlineCount = (db.prepare('SELECT COUNT(*) as c FROM offline_downloads').get() as {c: number}).c;
  const totalPlays = (db.prepare('SELECT COALESCE(SUM(play_count), 0) as total FROM songs').get() as {total: number})
    .total;

  const languageStats = db
    .prepare(
      `SELECT language, COUNT(*) as track_count, COALESCE(SUM(play_count), 0) as plays
       FROM songs GROUP BY language ORDER BY plays DESC`
    )
    .all();

  const topTracks = db.prepare(`${SONG_SELECT} ORDER BY s.play_count DESC LIMIT 6`).all();

  res.json({
    summary: {
      usersCount,
      premiumCount,
      songsCount,
      artistsCount,
      albumsCount,
      playlistsCount,
      offlineCount,
      totalPlays,
    },
    languageStats,
    topTracks,
  });
});

app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({error: 'No file uploaded'});
    return;
  }
  res.status(201).json({url: `/uploads/${req.file.filename}`, filename: req.file.originalname});
});

app.post('/api/admin/songs', requireAdmin, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const artistId = typeof req.body?.artist_id === 'string' ? req.body.artist_id : '';
  const albumId = typeof req.body?.album_id === 'string' && req.body.album_id ? req.body.album_id : null;
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : 'Hindi';
  const genre = typeof req.body?.genre === 'string' ? req.body.genre.trim() : 'Pop';
  const durationSec = Math.max(10, Math.min(3600, Number(req.body?.duration_sec) || 45));
  const rawAudioUrl = typeof req.body?.audio_url === 'string' ? req.body.audio_url.trim() : '';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'custom-track';
  const audioUrl = rawAudioUrl && isValidSafeUrl(rawAudioUrl) ? rawAudioUrl : `/api/audio/${slug}.wav`;
  const coverUrl = isValidSafeUrl(req.body?.cover_url)
    ? req.body.cover_url.trim()
    : '/src/assets/images/cover_midnight_raga_1795351412436.jpg';

  if (title.length < 1 || title.length > 120) {
    res.status(400).json({error: 'Song title is required'});
    return;
  }
  const artist = db.prepare('SELECT id FROM artists WHERE id = ?').get(artistId);
  if (!artist) {
    res.status(400).json({error: 'Valid artist is required'});
    return;
  }

  const id = `song-${crypto.randomUUID()}`;
  db.prepare(
    `INSERT INTO songs (
      id, title, artist_id, album_id, duration_sec, audio_url, cover_url,
      language, genre, is_bollywood, is_featured, is_trending, is_new_release
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title,
    artistId,
    albumId,
    durationSec,
    audioUrl,
    coverUrl,
    language,
    genre,
    req.body?.is_bollywood ? 1 : 0,
    req.body?.is_featured ? 1 : 0,
    req.body?.is_trending ? 1 : 0,
    req.body?.is_new_release ? 1 : 0
  );

  const song = db.prepare(`${SONG_SELECT} WHERE s.id = ?`).get(id);
  res.status(201).json({song});
});

app.patch('/api/admin/songs/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id) as Record<string, any> | undefined;
  if (!existing) {
    res.status(404).json({error: 'Song not found'});
    return;
  }
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : existing.title;
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : existing.language;
  const genre = typeof req.body?.genre === 'string' ? req.body.genre.trim() : existing.genre;
  const isFeatured = req.body?.is_featured !== undefined ? (req.body.is_featured ? 1 : 0) : existing.is_featured;
  const isTrending = req.body?.is_trending !== undefined ? (req.body.is_trending ? 1 : 0) : existing.is_trending;
  const isBollywood = req.body?.is_bollywood !== undefined ? (req.body.is_bollywood ? 1 : 0) : existing.is_bollywood;
  const isNewRelease =
    req.body?.is_new_release !== undefined ? (req.body.is_new_release ? 1 : 0) : existing.is_new_release;

  db.prepare(
    `UPDATE songs SET title = ?, language = ?, genre = ?, is_featured = ?, is_trending = ?, is_bollywood = ?, is_new_release = ? WHERE id = ?`
  ).run(title, language, genre, isFeatured, isTrending, isBollywood, isNewRelease, req.params.id);

  const song = db.prepare(`${SONG_SELECT} WHERE s.id = ?`).get(req.params.id);
  res.json({song});
});

app.delete('/api/admin/songs/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
  res.json({ok: true});
});

app.post('/api/admin/artists', requireAdmin, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const genre = typeof req.body?.genre === 'string' ? req.body.genre.trim() : 'Contemporary';
  const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim().slice(0, 400) : '';
  const imageUrl = isValidSafeUrl(req.body?.image_url)
    ? req.body.image_url.trim()
    : '/src/assets/images/artist_aria_kapoor_1795351413429.jpg';
  const monthlyListeners = Math.max(0, Number(req.body?.monthly_listeners) || 125000);

  if (name.length < 2 || name.length > 80) {
    res.status(400).json({error: 'Artist name must be 2–80 characters'});
    return;
  }
  const id = `art-${crypto.randomUUID()}`;
  db.prepare(
    'INSERT INTO artists (id, name, genre, bio, image_url, monthly_listeners) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, genre, bio, imageUrl, monthlyListeners);

  const artist = db.prepare('SELECT * FROM artists WHERE id = ?').get(id);
  res.status(201).json({artist});
});

app.delete('/api/admin/artists/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM artists WHERE id = ?').run(req.params.id);
  res.json({ok: true});
});

app.post('/api/admin/albums', requireAdmin, (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const artistId = typeof req.body?.artist_id === 'string' ? req.body.artist_id : '';
  const releaseYear = Math.max(1950, Math.min(2035, Number(req.body?.release_year) || 2026));
  const language = typeof req.body?.language === 'string' ? req.body.language.trim() : 'Hindi';
  const coverUrl = isValidSafeUrl(req.body?.cover_url)
    ? req.body.cover_url.trim()
    : '/src/assets/images/cover_velvet_frequency_1795351412420.jpg';

  if (title.length < 1 || title.length > 100) {
    res.status(400).json({error: 'Album title is required'});
    return;
  }
  if (!db.prepare('SELECT id FROM artists WHERE id = ?').get(artistId)) {
    res.status(400).json({error: 'Valid artist is required'});
    return;
  }

  const id = `alb-${crypto.randomUUID()}`;
  db.prepare(
    'INSERT INTO albums (id, title, artist_id, release_year, cover_url, language) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, title, artistId, releaseYear, coverUrl, language);

  const album = db
    .prepare('SELECT alb.*, a.name AS artist_name FROM albums alb JOIN artists a ON a.id = alb.artist_id WHERE alb.id = ?')
    .get(id);
  res.status(201).json({album});
});

app.delete('/api/admin/albums/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM albums WHERE id = ?').run(req.params.id);
  res.json({ok: true});
});

app.post('/api/admin/playlists', requireAdmin, (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body?.description === 'string' ? req.body.description.trim().slice(0, 240) : '';
  const coverUrl = isValidSafeUrl(req.body?.cover_url)
    ? req.body.cover_url.trim()
    : '/src/assets/images/cover_punjabi_anthem_1795351411887.jpg';

  if (name.length < 1 || name.length > 80) {
    res.status(400).json({error: 'Playlist name is required'});
    return;
  }
  const id = `pl-${crypto.randomUUID()}`;
  db.prepare(
    `INSERT INTO playlists (id, name, description, user_id, cover_url, is_public, is_recommended)
     VALUES (?, ?, ?, NULL, ?, 1, 1)`
  ).run(id, name, description, coverUrl);

  const playlist = db.prepare('SELECT *, 0 AS song_count FROM playlists WHERE id = ?').get(id);
  res.status(201).json({playlist});
});

app.delete('/api/admin/playlists/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ok: true});
});

app.get('/api/admin/users', requireAdmin, (_req, res) => {
  const users = db
    .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({users});
});

app.patch('/api/admin/users/:id', requireAdmin, (req: AuthedRequest, res) => {
  const target = db.prepare('SELECT id, role, plan FROM users WHERE id = ?').get(req.params.id) as
    | {id: string; role: 'user' | 'admin'; plan: 'free' | 'premium'}
    | undefined;
  if (!target) {
    res.status(404).json({error: 'User not found'});
    return;
  }
  const nextRole = req.body?.role === 'admin' || req.body?.role === 'user' ? req.body.role : target.role;
  const nextPlan = req.body?.plan === 'premium' || req.body?.plan === 'free' ? req.body.plan : target.plan;

  if (target.id === req.user!.id && nextRole !== 'admin') {
    res.status(400).json({error: 'You cannot remove your own admin role'});
    return;
  }

  db.prepare('UPDATE users SET role = ?, plan = ? WHERE id = ?').run(nextRole, nextPlan, req.params.id);
  const updated = db
    .prepare('SELECT id, name, email, avatar_url, role, plan, created_at FROM users WHERE id = ?')
    .get(req.params.id);
  res.json({user: updated});
});

// ---------------- VITE / STATIC SERVING ----------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {middlewareMode: true},
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Buzzly Music listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
