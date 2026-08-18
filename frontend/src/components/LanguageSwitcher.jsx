import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { LANGUAGES, STORAGE_KEY } from '../i18n';

// Note: this component intentionally keeps its own trigger/aria labels
// ("Select language") in English regardless of the active language, since a
// language picker's own label must stay legible to someone who just landed
// in a language they don't yet recognize and wants to switch away from it.

// Compact language selector, styled to match the existing gov-header
// accessibility controls (same button size/border/colors), placed among
// the other top-right header icons. Persists to localStorage and never
// reloads the page - i18next re-renders every t()-consuming component in
// place, so route/tab/form state is untouched.
export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) || LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const selectLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem(STORAGE_KEY, code);
    setOpen(false);
  };

  return (
    <div className="gov-lang-switcher" ref={containerRef}>
      <button
        type="button"
        className="gov-lang-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select language"
        title="Select language"
      >
        <Globe size={13} />
        <span className="gov-lang-trigger-label">{current.nativeLabel}</span>
        <span className="gov-lang-trigger-code">{current.code.toUpperCase()}</span>
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="gov-lang-dropdown" role="listbox" aria-label="Language">
          <div className="gov-lang-dropdown-header">
            <Globe size={12} /> {t('common.language')}
          </div>
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={lang.code === current.code}
              className={`gov-lang-option ${lang.code === current.code ? 'active' : ''}`}
              onClick={() => selectLanguage(lang.code)}
            >
              <span className="gov-lang-option-tick">
                {lang.code === current.code && <Check size={13} />}
              </span>
              {lang.nativeLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
