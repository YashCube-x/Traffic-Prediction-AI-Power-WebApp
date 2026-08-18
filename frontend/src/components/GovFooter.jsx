import React, { useEffect, useState } from 'react';
import { Phone, ShieldCheck, Eye } from 'lucide-react';

// Government-portal-style footer: helpline numbers, standard policy links,
// visitor counter and a "last content review" date.
export default function GovFooter() {
  const [visitors, setVisitors] = useState(null);

  useEffect(() => {
    // Count once per browser session (POST increments), otherwise just read
    // the current total (GET) so repeat renders don't inflate the counter.
    const key = 'tv_visit_counted_session';
    const alreadyCounted = sessionStorage.getItem(key);
    const method = alreadyCounted ? 'GET' : 'POST';

    fetch('http://localhost:2001/api/v1/stats/visit', { method })
      .then((res) => res.json())
      .then((data) => {
        setVisitors(data.visitors);
        if (!alreadyCounted) sessionStorage.setItem(key, '1');
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="gov-footer">
      <div className="gov-footer-inner">
        <div className="gov-footer-col">
          <strong>Namma Bengaluru Urban Traffic Authority</strong>
          <p>An AI-powered public traffic advisory platform. This is a demonstration/student project and is not an official government service.</p>
        </div>
        <div className="gov-footer-col">
          <strong>Citizen Helpline</strong>
          <p><Phone size={12} /> Traffic Police: <a href="tel:103" style={{ color: 'inherit' }}><strong>103</strong></a></p>
          <p><Phone size={12} /> Emergency: <a href="tel:112" style={{ color: 'inherit' }}><strong>112</strong></a></p>
          <p><Phone size={12} /> Women Helpline: <a href="tel:181" style={{ color: 'inherit' }}><strong>181</strong></a></p>
        </div>
        <div className="gov-footer-col">
          <strong>Policies</strong>
          <p>Terms of Use · Privacy Policy · Accessibility Statement</p>
          <p style={{ opacity: 0.7 }}>Content last reviewed: {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="gov-footer-col">
          <strong>Site Metrics</strong>
          <p><Eye size={12} /> Total Visitors: <strong>{visitors !== null ? visitors.toLocaleString('en-IN') : '—'}</strong></p>
          <p><ShieldCheck size={12} /> Best viewed on any modern browser</p>
        </div>
      </div>
      <div className="gov-footer-bottom">
        © {new Date().getFullYear()} TrafficVision AI — Namma Bengaluru Urban Mobility System. All content is indicative and AI-generated; verify critical decisions independently.
      </div>
    </footer>
  );
}
