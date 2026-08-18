import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Contrast } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

// A government-portal-style top strip: tricolour accent, trilingual
// authority name, accessibility controls (font size, high contrast) and a
// live date/time — the chrome real Indian government transport portals use.
// NOTE: this is a fictional authority name/emblem (a simple location-pin
// mark, not the State Emblem) — using the real Ashoka Emblem or an actual
// department's identity here would be unlawful impersonation.
export default function GovHeader() {
  const [fontScale, setFontScale] = useState(() => parseFloat(localStorage.getItem('tv_font_scale') || '1'));
  const [highContrast, setHighContrast] = useState(() => localStorage.getItem('tv_high_contrast') === '1');
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    document.documentElement.style.fontSize = `${16 * fontScale}px`;
    localStorage.setItem('tv_font_scale', String(fontScale));
  }, [fontScale]);

  useEffect(() => {
    document.body.classList.toggle('gov-high-contrast', highContrast);
    localStorage.setItem('tv_high_contrast', highContrast ? '1' : '0');
  }, [highContrast]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="gov-header-strip">
      {/* Tricolour accent line */}
      <div className="gov-tricolor-line" aria-hidden="true"></div>

      <div className="gov-header-bar">
        <div className="gov-header-left">
          <span className="gov-emblem" aria-hidden="true">📍</span>
          <div className="gov-header-titles">
            <span className="gov-title-kn">ನಮ್ಮ ಬೆಂಗಳೂರು ನಗರ ಸಂಚಾರ ಪ್ರಾಧಿಕಾರ</span>
            <span className="gov-title-hi">नम्म बेंगळूरु नगर संचार प्राधिकरण</span>
            <span className="gov-title-en">Namma Bengaluru Urban Traffic Authority</span>
          </div>
        </div>

        <div className="gov-header-right">
          <span className="gov-datetime">
            {now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>

          <LanguageSwitcher />

          <div className="gov-a11y-controls" role="group" aria-label="Accessibility controls">
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.max(0.85, +(s - 0.1).toFixed(2)))}
              aria-label="Decrease font size"
              title="Decrease font size"
            >
              <ZoomOut size={13} />
            </button>
            <button
              type="button"
              onClick={() => setFontScale(1)}
              aria-label="Reset font size"
              title="Reset font size"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => setFontScale((s) => Math.min(1.4, +(s + 0.1).toFixed(2)))}
              aria-label="Increase font size"
              title="Increase font size"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => setHighContrast((c) => !c)}
              aria-label="Toggle high contrast mode"
              title="Toggle high contrast"
              className={highContrast ? 'active' : ''}
            >
              <Contrast size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
