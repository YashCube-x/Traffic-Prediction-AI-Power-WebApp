import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Circle, Truck } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const LIFECYCLE = ['REPORTED', 'VERIFIED', 'DISPATCHED', 'RESPONDING', 'RESOLVED'];

// Deterministic "response units" generated from the incident id — there is
// no real emergency-dispatch integration in this system, so this is always
// rendered under a clear SIMULATED banner and never claimed as live data.
const UNIT_POOL = [
  { type: 'Police Unit', prefix: 'P' },
  { type: 'Traffic Unit', prefix: 'T' },
  { type: 'Emergency Unit', prefix: 'A' },
];
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function simulatedUnits(alertId, statusIndex) {
  if (statusIndex < LIFECYCLE.indexOf('DISPATCHED')) return [];
  const seed = hashSeed(alertId);
  const count = 1 + (seed % 3);
  return Array.from({ length: count }, (_, i) => {
    const pool = UNIT_POOL[(seed + i) % UNIT_POOL.length];
    const unitNo = ((seed >> (i * 3)) % 20) + 1;
    const stateOptions = statusIndex >= LIFECYCLE.indexOf('RESPONDING')
      ? ['ON SCENE', 'EN ROUTE']
      : ['DISPATCHED'];
    const state = stateOptions[(seed + i) % stateOptions.length];
    const eta = state === 'ON SCENE' ? null : 3 + ((seed + i * 7) % 10);
    return { id: `${pool.prefix}-${String(unitNo).padStart(2, '0')}`, type: pool.type, state, eta };
  });
}

export default function IncidentDetailDrawer({ alert, userSession, onClose, onUpdated }) {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState(false);
  const token = userSession?.access_token;

  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!alert) return null;

  const statusIndex = Math.max(0, LIFECYCLE.indexOf(alert.status || 'REPORTED'));
  const nextStatus = LIFECYCLE[statusIndex + 1];
  const units = simulatedUnits(alert.alert_id, statusIndex);

  const pushStatus = (status) => {
    setUpdating(true);
    fetch(`http://localhost:2001/api/v1/alerts/${alert.alert_id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not update status');
        return data;
      })
      .then((updated) => {
        setUpdating(false);
        onUpdated?.(updated);
        showToast(`Incident status updated to ${status}.`, 'success');
      })
      .catch((err) => {
        setUpdating(false);
        showToast(err.message, 'error');
      });
  };

  const severityColor = { CRITICAL: 'var(--status-severe)', HIGH: 'var(--status-heavy)', MODERATE: 'var(--status-moderate)', INFO: 'var(--status-low)' }[alert.severity] || 'var(--status-low)';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'flex-end', zIndex: 1600 }} onClick={onClose}>
      <div className="panel-card" style={{ width: '100%', maxWidth: '440px', height: '100%', borderRadius: 0, overflowY: 'auto', padding: '24px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span className="mono-eyebrow" style={{ color: severityColor }}>INCIDENT {alert.alert_id}</span>
          <button onClick={onClose} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: '50%', width: '30px', height: '30px', color: 'var(--color-on-dark)', cursor: 'pointer' }}><X size={14} /></button>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{alert.title}</h3>
        <div style={{ fontSize: '13px', color: 'var(--color-body)', marginBottom: '18px' }}>📍 {alert.location} · {alert.zone_id}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
          <div><span className="mono-label" style={{ fontSize: '10px' }}>SEVERITY</span><div style={{ fontWeight: '700', color: severityColor }}>{alert.severity}</div></div>
          <div><span className="mono-label" style={{ fontSize: '10px' }}>EXPECTED DELAY</span><div style={{ fontWeight: '700' }}>+{alert.estimated_delay_mins} mins</div></div>
          <div><span className="mono-label" style={{ fontSize: '10px' }}>REPORTED</span><div style={{ fontWeight: '600', fontSize: '13px' }}>{new Date(alert.reported_at).toLocaleString()}</div></div>
          <div><span className="mono-label" style={{ fontSize: '10px' }}>ASSIGNED OPERATOR</span><div style={{ fontWeight: '600', fontSize: '13px' }}>{alert.assigned_operator || '— unassigned —'}</div></div>
        </div>

        {/* Lifecycle checklist */}
        <span className="mono-label" style={{ fontSize: '10px', display: 'block', marginBottom: '8px' }}>STATUS</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          {LIFECYCLE.map((step, i) => {
            const done = i < statusIndex || (i === statusIndex && step === 'RESOLVED');
            const current = i === statusIndex && step !== 'RESOLVED';
            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: current ? '700' : '500', color: done ? 'var(--status-low)' : current ? 'var(--color-on-dark)' : 'var(--color-body)' }}>
                {done ? <CheckCircle2 size={15} color="var(--status-low)" /> : current ? <span style={{ width: 15, textAlign: 'center' }}>●</span> : <Circle size={15} />}
                {step}
              </div>
            );
          })}
        </div>

        {/* Simulated dispatch tracking */}
        {units.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <Truck size={13} />
              <span className="mono-label" style={{ fontSize: '10px' }}>RESPONSE UNITS</span>
              <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(148,163,184,0.2)', color: 'var(--color-body)', fontWeight: '700' }}>SIMULATED — DEMO ONLY</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {units.map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', fontSize: '12px' }}>
                  <span>{u.type} {u.id}</span>
                  <span style={{ fontWeight: '700', color: u.state === 'ON SCENE' ? 'var(--status-low)' : 'var(--status-moderate)' }}>
                    ● {u.state}{u.eta ? ` · ETA ${u.eta} min` : ''}
                  </span>
                </div>
              ))}
            </div>
            <p className="mono-label" style={{ fontSize: '9px', marginTop: '6px' }}>No real emergency-service dispatch is integrated — these units are illustrative only.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {nextStatus && (
            <button
              onClick={() => pushStatus(nextStatus)}
              disabled={updating}
              style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
            >
              {updating ? 'Updating...' : `Advance to ${nextStatus}`}
            </button>
          )}
          {alert.status !== 'RESOLVED' && (
            <button
              onClick={() => pushStatus('RESOLVED')}
              disabled={updating}
              style={{ padding: '10px', borderRadius: 'var(--radius-md)', background: 'rgba(52,211,153,0.15)', border: '1px solid var(--status-low)', color: 'var(--status-low)', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
            >
              ✓ Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
