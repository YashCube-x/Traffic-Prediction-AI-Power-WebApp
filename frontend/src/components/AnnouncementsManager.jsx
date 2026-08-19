import React, { useState, useEffect } from 'react';
import { Megaphone, Send, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { API_BASE } from '../config.js';

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

// Admin broadcast of public notices/circulars — shown live on the landing
// page ticker, the public route-check page, and inside the app shell for
// every signed-in role, via NoticeTicker.jsx (poll + SSE 'notices_changed').
export default function AnnouncementsManager({ userSession }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', notice_type: 'INFO' });
  const [publishing, setPublishing] = useState(false);

  const fetchNotices = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/notices/all`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setNotices(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchNotices(); }, []);

  const handlePublish = (e) => {
    e.preventDefault();
    setPublishing(true);
    fetch(`${API_BASE}/api/v1/notices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(noticeForm),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not publish announcement');
        return data;
      })
      .then(() => {
        setPublishing(false);
        setNoticeForm({ title: '', body: '', notice_type: 'INFO' });
        fetchNotices();
        showToast('Announcement published — now live on the public ticker.', 'success');
      })
      .catch((err) => {
        setPublishing(false);
        showToast(err.message, 'error');
      });
  };

  const handleArchive = (id) => {
    fetch(`${API_BASE}/api/v1/notices/${id}/archive`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(() => { fetchNotices(); showToast('Announcement retracted.', 'info'); })
      .catch(() => showToast('Could not retract announcement.', 'error'));
  };

  const active = notices.filter((n) => n.is_active);
  const archived = notices.filter((n) => !n.is_active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Megaphone size={12} /> ANNOUNCEMENTS
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Broadcast a Notice or Circular</h2>
          <span className="mono-label" style={{ fontSize: '11px' }}>
            {active.length} live · {archived.length} retracted · shown on the landing page, public route check, and every signed-in dashboard
          </span>
        </div>
        <button onClick={fetchNotices} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
          <RefreshCw size={12} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="panel-card">
        <form onSubmit={handlePublish} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <input
              type="text" required placeholder="Announcement title, e.g. Road closure on M.G. Road"
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
            required rows={3} placeholder="Full announcement text shown on the public ticker..."
            value={noticeForm.body}
            onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <button
            type="submit" disabled={publishing}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
          >
            <Send size={13} /> {publishing ? 'Publishing...' : 'Publish Announcement'}
          </button>
        </form>
      </div>

      <div className="panel-card">
        <div className="panel-header"><div><span className="mono-eyebrow">LIVE & PAST ANNOUNCEMENTS</span></div></div>
        {loading ? (
          <div className="skeleton skeleton-block" style={{ height: '160px', marginTop: '12px' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
            {notices.length === 0 && (
              <p className="mono-label" style={{ fontSize: '12px' }}>No announcements published yet.</p>
            )}
            {notices.map((n) => (
              <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', opacity: n.is_active ? 1 : 0.5 }}>
                <div>
                  <span className={`status-badge ${n.notice_type === 'URGENT' ? 'SEVERE' : n.notice_type === 'ADVISORY' ? 'MODERATE' : 'LOW'}`} style={{ fontSize: '9px', marginRight: '8px' }}>
                    {n.notice_type}
                  </span>
                  <strong style={{ fontSize: '13px' }}>{n.title}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '4px' }}>{n.body}</div>
                  <span className="mono-label" style={{ fontSize: '10px' }}>
                    {n.is_active ? 'LIVE' : 'RETRACTED'} · by {n.published_by} · {new Date(n.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
                {n.is_active && (
                  <button
                    onClick={() => handleArchive(n.id)}
                    title="Retract this announcement"
                    style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
