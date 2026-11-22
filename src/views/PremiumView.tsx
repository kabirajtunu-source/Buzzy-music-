import React, {useState} from 'react';
import {Check, Crown, Sparkles} from 'lucide-react';
import {useAuth} from '../context/AuthContext';

export const PremiumView: React.FC = () => {
  const {user, subscribePlan, showToast} = useAuth();
  const [busy, setBusy] = useState(false);

  const currentPlan = user?.plan || 'free';

  const handlePlanChange = async (target: 'free' | 'premium') => {
    setBusy(true);
    try {
      await subscribePlan(target);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Subscription update failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#21153B] via-[#13111E] to-[#0B0A10] p-7 sm:p-10">
        <p className="text-xs font-medium text-violet-300">Buzzly Membership</p>
        <h1 className="mt-2 text-balance text-3xl font-extrabold text-white sm:text-4xl">
          Uninterrupted studio sound across every device.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300 leading-relaxed">
          Upgrade to Buzzly Premium for ad-free playback, unlimited offline song caching, and lossless studio streaming on desktop, Android, and iOS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Free Plan */}
        <div className="flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#13121C] p-6">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Buzzly Free</h2>
              <span className="font-mono text-xs text-zinc-400">For casual listeners</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-white tabular-nums">$0</span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <span>Full access to Hindi, English, Punjabi, and Bhojpuri catalog</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <span>Standard 128 kbps audio streaming</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <span>Up to 3 offline cached songs per account</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                <span>Periodic sponsor reminders every 4 tracks</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={busy || (Boolean(user) && currentPlan === 'free')}
            onClick={() => handlePlanChange('free')}
            className="mt-8 w-full rounded-xl border border-white/15 bg-white/[0.05] py-3 text-sm font-semibold text-white hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
          >
            {user && currentPlan === 'free' ? 'Current Plan' : 'Switch to Free'}
          </button>
        </div>

        {/* Premium Plan */}
        <div className="flex flex-col justify-between rounded-2xl border border-violet-500/45 bg-gradient-to-b from-[#1D1533] to-[#13121C] p-6 shadow-xl shadow-violet-950/20">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white">Buzzly Premium</h2>
              </div>
              <span className="font-mono text-xs text-violet-300">For dedicated listeners</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-mono text-3xl font-bold text-white tabular-nums">$4.99</span>
              <span className="text-xs text-zinc-400">/ month</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-zinc-200">
              <li className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span>100% ad-free listening with zero interruptions</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span>320 kbps studio fidelity & lossless WAV playback</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span>Unlimited offline track downloads across devices</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                <span>Background playback & Media Session lock-screen controls</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={busy || (Boolean(user) && currentPlan === 'premium')}
            onClick={() => handlePlanChange('premium')}
            className="mt-8 w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60 transition-colors"
          >
            {user && currentPlan === 'premium'
              ? 'Premium Active'
              : user
              ? 'Activate Buzzly Premium'
              : 'Sign Up for Premium'}
          </button>
        </div>
      </div>

      {/* Concrete Comparison Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#13121C]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.08] text-xs text-zinc-400">
            <tr>
              <th className="px-5 py-3.5 font-medium">Feature</th>
              <th className="px-5 py-3.5 font-medium">Free Plan</th>
              <th className="px-5 py-3.5 font-medium text-violet-300">Premium Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-zinc-300">
            <tr>
              <td className="px-5 py-3.5">Audio Streaming Quality</td>
              <td className="px-5 py-3.5 font-mono text-xs tabular-nums">128 kbps</td>
              <td className="px-5 py-3.5 font-mono text-xs text-white tabular-nums">320 kbps / Studio WAV</td>
            </tr>
            <tr>
              <td className="px-5 py-3.5">Ad Interruptions</td>
              <td className="px-5 py-3.5">Sponsor notice every 4 tracks</td>
              <td className="px-5 py-3.5 text-white">None (Ad-Free)</td>
            </tr>
            <tr>
              <td className="px-5 py-3.5">Offline Song Downloads</td>
              <td className="px-5 py-3.5 font-mono text-xs tabular-nums">Up to 3 tracks</td>
              <td className="px-5 py-3.5 text-white">Unlimited</td>
            </tr>
            <tr>
              <td className="px-5 py-3.5">Custom Playlists & Likes</td>
              <td className="px-5 py-3.5">Unlimited</td>
              <td className="px-5 py-3.5 text-white">Unlimited</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
