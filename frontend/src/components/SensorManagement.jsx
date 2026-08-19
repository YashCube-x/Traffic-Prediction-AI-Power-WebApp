import React, { useState, useEffect, useRef } from 'react';
import { Search, Eye, X, AlertTriangle, Radio } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { API_BASE } from '../config.js';

// Threshold-based anomaly detection (no ML/statistical model — simple
// configurable bounds, documented here since there is no System Settings
// page yet to surface these as admin-editable values):
const STALE_MINUTES = 10;          // no telemetry update within this window = OFFLINE
const MAX_SANE_SPEED_KMH = 120;    // above this, treat the reading as a sensor fault
const MIN_SANE_SPEED_KMH = 0;
const MAX_SANE_VEHICLE_COUNT = 1500;
const SPIKE_RATIO = 3;             // vehicle_count jumping >3x since the last poll

function timeAgo(iso) {
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return `${secs} sec ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  return `${Math.round(mins / 60)}h ago`;
}

function classifySensor(sensor, previousCount) {
  const ageMinutes = (Date.now() - new Date(sensor.timestamp).getTime()) / 60000;
  const anomalies = [];

  if (ageMinutes > STALE_MINUTES) {
    anomalies.push({ type: 'OFFLINE', detail: `No telemetry for ${Math.round(ageMinutes)} min` });
  }
  if (sensor.metrics.avg_speed_kmh > MAX_SANE_SPEED_KMH || sensor.metrics.avg_speed_kmh < MIN_SANE_SPEED_KMH) {
    anomalies.push({ type: 'SPEED', detail: `Reported speed ${sensor.metrics.avg_speed_kmh} km/h is outside the plausible range` });
  }
  if (sensor.metrics.vehicle_count > MAX_SANE_VEHICLE_COUNT) {
    anomalies.push({ type: 'COUNT', detail: `Vehicle count ${sensor.metrics.vehicle_count} exceeds the sane upper bound` });
  }
  if (previousCount != null && previousCount > 0 && sensor.metrics.vehicle_count > previousCount * SPIKE_RATIO) {
    anomalies.push({ type: 'SPIKE', detail: `Vehicle count jumped ${previousCount} → ${sensor.metrics.vehicle_count} since the last reading` });
  }

  const status = ageMinutes > STALE_MINUTES ? 'OFFLINE' : anomalies.length > 0 ? 'WARNING' : 'ONLINE';
  return { status, anomalies, ageMinutes };
}

const inputStyle = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)',
  border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)',
  fontSize: '13px',
  fontWeight: '500',
};

export default function SensorManagement({ userSession }) {
  const { showToast } = useToast();
  const [sensors, setSensors] = useState([]);
  const [dataSource, setDataSource] = useState('SIMULATED');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [zoneFilter, setZoneFilter] = useState('All');
  const [selected, setSelected] = useState(null);

  const token = userSession?.access_token;
  const prevCountsRef = useRef({});

  const fetchSensors = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/traffic/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load sensor network');
        return data;
      })
      .then((data) => {
        setSensors(data.recent_telemetry || []);
        setDataSource(data.data_source || 'SIMULATED');
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => { fetchSensors(); }, []);
  useEffect(() => {
    if (!selected) return;
    const handleEscape = (e) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selected]);
  useEffect(() => {
    const id = setInterval(fetchSensors, 20000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const classified = sensors.map((s) => {
    const prev = prevCountsRef.current[s.sensor_id];
    const result = classifySensor(s, prev);
    return { ...s, ...result };
  });
  // Store this poll's counts for next poll's spike comparison.
  useEffect(() => {
    sensors.forEach((s) => { prevCountsRef.current[s.sensor_id] = s.metrics.vehicle_count; });
  }, [sensors]);

  const onlineCount = classified.filter((s) => s.status === 'ONLINE').length;
  const anomalyList = classified.filter((s) => s.anomalies.length > 0);

  const zones = [...new Set(sensors.map((s) => s.location.zone_id))].sort();
  const filtered = classified.filter((s) => {
    if (statusFilter !== 'All' && s.status !== statusFilter.toUpperCase()) return false;
    if (zoneFilter !== 'All' && s.location.zone_id !== zoneFilter) return false;
    if (search && !`${s.sensor_id} ${s.location.road_name}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = { ONLINE: 'var(--status-low)', WARNING: 'var(--status-moderate)', OFFLINE: 'var(--status-severe)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Radio size={12} /> SENSOR NETWORK</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>
            {loading ? 'Loading...' : `${onlineCount} / ${sensors.length} ONLINE`}
          </h2>
          <span className="mono-label" style={{ fontSize: '11px' }}>
            {sensors.length ? `${Math.round((onlineCount / sensors.length) * 100)}% Operational` : ''} · {dataSource === 'TOMTOM_LIVE' ? '🛰️ Live (TomTom)' : 'Simulated telemetry'}
          </span>
        </div>
      </div>

      {error && (
        <div className="panel-card" role="alert" style={{ borderLeft: '4px solid var(--status-severe)', color: 'var(--status-severe)', fontSize: '13px' }}>
          ⚠️ SENSOR NETWORK UNAVAILABLE — {error}
          <button onClick={fetchSensors} style={{ marginLeft: '12px', background: 'none', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px' }}>Retry</button>
        </div>
      )}

      {/* Anomalies */}
      {anomalyList.length > 0 && (
        <div className="panel-card" style={{ borderLeft: '4px solid var(--status-moderate)' }}>
          <div className="panel-header">
            <div>
              <span className="mono-eyebrow" style={{ color: 'var(--status-moderate)' }}>⚠ SENSOR ANOMALIES — THRESHOLD-BASED DETECTION</span>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>{anomalyList.length} sensor{anomalyList.length > 1 ? 's' : ''} flagged</h3>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))', gap: '10px', marginTop: '10px' }}>
            {anomalyList.map((s) => (
              <div key={s.sensor_id} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', borderLeft: `3px solid ${statusColor[s.status]}` }}>
                <strong style={{ fontSize: '13px' }}>{s.sensor_id}</strong>
                {s.anomalies.map((a, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--color-body)', marginTop: '4px' }}>{a.detail}</div>
                ))}
                <button
                  onClick={() => setSelected(s)}
                  style={{ marginTop: '8px', background: 'none', border: `1px solid ${statusColor[s.status]}`, color: statusColor[s.status], borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}
                >
                  Investigate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-body)' }} />
          <input
            type="text" placeholder="Search sensor..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '100%', paddingLeft: '32px' }}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
          {['All', 'Online', 'Warning', 'Offline'].map((s) => <option key={s} value={s} style={{ color: '#0f172a', background: '#fff' }}>{s}</option>)}
        </select>
        <select value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)} style={inputStyle}>
          <option value="All" style={{ color: '#0f172a', background: '#fff' }}>All Zones</option>
          {zones.map((z) => <option key={z} value={z} style={{ color: '#0f172a', background: '#fff' }}>{z}</option>)}
        </select>
        <span className="mono-label" style={{ fontSize: '11px', marginLeft: 'auto' }}>{filtered.length} of {sensors.length}</span>
      </div>

      {/* Table */}
      <div className="panel-card">
        {loading ? (
          <div className="skeleton skeleton-block" style={{ height: '240px' }} />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sensor</th><th>Location</th><th>Zone</th><th>Avg Speed</th><th>Vehicle Count</th><th>Status</th><th>Last Update</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.sensor_id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-mint-text)' }}>{s.sensor_id}</td>
                    <td style={{ fontSize: '13px' }}>{s.location.road_name}</td>
                    <td className="mono-label" style={{ fontSize: '11px' }}>{s.location.zone_id}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{s.metrics.avg_speed_kmh} km/h</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{s.metrics.vehicle_count}</td>
                    <td><span style={{ color: statusColor[s.status], fontWeight: '700', fontSize: '12px' }}>● {s.status}</span></td>
                    <td className="mono-label" style={{ fontSize: '11px' }}>{timeAgo(s.timestamp)}</td>
                    <td>
                      <button onClick={() => setSelected(s)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', fontSize: '11px' }}>
                        <Eye size={11} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-body)' }}>No sensors match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sensor Detail Drawer */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end', zIndex: 1500 }} onClick={() => setSelected(null)}>
          <div className="panel-card" style={{ width: '100%', maxWidth: '420px', height: '100%', borderRadius: 0, overflowY: 'auto', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <span className="mono-eyebrow">SENSOR {selected.sensor_id}</span>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: '50%', width: '30px', height: '30px', color: 'var(--color-on-dark)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>{selected.location.road_name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                ['Status', <span style={{ color: statusColor[selected.status], fontWeight: '700' }}>● {selected.status}</span>],
                ['Zone', selected.location.zone_id],
                ['Coordinates', `${selected.location.latitude.toFixed(4)}, ${selected.location.longitude.toFixed(4)}`],
                ['Current Speed', `${selected.metrics.avg_speed_kmh} km/h`],
                ['Vehicle Count', selected.metrics.vehicle_count],
                ['Last Telemetry', timeAgo(selected.timestamp)],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="mono-label" style={{ fontSize: '10px' }}>{label.toUpperCase()}</span>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>{val}</div>
                </div>
              ))}
              {selected.anomalies.length > 0 && (
                <div style={{ marginTop: '6px', padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid var(--status-moderate)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--status-moderate)', display: 'flex', alignItems: 'center', gap: '6px' }}><AlertTriangle size={13} /> Anomalies Detected</span>
                  {selected.anomalies.map((a, i) => (
                    <div key={i} style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '4px' }}>• {a.detail}</div>
                  ))}
                </div>
              )}
              <p className="mono-label" style={{ fontSize: '10px', lineHeight: 1.5, marginTop: '4px' }}>
                Telemetry history / uptime percentage is not tracked — this in-memory sensor store only holds the latest reading per sensor.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
