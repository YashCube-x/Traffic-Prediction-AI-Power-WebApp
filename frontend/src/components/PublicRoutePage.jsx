import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import RouteOptimizer from './RouteOptimizer';

// Public, no-login traffic check. Anyone in the city can plan a route and
// see live congestion + incident banners; signing in additionally unlocks
// saved commutes and citizen incident reporting.
export default function PublicRoutePage({ userSession = null }) {
  return (
    <div className="app-container" style={{ minHeight: '100vh' }}>
      <div className="brand-chrome-bar"></div>

      {/* Slim public top bar */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 24px', borderBottom: '1px solid var(--color-hairline)',
        position: 'sticky', top: 0, zIndex: 1000,
        background: 'var(--color-canvas-dark)', backdropFilter: 'blur(12px)',
      }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span className="mono-eyebrow" style={{ fontSize: '15px', fontWeight: '800' }}>
            TRAFFICVISION <span style={{ color: 'var(--accent-orange)' }}>AI</span>
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="mono-label" style={{ fontSize: '11px' }}>PUBLIC TRAFFIC CHECK — NO LOGIN NEEDED</span>
          <Link
            to="/login"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: 'var(--radius-md)',
              background: 'var(--accent-orange)', color: '#fff',
              fontSize: '12px', fontWeight: '700', textDecoration: 'none',
            }}
          >
            Sign In <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        <RouteOptimizer userSession={userSession} />
      </main>
    </div>
  );
}
