import React, { useState, useEffect } from 'react';

export default function AlertsManager() {
  const [alerts, setAlerts] = useState([]);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formZone, setFormZone] = useState('ZONE_CENTRAL');
  const [formSeverity, setFormSeverity] = useState('CRITICAL');
  const [formCategory, setFormCategory] = useState('ACCIDENT');
  const [formDesc, setFormDesc] = useState('');
  const [formDelay, setFormDelay] = useState(15);

  const fetchAlerts = () => {
    setLoading(true);
    fetch('http://localhost:2001/api/v1/alerts')
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

  const handleResolve = (alertId) => {
    fetch(`http://localhost:2001/api/v1/alerts/${alertId}/resolve`, { method: 'PATCH' })
      .then(() => {
        setAlerts((prev) =>
          prev.map((a) => (a.alert_id === alertId ? { ...a, is_resolved: true } : a))
        );
      })
      .catch(() => {
        setAlerts((prev) =>
          prev.map((a) => (a.alert_id === alertId ? { ...a, is_resolved: true } : a))
        );
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

    fetch('http://localhost:2001/api/v1/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then((res) => res.json())
      .then((newAlert) => {
        setAlerts((prev) => [newAlert, ...prev]);
        setShowModal(false);
        resetForm();
      })
      .catch(() => {
        const localAlert = {
          alert_id: `ALT-2026-00${alerts.length + 1}`,
          ...payload,
          is_resolved: false,
          reported_at: new Date().toISOString()
        };
        setAlerts((prev) => [localAlert, ...prev]);
        setShowModal(false);
        resetForm();
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Panel */}
      <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="mono-eyebrow">MILESTONE 3 — SMART ALERTS & INCIDENT DISPATCH</span>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: '4px' }}>Real-Time Traffic Incident Command</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="button-mint" onClick={() => setShowModal(true)}>
            + Broadcast Emergency Alert
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

      {/* Active Alerts List */}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="panel-card" style={{ maxWidth: '520px', width: '100%', border: '1px solid var(--accent-orange)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Broadcast Traffic Alert</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span className="mono-label">ALERT TITLE:</span>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Tanker Breakdown near Flyover"
                  style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="mono-label">LOCATION:</span>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. MG Road Junction"
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                  />
                </div>
                <div>
                  <span className="mono-label">ZONE ID:</span>
                  <select
                    value={formZone}
                    onChange={(e) => setFormZone(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                  >
                    <option value="ZONE_CENTRAL">ZONE_CENTRAL</option>
                    <option value="ZONE_NORTH">ZONE_NORTH</option>
                    <option value="ZONE_SOUTH">ZONE_SOUTH</option>
                    <option value="ZONE_EAST">ZONE_EAST</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="mono-label">SEVERITY:</span>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="INFO">INFO</option>
                  </select>
                </div>

                <div>
                  <span className="mono-label">CATEGORY:</span>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                  >
                    <option value="ACCIDENT">ACCIDENT</option>
                    <option value="CONGESTION">CONGESTION</option>
                    <option value="CONSTRUCTION">CONSTRUCTION</option>
                    <option value="SIGNAL_FAILURE">SIGNAL_FAILURE</option>
                    <option value="WEATHER">WEATHER</option>
                  </select>
                </div>

                <div>
                  <span className="mono-label">DELAY (MINS):</span>
                  <input
                    type="number"
                    value={formDelay}
                    onChange={(e) => setFormDelay(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                  />
                </div>
              </div>

              <div>
                <span className="mono-label">DESCRIPTION:</span>
                <textarea
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Provide incident details and traffic flow guidance..."
                  style={{ width: '100%', padding: '8px 12px', marginTop: '4px', borderRadius: '4px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: '#fff' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--color-hairline)', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" className="button-mint">Broadcast Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
