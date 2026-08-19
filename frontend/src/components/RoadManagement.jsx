import React, { useState, useEffect, useRef } from 'react';
import {
  Signpost, MoreVertical, Video, MapPinned, ExternalLink, Info, Flag, X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { API_BASE } from '../config.js';

// A public, safe-for-work, long-standing embeddable video (Blender
// Foundation's "Big Buck Bunny") — a stand-in until real per-road camera
// feeds exist. Deliberately labelled as a placeholder everywhere it's
// shown so nobody mistakes it for an actual live feed of that road.
const PLACEHOLDER_VIDEO_ID = 'aqz-KE-bpKQ';

const VALID_ZONES = ['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'];
const ZONE_LABELS = {
  ZONE_CENTRAL: 'Central Zone', ZONE_NORTH: 'North Zone', ZONE_SOUTH: 'South Zone',
  ZONE_EAST: 'East Zone', ZONE_WEST: 'West Zone',
};
const CONGESTION_COLOR = { LOW: 'var(--status-low)', MODERATE: 'var(--status-moderate)', HEAVY: 'var(--status-heavy)', SEVERE: 'var(--status-severe)' };

// Same best-effort keyword match the backend uses to link an alert to a
// route (routes.js: routeMatchesAlert) — reimplemented client-side so this
// page can flag "N active incidents" per road from the same /alerts data
// without a new endpoint.
const STOPWORDS = new Set(['road', 'junction', 'flyover', 'zone', 'corridor', 'north', 'south', 'east', 'west', 'central', 'near', 'the', 'main', 'link', 'ring', 'outer', 'expressway', 'underpass']);
function keywordsOf(text) {
  return (text || '').split(/[^a-zA-Z]+/).map((w) => w.trim()).filter((w) => w.length >= 4 && !STOPWORDS.has(w.toLowerCase()));
}
function incidentsForRoad(roadName, alerts) {
  const haystack = roadName.toLowerCase();
  return alerts.filter((a) => !a.is_resolved && [...keywordsOf(a.location), ...keywordsOf(a.title)].some((kw) => haystack.includes(kw.toLowerCase())));
}

const fieldStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)', fontSize: '13px', fontWeight: '600',
};

export default function RoadManagement({ userSession }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;
  const isAdmin = userSession?.role === 'ADMIN';
  const isZonedOperator = userSession?.role === 'OPERATOR' && !!userSession?.assigned_zone;

  const [roads, setRoads] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [operatorsByZone, setOperatorsByZone] = useState({});
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [videoRoad, setVideoRoad] = useState(null);
  const [detailRoad, setDetailRoad] = useState(null);
  const [reportRoad, setReportRoad] = useState(null);
  const [reportForm, setReportForm] = useState({ title: '', description: '', severity: 'MODERATE', category: 'CONGESTION', estimated_delay_mins: 10 });
  const [submitting, setSubmitting] = useState(false);
  const menuRef = useRef(null);

  const fetchRoads = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/traffic/status`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.json())
      .then((data) => { setRoads(data.recent_telemetry || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchAlerts = () => {
    fetch(`${API_BASE}/api/v1/alerts`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setAlerts(data))
      .catch(() => {});
  };

  const fetchOperators = () => {
    if (!isAdmin) return;
    fetch(`${API_BASE}/api/v1/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((users) => {
        const map = {};
        (users || []).filter((u) => u.role === 'OPERATOR' && u.assigned_zone && u.is_active).forEach((u) => {
          (map[u.assigned_zone] = map[u.assigned_zone] || []).push(u.full_name || u.email);
        });
        setOperatorsByZone(map);
      })
      .catch(() => {});
  };

  useEffect(() => { fetchRoads(); fetchAlerts(); fetchOperators(); }, [token]);

  useEffect(() => {
    const closeMenu = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenuId(null); };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  useEffect(() => {
    if (!videoRoad && !detailRoad && !reportRoad) return;
    const onEsc = (e) => { if (e.key === 'Escape') { setVideoRoad(null); setDetailRoad(null); setReportRoad(null); } };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [videoRoad, detailRoad, reportRoad]);

  const roadsPerZone = roads.reduce((acc, r) => { acc[r.location.zone_id] = (acc[r.location.zone_id] || 0) + 1; return acc; }, {});

  const operatorInfoFor = (zoneId) => {
    if (isZonedOperator) {
      // An operator only ever sees their own zone's roads (server already
      // scopes GET /traffic/status), so "the operator" is always themself.
      return { names: [userSession.full_name || userSession.email], count: roads.length };
    }
    const names = operatorsByZone[zoneId] || [];
    return { names, count: roadsPerZone[zoneId] || 0 };
  };

  const openReportModal = (road) => {
    setReportForm({
      title: `Traffic issue on ${road.location.road_name}`,
      description: '', severity: 'MODERATE', category: 'CONGESTION', estimated_delay_mins: 10,
    });
    setReportRoad(road);
    setOpenMenuId(null);
  };

  const submitReport = (e) => {
    e.preventDefault();
    setSubmitting(true);
    fetch(`${API_BASE}/api/v1/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: reportForm.title,
        location: reportRoad.location.road_name,
        zone_id: reportRoad.location.zone_id,
        severity: reportForm.severity,
        category: reportForm.category,
        description: reportForm.description || `Reported from Road Management for ${reportRoad.location.road_name}.`,
        estimated_delay_mins: parseInt(reportForm.estimated_delay_mins, 10) || 10,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not broadcast this alert');
        return data;
      })
      .then(() => {
        setSubmitting(false);
        setReportRoad(null);
        showToast(`Incident broadcast for ${reportRoad.location.road_name}.`, 'success');
        fetchAlerts();
      })
      .catch((err) => { setSubmitting(false); showToast(err.message, 'error'); });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Signpost size={12} /> ROAD MANAGEMENT</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>
            {loading ? 'Loading…' : `${roads.length} road${roads.length !== 1 ? 's' : ''}`}
            {isZonedOperator && ` in ${ZONE_LABELS[userSession.assigned_zone] || userSession.assigned_zone}`}
          </h2>
          {isZonedOperator && (
            <span className="mono-label" style={{ fontSize: '11px', color: 'var(--status-moderate)' }}>📍 ZONE-SCOPED VIEW — you manage {roads.length} road{roads.length !== 1 ? 's' : ''} here</span>
          )}
        </div>
      </div>

      <div className="panel-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="skeleton skeleton-block" style={{ height: '260px', margin: '16px' }} />
        ) : (
          <div className="table-responsive-wrapper" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Road</th>
                  <th>Operator</th>
                  <th>Roads / Operator</th>
                  <th>Congestion</th>
                  <th>Avg Speed</th>
                  <th>Vehicles</th>
                  <th>Incidents</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {roads.map((r) => {
                  const opInfo = operatorInfoFor(r.location.zone_id);
                  const incidents = incidentsForRoad(r.location.road_name, alerts);
                  return (
                    <tr key={r.sensor_id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{r.location.road_name}</div>
                        <span className="mono-label" style={{ fontSize: '10px' }}>{ZONE_LABELS[r.location.zone_id] || r.location.zone_id} • {r.sensor_id}</span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{opInfo.names.length ? opInfo.names.join(', ') : <span style={{ color: 'var(--color-body)' }}>Unassigned</span>}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{opInfo.count}</td>
                      <td><span className={`status-badge ${r.metrics.congestion_level}`}>{r.metrics.congestion_level}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{r.metrics.avg_speed_kmh} km/h</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{r.metrics.vehicle_count}</td>
                      <td>
                        {incidents.length > 0
                          ? <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--status-severe)' }}>🚨 {incidents.length}</span>
                          : <span style={{ fontSize: '11px', color: 'var(--status-low)' }}>✓ clear</span>}
                      </td>
                      <td style={{ position: 'relative', textAlign: 'right' }}>
                        <button
                          onClick={() => setOpenMenuId(openMenuId === r.sensor_id ? null : r.sensor_id)}
                          aria-label="Road actions" aria-haspopup="true" aria-expanded={openMenuId === r.sensor_id}
                          style={{ background: 'none', border: '1px solid var(--color-hairline)', borderRadius: '6px', width: '30px', height: '30px', color: 'var(--color-on-dark)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === r.sensor_id && (
                          <div ref={menuRef} role="menu" style={{
                            position: 'absolute', right: 0, top: '36px', zIndex: 50, minWidth: '200px',
                            background: 'var(--color-surface-card)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)',
                            boxShadow: '0 12px 28px -8px rgba(0,0,0,0.35)', overflow: 'hidden', textAlign: 'left',
                          }}>
                            <MenuItem icon={Video} label="Live Video" onClick={() => { setVideoRoad(r); setOpenMenuId(null); }} />
                            <MenuItem icon={MapPinned} label="View on Map" onClick={() => { window.open(`https://www.openstreetmap.org/?mlat=${r.location.latitude}&mlon=${r.location.longitude}#map=16/${r.location.latitude}/${r.location.longitude}`, '_blank'); setOpenMenuId(null); }} />
                            <MenuItem icon={Info} label="Full Details" onClick={() => { setDetailRoad(r); setOpenMenuId(null); }} />
                            <MenuItem icon={Flag} label="Report Incident" onClick={() => openReportModal(r)} accent="var(--status-severe)" />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {roads.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '28px', color: 'var(--color-body)' }}>No roads to show.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live Video modal */}
      {videoRoad && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setVideoRoad(null)}>
          <div className="panel-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px', width: '100%', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <span className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Video size={12} /> LIVE VIDEO — DEMO PLACEHOLDER</span>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginTop: '2px' }}>{videoRoad.location.road_name}</h3>
              </div>
              <button onClick={() => setVideoRoad(null)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: '50%', width: '30px', height: '30px', color: 'var(--color-on-dark)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}>
              <iframe
                src={`https://www.youtube.com/embed/${PLACEHOLDER_VIDEO_ID}?autoplay=1`}
                title={`Live video placeholder for ${videoRoad.location.road_name}`}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-body)', marginTop: '10px' }}>
              Placeholder feed — not an actual live camera at this road. Wire up a real per-road stream URL here once one exists.
            </p>
            <a href={`https://www.youtube.com/watch?v=${PLACEHOLDER_VIDEO_ID}`} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '12px', color: 'var(--accent-mint-text)' }}>
              Open on YouTube <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}

      {/* Full Details drawer */}
      {detailRoad && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end', zIndex: 2000 }} onClick={() => setDetailRoad(null)}>
          <div className="panel-card" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', height: '100%', borderRadius: 0, overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span className="mono-eyebrow">{detailRoad.sensor_id}</span>
              <button onClick={() => setDetailRoad(null)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: '50%', width: '30px', height: '30px', color: 'var(--color-on-dark)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>{detailRoad.location.road_name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                ['Zone', ZONE_LABELS[detailRoad.location.zone_id] || detailRoad.location.zone_id],
                ['Operator', operatorInfoFor(detailRoad.location.zone_id).names.join(', ') || 'Unassigned'],
                ['Coordinates', `${detailRoad.location.latitude.toFixed(4)}, ${detailRoad.location.longitude.toFixed(4)}`],
                ['Congestion', <span style={{ color: CONGESTION_COLOR[detailRoad.metrics.congestion_level], fontWeight: '700' }}>{detailRoad.metrics.congestion_level}</span>],
                ['Average Speed', `${detailRoad.metrics.avg_speed_kmh} km/h`],
                ['Vehicle Count', detailRoad.metrics.vehicle_count],
                ['Occupancy', detailRoad.metrics.occupancy_rate != null ? `${Math.round(detailRoad.metrics.occupancy_rate * 100)}%` : '—'],
                ['Last Reading', new Date(detailRoad.timestamp).toLocaleString()],
              ].map(([label, val]) => (
                <div key={label}>
                  <span className="mono-label" style={{ fontSize: '10px' }}>{String(label).toUpperCase()}</span>
                  <div style={{ fontSize: '14px', fontWeight: '600', marginTop: '2px' }}>{val}</div>
                </div>
              ))}
              {incidentsForRoad(detailRoad.location.road_name, alerts).length > 0 && (
                <div style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--status-severe)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--status-severe)' }}>🚨 Active Incidents</span>
                  {incidentsForRoad(detailRoad.location.road_name, alerts).map((a) => (
                    <div key={a.alert_id} style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '4px' }}>• {a.title} (+{a.estimated_delay_mins} min)</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report Incident modal */}
      {reportRoad && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setReportRoad(null)}>
          <div className="panel-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px', width: '100%', border: '2px solid var(--status-severe)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--status-severe)' }}>🚩 REPORT INCIDENT</span>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginTop: '2px' }}>{reportRoad.location.road_name}</h3>
              </div>
              <button onClick={() => setReportRoad(null)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: '50%', width: '30px', height: '30px', color: 'var(--color-on-dark)', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <form onSubmit={submitReport} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TITLE:</span>
                <input required value={reportForm.title} onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })} style={fieldStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>SEVERITY:</span>
                  <select value={reportForm.severity} onChange={(e) => setReportForm({ ...reportForm, severity: e.target.value })} style={fieldStyle}>
                    {['CRITICAL', 'HIGH', 'MODERATE', 'INFO'].map((s) => <option key={s} value={s} style={{ color: '#0f172a', background: '#fff' }}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TYPE:</span>
                  <select value={reportForm.category} onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })} style={fieldStyle}>
                    {['CONGESTION', 'ACCIDENT', 'CONSTRUCTION', 'SIGNAL_FAILURE', 'WEATHER'].map((c) => <option key={c} value={c} style={{ color: '#0f172a', background: '#fff' }}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DELAY (MINS):</span>
                <input type="number" value={reportForm.estimated_delay_mins} onChange={(e) => setReportForm({ ...reportForm, estimated_delay_mins: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DESCRIPTION (OPTIONAL):</span>
                <textarea rows={2} value={reportForm.description} onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })} style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setReportRoad(null)} style={{ padding: '9px 16px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '9px 18px', background: 'var(--status-severe)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>{submitting ? 'Broadcasting…' : 'Broadcast Alert'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, accent }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px',
        background: 'none', border: 'none', borderBottom: '1px solid var(--color-hairline)',
        color: accent || 'var(--color-on-dark)', cursor: 'pointer', fontSize: '13px', fontWeight: '600', textAlign: 'left',
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}
