import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)',
  border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)',
  fontSize: '13px',
  fontWeight: '600',
};

export default function SystemSettings({ userSession }) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local editable copies
  const [cityName, setCityName] = useState('');
  const [targetSpeed, setTargetSpeed] = useState('');
  const [thresholds, setThresholds] = useState({ low_max: 40, moderate_max: 65, high_max: 85 });
  const [alertToggles, setAlertToggles] = useState({});

  const token = userSession?.access_token;
  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchSettings = () => {
    setLoading(true);
    fetch('http://localhost:2001/api/v1/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        setSettings(data);
        setCityName(data.city_name?.value || 'Bengaluru');
        setTargetSpeed(data.target_avg_speed_kmh?.value ?? 35);
        setThresholds(data.congestion_thresholds?.value || { low_max: 40, moderate_max: 65, high_max: 85 });
        setAlertToggles(data.alert_settings?.value || {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchSettings(); }, []);

  const saveSection = (key, value) => {
    setSaving(true);
    fetch('http://localhost:2001/api/v1/settings', {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ [key]: value }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not save setting');
        return data;
      })
      .then((data) => {
        setSettings(data);
        setSaving(false);
        showToast('Setting saved.', 'success');
      })
      .catch((err) => {
        setSaving(false);
        showToast(err.message, 'error');
      });
  };

  if (loading) {
    return <div className="panel-card skeleton skeleton-block" style={{ height: '320px' }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="panel-card">
        <span className="mono-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Settings size={12} /> SYSTEM SETTINGS</span>
        <h2 style={{ fontSize: '20px', fontWeight: '700', marginTop: '2px' }}>Platform Configuration</h2>
      </div>

      <div className="panel-card" style={{ borderLeft: '4px solid var(--status-moderate)', display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'flex-start' }}>
        <AlertCircle size={16} style={{ color: 'var(--status-moderate)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '12px', color: 'var(--color-body)', lineHeight: 1.6 }}>
          These values are <strong>genuinely saved</strong> to the database and read back correctly. However, other parts of
          the app (congestion-level classification, the hardcoded "Target: 35 km/h" labels on the Live Dashboard and Command
          Center) do not yet read from here — they still use their own fixed constants. Wiring every consumer to this config
          is separate follow-up work, not implied by saving a value here.
        </p>
      </div>

      {/* City Configuration */}
      <div className="panel-card">
        <div className="panel-header"><div><span className="mono-eyebrow">CITY CONFIGURATION</span></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '12px' }}>
          <div>
            <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>CITY</span>
            <input type="text" value={cityName} onChange={(e) => setCityName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TARGET AVERAGE SPEED (KM/H)</span>
            <input type="number" value={targetSpeed} onChange={(e) => setTargetSpeed(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <button
          onClick={() => { saveSection('city_name', cityName); saveSection('target_avg_speed_kmh', parseFloat(targetSpeed) || 35); }}
          disabled={saving}
          style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
        >
          <Save size={13} /> Save City Configuration
        </button>
        {settings?.target_avg_speed_kmh?.updated_by && (
          <p className="mono-label" style={{ fontSize: '10px', marginTop: '8px' }}>Last updated by {settings.target_avg_speed_kmh.updated_by} on {new Date(settings.target_avg_speed_kmh.updated_at).toLocaleString()}</p>
        )}
      </div>

      {/* Congestion Thresholds */}
      <div className="panel-card">
        <div className="panel-header"><div><span className="mono-eyebrow">CONGESTION THRESHOLDS</span><h3 style={{ fontSize: '15px', fontWeight: '600' }}>Density Percentage Bands</h3></div></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginTop: '12px' }}>
          <div>
            <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px', color: 'var(--status-low)' }}>LOW — below</span>
            <input type="number" value={thresholds.low_max} onChange={(e) => setThresholds({ ...thresholds, low_max: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </div>
          <div>
            <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px', color: 'var(--status-moderate)' }}>MODERATE — below</span>
            <input type="number" value={thresholds.moderate_max} onChange={(e) => setThresholds({ ...thresholds, moderate_max: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </div>
          <div>
            <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px', color: 'var(--status-heavy)' }}>HIGH — below</span>
            <input type="number" value={thresholds.high_max} onChange={(e) => setThresholds({ ...thresholds, high_max: parseFloat(e.target.value) || 0 })} style={inputStyle} />
          </div>
          <div>
            <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px', color: 'var(--status-severe)' }}>SEVERE — above</span>
            <div style={{ ...inputStyle, opacity: 0.6 }}>{thresholds.high_max}%</div>
          </div>
        </div>
        <button
          onClick={() => saveSection('congestion_thresholds', thresholds)}
          disabled={saving}
          style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
        >
          <Save size={13} /> Save Thresholds
        </button>
      </div>

      {/* Alert Settings */}
      <div className="panel-card">
        <div className="panel-header"><div><span className="mono-eyebrow">ALERT SETTINGS</span></div></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          {[
            ['critical_incident_alerts', 'Critical incident alerts'],
            ['sensor_offline_alerts', 'Sensor offline alerts'],
            ['prediction_service_alerts', 'Prediction service alerts'],
            ['severe_congestion_alerts', 'Severe congestion alerts'],
          ].map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!alertToggles[key]}
                onChange={(e) => setAlertToggles({ ...alertToggles, [key]: e.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
        <button
          onClick={() => saveSection('alert_settings', alertToggles)}
          disabled={saving}
          style={{ marginTop: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
        >
          <Save size={13} /> Save Alert Settings
        </button>
      </div>
    </div>
  );
}
