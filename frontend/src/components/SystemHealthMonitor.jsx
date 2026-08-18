import React, { useState, useEffect, useCallback } from 'react';
import { Server, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Cpu, Mail, Satellite, Database } from 'lucide-react';

const SERVICE_META = {
  database: { Icon: Database, color: '#3b82f6' },
  ai_engine: { Icon: Cpu, color: '#a855f7' },
  tomtom: { Icon: Satellite, color: '#06b6d4' },
  smtp: { Icon: Mail, color: '#f59e0b' },
};

const STATUS_STYLES = {
  HEALTHY: { color: 'var(--status-low)', bg: 'rgba(52, 211, 153, 0.12)', label: '● ALL SYSTEMS OPERATIONAL' },
  DEGRADED: { color: 'var(--status-moderate)', bg: 'rgba(251, 191, 36, 0.12)', label: '▲ DEGRADED — SOME SERVICES DOWN' },
  CRITICAL: { color: 'var(--status-severe)', bg: 'rgba(239, 68, 68, 0.12)', label: '✕ CRITICAL — CORE SERVICE DOWN' },
};

// Admin "control room": live up/down status of every backend dependency
// (database, AI model engine, TomTom live traffic, outbound email) with
// latency, so an admin can diagnose a problem without opening a terminal.
export default function SystemHealthMonitor({ userSession }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = userSession?.access_token;

  const fetchHealth = useCallback(() => {
    setLoading(true);
    fetch('http://localhost:2001/api/v1/system/health', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not fetch system health');
        return data;
      })
      .then((data) => {
        setHealth(data);
        setError('');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    fetchHealth();
    const id = setInterval(fetchHealth, 30000); // auto-refresh every 30s
    return () => clearInterval(id);
  }, [fetchHealth]);

  const overall = health?.overall_status;
  const style = STATUS_STYLES[overall] || STATUS_STYLES.DEGRADED;

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Server size={12} /> SYSTEM HEALTH MONITOR
          </span>
          <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Platform Control Room</h3>
        </div>
        <button
          onClick={fetchHealth}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
        >
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      {!health && !error && (
        <div className="skeleton skeleton-block" style={{ height: '160px', marginTop: '12px' }} />
      )}

      {health && (
        <>
          <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: 'var(--radius-md)', background: style.bg, border: `1px solid ${style.color}`, color: style.color, fontWeight: '700', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span>{style.label}</span>
            <span className="mono-label" style={{ fontWeight: '600' }}>
              Checked: {new Date(health.checked_at).toLocaleTimeString()} · Uptime: {Math.floor(health.process.uptime_seconds / 60)}m · {health.process.memory_mb} MB
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '14px' }}>
            {Object.entries(health.services).map(([key, svc]) => {
              const meta = SERVICE_META[key] || { Icon: Server, color: '#94a3b8' };
              const StatusIcon = svc.ok ? CheckCircle2 : (key === 'database' ? XCircle : AlertTriangle);
              const statusColor = svc.ok ? 'var(--status-low)' : (key === 'database' ? 'var(--status-severe)' : 'var(--status-moderate)');
              return (
                <div key={key} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '13px' }}>
                      <meta.Icon size={15} style={{ color: meta.color }} /> {svc.name}
                    </span>
                    <StatusIcon size={16} style={{ color: statusColor }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>{svc.detail}{svc.error ? `: ${svc.error}` : ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }} className="mono-label">
                    {typeof svc.latency_ms === 'number' && <span>{svc.latency_ms} ms</span>}
                    {key === 'tomtom' && svc.ok && (
                      <span>{svc.requests_today_estimate}/{svc.daily_free_limit} req today (est.)</span>
                    )}
                  </div>
                  {svc.note && <div style={{ fontSize: '10px', color: 'var(--status-moderate)' }}>ℹ️ {svc.note}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
