import React, { useState } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

// Full-screen gate shown after login when the account was created by an
// administrator with a temporary password (must_change_password = TRUE).
// The dashboard stays locked until the user sets their own password.
export default function ForcePasswordChange({ userSession, onPasswordChanged, onLogout }) {
  const { showToast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMsg('New password must be different from the temporary password.');
      return;
    }
    setLoading(true);

    fetch('http://localhost:2001/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userSession.access_token}`,
      },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not change password');
        return data;
      })
      .then(() => {
        setLoading(false);
        showToast('Password updated. Welcome to TrafficVision AI!', 'success');
        onPasswordChanged();
      })
      .catch((err) => {
        setLoading(false);
        setErrorMsg(err.message);
      });
  };

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col items-center justify-center font-sans text-slate-900 p-4">
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500 fixed top-0 left-0"></div>

      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl border border-slate-200/80">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-orange-100 text-orange-700 rounded-xl border border-orange-200">
            <KeyRound size={20} />
          </div>
          <div>
            <span className="text-[11px] font-extrabold text-orange-600 uppercase tracking-wider block">
              FIRST LOGIN — SECURITY STEP
            </span>
            <h2 className="text-lg font-black text-slate-900">Set Your Own Password</h2>
          </div>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-5">
          Signed in as <strong>{userSession.email}</strong>. Your account was created by the
          administrator with a temporary password — please replace it before continuing.
        </p>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs mb-4 font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
              Temporary Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="The password the admin gave you"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat the new password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 mt-1 flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : 'SAVE & CONTINUE'}
            <ArrowRight size={14} />
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
          >
            Sign out instead
          </button>
        </div>
      </div>
    </div>
  );
}
