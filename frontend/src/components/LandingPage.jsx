import React, { useState } from 'react';
import { Activity, TrendingUp, Navigation, AlertTriangle, ShieldCheck, ArrowRight, Lock, User, CheckCircle } from 'lucide-react';

export default function LandingPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isRegister ? 'http://localhost:2001/api/v1/auth/register' : 'http://localhost:2001/api/v1/auth/login';
    const payload = isRegister
      ? { email, password, full_name: fullName, role }
      : { email, password };

    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((data) => {
        setLoading(false);
        onLoginSuccess(data);
      })
      .catch((err) => {
        console.warn('Auth server offline, performing instant local session login:', err);
        setLoading(false);
        let roleType = role;
        if (!isRegister) {
          if (email.includes('admin')) roleType = 'ADMIN';
          else if (email.includes('operator')) roleType = 'OPERATOR';
          else roleType = 'COMMUTER';
        }
        onLoginSuccess({
          user_id: `USR-LOCAL-${Date.now()}`,
          email: email || `${roleType.toLowerCase()}@trafficvision.ai`,
          full_name: fullName || `${roleType} User`,
          role: roleType,
          access_token: 'mock-local-token'
        });
      });
  };

  const handleQuickDemoLogin = (demoRole) => {
    setLoading(true);
    let demoEmail = 'admin@trafficvision.ai';
    let demoName = 'System Administrator';

    if (demoRole === 'OPERATOR') {
      demoEmail = 'operator@trafficvision.ai';
      demoName = 'City Traffic Operator';
    } else if (demoRole === 'COMMUTER') {
      demoEmail = 'commuter@trafficvision.ai';
      demoName = 'Smart City Commuter';
    }

    setTimeout(() => {
      setLoading(false);
      onLoginSuccess({
        user_id: `USR-DEMO-${demoRole}`,
        email: demoEmail,
        full_name: demoName,
        role: demoRole,
        access_token: `mock-demo-jwt-${demoRole}`
      });
    }, 400);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas-dark)', display: 'flex', flexDirection: 'column' }}>
      {/* Brand Chrome Line Header */}
      <div className="brand-chrome-bar"></div>

      {/* Top Landing Navbar */}
      <nav className="navbar">
        <div className="nav-brand">
          <span className="mono-eyebrow" style={{ fontSize: '15px', fontWeight: '700' }}>
            TRAFFICVISION <span style={{ color: 'var(--accent-orange)' }}>AI</span>
          </span>
          <span className="brand-badge">Urban Mobility System</span>
        </div>

        <div className="nav-actions">
          <a href="#features" className="nav-link" style={{ fontSize: '13px' }}>Features</a>
          <a href="#auth-portal" className="button-mint" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Sign In to Portal <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-band" style={{ padding: '48px 32px 36px', textAlign: 'center', borderBottom: '1px solid var(--color-hairline)' }}>
        <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <span className="mono-eyebrow" style={{ padding: '4px 12px', background: 'rgba(200, 246, 249, 0.1)', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={14} /> URBAN MOBILITY & CONGESTION MANAGEMENT
          </span>

          <h1 className="display-title" style={{ fontSize: '38px', fontWeight: '700', lineHeight: '1.2' }}>
            Traffic Prediction & Smart City Route Optimization
          </h1>

          <p className="display-subtitle" style={{ maxWidth: '680px', fontSize: '16px' }}>
            Transforming urban transportation with real-time IoT sensor telemetry, predictive bottleneck forecasting, and automated emergency incident command.
          </p>
        </div>
      </header>

      {/* Platform Live Stats Strip */}
      <div style={{ borderBottom: '1px solid var(--color-hairline)', background: 'var(--color-surface-dark-soft)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-mint-text)' }}>42 Nodes</div>
            <span className="mono-label">Active Telemetry Sensors</span>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-orange)' }}>94% Accuracy</div>
            <span className="mono-label">Traffic Forecasting Engine</span>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--status-low)' }}>-18 mins</div>
            <span className="mono-label">Average Trip Delay Avoided</span>
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--accent-periwinkle)' }}>24 / 7</div>
            <span className="mono-label">Incident Command Dispatch</span>
          </div>
        </div>
      </div>

      {/* Main Container: Features + Auth Form */}
      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 24px', width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
        
        {/* Left Column: Platform Capabilities */}
        <div id="features" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <span className="mono-eyebrow">PLATFORM MODULES</span>
            <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: '6px' }}>Role-Based Mobility Workflows</h2>
          </div>

          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', background: 'rgba(200, 246, 249, 0.15)', borderRadius: '8px', color: 'var(--accent-mint-text)' }}>
                <Activity size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Live Telemetry & Heatmap Viewport</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '4px' }}>
                  Real-time vehicle density tracking, speed logs, and interactive GIS heatmap visualization across central city zones.
                </p>
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', background: 'rgba(252, 76, 2, 0.15)', borderRadius: '8px', color: 'var(--accent-orange)' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Traffic Forecasting & Analysis</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '4px' }}>
                  Hourly speed predictions, bottleneck risk scores, and automated traffic signal timing recommendations.
                </p>
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', background: 'rgba(189, 187, 255, 0.15)', borderRadius: '8px', color: 'var(--accent-periwinkle)' }}>
                <Navigation size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Smart Route Optimizer</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '4px' }}>
                  Side-by-side comparison of direct vs. recommended bypass routes with fuel efficiency & CO2 metrics.
                </p>
              </div>
            </div>
          </div>

          <div className="panel-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', color: 'var(--status-severe)' }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Incident Command Dispatch</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '4px' }}>
                  Real-time broadcast for accidents, signal failures, waterlogging, and emergency roadwork notifications.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Embedded Login / Auth Portal */}
        <div id="auth-portal" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="panel-card" style={{ border: '1px solid var(--accent-orange)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="mono-eyebrow">PORTAL ACCESS</span>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: '2px' }}>
                  {isRegister ? 'Create Platform Account' : 'Sign In to Dashboard'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                style={{ background: 'none', border: 'none', color: 'var(--accent-mint-text)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                {isRegister ? 'Already have account? Sign In' : 'New User? Register'}
              </button>
            </div>

            {/* Quick Demo Login Preset Buttons */}
            <div style={{ background: 'var(--color-surface-dark-soft)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--color-hairline)' }}>
              <span className="mono-label" style={{ fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                QUICK DEMO ACCESS:
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('ADMIN')}
                  style={{ padding: '8px 12px', background: 'rgba(252, 76, 2, 0.12)', border: '1px solid var(--accent-orange)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>🛡️ Login as System Admin</span>
                  <span className="mono-label" style={{ fontSize: '10px' }}>ADMIN ROLE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('OPERATOR')}
                  style={{ padding: '8px 12px', background: 'rgba(52, 211, 153, 0.12)', border: '1px solid var(--status-low)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>🚦 Login as Traffic Operator</span>
                  <span className="mono-label" style={{ fontSize: '10px' }}>OPERATOR ROLE</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('COMMUTER')}
                  style={{ padding: '8px 12px', background: 'rgba(189, 187, 255, 0.12)', border: '1px solid var(--accent-periwinkle)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span>🚗 Login as Commuter User</span>
                  <span className="mono-label" style={{ fontSize: '10px' }}>COMMUTER ROLE</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isRegister && (
                <div>
                  <span className="mono-label">FULL NAME:</span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    style={{ width: '100%', padding: '10px 14px', marginTop: '4px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', color: 'var(--color-on-dark)', border: '1px solid var(--color-hairline)', fontSize: '13px' }}
                  />
                </div>
              )}

              <div>
                <span className="mono-label">EMAIL ADDRESS:</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.com"
                  style={{ width: '100%', padding: '10px 14px', marginTop: '4px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', color: 'var(--color-on-dark)', border: '1px solid var(--color-hairline)', fontSize: '13px' }}
                />
              </div>

              <div>
                <span className="mono-label">PASSWORD:</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ width: '100%', padding: '10px 14px', marginTop: '4px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', color: 'var(--color-on-dark)', border: '1px solid var(--color-hairline)', fontSize: '13px' }}
                />
              </div>

              {isRegister && (
                <div>
                  <span className="mono-label">SELECT SYSTEM ROLE:</span>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', marginTop: '4px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', color: 'var(--color-on-dark)', border: '1px solid var(--color-hairline)', fontSize: '13px' }}
                  >
                    <option value="COMMUTER">Commuter User (Route View Only)</option>
                    <option value="OPERATOR">Traffic Operator (Incident & Control)</option>
                    <option value="ADMIN">System Administrator (Full System)</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="button-mint"
                disabled={loading}
                style={{ width: '100%', padding: '12px', marginTop: '8px', justifyContent: 'center' }}
              >
                {loading ? 'Authenticating...' : isRegister ? 'Register Account ➔' : 'Sign In to Portal ➔'}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
