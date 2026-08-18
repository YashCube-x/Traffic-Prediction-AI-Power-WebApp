import React, { useState } from 'react';
import { Siren, Phone, MapPin, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

// One shared SOS button + confirm modal, used both as a floating action
// button (visible on every authenticated tab) and inline inside the Safety
// Center hero. Keeping the send logic in one place avoids the floating and
// inline copies drifting out of sync.
export default function SOSButton({ userSession = null, variant = 'floating' }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [locating, setLocating] = useState(false);

  if (!token) return null;

  const closeModal = () => {
    if (sending) return;
    setOpen(false);
    setSent(false);
  };

  const handleConfirmSend = () => {
    setSending(true);
    setLocating(true);

    const send = (latitude, longitude) => {
      setLocating(false);
      fetch('http://localhost:2001/api/v1/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude, longitude, zone_id: userSession?.assigned_zone || null }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Could not send SOS signal');
          return data;
        })
        .then(() => {
          setSending(false);
          setSent(true);
          showToast('🚨 SOS sent — control room notified.', 'success');
        })
        .catch((err) => {
          setSending(false);
          showToast(err.message, 'error');
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => send(pos.coords.latitude, pos.coords.longitude),
        () => send(null, null),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      send(null, null);
    }
  };

  const trigger = variant === 'floating' ? (
    <button
      onClick={() => setOpen(true)}
      aria-label="Send emergency SOS signal"
      title="Emergency SOS"
      style={{
        position: 'fixed', right: '20px', bottom: '20px', zIndex: 1500,
        width: '58px', height: '58px', borderRadius: '50%',
        background: 'var(--status-severe)', color: '#fff', border: '3px solid rgba(255,255,255,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.5)',
      }}
    >
      <Siren size={24} />
    </button>
  ) : (
    <button
      onClick={() => setOpen(true)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '10px',
        padding: '16px 28px', borderRadius: 'var(--radius-lg)', background: 'var(--status-severe)',
        color: '#ffffff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '800',
        boxShadow: '0 8px 20px rgba(239, 68, 68, 0.35)',
      }}
    >
      <Siren size={20} /> Send SOS Now
    </button>
  );

  return (
    <>
      {trigger}

      {open && (
        <div
          role="dialog" aria-modal="true" aria-label="Confirm SOS"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, padding: '20px',
          }}
          onClick={closeModal}
        >
          <div
            className="panel-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '420px', width: '100%', border: '2px solid var(--status-severe)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', padding: '24px', borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            {!sent ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeModal}
                    aria-label="Close"
                    style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <Siren size={40} style={{ color: 'var(--status-severe)' }} />
                <h3 style={{ fontSize: '19px', fontWeight: '800', marginTop: '12px' }}>Send SOS Signal?</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px', lineHeight: 1.5 }}>
                  This will share your live location with the nearest traffic operator control room right away.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' }}>
                  <button
                    onClick={handleConfirmSend}
                    disabled={sending}
                    style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--status-severe)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '800' }}
                  >
                    {sending ? (locating ? 'Getting your location...' : 'Sending...') : 'Yes, Send SOS'}
                  </button>
                  <button
                    onClick={closeModal}
                    disabled={sending}
                    style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                </div>
                <a
                  href="tel:112"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '16px', fontSize: '13px', fontWeight: '700', color: 'var(--status-severe)', textDecoration: 'none' }}
                >
                  <Phone size={14} /> In immediate danger? Call 112 directly
                </a>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={closeModal}
                    aria-label="Close"
                    style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '28px', height: '28px', borderRadius: '50%', fontSize: '14px', cursor: 'pointer' }}
                  >
                    <X size={14} />
                  </button>
                </div>
                <div style={{ fontSize: '44px' }}>✅</div>
                <h3 style={{ fontSize: '19px', fontWeight: '800', marginTop: '8px', color: 'var(--status-low)' }}>SOS Sent</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px', lineHeight: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <MapPin size={14} /> Control room notified with your location.
                </p>
                <button
                  onClick={closeModal}
                  style={{ marginTop: '18px', padding: '12px 24px', borderRadius: 'var(--radius-md)', background: 'var(--status-low)', color: '#062', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
