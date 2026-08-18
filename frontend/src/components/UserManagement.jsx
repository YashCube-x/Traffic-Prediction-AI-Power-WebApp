import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Copy, ScrollText, RefreshCw } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import GovAdminExtras from './GovAdminExtras.jsx';
import SystemHealthMonitor from './SystemHealthMonitor.jsx';

const ZONES = ['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'];

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

export default function UserManagement({ userSession }) {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  // Create form state
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('OPERATOR');
  const [formZone, setFormZone] = useState('ZONE_CENTRAL');
  const [formTempPass, setFormTempPass] = useState('');

  const token = userSession?.access_token;
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchUsers = () => {
    setLoading(true);
    setLoadError('');
    fetch('http://localhost:2001/api/v1/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load users');
        return data;
      })
      .then((data) => {
        setUsers(data);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(`${err.message} — user management needs the database to be reachable.`);
        setLoading(false);
      });
  };

  const fetchAudit = () => {
    setAuditLoading(true);
    fetch('http://localhost:2001/api/v1/audit', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        const data = await res.json().catch(() => []);
        if (!res.ok) throw new Error(data.error || 'Could not load audit log');
        return data;
      })
      .then((data) => {
        setAuditEntries(data);
        setAuditLoading(false);
      })
      .catch(() => setAuditLoading(false));
  };

  useEffect(() => {
    fetchUsers();
    fetchAudit();
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const payload = {
      email: formEmail.trim(),
      full_name: formName.trim(),
      role: formRole,
      assigned_zone: formRole === 'OPERATOR' ? formZone : null,
    };
    if (formTempPass.trim()) payload.temp_password = formTempPass.trim();

    fetch('http://localhost:2001/api/v1/users', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not create the account');
        return data;
      })
      .then((newUser) => {
        setSubmitting(false);
        setShowModal(false);
        setFormEmail('');
        setFormName('');
        setFormTempPass('');
        setUsers((prev) => [newUser, ...prev]);
        // Show the one-time temporary password so the admin can hand it over.
        setCreatedCredentials({ email: newUser.email, temp_password: newUser.temp_password });
        showToast(`Account created for ${newUser.email}.`, 'success');
      })
      .catch((err) => {
        setSubmitting(false);
        showToast(err.message, 'error');
      });
  };

  const handlePatch = (userId, patch, successMsg) => {
    fetch(`http://localhost:2001/api/v1/users/${userId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify(patch),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Update failed');
        return data;
      })
      .then((updated) => {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        showToast(successMsg, 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  const copyCredentials = () => {
    const text = `Email: ${createdCredentials.email}\nTemporary password: ${createdCredentials.temp_password}`;
    navigator.clipboard?.writeText(text).then(
      () => showToast('Credentials copied to clipboard.', 'success'),
      () => showToast('Could not copy — please note them down manually.', 'warning')
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Control room — live status of every backend dependency */}
      <SystemHealthMonitor userSession={userSession} />

      {/* Header */}
      <div className="panel-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="mono-eyebrow">RBAC — ACCOUNT & ZONE ADMINISTRATION</span>
          <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: '4px' }}>User Management</h2>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--accent-orange)',
            color: '#ffffff',
            fontFamily: 'var(--font-display)',
            fontSize: '12px',
            fontWeight: '700',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(252, 76, 2, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <UserPlus size={14} /> Create Operator Account
        </button>
      </div>

      {/* One-time temporary credentials banner */}
      {createdCredentials && (
        <div
          className="panel-card"
          style={{ borderLeft: '4px solid var(--status-low)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}
        >
          <div>
            <span className="mono-eyebrow" style={{ color: 'var(--status-low)' }}>ONE-TIME TEMPORARY CREDENTIALS — SHARE SECURELY, SHOWN ONLY ONCE</span>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', marginTop: '6px' }}>
              {createdCredentials.email} &nbsp;/&nbsp; <strong>{createdCredentials.temp_password}</strong>
            </div>
            <span className="mono-label" style={{ fontSize: '11px' }}>The operator must change this password at first login.</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={copyCredentials}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(52, 211, 153, 0.15)', border: '1px solid var(--status-low)', color: 'var(--status-low)', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Copy size={13} /> Copy
            </button>
            <button
              onClick={() => setCreatedCredentials(null)}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="panel-card" role="alert" style={{ borderLeft: '4px solid var(--status-severe)', color: 'var(--status-severe)', fontSize: '13px', fontWeight: '600' }}>
          ⚠️ {loadError}
        </div>
      )}

      {/* Users Table */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow">PLATFORM ACCOUNTS</span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>All Registered Users</h3>
          </div>
          <span className="mono-label">{users.length} ACCOUNTS</span>
        </div>

        {loading ? (
          <div className="skeleton skeleton-block" style={{ height: '220px', marginTop: '12px' }} />
        ) : (
          <div className="table-responsive-wrapper" style={{ marginTop: '12px' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>ASSIGNED ZONE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{u.full_name}</div>
                      <span className="mono-label" style={{ fontSize: '10px' }}>{u.email}</span>
                      {u.must_change_password && (
                        <span className="mono-label" style={{ fontSize: '10px', color: 'var(--accent-orange)', display: 'block' }}>
                          ⏳ Pending first-login password change
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${u.role === 'ADMIN' ? 'SEVERE' : u.role === 'OPERATOR' ? 'MODERATE' : 'LOW'}`} style={{ fontSize: '10px' }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.role === 'OPERATOR' ? (
                        <select
                          value={u.assigned_zone || ''}
                          onChange={(e) => handlePatch(u.id, { assigned_zone: e.target.value }, `Zone updated to ${e.target.value} for ${u.email}.`)}
                          style={{ ...inputStyle, width: 'auto', padding: '6px 10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                        >
                          {!u.assigned_zone && <option value="">— unassigned —</option>}
                          {ZONES.map((z) => (
                            <option key={z} value={z} style={{ color: '#0f172a', background: '#ffffff' }}>{z}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="mono-label" style={{ fontSize: '11px' }}>{u.role === 'ADMIN' ? 'ALL ZONES' : '—'}</span>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          background: u.is_active ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: u.is_active ? 'var(--status-low)' : 'var(--status-severe)',
                        }}
                      >
                        {u.is_active ? 'ACTIVE' : 'DEACTIVATED'}
                      </span>
                    </td>
                    <td>
                      {u.id !== userSession?.user_id ? (
                        <button
                          onClick={() => handlePatch(u.id, { is_active: !u.is_active }, `${u.email} ${u.is_active ? 'deactivated' : 'reactivated'}.`)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 'var(--radius-sm)',
                            background: u.is_active ? 'rgba(239, 68, 68, 0.12)' : 'rgba(52, 211, 153, 0.15)',
                            border: `1px solid ${u.is_active ? 'var(--status-severe)' : 'var(--status-low)'}`,
                            color: u.is_active ? 'var(--status-severe)' : 'var(--status-low)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: '600',
                          }}
                        >
                          {u.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      ) : (
                        <span className="mono-label" style={{ fontSize: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ShieldCheck size={12} /> YOU
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Government-portal additions: system stats, CSV exports, circulars */}
      <GovAdminExtras userSession={userSession} />

      {/* Audit Log Panel */}
      <div className="panel-card">
        <div className="panel-header">
          <div>
            <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ScrollText size={12} /> SECURITY AUDIT TRAIL
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Recent Privileged Actions</h3>
          </div>
          <button
            onClick={fetchAudit}
            style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {auditLoading ? (
          <div className="skeleton skeleton-block" style={{ height: '140px', marginTop: '12px' }} />
        ) : auditEntries.length === 0 ? (
          <p className="mono-label" style={{ marginTop: '12px', fontSize: '12px' }}>No audit entries yet — actions like logins, incident logging and account changes will appear here.</p>
        ) : (
          <div className="table-responsive-wrapper" style={{ marginTop: '12px', maxHeight: '340px', overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>TIME</th>
                  <th>ACTOR</th>
                  <th>ACTION</th>
                  <th>TARGET</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditEntries.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>{e.actor_email || '—'}</div>
                      {e.actor_role && <span className="mono-label" style={{ fontSize: '10px' }}>{e.actor_role}</span>}
                    </td>
                    <td>
                      <span className={`status-badge ${e.action.startsWith('ALERT') ? 'MODERATE' : e.action.startsWith('USER') ? 'HEAVY' : 'LOW'}`} style={{ fontSize: '10px' }}>
                        {e.action}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{e.target || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{e.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Account Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
        }}>
          <div className="panel-card" style={{ maxWidth: '480px', width: '100%', border: '2px solid var(--accent-orange)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>ADMIN-ISSUED CREDENTIALS</span>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Create New Account</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>FULL NAME:</span>
                <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Ravi Kumar" style={inputStyle} />
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>EMAIL:</span>
                <input type="email" required value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g. operator.north@trafficvision.ai" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ROLE:</span>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value)} style={inputStyle}>
                    <option value="OPERATOR" style={{ color: '#0f172a', background: '#ffffff' }}>OPERATOR</option>
                    <option value="ADMIN" style={{ color: '#0f172a', background: '#ffffff' }}>ADMIN</option>
                  </select>
                </div>
                {formRole === 'OPERATOR' && (
                  <div>
                    <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ASSIGNED ZONE:</span>
                    <select value={formZone} onChange={(e) => setFormZone(e.target.value)} style={inputStyle}>
                      {ZONES.map((z) => (
                        <option key={z} value={z} style={{ color: '#0f172a', background: '#ffffff' }}>{z}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TEMPORARY PASSWORD (OPTIONAL — AUTO-GENERATED IF BLANK):</span>
                <input type="text" value={formTempPass} onChange={(e) => setFormTempPass(e.target.value)} placeholder="Leave blank to auto-generate" minLength={6} style={inputStyle} />
              </div>

              <p className="mono-label" style={{ fontSize: '11px', lineHeight: 1.5 }}>
                The new account will be forced to set its own password at first login.
                An operator only sees sensors and incidents from their assigned zone.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-hairline)' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 24px', background: 'var(--accent-orange)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '700', fontSize: '13px', boxShadow: '0 4px 12px rgba(252, 76, 2, 0.3)' }}
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
