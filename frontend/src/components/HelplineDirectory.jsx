import React, { useState, useEffect } from 'react';
import { PhoneCall, Search, Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { API_BASE } from '../config.js';

const CATEGORY_COLORS = {
  Emergency: 'var(--status-severe)',
  Health: '#3b82f6',
  Safety: 'var(--status-moderate)',
  Traffic: 'var(--accent-orange)',
  Transport: 'var(--accent-mint-text)',
  Utility: '#8b5cf6',
};
const CATEGORIES = Object.keys(CATEGORY_COLORS);

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)', fontSize: '13px', fontWeight: '600',
};

const emptyForm = { label: '', number: '', category: 'Emergency' };

// Single directory shown here, on the Safety Center's SOS flow, and on any
// public page that lists emergency numbers — admins edit it once here and
// it updates everywhere via GET /helplines.
export default function HelplineDirectory({ userSession = null }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;
  const isAdmin = userSession?.role === 'ADMIN';

  const [helplines, setHelplines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchHelplines = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/v1/helplines`)
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data)) setHelplines(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchHelplines(); }, []);

  useEffect(() => {
    if (!showAddForm) return;
    const handleEscape = (e) => { if (e.key === 'Escape') setShowAddForm(false); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddForm]);

  const handleAdd = (e) => {
    e.preventDefault();
    setSaving(true);
    fetch(`${API_BASE}/api/v1/helplines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(addForm),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not add helpline');
        return data;
      })
      .then(() => {
        setSaving(false);
        setAddForm(emptyForm);
        setShowAddForm(false);
        fetchHelplines();
        showToast('Helpline added — now visible to everyone.', 'success');
      })
      .catch((err) => { setSaving(false); showToast(err.message, 'error'); });
  };

  const startEdit = (h) => {
    setEditingId(h.id);
    setEditForm({ label: h.label, number: h.number, category: h.category });
  };

  const handleSaveEdit = (id) => {
    setSaving(true);
    fetch(`${API_BASE}/api/v1/helplines/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not update helpline');
        return data;
      })
      .then(() => {
        setSaving(false);
        setEditingId(null);
        fetchHelplines();
        showToast('Helpline updated.', 'success');
      })
      .catch((err) => { setSaving(false); showToast(err.message, 'error'); });
  };

  const handleDelete = (h) => {
    fetch(`${API_BASE}/api/v1/helplines/${h.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not remove helpline');
      })
      .then(() => { fetchHelplines(); showToast('Helpline removed.', 'info'); })
      .catch((err) => showToast(err.message, 'error'));
  };

  const filtered = helplines.filter((h) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return h.label.toLowerCase().includes(q) || h.number.includes(q) || h.category.toLowerCase().includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow">QUICK DIAL</span>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>Helpline Numbers</h2>
            <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '6px' }}>
              Tap any card to call — it opens your phone's dialer directly.
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700', flexShrink: 0 }}
            >
              <Plus size={14} /> Add Helpline
            </button>
          )}
        </div>

        <div style={{ position: 'relative', marginTop: '16px' }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-body)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number (e.g. women, fire, 112)"
            style={{
              width: '100%', padding: '12px 14px 12px 40px', borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)',
              color: 'var(--color-on-dark)', fontSize: '14px', fontWeight: '600',
            }}
          />
        </div>
      </div>

      <div className="panel-card">
        {loading ? (
          <div className="skeleton skeleton-block" style={{ height: '200px' }} />
        ) : filtered.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--color-body)', textAlign: 'center', padding: '24px' }}>
            {helplines.length === 0 ? 'No helplines configured yet.' : `No helpline matches "${query}".`}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '14px' }}>
            {filtered.map((h) => (
              editingId === h.id ? (
                <div key={h.id} className="panel-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input value={editForm.label} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} placeholder="Label" style={inputStyle} />
                  <input value={editForm.number} onChange={(e) => setEditForm({ ...editForm, number: e.target.value })} placeholder="Number" style={inputStyle} />
                  <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={inputStyle}>
                    {CATEGORIES.map((c) => <option key={c} value={c} style={{ color: '#0f172a', background: '#fff' }}>{c}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleSaveEdit(h.id)} disabled={saving} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'var(--status-low)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>
                      <Save size={13} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '12px' }}>
                      <X size={13} />
                    </button>
                  </div>
                </div>
              ) : (
                <div key={h.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '14px', padding: '16px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)' }}>
                  <a
                    href={`tel:${h.number}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '14px', textDecoration: 'none', color: 'var(--color-on-dark)', flex: 1, minWidth: 0 }}
                  >
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                      background: `${CATEGORY_COLORS[h.category]}1a`, border: `1px solid ${CATEGORY_COLORS[h.category]}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <PhoneCall size={18} style={{ color: CATEGORY_COLORS[h.category] }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="mono-label" style={{ fontSize: '10px', color: CATEGORY_COLORS[h.category] }}>{h.category.toUpperCase()}</div>
                      <div style={{ fontSize: '13px', fontWeight: '600', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: '800', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>{h.number}</div>
                    </div>
                  </a>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => startEdit(h)} title="Edit" style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer' }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(h)} title="Remove" style={{ padding: '6px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', cursor: 'pointer' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div onClick={() => setShowAddForm(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="panel-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', width: '100%', border: '2px solid var(--accent-orange)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Add a Helpline</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input required placeholder="Label, e.g. City Ambulance" value={addForm.label} onChange={(e) => setAddForm({ ...addForm, label: e.target.value })} style={inputStyle} />
              <input required placeholder="Number, e.g. 108" value={addForm.number} onChange={(e) => setAddForm({ ...addForm, number: e.target.value })} style={inputStyle} />
              <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} style={inputStyle}>
                {CATEGORIES.map((c) => <option key={c} value={c} style={{ color: '#0f172a', background: '#fff' }}>{c}</option>)}
              </select>
              <button type="submit" disabled={saving} style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}>
                {saving ? 'Adding...' : 'Add Helpline'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
