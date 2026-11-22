import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {
  api,
  cacheTrackForOffline,
  removeTrackFromOfflineCache,
  setAuthToken,
} from '../lib/api';
import {firebaseSignOut, signInWithGooglePopup} from '../lib/firebaseAuth';
import type {MembershipPlan, Playlist, Song, User} from '../types';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  adminExists: boolean;
  passcodeConfigured: boolean;
  likedIds: Set<string>;
  offlineIds: Set<string>;
  userPlaylists: Playlist[];
  authModalOpen: boolean;
  toast: {message: string; tone: 'info' | 'error'} | null;
  showToast: (message: string, tone?: 'info' | 'error') => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name: string, avatarUrl: string | null) => Promise<void>;
  claimAdmin: (passcode: string) => Promise<void>;
  subscribePlan: (plan: MembershipPlan) => Promise<void>;
  toggleLike: (songId: string) => Promise<void>;
  toggleOfflineDownload: (song: Song) => Promise<void>;
  createPlaylist: (name: string, description: string, coverUrl?: string) => Promise<Playlist | null>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  refreshUserExtras: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [passcodeConfigured, setPasscodeConfigured] = useState(false);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [offlineIds, setOfflineIds] = useState<Set<string>>(new Set());
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toast, setToast] = useState<{message: string; tone: 'info' | 'error'} | null>(null);

  const showToast = useCallback((message: string, tone: 'info' | 'error' = 'info') => {
    setToast({message, tone});
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshUserExtras = useCallback(async () => {
    try {
      const lib = await api.getLibrary();
      setLikedIds(new Set(lib.likedSongs.map((s) => s.id)));
      setOfflineIds(new Set(lib.offlineDownloads.map((s) => s.id)));
      setUserPlaylists(lib.playlists);
    } catch {
      // Not signed in or offline
    }
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me.user);
      setAdminExists(me.adminExists);
      setPasscodeConfigured(me.passcodeConfigured);
      if (me.user) {
        await refreshUserExtras();
      } else {
        setLikedIds(new Set());
        setOfflineIds(new Set());
        setUserPlaylists([]);
      }
    } catch {
      // Offline or error
    } finally {
      setAuthReady(true);
    }
  }, [refreshUserExtras]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const openAuthModal = useCallback(() => {
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const {idToken} = await signInWithGooglePopup();
    const loggedIn = await api.googleLogin(idToken);
    setUser(loggedIn);
    setAuthModalOpen(false);
    await refreshUserExtras();
    showToast(`Signed in as ${loggedIn.name}`);
  }, [refreshUserExtras, showToast]);

  const logout = useCallback(async () => {
    await Promise.allSettled([firebaseSignOut(), api.logout()]);
    setAuthToken(null);
    setUser(null);
    setLikedIds(new Set());
    setOfflineIds(new Set());
    setUserPlaylists([]);
    showToast('Signed out');
  }, [showToast]);

  const updateProfile = useCallback(
    async (name: string, avatarUrl: string | null) => {
      const res = await api.updateProfile(name, avatarUrl);
      setUser(res.user);
      showToast('Profile updated');
    },
    [showToast]
  );

  const claimAdmin = useCallback(
    async (passcode: string) => {
      const res = await api.claimAdmin(passcode);
      setUser(res.user);
      setAdminExists(true);
      showToast('Admin access enabled for your account');
    },
    [showToast]
  );

  const subscribePlan = useCallback(
    async (plan: MembershipPlan) => {
      if (!user) {
        openAuthModal();
        return;
      }
      const res = await api.subscribePlan(plan);
      setUser(res.user);
      showToast(
        plan === 'premium'
          ? 'Buzzly Premium activated — ad-free listening & unlimited offline downloads unlocked'
          : 'Switched to Buzzly Free plan'
      );
    },
    [openAuthModal, showToast, user]
  );

  const toggleLike = useCallback(
    async (songId: string) => {
      if (!user) {
        openAuthModal();
        showToast('Sign in with Google to save liked songs');
        return;
      }
      const res = await api.toggleLike(songId);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(songId);
        else next.delete(songId);
        return next;
      });
      showToast(res.liked ? 'Added to Liked Songs' : 'Removed from Liked Songs');
    },
    [openAuthModal, showToast, user]
  );

  const toggleOfflineDownload = useCallback(
    async (song: Song) => {
      if (!user) {
        openAuthModal();
        showToast('Sign in with Google to download tracks for offline listening');
        return;
      }
      const currentlyDownloaded = offlineIds.has(song.id);
      if (currentlyDownloaded) {
        await api.removeOfflineDownloaded(song.id);
        await removeTrackFromOfflineCache(song);
        setOfflineIds((prev) => {
          const next = new Set(prev);
          next.delete(song.id);
          return next;
        });
        showToast(`Removed "${song.title}" from offline storage`);
      } else {
        await api.markOfflineDownloaded(song.id);
        await cacheTrackForOffline(song);
        setOfflineIds((prev) => {
          const next = new Set(prev);
          next.add(song.id);
          return next;
        });
        showToast(`"${song.title}" saved for offline listening`);
      }
    },
    [offlineIds, openAuthModal, showToast, user]
  );

  const createPlaylist = useCallback(
    async (name: string, description: string, coverUrl?: string) => {
      if (!user) {
        openAuthModal();
        return null;
      }
      const res = await api.createPlaylist(name, description, coverUrl);
      setUserPlaylists((prev) => [res.playlist, ...prev]);
      showToast(`Playlist "${res.playlist.name}" created`);
      return res.playlist;
    },
    [openAuthModal, showToast, user]
  );

  const addSongToPlaylist = useCallback(
    async (playlistId: string, songId: string) => {
      if (!user) {
        openAuthModal();
        return;
      }
      await api.addSongToPlaylist(playlistId, songId);
      await refreshUserExtras();
      showToast('Added track to playlist');
    },
    [openAuthModal, refreshUserExtras, showToast, user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        adminExists,
        passcodeConfigured,
        likedIds,
        offlineIds,
        userPlaylists,
        authModalOpen,
        toast,
        showToast,
        openAuthModal,
        closeAuthModal,
        signInWithGoogle,
        logout,
        updateProfile,
        claimAdmin,
        subscribePlan,
        toggleLike,
        toggleOfflineDownload,
        createPlaylist,
        addSongToPlaylist,
        refreshUserExtras,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
