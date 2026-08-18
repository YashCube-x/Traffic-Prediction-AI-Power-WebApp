import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, RefreshCw } from 'lucide-react';

// Modules are derived from the action-name prefix — every audit action
// already encodes its module (ALERT_*, USER_*, REPORT_*, ...), so there's
// no separate "module" column to keep in sync with the action list.
const MODULE_MAP = {
  ALERT: 'Incident Control',
  USER: 'User Management',
  REPORT: 'Citizen Reports',
  NOTICE: 'Public Notices',
  COMMUTE: 'My Commute',
  SOS: 'Safety Center',
  SETTINGS: 'System Settings',
  LOGIN: 'Authentication',
  PASSWORD: 'Authentication',
};
function moduleFor(action) {
  const prefix = action.split('_')[0];
  return MODULE_MAP[prefix] || 'Other';
}

const inputStyle = {
  padding: '9px 12px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)',
  border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)',
  fontSize: '13px',
};

export default function AuditLogs({ userSession }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const token = userSession?.access_token;

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (userFilter) params.set('user', userFilter);
    if (actionFilter) params.set('action', actionFilter);
    if (fromDate) params.set('from', new Date(fromDate).toISOString());
    if (toDate) params.set('to', new Date(toDate + 'T23:59:59').toISOString());

    fetch(`http://localhost:2001/api/v1/audit?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not load audit log');
        return data;
      })
      .then((data) => { setEntries(data); setError(''); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, userFilter, actionFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const modules = [...new Set(entries.map((e) => moduleFor(e.action)))].sort();
  const filtered = moduleFilter === 'All' ? entries : entries.filter((e) => moduleFor(e.action) === moduleFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ScrollText size={12} /> AUDIT LOGS</span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Administrative Action History</h2>
          <span className="mono-label" style={{ fontSize: '11px' }}>{filtered.length} of {entries.length} entries shown · every recorded action succeeded (failed attempts are not currently logged)</span>
        </div>
        <button onClick={fetchLogs} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="panel-card" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <Search size={13} style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-body)' }} />
          <input type="text" placeholder="User email..." value={userFilter} onChange={(e) => setUserFilter(e.target.value)} style={{ ...inputStyle, width: '100%', paddingLeft: '28px' }} />
        </div>
        <input type="text" placeholder="Action (e.g. ALERT_CREATE)..." value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} style={{ ...inputStyle, flex: '1 1 180px' }} />
        <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} style={inputStyle}>
          <option value="All" style={{ color: '#0f172a', background: '#fff' }}>All Modules</option>
          {modules.map((m) => <option key={m} value={m} style={{ color: '#0f172a', background: '#fff' }}>{m}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inputStyle} />
        <span className="mono-label" style={{ fontSize: '11px' }}>to</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inputStyle} />
        {(userFilter || actionFilter || fromDate || toDate || moduleFilter !== 'All') && (
          <button
            onClick={() => { setUserFilter(''); setActionFilter(''); setFromDate(''); setToDate(''); setModuleFilter('All'); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-mint-text)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="panel-card" role="alert" style={{ borderLeft: '4px solid var(--status-severe)', color: 'var(--status-severe)', fontSize: '13px' }}>⚠️ {error}</div>
      )}

      <div className="panel-card">
        {loading ? (
          <div className="skeleton skeleton-block" style={{ height: '280px' }} />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Target</th><th>Result</th></tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleString()}</td>
                    <td style={{ fontSize: '12px' }}>{e.actor_email || '—'}</td>
                    <td className="mono-label" style={{ fontSize: '11px' }}>{e.actor_role || '—'}</td>
                    <td><span className={`status-badge ${e.action.includes('DELETE') || e.action.includes('DEACTIVATE') || e.action.includes('DISMISS') ? 'SEVERE' : e.action.includes('CREATE') || e.action.includes('UPDATE') ? 'MODERATE' : 'LOW'}`} style={{ fontSize: '9px' }}>{e.action}</span></td>
                    <td className="mono-label" style={{ fontSize: '11px' }}>{moduleFor(e.action)}</td>
                    <td style={{ fontSize: '12px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.target || '—'}</td>
                    <td style={{ fontSize: '11px', fontWeight: '700', color: 'var(--status-low)' }}>SUCCESS</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-body)' }}>No audit entries match this filter.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
