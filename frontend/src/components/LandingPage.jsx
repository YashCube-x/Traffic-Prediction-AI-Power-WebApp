import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, TrendingUp, Navigation, AlertTriangle, ArrowRight, ShieldCheck, 
  Radio, Cpu, Building2, Star, CheckCircle2, Zap, Terminal, Clock, BrainCircuit, Sparkles 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-orange-500 selection:text-white scroll-smooth relative">
      
      {/* ☀️ Top Fixed / Sticky Navbar Header */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-xl border-b border-slate-200/90 shadow-sm">
        {/* Brand Chrome Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-pink-500 to-indigo-500"></div>

        {/* Navbar Inner Bar */}
        <nav className="max-w-[1400px] mx-auto px-6 md:px-10 py-3.5 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div>
            <span className="font-mono text-xl font-black tracking-tight text-slate-900">
              TRAFFICVISION <span className="text-orange-600">AI</span>
            </span>
            <span className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
              Smart Mobility Platform
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <a href="#telemetry" className="hidden md:inline-block text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              Live Telemetry
            </a>
            <a href="#capabilities" className="hidden md:inline-block text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              AI Capabilities
            </a>
            <a href="#about" className="hidden md:inline-block text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              Architecture
            </a>
            <a href="#reviews" className="hidden md:inline-block text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
              Reviews
            </a>
            <Link
              to="/login"
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 no-underline"
            >
              Sign In to Portal <ArrowRight size={14} />
            </Link>
          </div>
        </nav>
      </header>

      {/* ☀️ SECTION 1: HERO SECTION (Perfectly Centered Vertically & Horizontally) */}
      <section className="w-full min-h-[calc(100vh-70px)] py-10 md:py-16 bg-white border-b border-slate-200/80 relative z-10 flex flex-col justify-center items-center">
        <div className="max-w-[1400px] w-full mx-auto px-6 md:px-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center justify-center my-auto relative">
          
          {/* Soft Radial Ambient Glow */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl pointer-events-none"></div>

          {/* Left Hero Content */}
          <div className="lg:col-span-7 flex flex-col justify-center gap-6 z-10">
            
            <div className="inline-flex items-center gap-2 text-xs font-bold tracking-wider uppercase px-4 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full w-fit">
              <Sparkles size={14} className="text-orange-500" /> Next-Gen AI Mobility Engine
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
              Intelligent Traffic Flow. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-pink-600 to-indigo-600">
                Zero Bottlenecks.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-normal leading-relaxed">
              Empowering smart city transportation networks with high-frequency IoT sensor telemetry, time-series bottleneck predictions, eco route optimization, and instant emergency dispatch.
            </p>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-3 gap-4 my-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Latency</span>
                <strong className="text-sm font-black text-sky-600">30s Live Stream</strong>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Forecast Accuracy</span>
                <strong className="text-sm font-black text-orange-600">94.8% LSTM Engine</strong>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Avg Delay Saved</span>
                <strong className="text-sm font-black text-emerald-600">-18.5 Min / Trip</strong>
              </div>
            </div>

            {/* Dual Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/login"
                className="px-8 py-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all no-underline flex items-center gap-2"
              >
                Get Started Free <ArrowRight size={16} />
              </Link>
              <a
                href="#telemetry"
                className="px-8 py-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs transition-all no-underline"
              >
                View Live Telemetry 📊
              </a>
            </div>

          </div>

          {/* Right Hero Showcase UI */}
          <div className="lg:col-span-5 relative z-10">
            <div className="w-full rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-2xl p-4 relative group">
              
              {/* Top Frame Bar */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-mono text-slate-700 font-bold">CITY_MAP_VIEWPORT // LIVE</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  42 SENSORS ONLINE
                </span>
              </div>

              <img
                src="/hero_dashboard_preview.jpg"
                alt="TrafficVision AI Dashboard"
                className="w-full h-72 md:h-80 object-cover rounded-xl border border-slate-200 group-hover:scale-[1.02] transition-transform duration-500"
              />

              {/* Bottom Status Row */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Peak Congestion:</span>
                  <span className="text-orange-600 font-bold">Hebbal (92%)</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">City Avg Speed:</span>
                  <span className="text-emerald-600 font-bold">25.9 km/h</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 📡 SECTION 2: LIVE TELEMETRY MATRIX */}
      <section id="telemetry" className="w-full scroll-mt-24 pt-24 pb-16 md:pt-28 md:pb-20 bg-slate-100 border-b border-slate-200 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-sky-600 uppercase tracking-widest block mb-1">
                REALTIME METRICS STREAM
              </span>
              <h2 className="text-3xl font-black text-slate-900">
                City Arterial Zone Congestion Matrix
              </h2>
            </div>
            <span className="text-xs font-mono px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-bold shadow-2xs">
              STATUS: OPERATIONAL ● 30s REFRESH
            </span>
          </div>

          {/* Realtime Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-4 px-6">ZONE / ARTERIAL CORRIDOR</th>
                    <th className="py-4 px-6">CONGESTION INDEX</th>
                    <th className="py-4 px-6">AVG SPEED</th>
                    <th className="py-4 px-6">24H VEHICLE COUNT</th>
                    <th className="py-4 px-6 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">Central CBD (M.G. Road Corridor)</td>
                    <td className="py-4 px-6 font-mono font-semibold text-orange-600">84.5%</td>
                    <td className="py-4 px-6 font-mono text-slate-700">16.2 km/h</td>
                    <td className="py-4 px-6 font-mono text-slate-600">4,820 vh</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        HEAVY
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">North Corridor (Hebbal Flyover / Airport Expressway)</td>
                    <td className="py-4 px-6 font-mono font-semibold text-red-600">92.0%</td>
                    <td className="py-4 px-6 font-mono text-slate-700">11.5 km/h</td>
                    <td className="py-4 px-6 font-mono text-slate-600">6,150 vh</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                        SEVERE
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">South Hub (Central Silk Board / Outer Ring Road)</td>
                    <td className="py-4 px-6 font-mono font-semibold text-amber-600">65.0%</td>
                    <td className="py-4 px-6 font-mono text-slate-700">28.4 km/h</td>
                    <td className="py-4 px-6 font-mono text-slate-600">3,400 vh</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        MODERATE
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">East Hub (Indiranagar 100ft Rd / Whitefield)</td>
                    <td className="py-4 px-6 font-mono font-semibold text-emerald-600">32.0%</td>
                    <td className="py-4 px-6 font-mono text-slate-700">42.0 km/h</td>
                    <td className="py-4 px-6 font-mono text-slate-600">1,950 vh</td>
                    <td className="py-4 px-6 text-right">
                      <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        OPTIMAL (LOW)
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </section>

      {/* ⚙️ SECTION 3: PLATFORM CAPABILITIES */}
      <section id="capabilities" className="w-full scroll-mt-24 pt-24 pb-16 md:pt-28 md:pb-20 bg-white border-b border-slate-200/80 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-widest block mb-1">
              INTELLIGENT MODULES
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Everything Needed to Manage City Mobility
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-300 transition-all">
              <div className="p-3.5 bg-sky-100 text-sky-700 rounded-2xl w-fit mb-5 border border-sky-200">
                <Activity size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Live Heatmap Viewport</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time vehicle density tracking, speed logs, and interactive GIS heatmap visualization.
              </p>
            </div>

            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-orange-300 transition-all">
              <div className="p-3.5 bg-orange-100 text-orange-700 rounded-2xl w-fit mb-5 border border-orange-200">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Traffic Forecasting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Time-series predictive models forecasting upcoming peak hour bottleneck risk windows.
              </p>
            </div>

            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all">
              <div className="p-3.5 bg-indigo-100 text-indigo-700 rounded-2xl w-fit mb-5 border border-indigo-200">
                <Navigation size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Smart Route Optimizer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Side-by-side comparison of direct vs. eco bypass routes with fuel efficiency & CO2 metrics.
              </p>
            </div>

            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-300 transition-all">
              <div className="p-3.5 bg-red-100 text-red-700 rounded-2xl w-fit mb-5 border border-red-200">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Incident Control Dispatch</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real-time broadcast for accidents, signal failures, waterlogging, and emergency roadwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 🏛️ SECTION 4: ARCHITECTURE & SECURITY */}
      <section id="about" className="w-full scroll-mt-24 pt-24 pb-16 md:pt-28 md:pb-20 bg-slate-100 border-b border-slate-200 relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-widest block mb-1">
              SYSTEM ARCHITECTURE
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Built on Modern Cloud & AI Foundation
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Radio className="text-sky-600 mb-4" size={28} />
              <h4 className="text-lg font-bold text-slate-900 mb-2">Edge Sensor Telemetry</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Stream sensor metrics from central city hubs into Neon PostgreSQL database pools with low latency and SSL security.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Cpu className="text-orange-600 mb-4" size={28} />
              <h4 className="text-lg font-bold text-slate-900 mb-2">FastAPI AI Engine</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Python FastAPI core engine running machine learning algorithms for speed forecasting and corridor bottleneck risk evaluation.
              </p>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
              <Building2 className="text-emerald-600 mb-4" size={28} />
              <h4 className="text-lg font-bold text-slate-900 mb-2">Role-Based Access Control</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                JWT token verification and role enforcement (ADMIN, OPERATOR, COMMUTER) ensuring secure operations across all APIs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ⭐ SECTION 5: REVIEWS & TESTIMONIALS */}
      <section id="reviews" className="w-full scroll-mt-24 pt-24 pb-16 md:pt-28 md:pb-20 bg-white relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">
              COMMUNITY & OPERATOR REVIEWS
            </span>
            <h2 className="text-3xl font-black text-slate-900">
              Trusted by Mobility Directors & Commuters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic mb-6">
                  "TrafficVision AI has revolutionized our emergency response times. Being able to predict bottleneck congestion 45 minutes before peak hours reduced city gridlock by 22%."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  VR
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Vikramaditya Rao</h4>
                  <span className="text-[11px] text-slate-500 block">Chief Director, Transport Authority</span>
                </div>
              </div>
            </div>

            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic mb-6">
                  "The Route Optimizer's side-by-side eco bypass route comparisons save me over 18 minutes on my daily airport commute while saving fuel. Highly recommended!"
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  MN
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Dr. Meera Nambiar</h4>
                  <span className="text-[11px] text-slate-500 block">Urban Mobility Researcher</span>
                </div>
              </div>
            </div>

            <div className="p-7 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1 text-amber-400 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed italic mb-6">
                  "Real-time broadcast alerts allowed our officers to quickly dispatch tow services during a severe collision on Hebbal Flyover, preventing massive gridlock."
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  AM
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Arjun Mehta</h4>
                  <span className="text-[11px] text-slate-500 block">Incident Command Operator</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🚀 SECTION 6: CALL TO ACTION BANNER */}
      <section className="w-full py-16 md:py-20 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white text-center relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 flex flex-col items-center gap-6">
          <div className="p-4 bg-emerald-950 border border-emerald-800/60 rounded-full text-emerald-400">
            <ShieldCheck size={36} />
          </div>
          <h3 className="text-3xl font-black tracking-tight text-white">Ready to Launch the Control Portal?</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Log in with your administrator, operator, or commuter account to access live sensor telemetry, bottleneck predictions, and incident dispatching.
          </p>
          <div className="flex gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center gap-2 no-underline"
            >
              Launch Portal Now <ArrowRight size={16} />
            </Link>
            <Link
              to="/register"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition-all no-underline"
            >
              Register New Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500 bg-white border-t border-slate-200 font-sans relative z-10">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          TrafficVision AI © 2026 — Smart Urban Mobility System
        </div>
      </footer>
    </div>
  );
}
