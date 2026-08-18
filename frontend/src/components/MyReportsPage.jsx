import React, { useState, useEffect } from 'react';
import { ClipboardList, Plus, X, Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const API = 'http://localhost:2001/api/v1';
const VALID_ZONES = ['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'];
const ZONE_LABELS = {
  ZONE_CENTRAL: 'Central Zone', ZONE_NORTH: 'North Zone', ZONE_SOUTH: 'South Zone',
  ZONE_EAST: 'East Zone', ZONE_WEST: 'West Zone',
};
const CATEGORIES = [
  ['CONGESTION', 'Traffic Jam'],
  ['ACCIDENT', 'Accident'],
  ['CONSTRUCTION', 'Road Construction'],
  ['SIGNAL_FAILURE', 'Signal Not Working'],
  ['WEATHER', 'Bad Weather'],
  ['HARASSMENT', 'Harassment / Safety Concern'],
  ['UNSAFE_AREA', 'Unsafe / Poorly Lit Area'],
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES);

const STATUS_META = {
  PENDING: { label: 'Pending Review', color: 'var(--status-moderate)', bg: 'rgba(251, 191, 36, 0.12)', Icon: Clock },
  IN_PROGRESS: { label: 'In Progress', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)', Icon: Loader2 },
  RESOLVED: { label: 'Resolved', color: 'var(--status-low)', bg: 'rgba(52, 211, 153, 0.12)', Icon: CheckCircle2 },
  DISMISSED: { label: 'Dismissed', color: 'var(--status-severe)', bg: 'rgba(239, 68, 68, 0.12)', Icon: XCircle },
};

const fieldStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)', fontSize: '14px', fontWeight: '600',
};

export default function MyReportsPage({ userSession = null }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', location: '', zone_id: 'ZONE_CENTRAL', category: 'CONGESTION', description: '' });

  const fetchMyReports = () => {
    if (!token) return;
    fetch(`${API}/my-reports`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setReports(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchMyReports(); }, [token]);

  useEffect(() => {
    if (!showModal) return;
    const handleEscape = (e) => { if (e.key === 'Escape') setShowModal(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showModal]);

  // Live updates: as soon as an operator reviews a report, or the resulting
  // alert's lifecycle moves (dispatched/responding/resolved), refresh.
  useEffect(() => {
    const source = new EventSource(`${API}/events`);
    source.addEventListener('reports_changed', fetchMyReports);
    source.addEventListener('alerts_changed', fetchMyReports);
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    fetch(`${API}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not submit the report');
        return data;
      })
      .then(() => {
        setSubmitting(false);
        setShowModal(false);
        setForm({ title: '', location: '', zone_id: 'ZONE_CENTRAL', category: 'CONGESTION', description: '' });
        showToast('Report submitted — sent to your zone\'s traffic operator and admin.', 'success');
        fetchMyReports();
      })
      .catch((err) => {
        setSubmitting(false);
        showToast(err.message, 'error');
      });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="mono-eyebrow">CITIZEN REPORTING</span>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>My Reports</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '6px', maxWidth: '520px' }}>
            Every report you submit goes straight to your zone's traffic operator and to admin for review — track its status right here.
          </p>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 20px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', boxShadow: '0 4px 12px rgba(252,76,2,0.3)', whiteSpace: 'nowrap' }}>
          <Plus size={15} /> New Report
        </button>
      </div>

      {/* Reports list */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ClipboardList size={12} /> YOUR SUBMISSIONS</span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>{reports.length} report{reports.length !== 1 ? 's' : ''}</h3>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: '12px', marginTop: '14px' }}>
            {[0, 1].map((i) => <div key={i} className="skeleton skeleton-block" style={{ height: '110px', borderRadius: 'var(--radius-md)' }} />)}
          </div>
        ) : reports.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <span className="mono-eyebrow">NO REPORTS YET</span>
            <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px' }}>
              Spotted a jam, accident, or a safety concern? Submit your first report to notify your zone's operator.
            </p>
            <button onClick={() => setShowModal(true)}
              style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
              <Plus size={13} /> Add Report
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: '12px', marginTop: '14px' }}>
            {reports.map((r) => {
              const meta = STATUS_META[r.tracking_status] || STATUS_META.PENDING;
              const StatusIcon = meta.Icon;
              return (
                <div key={r.id} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <span className="mono-eyebrow" style={{ fontSize: '10px' }}>{CATEGORY_LABELS[r.category] || r.category} • {ZONE_LABELS[r.zone_id] || r.zone_id}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '12px', background: meta.bg, color: meta.color, fontSize: '10px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                      <StatusIcon size={11} className={r.tracking_status === 'IN_PROGRESS' ? 'spin' : ''} /> {meta.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700' }}>{r.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>📍 {r.location}</div>
                  {r.description && <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>{r.description}</div>}
                  {r.tracking_status === 'IN_PROGRESS' && r.alert_delay_mins && (
                    <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700' }}>Live alert active — est. delay +{r.alert_delay_mins} min</div>
                  )}
                  <div className="mono-label" style={{ fontSize: '10px', marginTop: '4px' }}>Submitted {new Date(r.created_at).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Report modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="panel-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', width: '100%', border: '2px solid var(--accent-orange)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>🚩 NEW REPORT</span>
                <h3 style={{ fontSize: '19px', fontWeight: '700', marginTop: '2px' }}>What's happening?</h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TITLE:</span>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Huge jam near Silk Board flyover" style={fieldStyle} />
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LOCATION:</span>
                <input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Silk Board Junction, towards HSR" style={fieldStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ZONE:</span>
                  <select value={form.zone_id} onChange={(e) => setForm({ ...form, zone_id: e.target.value })} style={fieldStyle}>
                    {VALID_ZONES.map((z) => <option key={z} value={z} style={{ color: '#0f172a', background: '#fff' }}>{ZONE_LABELS[z]}</option>)}
                  </select>
                </div>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TYPE:</span>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={fieldStyle}>
                    {CATEGORIES.map(([c, l]) => <option key={c} value={c} style={{ color: '#0f172a', background: '#fff' }}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DETAILS (OPTIONAL):</span>
                <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Lane blocked? Since when? Any diversion?" style={{ ...fieldStyle, resize: 'vertical' }} />
              </div>
              <p className="mono-label" style={{ fontSize: '10px', lineHeight: 1.5 }}>
                Sent to your zone's traffic operator and admin for verification before it affects live routing and public alerts.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 18px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}>Cancel</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 22px', background: 'var(--accent-orange)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}>
                  {submitting ? 'Submitting...' : '🚩 Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
