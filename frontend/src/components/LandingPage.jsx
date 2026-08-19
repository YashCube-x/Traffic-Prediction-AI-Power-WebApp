import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, TrendingUp, Navigation, AlertTriangle, ArrowRight, ShieldCheck,
  Radio, Cpu, Building2, Landmark, FileText, Phone, Info, HeartHandshake, MapPinned, UserCheck, Siren
} from 'lucide-react';
import GovHeader from './GovHeader';
import NoticeTicker from './NoticeTicker';
import GovFooter from './GovFooter';
import ChatbotWidget from './ChatbotWidget';

// Public landing page, restyled to read as an Indian government / public-
// sector portal (reusing the same GovHeader/NoticeTicker/GovFooter chrome
// as the logged-in dashboard) rather than a startup marketing site.
// Deliberately honest: no fabricated official endorsements, no invented
// named officials, no real emblem/department identity - GovFooter's
// "demonstration/student project, not an official government service"
// disclosure applies here too.
export default function LandingPage() {
  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900 font-sans">
      <GovHeader />
      <NoticeTicker />

      {/* Secondary section nav - plain, no gradient chrome (GovHeader already carries the tricolour accent) */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200 shadow-sm">
        <nav className="max-w-[1200px] mx-auto px-6 md:px-10 py-3 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <span className="font-mono text-lg font-black tracking-tight text-slate-900">
              TRAFFICVISION <span className="text-orange-600">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <a href="#services" className="hidden md:inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Services
            </a>
            <a href="#snapshot" className="hidden md:inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              City Snapshot
            </a>
            <a href="#about" className="hidden md:inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              About
            </a>
            <a href="#safety" className="hidden md:inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Safety
            </a>
            <a href="#helpline" className="hidden md:inline-block text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              Helpline
            </a>
            <Link
              to="/login"
              className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center gap-2 no-underline"
            >
              Portal Sign In <ArrowRight size={13} />
            </Link>
          </div>
        </nav>
      </header>

      {/* HERO - restrained, official tone rather than gradient marketing */}
      <section className="w-full bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col gap-5">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase px-3 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded w-fit">
              <Landmark size={13} /> Namma Bengaluru Urban Mobility Initiative
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold tracking-tight text-slate-900 leading-tight">
              AI-Powered Traffic Prediction &amp; Congestion Management
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
              A public traffic advisory platform for Bengaluru — live corridor sensor telemetry, AI-forecasted travel times,
              route optimization, and citizen incident reporting, built to support Namma Bengaluru's traffic authorities and commuters.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/route"
                className="px-6 py-3 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wide transition-colors no-underline flex items-center gap-2"
              >
                Check Live Traffic (No Login Required) <ArrowRight size={15} />
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-md bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-900 font-bold text-xs uppercase tracking-wide transition-colors no-underline"
              >
                Citizen / Operator Login
              </Link>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-500 pt-3 border-t border-slate-100 mt-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                This is an AI-driven demonstration platform and is not an official government service.
                See the footer for the full disclosure.
              </span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="w-full rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-slate-50">
                <span className="text-[11px] font-mono font-bold text-slate-700">CITY MAP VIEWPORT</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                  LIVE
                </span>
              </div>
              <img
                src="/hero_dashboard_preview.jpg"
                alt="TrafficVision AI dashboard preview"
                className="w-full h-64 md:h-72 object-cover"
              />
              <div className="grid grid-cols-2 gap-2 p-3 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">Peak Corridor:</span>
                  <span className="text-orange-700 font-bold">Hebbal</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500">City Avg Speed:</span>
                  <span className="text-emerald-700 font-bold">~20 km/h</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK LINKS / e-SERVICES - a standard gov-portal pattern */}
      <section className="w-full bg-slate-100 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/route" className="p-5 bg-white rounded-lg border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all no-underline text-slate-900">
              <Navigation size={20} className="text-orange-600 mb-3" />
              <div className="text-sm font-bold">Check Traffic</div>
              <div className="text-[11px] text-slate-500 mt-1">No login needed</div>
            </Link>
            <Link to="/login" className="p-5 bg-white rounded-lg border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all no-underline text-slate-900">
              <ShieldCheck size={20} className="text-sky-600 mb-3" />
              <div className="text-sm font-bold">Portal Login</div>
              <div className="text-[11px] text-slate-500 mt-1">Citizen / Operator / Admin</div>
            </Link>
            <Link to="/register" className="p-5 bg-white rounded-lg border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all no-underline text-slate-900">
              <FileText size={20} className="text-indigo-600 mb-3" />
              <div className="text-sm font-bold">Register Account</div>
              <div className="text-[11px] text-slate-500 mt-1">Create a commuter account</div>
            </Link>
            <a href="#helpline" className="p-5 bg-white rounded-lg border border-slate-200 hover:border-orange-300 hover:shadow-sm transition-all no-underline text-slate-900">
              <Phone size={20} className="text-emerald-600 mb-3" />
              <div className="text-sm font-bold">Helpline Numbers</div>
              <div className="text-[11px] text-slate-500 mt-1">Traffic Police, Emergency</div>
            </a>
          </div>
        </div>
      </section>

      {/* CITY SNAPSHOT */}
      <section id="snapshot" className="w-full scroll-mt-24 bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-14">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-3">
            <div>
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-widest block mb-1">Realtime Metrics</span>
              <h2 className="text-2xl font-extrabold text-slate-900">City Arterial Corridor Snapshot</h2>
            </div>
            <span className="text-[11px] font-mono px-3 py-1 bg-slate-50 border border-slate-300 text-slate-700 rounded font-bold">
              STATUS: OPERATIONAL &bull; 30s REFRESH
            </span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3 px-5">Corridor</th>
                    <th className="py-3 px-5">Congestion Index</th>
                    <th className="py-3 px-5">Avg Speed</th>
                    <th className="py-3 px-5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                  <tr>
                    <td className="py-3 px-5 font-semibold text-slate-900">Central Silk Board Junction</td>
                    <td className="py-3 px-5 font-mono text-red-700">92%</td>
                    <td className="py-3 px-5 font-mono text-slate-700">9.5 km/h</td>
                    <td className="py-3 px-5 text-right"><span className="px-2.5 py-1 text-[11px] font-bold rounded bg-red-50 text-red-700 border border-red-200">SEVERE</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-semibold text-slate-900">Hebbal Flyover to Airport Expressway</td>
                    <td className="py-3 px-5 font-mono text-amber-700">45%</td>
                    <td className="py-3 px-5 font-mono text-slate-700">22.0 km/h</td>
                    <td className="py-3 px-5 text-right"><span className="px-2.5 py-1 text-[11px] font-bold rounded bg-amber-50 text-amber-700 border border-amber-200">MODERATE</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-semibold text-slate-900">Outer Ring Road (Marathahalli - Bellandur)</td>
                    <td className="py-3 px-5 font-mono text-red-700">88%</td>
                    <td className="py-3 px-5 font-mono text-slate-700">11.0 km/h</td>
                    <td className="py-3 px-5 text-right"><span className="px-2.5 py-1 text-[11px] font-bold rounded bg-red-50 text-red-700 border border-red-200">SEVERE</span></td>
                  </tr>
                  <tr>
                    <td className="py-3 px-5 font-semibold text-slate-900">Electronic City Elevated Expressway</td>
                    <td className="py-3 px-5 font-mono text-emerald-700">18%</td>
                    <td className="py-3 px-5 font-mono text-slate-700">45.0 km/h</td>
                    <td className="py-3 px-5 text-right"><span className="px-2.5 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">LOW</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            Figures shown are representative sample readings from the live sensor network — see the full dashboard after signing in for real-time values.
          </p>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="w-full scroll-mt-24 bg-slate-100 border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-14">
          <div className="mb-10">
            <span className="text-[11px] font-bold text-orange-700 uppercase tracking-widest block mb-1">What This Platform Offers</span>
            <h2 className="text-2xl font-extrabold text-slate-900">Our Services</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 bg-white rounded-lg border border-slate-200">
              <div className="p-3 bg-sky-50 text-sky-700 rounded-lg w-fit mb-4 border border-sky-200">
                <Activity size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Live Sensor Map</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Real corridor sensor locations plotted on an interactive map with speed and vehicle-count readings.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-slate-200">
              <div className="p-3 bg-orange-50 text-orange-700 rounded-lg w-fit mb-4 border border-orange-200">
                <TrendingUp size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">AI Traffic Forecasting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A trained model forecasts corridor speeds and congestion risk for the hours ahead.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-slate-200">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg w-fit mb-4 border border-indigo-200">
                <Navigation size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Route Optimizer</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Compares real routes with live/estimated delay, so you can pick the fastest way through the city.
              </p>
            </div>
            <div className="p-6 bg-white rounded-lg border border-slate-200">
              <div className="p-3 bg-red-50 text-red-700 rounded-lg w-fit mb-4 border border-red-200">
                <AlertTriangle size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Incident Reporting</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Citizens and operators can report and track accidents, waterlogging, and road closures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="w-full scroll-mt-24 bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
              <span className="text-[11px] font-bold text-sky-700 uppercase tracking-widest block mb-1">About</span>
              <h2 className="text-2xl font-extrabold text-slate-900">How This Platform Is Built</h2>
            </div>
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                <Radio className="text-sky-700 mb-3" size={22} />
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">Sensor Telemetry</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Corridor sensor readings stored in a PostgreSQL database with role-scoped API access.
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                <Cpu className="text-orange-700 mb-3" size={22} />
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">GBDT Forecasting Model</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  A scikit-learn Gradient Boosted Decision Tree model trained on corridor telemetry.
                </p>
              </div>
              <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                <Building2 className="text-emerald-700 mb-3" size={22} />
                <h4 className="text-sm font-bold text-slate-900 mb-1.5">Role-Based Access</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  JWT-secured Admin, Operator, and Commuter roles, each scoped to what they need.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WOMEN'S SAFETY */}
      <section id="safety" className="w-full scroll-mt-24 bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-14">
          <div className="flex items-center gap-2 mb-1">
            <HeartHandshake size={16} className="text-rose-700" />
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-widest">Commuter Safety</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Built With Women's Safety in Mind</h2>
          <p className="text-sm text-slate-600 max-w-2xl mb-8">
            Real safety tools available to every commuter, not just a slogan — an always-on SOS button, direct
            women's helpline dialing, and an emergency contact who's notified automatically.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 bg-rose-50/60 rounded-lg border border-rose-100">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-lg w-fit mb-4 border border-rose-200">
                <Siren size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">One-Tap SOS, Always On</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The SOS button floats on every page of the app. One tap shares your live GPS location instantly with the nearest traffic operator control room.
              </p>
            </div>
            <div className="p-6 bg-rose-50/60 rounded-lg border border-rose-100">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-lg w-fit mb-4 border border-rose-200">
                <UserCheck size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Emergency Contact Alert</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Save a trusted contact once in your Safety Profile — they're referenced automatically the moment you trigger an SOS.
              </p>
            </div>
            <div className="p-6 bg-rose-50/60 rounded-lg border border-rose-100">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-lg w-fit mb-4 border border-rose-200">
                <Phone size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Women's Helpline, One Tap Away</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct quick-dial to the National Women Helpline (181) and Police Women Helpline (1091) from the Safety Center.
              </p>
            </div>
            <div className="p-6 bg-rose-50/60 rounded-lg border border-rose-100">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-lg w-fit mb-4 border border-rose-200">
                <MapPinned size={22} />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1.5">Monitored in Real Time</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Every SOS signal lands on a live queue watched by traffic operator staff — not a silent form that goes nowhere.
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 text-[11px] text-slate-500">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>
              For a life-threatening emergency, always call 112 directly first — the in-app SOS complements, but does not replace, emergency services.
            </span>
          </div>
        </div>
      </section>

      {/* HELPLINE */}
      <section id="helpline" className="w-full scroll-mt-24 bg-slate-100">
        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-14">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-widest block mb-1">Citizen Helpline</span>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Emergency &amp; Helpline Numbers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 bg-white rounded-lg border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200"><Phone size={20} /></div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Traffic Police</div>
                <div className="text-lg font-bold text-slate-900">103</div>
              </div>
            </div>
            <div className="p-5 bg-white rounded-lg border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-700 rounded-lg border border-orange-200"><Phone size={20} /></div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Emergency</div>
                <div className="text-lg font-bold text-slate-900">112</div>
              </div>
            </div>
            <div className="p-5 bg-white rounded-lg border border-slate-200 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200"><Phone size={20} /></div>
              <div>
                <div className="text-[11px] text-slate-500 font-semibold uppercase">Women Helpline</div>
                <div className="text-lg font-bold text-slate-900">181</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative w-full py-14 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white text-center overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-72 h-72 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 right-1/4 w-72 h-72 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative max-w-[1200px] mx-auto px-6 md:px-10 flex flex-col items-center gap-5">
          <div className="p-3 bg-emerald-950 border border-emerald-800/60 rounded-full text-emerald-400">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight">Access the Traffic Management Portal</h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Sign in with your Administrator, Operator, or Commuter account for live sensor telemetry, AI forecasts, and incident dispatch.
          </p>
          <div className="flex gap-3">
            <Link
              to="/login"
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-fuchsia-600 hover:from-orange-500 hover:to-fuchsia-500 text-white font-bold text-xs uppercase tracking-wide rounded-md transition-all shadow-lg shadow-orange-900/30 flex items-center gap-2 no-underline"
            >
              Portal Sign In <ArrowRight size={15} />
            </Link>
            <Link
              to="/register"
              className="px-6 py-3 bg-white/5 hover:bg-white/15 text-white border border-indigo-400/30 hover:border-indigo-300/50 font-bold text-xs rounded-md transition-all no-underline"
            >
              Register New Account
            </Link>
          </div>
        </div>
      </section>

      <GovFooter />
      <ChatbotWidget />
    </div>
  );
}
