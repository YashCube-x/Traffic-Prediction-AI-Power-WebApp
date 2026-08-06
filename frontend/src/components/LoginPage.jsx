import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Activity, ArrowRight, Eye, EyeOff, ShieldCheck, UserCheck, Car } from 'lucide-react';

export default function LoginPage({ onLoginSuccess, initialRegister = false }) {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(initialRegister);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const endpoint = isRegister ? 'http://localhost:2001/api/v1/auth/register' : 'http://localhost:2001/api/v1/auth/login';
    const payload = isRegister
      ? { email, password, full_name: fullName, role }
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
                  {isRegister ? 'NEW ACCOUNT REGISTRATION' : 'ALREADY MEMBERS'}
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

              {/* Login / Register Form */}
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1 uppercase tracking-wider">
                      Select System Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all"
                    >
                      <option value="COMMUTER">Commuter User (Route View)</option>
                      <option value="OPERATOR">Traffic Operator (Incidents)</option>
                      <option value="ADMIN">System Administrator (Full Access)</option>
                    </select>
                  </div>
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

              {/* Card Footer Toggle Link */}
              <div className="text-center mt-5 text-xs text-slate-500 font-medium">
                {isRegister ? (
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
