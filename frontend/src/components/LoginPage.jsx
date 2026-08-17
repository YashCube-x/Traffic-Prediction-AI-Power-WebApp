import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ArrowRight, Eye, EyeOff, ShieldCheck, UserCheck, Car } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, initialRegister = false, initialView = 'auth' }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(initialRegister);
  // 'auth' = login/register card, 'forgot' = request reset link, 'reset' = set new password
  const [view, setView] = useState(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [devResetLink, setDevResetLink] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetToken = new URLSearchParams(window.location.search).get('token') || '';

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // Public self-registration always creates a COMMUTER; operator/admin
    // accounts are created by the administrator from the User Management tab.
    const endpoint = isRegister ? 'http://localhost:2001/api/v1/auth/register' : 'http://localhost:2001/api/v1/auth/login';
    const payload = isRegister
      ? { email, password, full_name: fullName }
      : { email, password };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.detail || 'Authentication failed');
        }
        return data;
      })
      .then((data) => {
        setLoading(false);
        onLoginSuccess(data);
        navigate('/dashboard');
      })
      .catch((err) => {
        setLoading(false);
        setErrorMsg(err.message || 'Authentication server unreachable. Please check connection.');
      });
  };

  const handleQuickDemoLogin = (demoRole) => {
    setLoading(true);
    setErrorMsg('');

    let demoEmail = 'admin@trafficvision.ai';
    let demoPass = 'admin';

    if (demoRole === 'OPERATOR') {
      demoEmail = 'operator@trafficvision.ai';
      demoPass = 'operator';
    } else if (demoRole === 'COMMUTER') {
      demoEmail = 'commuter@trafficvision.ai';
      demoPass = 'commuter';
    }

    fetch('http://localhost:2001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: demoEmail, password: demoPass })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Demo login failed');
        return data;
      })
      .then((data) => {
        setLoading(false);
        onLoginSuccess(data);
        navigate('/dashboard');
      })
      .catch((err) => {
        setLoading(false);
        setErrorMsg(`Failed to connect to authentication server: ${err.message}`);
      });
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    setDevResetLink('');

    fetch('http://localhost:2001/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not request password reset');
        return data;
      })
      .then((data) => {
        setLoading(false);
        setInfoMsg(data.message);
        if (data.dev_reset_link) setDevResetLink(data.dev_reset_link);
      })
      .catch((err) => {
        setLoading(false);
        setErrorMsg(err.message || 'Could not reach the authentication server.');
      });
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setLoading(true);

    fetch('http://localhost:2001/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: resetToken, new_password: newPassword })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not reset password');
        return data;
      })
      .then((data) => {
        setLoading(false);
        setInfoMsg(data.message);
        setView('auth');
        setIsRegister(false);
        navigate('/login');
      })
      .catch((err) => {
        setLoading(false);
        setErrorMsg(err.message || 'Could not reach the authentication server.');
      });
  };

  return (
    <div className="h-screen w-screen bg-slate-100 flex flex-col justify-between overflow-hidden font-sans text-slate-900">
      
      {/* Brand Chrome Line Header */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500"></div>

      {/* Light Navbar */}
      <nav className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center z-20">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <span className="font-mono text-base font-bold tracking-tight text-slate-900">
            TRAFFICVISION <span className="text-orange-500">AI</span>
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            Smart Mobility Portal
          </span>
        </Link>

        <Link
          to="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          ← Back to Overview
        </Link>
      </nav>

      {/* 100vh Centered Split Screen Container - Light UI Palette */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
        <div className="w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row border border-slate-200/80 bg-white my-auto">
          
          {/* Left Side: Light Teal/Sky Vector Illustration Panel */}
          <div className="flex-1 bg-gradient-to-br from-sky-50 via-slate-100 to-teal-50 p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-200">
            <div className="absolute w-80 h-80 bg-sky-200/40 rounded-full blur-3xl pointer-events-none"></div>
            
            <img
              src="/traffic_login_illustration.jpg"
              alt="AI Traffic Control Center Illustration"
              className="w-full max-w-sm h-auto rounded-2xl object-cover shadow-xl border border-white/80 relative z-10 transition-transform duration-300 hover:scale-105"
            />
            
            <div className="text-center mt-6 z-10 max-w-xs">
              <h4 className="text-base font-bold text-slate-900 mb-1">
                Smart City Control Center
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                AI-driven real-time traffic monitoring, signal optimization, and emergency dispatch network.
              </p>
            </div>
          </div>

          {/* Right Side: Warm Accent Panel with Floating White Card */}
          <div className="flex-1 md:flex-[1.15] bg-gradient-to-br from-slate-50 via-amber-50/40 to-orange-50/30 p-6 md:p-10 flex flex-col items-center justify-center relative">
            
            {/* Quick Demo Access Pills Header */}
            <div className="w-full max-w-sm mb-4 z-10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                  QUICK DEMO PRESETS:
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('ADMIN')}
                  className="py-2 px-2 bg-orange-500/10 border border-orange-500/40 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-500/20 transition-all text-center flex items-center justify-center gap-1"
                >
                  <ShieldCheck size={13} /> ADMIN
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('OPERATOR')}
                  className="py-2 px-2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-all text-center flex items-center justify-center gap-1"
                >
                  <UserCheck size={13} /> OPERATOR
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('COMMUTER')}
                  className="py-2 px-2 bg-indigo-500/10 border border-indigo-500/40 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-500/20 transition-all text-center flex items-center justify-center gap-1"
                >
                  <Car size={13} /> COMMUTER
                </button>
              </div>
            </div>

            {/* Floating White Card */}
            <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-xl border border-slate-200/60 relative z-10 text-slate-900">
              
              {/* Card Header Row */}
              <div className="flex justify-between items-center pb-3 mb-5 border-b border-slate-100">
                <span className="text-xs font-extrabold text-orange-600 uppercase tracking-wider">
                  {view === 'forgot' ? 'RESET YOUR PASSWORD' : view === 'reset' ? 'SET A NEW PASSWORD' : isRegister ? 'NEW ACCOUNT REGISTRATION' : 'ALREADY MEMBERS'}
                </span>
                <Link to="/" className="text-xs text-slate-400 hover:text-orange-500 font-medium transition-colors">
                  Need help?
                </Link>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs mb-4 font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}

              {infoMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs mb-4 font-medium">
                  ✅ {infoMsg}
                  {devResetLink && (
                    <div className="mt-2 break-all">
                      <span className="font-bold block mb-1">DEV MODE — reset link:</span>
                      <a href={devResetLink} className="text-indigo-600 underline">{devResetLink}</a>
                    </div>
                  )}
                </div>
              )}

              {/* Forgot Password Form */}
              {view === 'forgot' && (
                <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Enter your account email and we'll send you a password reset link.
                    Demo preset accounts (admin/operator/commuter) have fixed passwords and cannot be reset.
                  </p>
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                      Account Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. operator.north@trafficvision.ai"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Sending...' : 'SEND RESET LINK'}
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* Reset Password Form (opened from the emailed link) */}
              {view === 'reset' && (
                <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
                  {!resetToken && (
                    <p className="text-xs text-red-600 font-medium">
                      ⚠️ No reset token found in this link. Please use the full link from your reset email.
                    </p>
                  )}
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
                    disabled={loading || !resetToken}
                    className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'SET NEW PASSWORD'}
                    <ArrowRight size={14} />
                  </button>
                </form>
              )}

              {/* Login / Register Form */}
              {view === 'auth' && (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                {isRegister && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Mahisa Dyan Diptya"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                    Email or Username
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@trafficvision.ai"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 border border-slate-200 rounded-xl p-3">
                    ℹ️ New accounts are registered as <strong>Commuters</strong>.
                    Traffic Operator accounts are issued only by the System Administrator.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? 'Authenticating...' : isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}
                  <ArrowRight size={14} />
                </button>
              </form>
              )}

              {/* Card Footer Toggle Link */}
              <div className="text-center mt-5 text-xs text-slate-500 font-medium">
                {view !== 'auth' ? (
                  <button
                    type="button"
                    onClick={() => { setView('auth'); setIsRegister(false); setErrorMsg(''); setInfoMsg(''); }}
                    className="text-orange-600 font-bold hover:underline cursor-pointer"
                  >
                    ← Back to Sign In
                  </button>
                ) : isRegister ? (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegister(false)}
                      className="text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => setIsRegister(true)}
                      className="text-orange-600 font-bold hover:underline ml-1 cursor-pointer"
                    >
                      Create an account
                    </button>
                    <span className="mx-2 text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => { setView('forgot'); setErrorMsg(''); setInfoMsg(''); }}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-6 text-center text-xs text-slate-400 bg-white border-t border-slate-200">
        TrafficVision AI © 2026 — Smart Urban Mobility Platform
      </footer>
    </div>
  );
}
