import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './styles/theme.css';
import { Sun, Moon, User as UserIcon, LogOut, Activity, Navigation, AlertTriangle, BarChart2, TrendingUp, Menu, X, Users, ShieldAlert, Star, LayoutDashboard, Radio, ScrollText, Settings, ClipboardList, Megaphone } from 'lucide-react';
import { useToast } from './context/ToastContext.jsx';
import { useTranslation } from 'react-i18next';
import { API_BASE } from './config.js';

const CONGESTION_COLORS = {
  LOW: '#34d399',
  MODERATE: '#fbbf24',
  HEAVY: '#f97316',
  SEVERE: '#ef4444',
};
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import AIForecasting from './components/AIForecasting';
import RouteOptimizer from './components/RouteOptimizer';
import AlertsManager from './components/AlertsManager';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import UserManagement from './components/UserManagement';
import SafetyCenter from './components/SafetyCenter';
import SOSButton from './components/SOSButton';
import MyCommutePage from './components/MyCommutePage';
import MyReportsPage from './components/MyReportsPage';
import ForcePasswordChange from './components/ForcePasswordChange';
import PublicRoutePage from './components/PublicRoutePage';
import GovHeader from './components/GovHeader';
import GovFooter from './components/GovFooter';
import NoticeTicker from './components/NoticeTicker';
import CommandCenter from './components/CommandCenter';
import SensorManagement from './components/SensorManagement';
import AuditLogs from './components/AuditLogs';
import SystemSettings from './components/SystemSettings';
import AnnouncementsManager from './components/AnnouncementsManager';
// Helpline directory now lives inside Safety Center's own internal tab
// switcher (SOS | Helpline) instead of being a separate top-level nav item.

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)',
  border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)',
  fontSize: '14px',
  fontWeight: '600',
};

const NAV_ITEMS = [
  { tab: 'command', labelKey: 'navigation.commandCenter', Icon: LayoutDashboard, roles: ['ADMIN'] },
  { tab: 'dashboard', labelKey: 'navigation.liveDashboard', Icon: Activity, roles: ['ADMIN', 'OPERATOR', 'COMMUTER'] },
  { tab: 'predictions', labelKey: 'navigation.trafficForecasting', Icon: TrendingUp, roles: ['ADMIN', 'OPERATOR'] },
  { tab: 'routes', labelKey: 'navigation.routeOptimizer', Icon: Navigation, roles: ['ADMIN', 'OPERATOR', 'COMMUTER'] },
  { tab: 'my-commute', labelKey: 'navigation.myCommute', Icon: Star, roles: ['COMMUTER'] },
  { tab: 'reports', labelKey: 'navigation.myReports', Icon: ClipboardList, roles: ['COMMUTER'] },
  { tab: 'alerts', labelKey: 'navigation.incidentControl', Icon: AlertTriangle, roles: ['ADMIN', 'OPERATOR'] },
  { tab: 'sensors', labelKey: 'navigation.sensorManagement', Icon: Radio, roles: ['ADMIN'] },
  { tab: 'safety', labelKey: 'navigation.safetyCenter', Icon: ShieldAlert, roles: ['ADMIN', 'OPERATOR', 'COMMUTER'] },
  { tab: 'analytics', labelKey: 'navigation.analytics', Icon: BarChart2, roles: ['ADMIN'] },
  { tab: 'users', labelKey: 'navigation.userManagement', Icon: Users, roles: ['ADMIN'] },
  { tab: 'audit', labelKey: 'navigation.auditLogs', Icon: ScrollText, roles: ['ADMIN'] },
  { tab: 'announcements', labelKey: 'navigation.announcements', Icon: Megaphone, roles: ['ADMIN'] },
  { tab: 'settings', labelKey: 'navigation.systemSettings', Icon: Settings, roles: ['ADMIN'] },
];

// The session used to live only in React state, so any page refresh (or the
// browser restoring a tab) reset it to null and bounced a still-validly-
// logged-in user back to /login. sessionStorage survives a refresh (but not
// a closed tab/browser, unlike localStorage), which matches how a JWT-backed
// session should behave here.
const SESSION_KEY = 'tv_session';
function loadStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function defaultTabFor(session) {
  if (!session) return 'dashboard';
  if (session.role === 'COMMUTER') return 'routes';
  if (session.role === 'ADMIN') return 'command';
  return 'dashboard';
}

export default function App() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [userSession, setUserSession] = useState(loadStoredSession);
  const [trafficData, setTrafficData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeMode] = useState('light');
  const [activeTab, setActiveTab] = useState(() => defaultTabFor(loadStoredSession()));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // The header stack above the mobile drawer (GovHeader + notice ticker +
  // chrome bar + top bar) has no fixed height — it grows with longer
  // announcements, the language switcher, font-size changes, etc. A
  // hardcoded CSS offset here previously caused the sticky top bar (higher
  // z-index) to sit on top of and hide the first few drawer nav items, so
  // the offset is measured from the real top bar instead.
  const [mobileDrawerTop, setMobileDrawerTop] = useState(76);
  const mobileTopbarRef = useRef(null);
  const [selectedSensorId, setSelectedSensorId] = useState(null);
  const [showAddSensorModal, setShowAddSensorModal] = useState(false);
  const [addSensorSubmitting, setAddSensorSubmitting] = useState(false);
  const [sensorForm, setSensorForm] = useState({
    sensor_id: '',
    road_name: '',
    zone_id: 'ZONE_CENTRAL',
    latitude: '',
    longitude: '',
    vehicle_count: '',
    avg_speed_kmh: '',
    congestion_level: 'MODERATE',
  });
  const dashboardMapInstanceRef = useRef(null);
  const dashboardMarkersRef = useRef({});
  const trafficDataRef = useRef(null);

  useEffect(() => {
    if (userSession) sessionStorage.setItem(SESSION_KEY, JSON.stringify(userSession));
    else sessionStorage.removeItem(SESSION_KEY);
  }, [userSession]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (!showAddSensorModal) return;
    const handleEscape = (e) => { if (e.key === 'Escape') setShowAddSensorModal(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddSensorModal]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const measure = () => {
      if (mobileTopbarRef.current) {
        setMobileDrawerTop(mobileTopbarRef.current.getBoundingClientRect().bottom);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.setAttribute('data-theme', themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchTrafficStatus = (session = userSession) => {
    // Fetch traffic status from Express backend. The token is sent so the
    // backend can zone-scope the response: an OPERATOR only receives the
    // sensors of their own assigned zone, ADMIN receives the full city.
    const headers = {};
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    fetch(`${API_BASE}/api/v1/traffic/status`, { headers })
      .then((res) => res.json())
      .then((data) => {
        setTrafficData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend server fallback:', err);
        setTrafficData({
          total_active_sensors: 8,
          avg_city_speed_kmh: 19.0,
          active_congestion_alerts: 5,
          system_status: "OPERATIONAL",
          recent_telemetry: [
            {
              sensor_id: "SN-SOUTH-02",
              location: { road_name: "Central Silk Board Junction", zone_id: "ZONE_SOUTH", latitude: 12.9172, longitude: 77.6238 },
              metrics: { vehicle_count: 480, avg_speed_kmh: 9.5, congestion_level: "SEVERE" }
            },
            {
              sensor_id: "SN-NORTH-04",
              location: { road_name: "Hebbal Flyover to Airport Expressway", zone_id: "ZONE_NORTH", latitude: 13.0358, longitude: 77.5970 },
              metrics: { vehicle_count: 210, avg_speed_kmh: 22.0, congestion_level: "MODERATE" }
            },
            {
              sensor_id: "SN-EAST-03",
              location: { road_name: "Outer Ring Road (Marathahalli - Bellandur)", zone_id: "ZONE_EAST", latitude: 12.9569, longitude: 77.7011 },
              metrics: { vehicle_count: 390, avg_speed_kmh: 11.0, congestion_level: "SEVERE" }
            },
            {
              sensor_id: "SN-EAST-05",
              location: { road_name: "Tin Factory & K.R. Puram Junction", zone_id: "ZONE_EAST", latitude: 12.9987, longitude: 77.6952 },
              metrics: { vehicle_count: 340, avg_speed_kmh: 8.4, congestion_level: "SEVERE" }
            },
            {
              sensor_id: "SN-CENTRAL-01",
              location: { road_name: "M.G. Road & Trinity Circle Corridor", zone_id: "ZONE_CENTRAL", latitude: 12.9716, longitude: 77.5946 },
              metrics: { vehicle_count: 185, avg_speed_kmh: 14.2, congestion_level: "HEAVY" }
            },
            {
              sensor_id: "SN-EAST-08",
              location: { road_name: "Whitefield ITPB Main Road", zone_id: "ZONE_EAST", latitude: 12.9698, longitude: 77.7500 },
              metrics: { vehicle_count: 260, avg_speed_kmh: 15.5, congestion_level: "HEAVY" }
            },
            {
              sensor_id: "SN-WEST-06",
              location: { road_name: "Goraguntepalya Tumkur Road Junction", zone_id: "ZONE_WEST", latitude: 13.0280, longitude: 77.5460 },
              metrics: { vehicle_count: 150, avg_speed_kmh: 26.0, congestion_level: "MODERATE" }
            },
            {
              sensor_id: "SN-SOUTH-07",
              location: { road_name: "Electronic City Elevated Expressway", zone_id: "ZONE_SOUTH", latitude: 12.8452, longitude: 77.6602 },
              metrics: { vehicle_count: 90, avg_speed_kmh: 45.0, congestion_level: "LOW" }
            }
          ]
        });
        setLoading(false);
      });
  };

  // Refetch whenever the session changes so the zone-scoped view applies
  // immediately after an operator logs in (or resets on logout).
  useEffect(() => {
    fetchTrafficStatus(userSession);
  }, [userSession]);

  useEffect(() => {
    trafficDataRef.current = trafficData;
    const telemetry = trafficData?.recent_telemetry || [];
    // Keep the selection valid: after zone-scoping the previously selected
    // sensor may no longer be visible to this user.
    if (telemetry.length && !telemetry.some((s) => s.sensor_id === selectedSensorId)) {
      setSelectedSensorId(telemetry[0].sensor_id);
    }
  }, [trafficData, selectedSensorId]);

  // Real Leaflet map for the dashboard's sensor telemetry viewport, plotting
  // each sensor at its actual reported lat/lon instead of hardcoded % positions.
  // Uses a callback ref (not useEffect+useRef) because this div's mount timing
  // depends on both the trafficData fetch AND react-router's navigation to
  // /dashboard landing in separate commits - a dependency-array effect can
  // miss the render where the node actually appears. A callback ref fires
  // exactly when React attaches/detaches the node, so it can't miss it.
  const dashboardMapCallbackRef = useCallback((node) => {
    if (dashboardMapInstanceRef.current) {
      dashboardMapInstanceRef.current.remove();
      dashboardMapInstanceRef.current = null;
    }
    if (!node) return;

    const map = L.map(node, { scrollWheelZoom: false }).setView([12.9716, 77.5946], 11);
    dashboardMapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    dashboardMarkersRef.current = {};
    (trafficDataRef.current?.recent_telemetry || []).forEach((sensor) => {
      const color = CONGESTION_COLORS[sensor.metrics.congestion_level] || CONGESTION_COLORS.LOW;
      const marker = L.circleMarker([sensor.location.latitude, sensor.location.longitude], {
        radius: 9,
        color,
        fillColor: color,
        fillOpacity: 0.65,
        weight: 2,
      })
        .addTo(map)
        .bindPopup(
          `<b>${sensor.location.road_name}</b><br>${sensor.metrics.congestion_level} &bull; ${sensor.metrics.avg_speed_kmh} km/h<br>${sensor.metrics.vehicle_count} vehicles`
        )
        .on('click', () => setSelectedSensorId(sensor.sensor_id));

      dashboardMarkersRef.current[sensor.sensor_id] = marker;
    });

    // Container size can be 0 at the instant of L.map() if layout hasn't
    // settled yet - force Leaflet to remeasure on the next frame.
    requestAnimationFrame(() => map.invalidateSize());
  }, []);

  const handleSelectSensor = (sensor) => {
    setSelectedSensorId(sensor.sensor_id);
    const map = dashboardMapInstanceRef.current;
    const marker = dashboardMarkersRef.current[sensor.sensor_id];
    if (map && marker) {
      map.flyTo([sensor.location.latitude, sensor.location.longitude], 13, { duration: 0.6 });
      marker.openPopup();
    }
  };

  const handleAddSensorSubmit = (e) => {
    e.preventDefault();
    setAddSensorSubmitting(true);

    const payload = {
      sensor_id: sensorForm.sensor_id.trim(),
      road_name: sensorForm.road_name.trim(),
      zone_id: sensorForm.zone_id,
      latitude: parseFloat(sensorForm.latitude),
      longitude: parseFloat(sensorForm.longitude),
      vehicle_count: parseInt(sensorForm.vehicle_count, 10) || 0,
      avg_speed_kmh: parseFloat(sensorForm.avg_speed_kmh) || 0,
      congestion_level: sensorForm.congestion_level,
    };

    fetch(`${API_BASE}/api/v1/traffic/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Failed to add sensor node');
        return data;
      })
      .then(() => {
        setAddSensorSubmitting(false);
        setShowAddSensorModal(false);
        setSensorForm({
          sensor_id: '', road_name: '', zone_id: 'ZONE_CENTRAL', latitude: '', longitude: '',
          vehicle_count: '', avg_speed_kmh: '', congestion_level: 'MODERATE',
        });
        fetchTrafficStatus();
        showToast(`Sensor node "${payload.sensor_id}" added and now live on the map.`, 'success');
      })
      .catch((err) => {
        setAddSensorSubmitting(false);
        showToast(err.message || 'Could not reach the backend to add this sensor.', 'error');
      });
  };

  const handleLoginSuccess = (user) => {
    setUserSession(user);
    if (user.role === 'COMMUTER') setActiveTab('routes');
    else if (user.role === 'ADMIN') setActiveTab('command');
    else setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setUserSession(null);
    sessionStorage.removeItem(SESSION_KEY);
    navigate('/');
  };

  const userRole = userSession?.role || 'COMMUTER';
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(userRole));

  const renderNavLink = ({ tab, labelKey, Icon }, closeDrawerAfter) => (
    <button
      key={tab}
      className={`nav-link ${activeTab === tab ? 'active' : ''}`}
      onClick={() => {
        setActiveTab(tab);
        if (closeDrawerAfter) setMobileMenuOpen(false);
      }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', display: 'flex', alignItems: 'center', gap: '10px', width: '100%', textAlign: 'left' }}
    >
      <Icon size={16} /> {t(labelKey)}
    </button>
  );

  const renderSidebarFooter = () => (
    <>
      <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Light/Dark Theme" aria-label="Toggle light/dark theme" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', height: '36px', width: '100%' }}>
        {themeMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        {themeMode === 'dark' ? t('common.lightMode') : t('common.darkMode')}
      </button>

      <div className="user-role-pill" style={{ display: 'flex', alignItems: 'center', gap: '8px', height: 'auto', padding: '8px 10px' }}>
        <UserIcon size={14} style={{ color: 'var(--color-on-dark)', flexShrink: 0 }} />
        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-on-dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {userSession.full_name || userSession.email.split('@')[0]}
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            marginLeft: 'auto',
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
          height: '36px',
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
          justifyContent: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
          width: '100%',
        }}
      >
        <LogOut size={14} /> {t('common.signOut')}
      </button>
    </>
  );

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

      {/* 4. Password Reset Route (opened from the reset email link) */}
      <Route
        path="/reset-password"
        element={<LoginPage onLoginSuccess={handleLoginSuccess} initialView="reset" />}
      />

      {/* 4b. Public no-login traffic check for city commuters */}
      <Route
        path="/route"
        element={<PublicRoutePage userSession={userSession} />}
      />

      {/* 5. Authenticated Portal Dashboard Route */}
      <Route
        path="/dashboard"
        element={
          userSession ? (
            userSession.must_change_password ? (
              /* Admin-issued temporary password must be replaced before the
                 dashboard unlocks. */
              <ForcePasswordChange
                userSession={userSession}
                onPasswordChanged={() => setUserSession({ ...userSession, must_change_password: false })}
                onLogout={handleLogout}
              />
            ) : (
            <div className="app-container">
              {/* Government-style trilingual header + accessibility controls */}
              <GovHeader />
              <NoticeTicker />
              {/* Brand Chrome Line Header */}
              <div className="brand-chrome-bar"></div>

              {/* Mobile / Tablet Top Bar - visible below the desktop sidebar breakpoint */}
              <div className="mobile-topbar" ref={mobileTopbarRef}>
                <button
                  className="mobile-menu-toggle"
                  aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                  aria-expanded={mobileMenuOpen}
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <span className="mono-eyebrow" style={{ fontSize: '15px', fontWeight: '800' }}>
                  TRAFFICVISION <span style={{ color: 'var(--accent-orange)' }}>AI</span>
                </span>
              </div>

              {/* Mobile / Tablet Navigation Drawer */}
              {mobileMenuOpen && (
                <>
                  <div className="mobile-nav-backdrop" style={{ top: mobileDrawerTop }} onClick={() => setMobileMenuOpen(false)} />
                  <nav className="mobile-nav-drawer" style={{ top: mobileDrawerTop }} aria-label="Mobile navigation">
                    <div className="sidebar-nav">
                      {visibleNavItems.map((item) => renderNavLink(item, true))}
                    </div>
                    <div className="sidebar-footer">
                      {renderSidebarFooter()}
                    </div>
                  </nav>
                </>
              )}

              <div className="app-shell">
                {/* Desktop Fixed Sidebar */}
                <aside className="sidebar">
                  <div className="sidebar-brand">
                    <span className="mono-eyebrow" style={{ fontSize: '15px', fontWeight: '800' }}>
                      TRAFFICVISION <span style={{ color: 'var(--accent-orange)' }}>AI</span>
                    </span>
                    <span className="brand-badge" style={{ marginTop: '8px', background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-low)', borderColor: 'var(--status-low)' }}>
                      {userRole} {t('common.portal')}
                    </span>
                    {userRole === 'OPERATOR' && userSession.assigned_zone && (
                      <span className="brand-badge" style={{ marginTop: '6px', background: 'rgba(251, 191, 36, 0.15)', color: 'var(--status-moderate)', borderColor: 'var(--status-moderate)' }}>
                        📍 {userSession.assigned_zone}
                      </span>
                    )}
                  </div>

                  <nav className="sidebar-nav" aria-label="Primary navigation">
                    {visibleNavItems.map((item) => renderNavLink(item, false))}
                  </nav>

                  <div className="sidebar-footer">
                    {renderSidebarFooter()}
                  </div>
                </aside>

                <div className="main-column">
              {/* Hero Header — only for tabs without their own in-page title.
                  Every other tab's component (CommandCenter, SensorManagement,
                  SafetyCenter, AlertsManager, UserManagement, AuditLogs,
                  AnnouncementsManager, SystemSettings, etc.) already renders
                  its own eyebrow + heading, so showing this generic banner on
                  top of those duplicated/mismatched the page you were on. */}
              {activeTab === 'dashboard' && (
              <header className="hero-band">
                <div className="hero-grid">
                  <div>
                    <span className="mono-eyebrow">{t('dashboard.eyebrow')}</span>
                    <h1 className="display-title" style={{ marginTop: '4px' }}>
                      {t('dashboard.systemTitle')}
                    </h1>
                  </div>
                  {userRole === 'ADMIN' && (
                    <div style={{ textAlign: 'right' }}>
                      <button className="button-mint" onClick={() => setShowAddSensorModal(true)}>
                        + {t('dashboard.addSensorNode')}
                      </button>
                    </div>
                  )}
                </div>
              </header>
              )}

              {/* Add Sensor Node Modal */}
              {showAddSensorModal && (
                <div
                  onClick={() => setShowAddSensorModal(false)}
                  style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 2000, padding: '20px',
                  }}
                >
                  <div
                    className="panel-card"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      maxWidth: '560px', width: '100%', border: '2px solid var(--accent-mint)',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)', padding: '24px', borderRadius: 'var(--radius-lg)',
                      maxHeight: '90vh', overflowY: 'auto',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
                      <div>
                        <span className="mono-eyebrow">SENSOR NETWORK EXPANSION</span>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Add Sensor Node</h3>
                      </div>
                      <button
                        onClick={() => setShowAddSensorModal(false)}
                        style={{
                          background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)',
                          color: 'var(--color-on-dark)', width: '32px', height: '32px', borderRadius: '50%',
                          fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleAddSensorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>SENSOR ID:</span>
                          <input
                            type="text" required
                            value={sensorForm.sensor_id}
                            onChange={(e) => setSensorForm({ ...sensorForm, sensor_id: e.target.value })}
                            placeholder="e.g. SN-EAST-09"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ZONE:</span>
                          <select
                            value={sensorForm.zone_id}
                            onChange={(e) => setSensorForm({ ...sensorForm, zone_id: e.target.value })}
                            style={inputStyle}
                          >
                            {['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'].map((z) => (
                              <option key={z} value={z} style={{ color: '#0f172a', background: '#ffffff' }}>{z}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ROAD / CORRIDOR NAME:</span>
                        <input
                          type="text" required
                          value={sensorForm.road_name}
                          onChange={(e) => setSensorForm({ ...sensorForm, road_name: e.target.value })}
                          placeholder="e.g. Bannerghatta Road Junction"
                          style={inputStyle}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LATITUDE:</span>
                          <input
                            type="number" step="any" required
                            value={sensorForm.latitude}
                            onChange={(e) => setSensorForm({ ...sensorForm, latitude: e.target.value })}
                            placeholder="e.g. 12.9100"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LONGITUDE:</span>
                          <input
                            type="number" step="any" required
                            value={sensorForm.longitude}
                            onChange={(e) => setSensorForm({ ...sensorForm, longitude: e.target.value })}
                            placeholder="e.g. 77.6100"
                            style={inputStyle}
                          />
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>VEHICLE COUNT:</span>
                          <input
                            type="number" required
                            value={sensorForm.vehicle_count}
                            onChange={(e) => setSensorForm({ ...sensorForm, vehicle_count: e.target.value })}
                            placeholder="e.g. 220"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>AVG SPEED (KM/H):</span>
                          <input
                            type="number" step="any" required
                            value={sensorForm.avg_speed_kmh}
                            onChange={(e) => setSensorForm({ ...sensorForm, avg_speed_kmh: e.target.value })}
                            placeholder="e.g. 18.5"
                            style={inputStyle}
                          />
                        </div>
                        <div>
                          <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>STATUS:</span>
                          <select
                            value={sensorForm.congestion_level}
                            onChange={(e) => setSensorForm({ ...sensorForm, congestion_level: e.target.value })}
                            style={inputStyle}
                          >
                            {['LOW', 'MODERATE', 'HEAVY', 'SEVERE'].map((lvl) => (
                              <option key={lvl} value={lvl} style={{ color: '#0f172a', background: '#ffffff' }}>{lvl}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={addSensorSubmitting}
                        className="button-mint"
                        style={{ marginTop: '4px', padding: '12px', fontSize: '13px', fontWeight: '700' }}
                      >
                        {addSensorSubmitting ? `${t('common.loading')}...` : `+ ${t('dashboard.addSensorNode')}`}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Main Content */}
              <main className="main-content animate-fade-in" key={activeTab}>
                {activeTab === 'command' && (
                  <CommandCenter userSession={userSession} onNavigate={setActiveTab} />
                )}
                {activeTab === 'sensors' && (
                  <SensorManagement userSession={userSession} />
                )}
                {activeTab === 'dashboard' && (
                  <>
                    {/* Selected Sensor Detail Panel */}
                    {(() => {
                      const selectedSensor = trafficData?.recent_telemetry?.find((s) => s.sensor_id === selectedSensorId);
                      if (!selectedSensor) return null;
                      const sevColor = `var(--status-${selectedSensor.metrics.congestion_level.toLowerCase()})`;
                      return (
                        <div className="panel-card" style={{ borderLeft: `4px solid ${sevColor}` }}>
                          <div className="panel-header">
                            <div>
                              <span className="mono-eyebrow">{t('dashboard.selectedNodeDetail')}</span>
                              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{selectedSensor.location.road_name}</h3>
                            </div>
                            <span className={`status-badge ${selectedSensor.metrics.congestion_level}`}>
                              {selectedSensor.metrics.congestion_level}
                            </span>
                          </div>
                          <div className="stats-grid" style={{ marginTop: '16px' }}>
                            <div className="stat-card">
                              <span className="mono-eyebrow">{t('dashboard.sensorId')}</span>
                              <div className="stat-value" style={{ fontSize: '18px' }}>{selectedSensor.sensor_id}</div>
                              <span className="mono-label">{selectedSensor.location.zone_id}</span>
                            </div>
                            <div className="stat-card">
                              <span className="mono-eyebrow">{t('dashboard.averageSpeed')}</span>
                              <div className="stat-value">{selectedSensor.metrics.avg_speed_kmh} km/h</div>
                              <span className="mono-label">{t('dashboard.liveCorridorReading')}</span>
                            </div>
                            <div className="stat-card">
                              <span className="mono-eyebrow">{t('dashboard.vehicleCount')}</span>
                              <div className="stat-value">{selectedSensor.metrics.vehicle_count}</div>
                              <span className="mono-label">{t('dashboard.vehiclesInView')}</span>
                            </div>
                            <div className="stat-card">
                              <span className="mono-eyebrow">{t('dashboard.coordinates')}</span>
                              <div className="stat-value" style={{ fontSize: '15px' }}>
                                {selectedSensor.location.latitude.toFixed(4)}, {selectedSensor.location.longitude.toFixed(4)}
                              </div>
                              <span className="mono-label">{t('dashboard.latLon')}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Map (large) + Stats Column (right) */}
                    <div className="dashboard-grid">
                      <div className="panel-card">
                        <div className="panel-header">
                          <div>
                            <span className="mono-eyebrow">{t('dashboard.sensorTelemetryViewport')}</span>
                            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{t('dashboard.citySensorNodeMap')}</h3>
                          </div>
                          <span className="mono-label">
                            {trafficData?.recent_telemetry?.length || 0} {t('dashboard.sensorsPlotted')}
                            {trafficData?.data_source === 'TOMTOM_LIVE' ? ' • 🛰️ LIVE (TOMTOM)' : ' • SIMULATED'}
                          </span>
                        </div>

                        <div className="map-viewport" style={{ padding: 0 }}>
                          {loading ? (
                            <div className="skeleton skeleton-block" style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <div ref={dashboardMapCallbackRef} style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-sm)' }} />
                          )}
                        </div>
                      </div>

                      <div className="stats-column">
                        <div className="stat-card mint-tint">
                          <span className="mono-eyebrow">{t('dashboard.activeSensorNodes')}</span>
                          <div className="stat-value" style={{ color: 'var(--accent-mint-text)' }}>
                            {loading ? <span className="skeleton skeleton-stat" /> : trafficData?.total_active_sensors}
                          </div>
                          <span className="mono-label">{t('dashboard.operationalNetwork')}</span>
                        </div>

                        <div className="stat-card">
                          <span className="mono-eyebrow">{t('dashboard.cityAverageSpeed')}</span>
                          <div className="stat-value">
                            {loading ? <span className="skeleton skeleton-stat" /> : `${trafficData?.avg_city_speed_kmh} km/h`}
                          </div>
                          <span className="mono-label">Target: 35.0 km/h</span>
                        </div>

                        <div className="stat-card">
                          <span className="mono-eyebrow">{t('dashboard.activeCongestionAlerts')}</span>
                          <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>
                            {loading ? <span className="skeleton skeleton-stat" /> : trafficData?.active_congestion_alerts}
                          </div>
                          <span className="mono-label">{t('dashboard.activeBottlenecks')}</span>
                        </div>

                        <div className="stat-card">
                          <span className="mono-eyebrow">{t('dashboard.systemHealth')}</span>
                          <div className="stat-value" style={{ color: '#34d399', fontSize: '24px' }}>
                            {loading ? <span className="skeleton skeleton-stat" /> : <>● {trafficData?.system_status}</>}
                          </div>
                          <span className="mono-label">{t('dashboard.allSystemsOnline')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sensor Telemetry Table (full width) */}
                    <div className="panel-card">
                      <div className="panel-header">
                        <div>
                          <span className="mono-eyebrow">{t('dashboard.feedStream')}</span>
                          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{t('dashboard.sensorTelemetryNodes')}</h3>
                        </div>
                      </div>
                      <div className="table-responsive-wrapper" style={{ marginTop: '12px' }}>
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>{t('dashboard.sensorId')}</th>
                              <th>{t('dashboard.location')}</th>
                              <th>{t('dashboard.vehiclesSpeed')}</th>
                              <th>{t('common.status')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trafficData?.recent_telemetry?.map((sensor) => (
                              <tr
                                key={sensor.sensor_id}
                                onClick={() => handleSelectSensor(sensor)}
                                style={{
                                  cursor: 'pointer',
                                  background: selectedSensorId === sensor.sensor_id ? 'rgba(189, 187, 255, 0.12)' : 'transparent',
                                }}
                              >
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

                  </>
                )}

                {activeTab === 'predictions' && <AIForecasting />}
                {activeTab === 'routes' && <RouteOptimizer userSession={userSession} />}
                {activeTab === 'my-commute' && <MyCommutePage userSession={userSession} />}
                {activeTab === 'reports' && <MyReportsPage userSession={userSession} />}
                {activeTab === 'alerts' && <AlertsManager userSession={userSession} />}
                {activeTab === 'safety' && <SafetyCenter userSession={userSession} />}
                {activeTab === 'analytics' && <AnalyticsDashboard />}
                {activeTab === 'users' && <UserManagement userSession={userSession} onNavigate={setActiveTab} />}
                {activeTab === 'audit' && <AuditLogs userSession={userSession} />}
                {activeTab === 'announcements' && <AnnouncementsManager userSession={userSession} />}
                {activeTab === 'settings' && <SystemSettings userSession={userSession} />}
              </main>
                </div>
              </div>
              <GovFooter />
              <SOSButton userSession={userSession} variant="floating" />
            </div>
            )
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
