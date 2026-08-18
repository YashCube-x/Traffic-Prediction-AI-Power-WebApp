import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Megaphone, Trash2, Send } from 'lucide-react';
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
// tiles, one-click CSV report exports, and circular/notice publishing.
export default function GovAdminExtras({ userSession }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;

  const [stats, setStats] = useState(null);
  const [notices, setNotices] = useState([]);
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', notice_type: 'INFO' });
  const [publishing, setPublishing] = useState(false);

  const fetchStats = () => {
    fetch('http://localhost:2001/api/v1/stats/system', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => !data.error && setStats(data))
      .catch(() => {});
  };

  const fetchNotices = () => {
    fetch('http://localhost:2001/api/v1/notices/all', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setNotices(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchStats();
    fetchNotices();
  }, []);

  const handlePublishNotice = (e) => {
    e.preventDefault();
    setPublishing(true);
    fetch('http://localhost:2001/api/v1/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(noticeForm),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not publish notice');
        return data;
      })
      .then(() => {
        setPublishing(false);
        setNoticeForm({ title: '', body: '', notice_type: 'INFO' });
        fetchNotices();
        showToast('Circular published — now live on the public ticker.', 'success');
      })
      .catch((err) => {
        setPublishing(false);
        showToast(err.message, 'error');
      });
  };

  const handleArchiveNotice = (id) => {
    fetch(`http://localhost:2001/api/v1/notices/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => {
        fetchNotices();
        showToast('Notice retracted.', 'info');
      })
      .catch(() => showToast('Could not retract notice.', 'error'));
  };

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

      {/* Public Notices / Circulars */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--status-moderate)' }}>
              <Megaphone size={12} /> PUBLIC NOTICES & CIRCULARS
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Manage Announcements</h3>
          </div>
        </div>

        <form onSubmit={handlePublishNotice} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--color-hairline)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <input
              type="text" required placeholder="Notice title, e.g. Road closure on M.G. Road"
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              style={inputStyle}
            />
            <select
              value={noticeForm.notice_type}
              onChange={(e) => setNoticeForm({ ...noticeForm, notice_type: e.target.value })}
              style={inputStyle}
            >
              <option value="INFO" style={{ color: '#0f172a', background: '#fff' }}>INFO</option>
              <option value="ADVISORY" style={{ color: '#0f172a', background: '#fff' }}>ADVISORY</option>
              <option value="URGENT" style={{ color: '#0f172a', background: '#fff' }}>URGENT</option>
            </select>
          </div>
          <textarea
            required rows={2} placeholder="Full circular text shown on the public ticker..."
            value={noticeForm.body}
            onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <button
            type="submit" disabled={publishing}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
          >
            <Send size={13} /> {publishing ? 'Publishing...' : 'Publish Circular'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
          {notices.length === 0 && (
            <p className="mono-label" style={{ fontSize: '12px' }}>No circulars published yet.</p>
          )}
          {notices.map((n) => (
            <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', opacity: n.is_active ? 1 : 0.5 }}>
              <div>
                <span className={`status-badge ${n.notice_type === 'URGENT' ? 'SEVERE' : n.notice_type === 'ADVISORY' ? 'MODERATE' : 'LOW'}`} style={{ fontSize: '9px', marginRight: '8px' }}>
                  {n.notice_type}
                </span>
                <strong style={{ fontSize: '13px' }}>{n.title}</strong>
                <div style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '4px' }}>{n.body}</div>
                <span className="mono-label" style={{ fontSize: '10px' }}>
                  {n.is_active ? 'LIVE' : 'RETRACTED'} · by {n.published_by} · {new Date(n.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>
              {n.is_active && (
                <button
                  onClick={() => handleArchiveNotice(n.id)}
                  title="Retract this notice"
                  style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', cursor: 'pointer', flexShrink: 0 }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
