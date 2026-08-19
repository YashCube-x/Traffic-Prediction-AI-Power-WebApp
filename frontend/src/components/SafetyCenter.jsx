import React, { useState, useEffect } from 'react';
import { Siren, Phone, ShieldAlert, MapPin, UserCog, Users2 } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import SOSButton from './SOSButton.jsx';
import HelplineDirectory from './HelplineDirectory.jsx';
import { API_BASE } from '../config.js';

const fieldStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)',
  border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)',
  fontSize: '14px',
  fontWeight: '600',
};

export default function SafetyCenter({ userSession = null }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;
  const isStaff = userSession?.role === 'ADMIN' || userSession?.role === 'OPERATOR';

  const [tab, setTab] = useState('sos');
  const [profile, setProfile] = useState({ phone: '', emergency_contact_name: '', emergency_contact_phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [safetyReports, setSafetyReports] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);

  const fetchProfile = () => {
    if (!token) return;
    fetch(`${API_BASE}/api/v1/me/safety-profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setProfile({
        phone: data.phone || '',
        emergency_contact_name: data.emergency_contact_name || '',
        emergency_contact_phone: data.emergency_contact_phone || '',
      }))
      .catch(() => {});
  };

  const fetchSafetyReports = () => {
    fetch(`${API_BASE}/api/v1/safety-reports`)
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setSafetyReports(data))
      .catch(() => {});
  };

  const fetchSosAlerts = () => {
    if (!token || !isStaff) return;
    fetch(`${API_BASE}/api/v1/sos`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setSosAlerts(data))
      .catch(() => {});
  };

  useEffect(() => { fetchProfile(); }, [token]);
  useEffect(() => { fetchSafetyReports(); }, []);
  useEffect(() => { fetchSosAlerts(); }, [token]);

  // Live updates for staff watching the SOS queue
  useEffect(() => {
    if (!isStaff) return;
    const source = new EventSource(`${API_BASE}/api/v1/events`);
    source.addEventListener('sos_changed', (e) => {
      fetchSosAlerts();
      try {
        const { kind } = JSON.parse(e.data);
        if (kind === 'triggered') showToast('🚨 New SOS signal received — check the queue.', 'error');
      } catch { /* signal only */ }
    });
    return () => source.close();
  }, [isStaff, token]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavingProfile(true);
    fetch(`${API_BASE}/api/v1/me/safety-profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(profile),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not save your safety profile');
        return data;
      })
      .then(() => {
        setSavingProfile(false);
        showToast('Safety profile saved.', 'success');
      })
      .catch((err) => {
        setSavingProfile(false);
        showToast(err.message, 'error');
      });
  };

  const handleResolveSos = (id) => {
    fetch(`${API_BASE}/api/v1/sos/${id}/resolve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not resolve this SOS alert');
        return data;
      })
      .then(() => {
        fetchSosAlerts();
        showToast('SOS alert marked resolved.', 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  const tabButtonStyle = (isActive) => ({
    flex: 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '12px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
    fontSize: '13px', fontWeight: '700',
    background: isActive ? 'var(--status-severe)' : 'var(--color-surface-dark-soft)',
    color: isActive ? '#fff' : 'var(--color-on-dark)',
    border: isActive ? 'none' : '1px solid var(--color-hairline)',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Two-tab switcher: SOS | Helpline */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => setTab('sos')} style={tabButtonStyle(tab === 'sos')}>
          <Siren size={15} /> SOS
        </button>
        <button onClick={() => setTab('helpline')} style={tabButtonStyle(tab === 'helpline')}>
          <Phone size={15} /> Helpline
        </button>
      </div>

      {tab === 'sos' && (
        <>
          {/* SOS Hero */}
          <div className="panel-card" style={{ borderLeft: '4px solid var(--status-severe)' }}>
            <div className="panel-header">
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--status-severe)' }}>SAFETY CENTER</span>
                <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>Emergency SOS</h2>
              </div>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px' }}>
              One tap sends your live location to the nearest traffic operator control room. This button is also always available in the bottom-right corner of every page. For an immediate life-threatening emergency, call 112 directly.
            </p>
            <div style={{ marginTop: '16px' }}>
              <SOSButton userSession={userSession} variant="inline" />
            </div>
          </div>

          {/* Staff-only: active SOS queue — the incoming reports, shown right
              after the SOS action itself since responding to these is the most
              urgent thing on this page. */}
          {isStaff && (
            <div className="panel-card" style={{ borderLeft: '4px solid var(--status-severe)' }}>
              <div className="panel-header">
                <div>
                  <span className="mono-eyebrow" style={{ color: 'var(--status-severe)' }}>🚨 ACTIVE SOS SIGNALS</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                    {sosAlerts.length} awaiting response
                  </h3>
                </div>
              </div>
              {sosAlerts.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px' }}>No active SOS signals right now.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '12px', marginTop: '12px' }}>
                  {sosAlerts.map((s) => (
                    <div key={s.id} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--status-severe)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '700' }}>{s.user_email}</div>
                      {s.user_phone && <div style={{ fontSize: '12px' }}>📞 {s.user_phone}</div>}
                      {s.emergency_contact_name && (
                        <div style={{ fontSize: '12px' }}>
                          Emergency contact: {s.emergency_contact_name} {s.emergency_contact_phone ? `(${s.emergency_contact_phone})` : ''}
                        </div>
                      )}
                      {s.latitude && s.longitude && (
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${s.latitude}&mlon=${s.longitude}#map=17/${s.latitude}/${s.longitude}`}
                          target="_blank" rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--accent-mint-text)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <MapPin size={12} /> View location on map
                        </a>
                      )}
                      <div className="mono-label" style={{ fontSize: '10px' }}>{new Date(s.created_at).toLocaleString()}</div>
                      <button
                        onClick={() => handleResolveSos(s.id)}
                        style={{ marginTop: '4px', padding: '8px', borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--status-low)', color: 'var(--status-low)', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
                      >
                        ✓ Mark Resolved
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Safety profile — phone + emergency contact */}
          {token && (
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCog size={12} /> YOUR SAFETY PROFILE
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Phone & Emergency Contact</h3>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '4px' }}>
                Saved once, used automatically every time you send an SOS.
              </p>
              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: '14px', marginTop: '12px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>YOUR PHONE:</span>
                  <input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="e.g. 9876543210" style={fieldStyle} />
                </div>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>EMERGENCY CONTACT NAME:</span>
                  <input type="text" value={profile.emergency_contact_name} onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })} placeholder="e.g. Mom" style={fieldStyle} />
                </div>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>EMERGENCY CONTACT PHONE:</span>
                  <input type="tel" value={profile.emergency_contact_phone} onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })} placeholder="e.g. 9876500000" style={fieldStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="submit" disabled={savingProfile} className="button-mint" style={{ width: '100%', padding: '10px' }}>
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Community-reported safety concerns */}
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <span className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users2 size={12} /> COMMUNITY REPORTS
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Safety Concerns Near the City</h3>
              </div>
            </div>
            {safetyReports.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px' }}>No verified safety concerns reported yet.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))', gap: '12px', marginTop: '12px' }}>
                {safetyReports.map((r) => (
                  <div key={r.id} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span className="mono-eyebrow" style={{ fontSize: '10px', color: 'var(--status-moderate)' }}>
                      <ShieldAlert size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                      {r.category === 'HARASSMENT' ? 'HARASSMENT REPORT' : 'UNSAFE / POORLY LIT AREA'} • {r.zone_id}
                    </span>
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{r.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>📍 {r.location}</div>
                    {r.description && <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>{r.description}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'helpline' && <HelplineDirectory userSession={userSession} />}
    </div>
  );
}
