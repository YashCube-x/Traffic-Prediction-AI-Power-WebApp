import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext.jsx';

export default function AlertsManager({ userSession }) {
  const { showToast } = useToast();
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingReports, setPendingReports] = useState([]);

  // A zone-scoped operator can only see and log incidents in their own zone;
  // the backend enforces this too, the UI just mirrors it.
  const isZonedOperator = userSession?.role === 'OPERATOR' && !!userSession?.assigned_zone;

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formZone, setFormZone] = useState(userSession?.assigned_zone || 'ZONE_CENTRAL');
  const [formSeverity, setFormSeverity] = useState('CRITICAL');
  const [formCategory, setFormCategory] = useState('ACCIDENT');
  const [formDesc, setFormDesc] = useState('');
  const [formDelay, setFormDelay] = useState(15);

  const token = userSession?.access_token;

  const fetchAlerts = () => {
    setLoading(true);
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('http://localhost:2001/api/v1/alerts', { headers })
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend alerts API unavailable, using fallback mock data:', err);
        setAlerts([
          {
            alert_id: "ALT-2026-001",
            title: "Multi-Vehicle Collision near Hebbal Junction",
            location: "Hebbal Flyover, North Corridor",
            zone_id: "ZONE_NORTH",
            severity: "CRITICAL",
            category: "ACCIDENT",
            description: "Collision blocking 2 center lanes. Emergency services dispatched. Expect heavy gridlock.",
            estimated_delay_mins: 35,
            is_resolved: false,
            reported_at: new Date().toISOString()
          },
          {
            alert_id: "ALT-2026-002",
            title: "Traffic Signal Controller Failure at Silk Board",
            location: "Central Silk Board Junction",
            zone_id: "ZONE_SOUTH",
            severity: "HIGH",
            category: "SIGNAL_FAILURE",
            description: "Signal lights operating on yellow flashing. Traffic personnel directing manual flow.",
            estimated_delay_mins: 20,
            is_resolved: false,
            reported_at: new Date().toISOString()
          },
          {
            alert_id: "ALT-2026-003",
            title: "Metro Construction Lane Restriction",
            location: "Outer Ring Road - Marathahalli",
            zone_id: "ZONE_EAST",
            severity: "MODERATE",
            category: "CONSTRUCTION",
            description: "Single lane narrowed for pillar casting work. Moderate slowdown observed.",
            estimated_delay_mins: 12,
            is_resolved: false,
            reported_at: new Date().toISOString()
          },
          {
            alert_id: "ALT-2026-004",
            title: "Monsoon Waterlogging Warning",
            location: "M.G. Road Underpass",
            zone_id: "ZONE_CENTRAL",
            severity: "INFO",
            category: "WEATHER",
            description: "Water accumulation reduced traffic speed to 15 km/h. Pumps deployed.",
            estimated_delay_mins: 8,
            is_resolved: true,
            reported_at: new Date().toISOString()
          }
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Citizen reports pending verification (operator sees only own zone)
  const fetchPendingReports = () => {
    if (!token) return;
    fetch('http://localhost:2001/api/v1/reports?status=PENDING', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setPendingReports(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchPendingReports();
  }, [token]);

  const handleReviewReport = (reportId, decision) => {
    fetch(`http://localhost:2001/api/v1/reports/${reportId}/${decision}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: decision === 'approve' ? JSON.stringify({ severity: 'MODERATE', estimated_delay_mins: 10 }) : undefined,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Review failed');
        return data;
      })
      .then(() => {
        fetchPendingReports();
        if (decision === 'approve') {
          fetchAlerts();
          showToast('Report verified — now a live alert affecting routes.', 'success');
        } else {
          showToast('Report dismissed.', 'info');
        }
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  // Live updates: the backend broadcasts an SSE signal whenever any incident
  // is logged or resolved; refetching through the normal endpoint keeps the
  // operator's zone-scoping intact.
  useEffect(() => {
    const source = new EventSource('http://localhost:2001/api/v1/events');
    source.addEventListener('alerts_changed', (e) => {
      fetchAlerts();
      try {
        const { kind } = JSON.parse(e.data);
        showToast(kind === 'resolved' ? 'An incident was just resolved — feed updated live.' : 'New incident broadcast — feed updated live.', 'info');
      } catch { /* signal only */ }
    });
    source.addEventListener('reports_changed', () => fetchPendingReports());
    return () => source.close();
  }, []);

  const handleResolve = (alertId) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch(`http://localhost:2001/api/v1/alerts/${alertId}/resolve`, { method: 'PATCH', headers })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.error || 'You do not have permission to resolve this incident.');
          err.isApiError = true;
          throw err;
        }
        return data;
      })
      .then(() => {
        setAlerts((prev) =>
          prev.map((a) => (a.alert_id === alertId ? { ...a, is_resolved: true } : a))
        );
        showToast('Incident marked resolved.', 'success');
      })
      .catch((err) => {
        if (err.isApiError) {
          showToast(err.message, 'error');
          return;
        }
        console.warn('Alerts backend unreachable, resolving locally only:', err);
        setAlerts((prev) =>
          prev.map((a) => (a.alert_id === alertId ? { ...a, is_resolved: true } : a))
        );
        showToast('Backend unreachable — resolved locally only, not synced.', 'warning');
      });
  };

  const handleCreateAlert = (e) => {
    e.preventDefault();
    const payload = {
      title: formTitle,
      location: formLocation,
      zone_id: formZone,
      severity: formSeverity,
      category: formCategory,
      description: formDesc,
      estimated_delay_mins: parseInt(formDelay, 10) || 10
    };

    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('http://localhost:2001/api/v1/alerts', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const err = new Error(data.error || 'You do not have permission to log incidents.');
          err.isApiError = true;
          throw err;
        }
        return data;
      })
      .then((newAlert) => {
        setAlerts((prev) => [newAlert, ...prev]);
        setShowModal(false);
        resetForm();
        showToast('Incident logged and now affecting live route calculations.', 'success');
      })
      .catch((err) => {
        if (err.isApiError) {
          showToast(err.message, 'error');
          return;
        }
        console.warn('Alerts backend unreachable, creating alert locally only:', err);
        const localAlert = {
          alert_id: `ALT-2026-00${alerts.length + 1}`,
          ...payload,
          is_resolved: false,
          reported_at: new Date().toISOString()
        };
        setAlerts((prev) => [localAlert, ...prev]);
        setShowModal(false);
        resetForm();
        showToast('Backend unreachable — incident saved locally only, not synced.', 'warning');
      });
  };

  const resetForm = () => {
    setFormTitle('');
    setFormLocation('');
    setFormDesc('');
    setFormDelay(15);
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="panel-card skeleton skeleton-block" style={{ height: '90px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {[0, 1, 2].map((i) => (
            <div className="panel-card skeleton skeleton-block" style={{ height: '180px' }} key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Panel */}
      <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="mono-eyebrow">SMART ALERTS & INCIDENT DISPATCH</span>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: '4px' }}>Real-Time Traffic Incident Command</h2>
          {isZonedOperator && (
            <span className="mono-label" style={{ fontSize: '11px', color: 'var(--status-moderate)', display: 'block', marginTop: '4px' }}>
              📍 ZONE-SCOPED VIEW — you only see and manage incidents in {userSession.assigned_zone}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 18px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-orange)',
              color: '#ffffff',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(252, 76, 2, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            + Log New Traffic Incident
          </button>
          <button className="button-mint" onClick={() => setShowModal(true)}>
            📡 Broadcast Emergency Alert
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span className="mono-label" style={{ marginRight: '8px' }}>FILTER SEVERITY:</span>
        {['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'INFO'].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-md)',
              border: filterSeverity === sev ? '1px solid var(--accent-orange)' : '1px solid var(--color-hairline)',
              background: filterSeverity === sev ? 'rgba(252, 76, 2, 0.15)' : 'var(--color-surface-dark-soft)',
              color: filterSeverity === sev ? 'var(--accent-orange)' : 'var(--color-on-dark)',
              fontFamily: 'var(--font-display)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* 🚩 Citizen Reports Pending Verification */}
      {pendingReports.length > 0 && (
        <div className="panel-card" style={{ borderLeft: '4px solid var(--status-moderate)' }}>
          <div className="panel-header">
            <div>
              <span className="mono-eyebrow" style={{ color: 'var(--status-moderate)' }}>🚩 CITIZEN REPORTS — PENDING VERIFICATION</span>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                {pendingReports.length} report{pendingReports.length > 1 ? 's' : ''} awaiting your review
              </h3>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px', marginTop: '12px' }}>
            {pendingReports.map((r) => (
              <div key={r.id} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                  <span className="mono-eyebrow" style={{ fontSize: '10px' }}>{r.category} • {r.zone_id}</span>
                  <span className="mono-label" style={{ fontSize: '10px' }}>{new Date(r.created_at).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700' }}>{r.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>📍 {r.location}</div>
                {r.description && <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>{r.description}</div>}
                <div className="mono-label" style={{ fontSize: '10px' }}>Reported by: {r.reporter_email}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    onClick={() => handleReviewReport(r.id, 'approve')}
                    style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--status-low)', color: 'var(--status-low)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                  >
                    ✓ Verify → Broadcast Alert
                  </button>
                  <button
                    onClick={() => handleReviewReport(r.id, 'dismiss')}
                    style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Alerts List */}
      {filteredAlerts.length === 0 && (
        <div className="panel-card" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-body)' }}>
          <span className="mono-eyebrow">No incidents match this filter</span>
          <p style={{ marginTop: '8px', fontSize: '13px' }}>Try a different severity filter, or log a new incident above.</p>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {filteredAlerts.map((alert) => {
          let sevColor = 'var(--status-low)';
          if (alert.severity === 'CRITICAL') sevColor = 'var(--status-severe)';
          if (alert.severity === 'HIGH') sevColor = 'var(--status-heavy)';
          if (alert.severity === 'MODERATE') sevColor = 'var(--status-moderate)';

          return (
            <div
              key={alert.alert_id}
              className="panel-card"
              style={{
                borderLeft: `4px solid ${sevColor}`,
                opacity: alert.is_resolved ? 0.65 : 1
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span className="mono-eyebrow" style={{ color: sevColor }}>{alert.alert_id} • {alert.category}</span>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px' }}>{alert.title}</h3>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    background: alert.is_resolved ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: alert.is_resolved ? 'var(--status-low)' : 'var(--status-severe)'
                  }}
                >
                  {alert.is_resolved ? 'RESOLVED' : 'ACTIVE'}
                </span>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--color-body)', marginBottom: '12px' }}>
                📍 <strong>{alert.location}</strong> ({alert.zone_id})
              </div>

              <p style={{ fontSize: '13px', lineHeight: '1.4', marginBottom: '16px' }}>
                {alert.description}
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface-dark-soft)', padding: '10px 12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span className="mono-label">EXPECTED DELAY:</span>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: sevColor }}>
                    +{alert.estimated_delay_mins} mins
                  </div>
                </div>

                {!alert.is_resolved ? (
                  <button
                    onClick={() => handleResolve(alert.alert_id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(52, 211, 153, 0.15)',
                      border: '1px solid var(--status-low)',
                      color: 'var(--status-low)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    ✓ Mark Resolved
                  </button>
                ) : (
                  <span className="mono-label" style={{ color: 'var(--status-low)' }}>✓ Closed</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Broadcast Alert Modal Form */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="panel-card" style={{
            maxWidth: '540px',
            width: '100%',
            border: '2px solid var(--accent-orange)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>🚨 EMERGENCY INCIDENT COMMAND</span>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Broadcast Traffic Alert</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'var(--color-surface-dark-soft)',
                  border: '1px solid var(--color-hairline)',
                  color: 'var(--color-on-dark)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ALERT TITLE:</span>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Tanker Breakdown near Flyover"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-dark-soft)',
                    border: '1px solid var(--color-hairline)',
                    color: 'var(--color-on-dark)',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LOCATION:</span>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. MG Road Junction"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-dark-soft)',
                      border: '1px solid var(--color-hairline)',
                      color: 'var(--color-on-dark)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                </div>

                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                    ZONE ID: {isZonedOperator && <em style={{ color: 'var(--status-moderate)' }}>(locked to your zone)</em>}
                  </span>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    disabled={isZonedOperator}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-dark-soft)',
                      border: '1px solid var(--color-hairline)',
                      color: 'var(--color-on-dark)',
                      fontSize: '13px',
                      fontWeight: '600',
                      opacity: isZonedOperator ? 0.7 : 1,
                      cursor: isZonedOperator ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="ZONE_CENTRAL" style={{ color: '#0f172a', background: '#ffffff' }}>ZONE_CENTRAL</option>
                    <option value="ZONE_NORTH" style={{ color: '#0f172a', background: '#ffffff' }}>ZONE_NORTH</option>
                    <option value="ZONE_SOUTH" style={{ color: '#0f172a', background: '#ffffff' }}>ZONE_SOUTH</option>
                    <option value="ZONE_EAST" style={{ color: '#0f172a', background: '#ffffff' }}>ZONE_EAST</option>
                    <option value="ZONE_WEST" style={{ color: '#0f172a', background: '#ffffff' }}>ZONE_WEST</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>SEVERITY:</span>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-dark-soft)',
                      border: '1px solid var(--color-hairline)',
                      color: 'var(--color-on-dark)',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    <option value="CRITICAL" style={{ color: '#0f172a', background: '#ffffff' }}>CRITICAL</option>
                    <option value="HIGH" style={{ color: '#0f172a', background: '#ffffff' }}>HIGH</option>
                    <option value="MODERATE" style={{ color: '#0f172a', background: '#ffffff' }}>MODERATE</option>
                    <option value="INFO" style={{ color: '#0f172a', background: '#ffffff' }}>INFO</option>
                  </select>
                </div>

                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>CATEGORY:</span>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-dark-soft)',
                      border: '1px solid var(--color-hairline)',
                      color: 'var(--color-on-dark)',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    <option value="ACCIDENT" style={{ color: '#0f172a', background: '#ffffff' }}>ACCIDENT</option>
                    <option value="CONGESTION" style={{ color: '#0f172a', background: '#ffffff' }}>CONGESTION</option>
                    <option value="CONSTRUCTION" style={{ color: '#0f172a', background: '#ffffff' }}>CONSTRUCTION</option>
                    <option value="SIGNAL_FAILURE" style={{ color: '#0f172a', background: '#ffffff' }}>SIGNAL_FAILURE</option>
                    <option value="WEATHER" style={{ color: '#0f172a', background: '#ffffff' }}>WEATHER</option>
                  </select>
                </div>

                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DELAY (MINS):</span>
                  <input
                    type="number"
                    value={formDelay}
                    onChange={(e) => setFormDelay(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-surface-dark-soft)',
                      border: '1px solid var(--color-hairline)',
                      color: 'var(--color-on-dark)',
                      fontSize: '14px',
                      fontWeight: '600'
                    }}
                  />
                </div>
              </div>

              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DESCRIPTION:</span>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Provide incident details and traffic flow guidance..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-dark-soft)',
                    border: '1px solid var(--color-hairline)',
                    color: 'var(--color-on-dark)',
                    fontSize: '13px',
                    fontWeight: '500',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--color-surface-dark-soft)',
                    border: '1px solid var(--color-hairline)',
                    color: 'var(--color-on-dark)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px',
                    background: 'var(--accent-orange)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '13px',
                    boxShadow: '0 4px 12px rgba(252, 76, 2, 0.3)'
                  }}
                >
                  Broadcast Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
