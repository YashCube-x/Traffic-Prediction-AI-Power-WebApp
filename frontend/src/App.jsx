import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './styles/theme.css';
import { Sun, Moon, User as UserIcon, LogOut, Activity, Navigation, AlertTriangle, BarChart2, TrendingUp } from 'lucide-react';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import AIForecasting from './components/AIForecasting';
import RouteOptimizer from './components/RouteOptimizer';
import AlertsManager from './components/AlertsManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';

export default function App() {
  const navigate = useNavigate();
  const [userSession, setUserSession] = useState(null);
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState('light');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Fetch traffic status from Express backend
    fetch('http://localhost:2001/api/v1/traffic/status')
      .then((res) => res.json())
      .then((data) => {
        setTrafficData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend server fallback:', err);
        setTrafficData({
          total_active_sensors: 42,
          avg_city_speed_kmh: 25.9,
          active_congestion_alerts: 5,
          system_status: "OPERATIONAL",
          recent_telemetry: [
            {
              sensor_id: "SN-CENTRAL-01",
              location: { road_name: "M.G. Road", zone_id: "ZONE_CENTRAL", latitude: 12.9716, longitude: 77.5946 },
              metrics: { vehicle_count: 185, avg_speed_kmh: 14.2, congestion_level: "HEAVY" }
            },
            {
              sensor_id: "SN-NORTH-04",
              location: { road_name: "Hebbal Flyover", zone_id: "ZONE_NORTH", latitude: 13.0358, longitude: 77.5970 },
              metrics: { vehicle_count: 210, avg_speed_kmh: 9.5, congestion_level: "SEVERE" }
            },
            {
              sensor_id: "SN-SOUTH-02",
              location: { road_name: "Silk Board Junction", zone_id: "ZONE_SOUTH", latitude: 12.9165, longitude: 77.6101 },
              metrics: { vehicle_count: 120, avg_speed_kmh: 32.0, congestion_level: "MODERATE" }
            },
            {
              sensor_id: "SN-EAST-08",
              location: { road_name: "Indiranagar 100ft Rd", zone_id: "ZONE_EAST", latitude: 12.9784, longitude: 77.6408 },
              metrics: { vehicle_count: 65, avg_speed_kmh: 48.0, congestion_level: "LOW" }
            }
          ]
        });
        setLoading(false);
      });
  }, []);

  const handleLoginSuccess = (user) => {
    setUserSession(user);
    if (user.role === 'COMMUTER') setActiveTab('routes');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUserSession(null);
    navigate('/');
  };

  const userRole = userSession?.role || 'COMMUTER';

  return (
    <Routes>
      {/* 1. Landing Page Route */}
      <Route path="/" element={<LandingPage />} />

      {/* 2. Dedicated 100vh Light UI Login Route */}
      <Route
        path="/login"
        element={<LoginPage onLoginSuccess={handleLoginSuccess} initialRegister={false} />}
      />

      {/* 3. Dedicated 100vh Light UI Register Route */}
      <Route
        path="/register"
        element={<LoginPage onLoginSuccess={handleLoginSuccess} initialRegister={true} />}
      />

      {/* 4. Authenticated Portal Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          userSession ? (
            <div className="app-container">
              {/* Brand Chrome Line Header */}
              <div className="brand-chrome-bar"></div>

              {/* Top Navbar */}
              <nav className="navbar">
                <div className="nav-brand">
                  <span className="mono-eyebrow" style={{ fontSize: '15px', fontWeight: '800', tracking: '-0.02em' }}>
                    TRAFFICVISION <span style={{ color: 'var(--accent-orange)' }}>AI</span>
                  </span>
                  <span className="brand-badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-low)', borderColor: 'var(--status-low)' }}>
                    {userRole} PORTAL
                  </span>
                </div>

                <div className="nav-links">
                  {(userRole === 'ADMIN' || userRole === 'OPERATOR' || userRole === 'COMMUTER') && (
                    <button 
                      className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                      onClick={() => setActiveTab('dashboard')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Activity size={15} /> Live Dashboard
                    </button>
                  )}

                  {(userRole === 'ADMIN' || userRole === 'OPERATOR') && (
                    <button 
                      className={`nav-link ${activeTab === 'predictions' ? 'active' : ''}`}
                      onClick={() => setActiveTab('predictions')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <TrendingUp size={15} /> Traffic Forecasting
                    </button>
                  )}

                  {(userRole === 'ADMIN' || userRole === 'OPERATOR' || userRole === 'COMMUTER') && (
                    <button 
                      className={`nav-link ${activeTab === 'routes' ? 'active' : ''}`}
                      onClick={() => setActiveTab('routes')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Navigation size={15} /> Route Optimizer
                    </button>
                  )}

                  {(userRole === 'ADMIN' || userRole === 'OPERATOR') && (
                    <button 
                      className={`nav-link ${activeTab === 'alerts' ? 'active' : ''}`}
                      onClick={() => setActiveTab('alerts')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <AlertTriangle size={15} /> Incident Control
                    </button>
                  )}

                  {userRole === 'ADMIN' && (
                    <button 
                      className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                      onClick={() => setActiveTab('analytics')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <BarChart2 size={15} /> Analytics
                    </button>
                  )}
                </div>

                {/* Right Control Actions - Single Horizontal Row */}
                <div className="nav-user-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light/Dark Theme" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px' }}>
                    {themeMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
                    {themeMode === 'dark' ? 'Light' : 'Dark'}
                  </button>

                  <div className="user-role-pill" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '32px' }}>
                    <UserIcon size={14} style={{ color: 'var(--color-on-dark)' }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-on-dark)', whiteSpace: 'nowrap' }}>
                      {userSession.full_name || userSession.email.split('@')[0]}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: userRole === 'ADMIN' ? 'var(--accent-orange)' : userRole === 'OPERATOR' ? 'var(--accent-mint)' : 'var(--accent-periwinkle)',
                        color: userRole === 'OPERATOR' ? '#000' : '#fff'
                      }}
                    >
                      {userRole}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    style={{
                      height: '32px',
                      padding: '0 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      fontFamily: 'var(--font-display)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </nav>

              {/* Hero Header */}
              <header className="hero-band">
                <div className="hero-grid">
                  <div>
                    <span className="mono-eyebrow">
                      {activeTab === 'dashboard' && `Traffic & Congestion Dashboard`}
                      {activeTab === 'predictions' && `Traffic Forecasting & Bottleneck Prediction`}
                      {activeTab === 'routes' && `Smart Route Optimization & Travel Time`}
                      {activeTab === 'alerts' && `Incident Management & Dispatch`}
                      {activeTab === 'analytics' && `Traffic Analytics & Heatmaps`}
                    </span>
                    <h1 className="display-title" style={{ marginTop: '8px' }}>
                      Urban Traffic Management System
                    </h1>
                    <p className="display-subtitle" style={{ marginTop: '8px' }}>
                      Logged in as <strong style={{ color: 'var(--accent-mint-text)' }}>{userSession.email}</strong> ({userRole} Portal). Monitoring city mobility and optimizing vehicle flow.
                    </p>
                  </div>
                  {userRole === 'ADMIN' && (
                    <div style={{ textAlign: 'right' }}>
                      <button className="button-mint">
                        + Add Sensor Node
                      </button>
                    </div>
                  )}
                </div>
              </header>

              {/* Main Content */}
              <main className="main-content animate-fade-in" key={activeTab}>
                {activeTab === 'dashboard' && (
                  <>
                    {/* Key Metrics Row */}
                    <section className="stats-grid">
                      <div className="stat-card mint-tint">
                        <span className="mono-eyebrow">Active Sensor Nodes</span>
                        <div className="stat-value" style={{ color: 'var(--accent-mint-text)' }}>
                          {loading ? '...' : trafficData?.total_active_sensors}
                        </div>
                        <span className="mono-label">Operational Network</span>
                      </div>

                      <div className="stat-card">
                        <span className="mono-eyebrow">City Average Speed</span>
                        <div className="stat-value">
                          {loading ? '...' : `${trafficData?.avg_city_speed_kmh} km/h`}
                        </div>
                        <span className="mono-label">Target: 35.0 km/h</span>
                      </div>

                      <div className="stat-card">
                        <span className="mono-eyebrow">Active Congestion Alerts</span>
                        <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>
                          {loading ? '...' : trafficData?.active_congestion_alerts}
                        </div>
                        <span className="mono-label">Active Bottlenecks</span>
                      </div>

                      <div className="stat-card">
                        <span className="mono-eyebrow">System Health</span>
                        <div className="stat-value" style={{ color: '#34d399', fontSize: '24px' }}>
                          ● {loading ? 'Checking...' : trafficData?.system_status}
                        </div>
                        <span className="mono-label">All Systems Online</span>
                      </div>
                    </section>

                    {/* Dashboard Panels */}
                    <div className="dashboard-grid">
                      <div className="panel-card">
                        <div className="panel-header">
                          <div>
                            <span className="mono-eyebrow">LIVE TELEMETRY VIEWPORT</span>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>City Road Density Heatmap</h3>
                          </div>
                          <span className="mono-label">UPDATE: REALTIME (30s)</span>
                        </div>

                        <div className="map-viewport">
                          <div className="map-grid-overlay"></div>
                          
                          <div className="sensor-node-dot" style={{ top: '35%', left: '42%', color: 'var(--status-heavy)' }} title="M.G. Road - HEAVY"></div>
                          <div className="sensor-node-dot" style={{ top: '20%', left: '68%', color: 'var(--status-severe)' }} title="Hebbal Flyover - SEVERE"></div>
                          <div className="sensor-node-dot" style={{ top: '70%', left: '50%', color: 'var(--status-moderate)' }} title="Silk Board Junction - MODERATE"></div>
                          <div className="sensor-node-dot" style={{ top: '45%', left: '80%', color: 'var(--status-low)' }} title="Indiranagar - LOW"></div>

                          <div style={{ position: 'absolute', bottom: '16px', left: '16px', background: 'rgba(1, 1, 32, 0.85)', padding: '8px 16px', borderRadius: '4px', border: '1px solid var(--color-hairline)' }}>
                            <span className="mono-label" style={{ color: '#fff' }}>📍 Live GIS Simulation Viewport</span>
                          </div>
                        </div>
                      </div>

                      <div className="panel-card">
                        <div className="panel-header">
                          <div>
                            <span className="mono-eyebrow">FEED STREAM</span>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Sensor Telemetry Nodes</h3>
                          </div>
                        </div>
                        <div className="table-responsive-wrapper" style={{ marginTop: '12px' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>SENSOR ID</th>
                                <th>LOCATION</th>
                                <th>VEHICLES / SPEED</th>
                                <th>STATUS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trafficData?.recent_telemetry?.map((sensor) => (
                                <tr key={sensor.sensor_id}>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-mint-text)' }}>
                                    {sensor.sensor_id}
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: '600' }}>{sensor.location.road_name}</div>
                                    <span className="mono-label" style={{ fontSize: '10px' }}>{sensor.location.zone_id}</span>
                                  </td>
                                  <td>
                                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: '600' }}>
                                      {sensor.metrics.vehicle_count} vh
                                    </div>
                                    <span className="mono-label" style={{ fontSize: '10px' }}>
                                      {sensor.metrics.avg_speed_kmh} km/h
                                    </span>
                                  </td>
                                  <td>
                                    <span className={`status-badge ${sensor.metrics.congestion_level}`}>
                                      {sensor.metrics.congestion_level}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'predictions' && <AIForecasting />}
                {activeTab === 'routes' && <RouteOptimizer />}
                {activeTab === 'alerts' && <AlertsManager userSession={userSession} />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
              </main>
            </div>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
