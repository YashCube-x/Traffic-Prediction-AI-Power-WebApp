import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  RefreshCw, AlertTriangle, Radio, Gauge, Activity, Route as RouteIcon,
  Cpu, ChevronRight, MapPin,
} from 'lucide-react';

const CONGESTION_COLORS = { LOW: '#34d399', MODERATE: '#fbbf24', HEAVY: '#f97316', SEVERE: '#ef4444' };
const CONGESTION_RANK = { LOW: 0, MODERATE: 1, HEAVY: 2, SEVERE: 3 };

// Approximate zone centroids — the same coordinates the sensor seed data
// already uses (backend/src/routes/traffic.js), so this isn't a new
// geocoding claim, just a label for where each zone's cluster sits.
const ZONE_CENTERS = {
  ZONE_CENTRAL: { lat: 12.9716, lon: 77.5946, label: 'Central CBD (M.G. Road)' },
  ZONE_NORTH: { lat: 13.0358, lon: 77.5970, label: 'North Hub (Hebbal / Airport)' },
  ZONE_SOUTH: { lat: 12.9172, lon: 77.6238, label: 'South Hub (Silk Board)' },
  ZONE_EAST: { lat: 12.9569, lon: 77.7011, label: 'East Hub (Marathahalli / ORR)' },
  ZONE_WEST: { lat: 13.0280, lon: 77.5460, label: 'West Hub (Goraguntepalya)' },
};

const TOTAL_SENSOR_NODES = 8; // matches the seeded sensor network size
const STALE_SENSOR_MINUTES = 10;
const SLOW_PREDICTION_MS = 150;

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function CommandCenter({ userSession, onNavigate }) {
  const [traffic, setTraffic] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState(null);
  const [pendingReports, setPendingReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showAllAttention, setShowAllAttention] = useState(false);
  const [mapLayer, setMapLayer] = useState({ sensors: true, incidents: true });

  const token = userSession?.access_token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchAll = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('http://localhost:2001/api/v1/traffic/status', { headers: authHeaders }).then(r => r.json()).catch(() => null),
      fetch('http://localhost:2001/api/v1/alerts', { headers: authHeaders }).then(r => r.json()).catch(() => []),
      fetch('http://localhost:2001/api/v1/system/health', { headers: authHeaders }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('http://localhost:2001/api/v1/reports?status=PENDING', { headers: authHeaders }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([trafficData, alertsData, healthData, reportsData]) => {
      setTraffic(trafficData);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
      setHealth(healthData);
      setPendingReports(Array.isArray(reportsData) ? reportsData.length : 0);
      setLastUpdated(new Date());
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchAll]);

  const sensors = traffic?.recent_telemetry || [];
  const activeAlerts = alerts.filter(a => !a.is_resolved);
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'CRITICAL');
  const staleSensors = sensors.filter(s => (Date.now() - new Date(s.timestamp).getTime()) / 60000 > STALE_SENSOR_MINUTES);
  const aiOk = health?.services?.ai_engine?.ok;
  const aiLatency = health?.services?.ai_engine?.latency_ms;
  const aiSlow = aiOk && typeof aiLatency === 'number' && aiLatency > SLOW_PREDICTION_MS;

  const overallHealthy = health?.overall_status === 'HEALTHY' && criticalAlerts.length === 0;
  const overallLabel = criticalAlerts.length > 0
    ? `${criticalAlerts.length} CRITICAL INCIDENT${criticalAlerts.length > 1 ? 'S' : ''} ACTIVE`
    : health?.overall_status === 'CRITICAL' ? 'CORE SERVICE DOWN'
    : health?.overall_status === 'DEGRADED' ? 'DEGRADED — SOME SERVICES DOWN'
    : 'ALL SYSTEMS OPERATIONAL';

  // Zones aggregated from real sensor telemetry (worst congestion + avg speed)
  const zoneStats = {};
  sensors.forEach((s) => {
    const z = s.location.zone_id;
    if (!zoneStats[z]) zoneStats[z] = { speeds: [], worst: 'LOW', vehicles: 0, incidents: 0 };
    zoneStats[z].speeds.push(s.metrics.avg_speed_kmh);
    zoneStats[z].vehicles += s.metrics.vehicle_count || 0;
    if (CONGESTION_RANK[s.metrics.congestion_level] > CONGESTION_RANK[zoneStats[z].worst]) {
      zoneStats[z].worst = s.metrics.congestion_level;
    }
  });
  activeAlerts.forEach((a) => {
    if (zoneStats[a.zone_id]) zoneStats[a.zone_id].incidents += 1;
  });
  const zoneList = Object.entries(zoneStats).map(([zoneId, z]) => ({
    zoneId,
    label: ZONE_CENTERS[zoneId]?.label || zoneId,
    avgSpeed: z.speeds.length ? (z.speeds.reduce((a, b) => a + b, 0) / z.speeds.length) : 0,
    status: z.worst,
    vehicles: z.vehicles,
    incidents: z.incidents,
  })).sort((a, b) => a.avgSpeed - b.avgSpeed);
  const worstZone = zoneList[0];
  const bestZone = zoneList[zoneList.length - 1];

  // KPIs — every value is derived from real fetched data, not hardcoded.
  const mobilityIndex = traffic ? Math.min(10, (traffic.avg_city_speed_kmh / 35) * 10) : null;
  const routesAffectedZones = new Set(activeAlerts.map(a => a.zone_id)).size;

  // Needs-attention feed, most severe first, real conditions only.
  const attentionItems = [];
  criticalAlerts.forEach(a => attentionItems.push({
    key: `alert-${a.alert_id}`, level: 'CRITICAL',
    title: a.title, subtitle: `${a.location} · +${a.estimated_delay_mins} min delay`,
    action: 'OPEN INCIDENT', onClick: () => onNavigate?.('alerts'),
  }));
  activeAlerts.filter(a => a.severity === 'HIGH').forEach(a => attentionItems.push({
    key: `alert-${a.alert_id}`, level: 'HIGH',
    title: a.title, subtitle: `${a.location} · +${a.estimated_delay_mins} min delay`,
    action: 'OPEN INCIDENT', onClick: () => onNavigate?.('alerts'),
  }));
  staleSensors.forEach(s => attentionItems.push({
    key: `sensor-${s.sensor_id}`, level: 'WARN',
    title: `SENSOR STALE — ${s.sensor_id}`, subtitle: `Last telemetry: ${timeAgo(s.timestamp)}`,
    action: 'INVESTIGATE', onClick: () => onNavigate?.('dashboard'),
  }));
  if (!aiOk) {
    attentionItems.push({
      key: 'ai-down', level: 'WARN', title: 'PREDICTION SERVICE UNREACHABLE',
      subtitle: health?.services?.ai_engine?.error || 'FastAPI engine not responding — routing falls back to TomTom/heuristic',
      action: 'VIEW HEALTH', onClick: () => onNavigate?.('users'),
    });
  } else if (aiSlow) {
    attentionItems.push({
      key: 'ai-slow', level: 'INFO', title: 'PREDICTION SERVICE LATENCY ELEVATED',
      subtitle: `Current: ${aiLatency} ms`, action: 'VIEW HEALTH', onClick: () => onNavigate?.('users'),
    });
  }
  if (pendingReports > 0) {
    attentionItems.push({
      key: 'reports-pending', level: 'INFO', title: `${pendingReports} CITIZEN REPORT${pendingReports > 1 ? 'S' : ''} PENDING VERIFICATION`,
      subtitle: 'Reported by commuters, awaiting operator review', action: 'REVIEW', onClick: () => onNavigate?.('alerts'),
    });
  }
  const visibleAttention = showAllAttention ? attentionItems : attentionItems.slice(0, 4);

  // Compact Leaflet map: sensors (colored by congestion) + zone-level
  // incident markers (approximate zone centroid, since alerts don't carry
  // precise lat/lon — labelled honestly in the popup).
  const mapCallbackRef = useCallback((node) => {
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    if (!node) return;
    const map = L.map(node, { scrollWheelZoom: false }).setView([12.9716, 77.5946], 11);
    mapInstanceRef.current = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    requestAnimationFrame(() => map.invalidateSize());
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.eachLayer((layer) => { if (layer instanceof L.CircleMarker || layer.__cc) map.removeLayer(layer); });

    if (mapLayer.sensors) {
      sensors.forEach((s) => {
        const color = CONGESTION_COLORS[s.metrics.congestion_level] || CONGESTION_COLORS.LOW;
        L.circleMarker([s.location.latitude, s.location.longitude], { radius: 9, color, fillColor: color, fillOpacity: 0.65, weight: 2 })
          .addTo(map)
          .bindPopup(`<b>${s.location.road_name}</b><br>${s.metrics.congestion_level} · ${s.metrics.avg_speed_kmh} km/h<br>${s.metrics.vehicle_count} vehicles`);
      });
    }

    if (mapLayer.incidents) {
      activeAlerts.forEach((a) => {
        const zc = ZONE_CENTERS[a.zone_id];
        if (!zc) return;
        const icon = L.divIcon({
          className: 'cc-incident-pin',
          html: `<div style="width:26px;height:26px;border-radius:50%;background:${a.severity === 'CRITICAL' ? '#ef4444' : '#f97316'};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:13px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">🚨</div>`,
          iconSize: [26, 26], iconAnchor: [13, 13],
        });
        const marker = L.marker([zc.lat + (Math.random() - 0.5) * 0.01, zc.lon + (Math.random() - 0.5) * 0.01], { icon })
          .addTo(map)
          .bindPopup(`<b>${a.category}</b><br>${a.location}<br>Severity: ${a.severity}<br>Delay: +${a.estimated_delay_mins} min<br>Status: ${a.is_resolved ? 'RESOLVED' : 'ACTIVE'}<br><em style="font-size:10px">Zone-level marker — exact coordinates not tracked</em>`);
        marker.__cc = true;
      });
    }
  }, [sensors, activeAlerts, mapLayer]);

  if (loading && !traffic) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="panel-card skeleton skeleton-block" style={{ height: '70px' }} />
        <div className="stats-grid">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="stat-card skeleton skeleton-block" style={{ height: '90px' }} />)}
        </div>
        <div className="panel-card skeleton skeleton-block" style={{ height: '200px' }} />
        <p className="mono-label" style={{ textAlign: 'center' }}>Loading city status...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="mono-eyebrow">CITY COMMAND CENTER</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Bengaluru Mobility Operations</h2>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', fontWeight: '700', color: overallHealthy ? 'var(--status-low)' : criticalAlerts.length > 0 ? 'var(--status-severe)' : 'var(--status-moderate)' }}>
            ● {overallLabel}
          </span>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
          <span className="mono-label" style={{ fontSize: '11px' }}>
            Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', cursor: 'pointer' }} className="mono-label">
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto-refresh
            </label>
            <button
              onClick={fetchAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
            >
              <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* KPI Grid — real data only */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="mono-eyebrow">Active Incidents</span>
          <div className="stat-value" style={{ color: activeAlerts.length ? 'var(--status-severe)' : 'var(--status-low)' }}>{activeAlerts.length}</div>
          <span className="mono-label">{criticalAlerts.length} Critical</span>
        </div>
        <div className="stat-card mint-tint">
          <span className="mono-eyebrow">Active Sensors</span>
          <div className="stat-value" style={{ color: 'var(--accent-mint-text)' }}>{sensors.length} / {TOTAL_SENSOR_NODES}</div>
          <span className="mono-label">{Math.round((sensors.length / TOTAL_SENSOR_NODES) * 100)}% Operational{staleSensors.length ? ` · ${staleSensors.length} stale` : ''}</span>
        </div>
        <div className="stat-card">
          <span className="mono-eyebrow">City Average Speed</span>
          <div className="stat-value">{traffic?.avg_city_speed_kmh ?? '—'} km/h</div>
          <span className="mono-label">Target: 35 km/h{traffic?.data_source === 'TOMTOM_LIVE' ? ' · 🛰️ Live' : ' · Simulated'}</span>
        </div>
        <div className="stat-card">
          <span className="mono-eyebrow">Mobility Index</span>
          <div className="stat-value">{mobilityIndex !== null ? mobilityIndex.toFixed(1) : '—'} / 10</div>
          <span className="mono-label">Speed-based flow efficiency</span>
        </div>
        <div className="stat-card">
          <span className="mono-eyebrow">Zones Affected</span>
          <div className="stat-value" style={{ color: routesAffectedZones ? 'var(--status-moderate)' : 'var(--status-low)' }}>{routesAffectedZones}</div>
          <span className="mono-label">By active incidents</span>
        </div>
        <div className="stat-card">
          <span className="mono-eyebrow">AI Prediction</span>
          <div className="stat-value" style={{ fontSize: '17px', color: aiOk ? (aiSlow ? 'var(--status-moderate)' : 'var(--status-low)') : 'var(--status-severe)' }}>
            {health ? (aiOk ? '● HEALTHY' : '● DOWN') : '—'}
          </div>
          <span className="mono-label">{typeof aiLatency === 'number' ? `${aiLatency} ms response` : 'Status unknown'}</span>
        </div>
      </div>

      {/* Needs Attention */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow" style={{ color: attentionItems.length ? 'var(--status-severe)' : 'var(--status-low)' }}>NEEDS ATTENTION</span>
            <h3 style={{ fontSize: '17px', fontWeight: '600' }}>{attentionItems.length} item{attentionItems.length === 1 ? '' : 's'}</h3>
          </div>
        </div>
        {attentionItems.length === 0 ? (
          <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--status-low)' }}>✓ Nothing requires attention right now — all monitored conditions are within normal range.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
            {visibleAttention.map((item) => {
              const color = item.level === 'CRITICAL' ? 'var(--status-severe)' : item.level === 'HIGH' ? 'var(--status-heavy)' : item.level === 'WARN' ? 'var(--status-moderate)' : 'var(--accent-mint-text)';
              const dot = item.level === 'CRITICAL' ? '🔴' : item.level === 'HIGH' ? '🟠' : item.level === 'WARN' ? '🟡' : '🔵';
              return (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', borderLeft: `3px solid ${color}` }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: '800', color }}>{dot} {item.title}</span>
                    <div style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '2px' }}>{item.subtitle}</div>
                  </div>
                  <button
                    onClick={item.onClick}
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '7px 12px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: `1px solid ${color}`, color, cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
                  >
                    {item.action} <ChevronRight size={12} />
                  </button>
                </div>
              );
            })}
            {attentionItems.length > 4 && (
              <button
                onClick={() => setShowAllAttention((v) => !v)}
                style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--accent-mint-text)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', padding: '4px 0' }}
              >
                {showAllAttention ? 'Show less' : `View all ${attentionItems.length}`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Live City Map + Zone Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)', gap: '20px' }}>
        <div className="panel-card" style={{ padding: '16px' }}>
          <div className="panel-header" style={{ marginBottom: '10px' }}>
            <div>
              <span className="mono-eyebrow">LIVE CITY OPERATIONS MAP</span>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Sensor Network & Active Incidents</h3>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <label className="mono-label" style={{ fontSize: '11px', display: 'inline-flex', gap: '4px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={mapLayer.sensors} onChange={(e) => setMapLayer((l) => ({ ...l, sensors: e.target.checked }))} /> <Radio size={11} /> Sensors
            </label>
            <label className="mono-label" style={{ fontSize: '11px', display: 'inline-flex', gap: '4px', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={mapLayer.incidents} onChange={(e) => setMapLayer((l) => ({ ...l, incidents: e.target.checked }))} /> <AlertTriangle size={11} /> Incidents
            </label>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: '10px', fontSize: '10px' }}>
              {Object.entries(CONGESTION_COLORS).map(([lvl, color]) => (
                <span key={lvl} className="mono-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }}></span>{lvl}
                </span>
              ))}
            </span>
          </div>
          <div ref={mapCallbackRef} style={{ width: '100%', height: '360px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-hairline)' }} />
        </div>

        <div className="panel-card">
          <div className="panel-header" style={{ marginBottom: '8px' }}>
            <div><span className="mono-eyebrow">CITY STATUS</span><h3 style={{ fontSize: '16px', fontWeight: '600' }}>Zone Overview</h3></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {zoneList.map((z) => (
              <div key={z.zoneId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{z.zoneId.replace('ZONE_', '')}</span>
                <span className={`status-badge ${z.status}`} style={{ fontSize: '10px' }}>{z.status}</span>
              </div>
            ))}
            {zoneList.length === 0 && <p className="mono-label" style={{ fontSize: '12px' }}>No zone data available.</p>}
          </div>
          {worstZone && bestZone && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '10px' }}>WORST ZONE</span>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-severe)' }}>{worstZone.label} — {worstZone.avgSpeed.toFixed(1)} km/h</div>
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '10px' }}>BEST PERFORMING</span>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--status-low)' }}>{bestZone.label} — {bestZone.avgSpeed.toFixed(1)} km/h</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent incidents strip */}
      <div className="panel-card">
        <div className="panel-header">
          <div><span className="mono-eyebrow">RECENT INCIDENTS</span><h3 style={{ fontSize: '16px', fontWeight: '600' }}>Latest Reported</h3></div>
          <button onClick={() => onNavigate?.('alerts')} style={{ background: 'none', border: 'none', color: 'var(--accent-mint-text)', cursor: 'pointer', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            Open Incident Control <ChevronRight size={12} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px', marginTop: '10px' }}>
          {alerts.slice(0, 4).map((a) => (
            <div key={a.alert_id} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', borderLeft: `3px solid ${a.is_resolved ? 'var(--status-low)' : 'var(--status-severe)'}`, opacity: a.is_resolved ? 0.6 : 1 }}>
              <div style={{ fontSize: '12px', fontWeight: '700' }}>{a.title}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-body)', marginTop: '2px' }}><MapPin size={10} style={{ display: 'inline', marginRight: '4px' }} />{a.location}</div>
              <span className="mono-label" style={{ fontSize: '10px' }}>{a.is_resolved ? 'RESOLVED' : `ACTIVE · +${a.estimated_delay_mins}m`}</span>
            </div>
          ))}
          {alerts.length === 0 && <p className="mono-label" style={{ fontSize: '12px' }}>No incidents logged yet.</p>}
        </div>
      </div>
    </div>
  );
}
