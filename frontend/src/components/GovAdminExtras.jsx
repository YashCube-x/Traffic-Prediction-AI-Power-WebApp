import React, { useState, useEffect } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)',
  border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)',
  fontSize: '13px',
  fontWeight: '600',
};

// Government-portal-style additions to the Admin panel: system statistics
// tiles and one-click CSV report exports. Notice/circular publishing lives
// in its own dedicated page — see AnnouncementsManager.jsx.
export default function GovAdminExtras({ userSession }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;

  const [stats, setStats] = useState(null);

  const fetchStats = () => {
    fetch('http://localhost:2001/api/v1/stats/system', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => !data.error && setStats(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const downloadCsv = (endpoint, filename) => {
    fetch(`http://localhost:2001/api/v1/export/${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast(`${filename} downloaded.`, 'success');
      })
      .catch(() => showToast('Could not export the report.', 'error'));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* System Statistics Tiles */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <BarChart3 size={12} /> SYSTEM STATISTICS
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Platform Overview</h3>
          </div>
        </div>
        {stats ? (
          <div className="stats-grid" style={{ marginTop: '12px' }}>
            <div className="stat-card mint-tint">
              <span className="mono-eyebrow">Total Visitors</span>
              <div className="stat-value" style={{ color: 'var(--accent-mint-text)' }}>{stats.total_visitors.toLocaleString('en-IN')}</div>
              <span className="mono-label">Since deployment</span>
            </div>
            <div className="stat-card">
              <span className="mono-eyebrow">Active Incidents</span>
              <div className="stat-value" style={{ color: 'var(--status-severe)' }}>{stats.alerts_active}</div>
              <span className="mono-label">{stats.alerts_total} total logged</span>
            </div>
            <div className="stat-card">
              <span className="mono-eyebrow">Citizen Reports Pending</span>
              <div className="stat-value" style={{ color: 'var(--status-moderate)' }}>{stats.reports_pending}</div>
              <span className="mono-label">Awaiting operator review</span>
            </div>
            <div className="stat-card">
              <span className="mono-eyebrow">Registered Accounts</span>
              <div className="stat-value">
                {Object.values(stats.users_by_role).reduce((sum, r) => sum + r.total, 0)}
              </div>
              <span className="mono-label">
                {Object.entries(stats.users_by_role).map(([role, r]) => `${role}: ${r.active}/${r.total}`).join(' · ')}
              </span>
            </div>
          </div>
        ) : (
          <div className="skeleton skeleton-block" style={{ height: '100px', marginTop: '12px' }} />
        )}
      </div>

      {/* CSV Report Exports */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Download size={12} /> REPORTS & DATA EXPORT
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Download Official Records (CSV)</h3>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' }}>
          {[
            { key: 'alerts.csv', label: 'Traffic Incidents Register', file: 'alerts_register.csv' },
            { key: 'audit.csv', label: 'Security Audit Trail', file: 'audit_trail.csv' },
            { key: 'users.csv', label: 'Registered Accounts', file: 'user_accounts.csv' },
            { key: 'reports.csv', label: 'Citizen Reports Log', file: 'citizen_reports.csv' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => downloadCsv(item.key, item.file)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
            >
              <Download size={13} /> {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
