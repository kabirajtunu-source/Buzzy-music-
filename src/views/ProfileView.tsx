import React, {useState} from 'react';
import {Crown, LogOut, ShieldCheck, User as UserIcon} from 'lucide-react';
import {MediaArtwork} from '../components/MediaArtwork';
import {PWAInstallButton} from '../components/PWAInstallButton';
import {useAuth} from '../context/AuthContext';

export const ProfileView: React.FC<{
  onOpenAdmin: () => void;
  onOpenPremium: () => void;
}> = ({onOpenAdmin, onOpenPremium}) => {
  const {
    user,
    adminExists,
    passcodeConfigured,
    likedIds,
    offlineIds,
    userPlaylists,
    openAuthModal,
    logout,
    updateProfile,
    claimAdmin,
    showToast,
  } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [passcode, setPasscode] = useState('');
  const [saving, setSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);

  if (!user) {
    return (
      <div className="mx-auto mt-8 max-w-md rounded-2xl border border-white/[0.08] bg-[#13121C] p-8 text-center">
        <UserIcon className="mx-auto h-10 w-10 text-violet-400" />
        <h1 className="mt-4 text-xl font-bold text-white">Sign in with Google</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Connect your Google account to manage your profile, membership plan, and cross-device library.
        </p>
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => openAuthModal()}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile(name.trim() || user.name, avatarUrl.trim() || null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    try {
      await claimAdmin(passcode);
      setPasscode('');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not claim admin role', 'error');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-[#13121C] p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/15 bg-violet-600/20">
            {user.avatar_url ? (
              <MediaArtwork src={user.avatar_url} alt={user.name} rounded="rounded-full" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xl font-bold text-violet-300">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
            <p className="text-xs text-zinc-400">
              {user.email} · {user.plan === 'premium' ? 'Buzzly Premium' : 'Free Plan'} ·{' '}
              {user.role === 'admin' ? 'Administrator' : 'Listener'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.08]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-4">
          <p className="text-xs text-zinc-400">Liked Songs</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">{likedIds.size}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-4">
          <p className="text-xs text-zinc-400">Playlists</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">{userPlaylists.length}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#13121C] p-4">
          <p className="text-xs text-zinc-400">Offline Saved</p>
          <p className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">{offlineIds.size}</p>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSaveProfile} className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-6 space-y-4">
        <h2 className="text-base font-bold text-white">Profile Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">Display Name</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3.5 py-2.5 text-sm text-white focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-300">Avatar Image URL (optional)</label>
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://... or /src/assets/images/..."
              className="w-full rounded-xl border border-white/10 bg-[#0A090F] px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onOpenPremium}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-300 hover:text-violet-200"
          >
            <Crown className="h-3.5 w-3.5" />
            <span>{user.plan === 'premium' ? 'Manage Premium Plan' : 'Upgrade to Premium'}</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Admin Access / First-Run Claim */}
      {user.role === 'admin' ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-violet-400 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white">Administrator Access Enabled</h2>
              <p className="text-xs text-zinc-300">
                Upload tracks, manage artists, curate playlists, and view platform analytics.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 whitespace-nowrap shrink-0"
          >
            Open Admin Dashboard
          </button>
        </div>
      ) : !adminExists || passcodeConfigured ? (
        <form
          onSubmit={handleClaimAdmin}
          className="rounded-2xl border border-white/[0.08] bg-[#13121C] p-6 space-y-3"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-violet-400" />
            <h2 className="text-base font-bold text-white">
              {!adminExists ? 'First-Run Admin Setup' : 'Claim Admin Privileges'}
            </h2>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {!adminExists
              ? 'No administrator has been configured yet. Claim the initial Admin role for your account to unlock song uploads, artist management, and analytics.'
              : 'Enter the server ADMIN_PASSCODE to promote your account to Administrator.'}
          </p>
          {passcodeConfigured && (
            <input
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter ADMIN_PASSCODE"
              className="w-full max-w-xs rounded-xl border border-white/10 bg-[#0A090F] px-3.5 py-2 text-sm text-white focus:border-violet-500 focus:outline-none"
            />
          )}
          <div>
            <button
              type="submit"
              disabled={claiming}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {claiming ? 'Claiming...' : 'Enable Admin Access'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
};
