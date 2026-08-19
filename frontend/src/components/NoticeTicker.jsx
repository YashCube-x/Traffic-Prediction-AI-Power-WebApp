import React, { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { API_BASE } from '../config.js';

// Scrolling circulars/notices strip — the classic government-portal
// "Latest Announcements" ticker.
export default function NoticeTicker() {
  const { t } = useTranslation();
  const [notices, setNotices] = useState([]);

  const fetchNotices = () => {
    fetch(`${API_BASE}/api/v1/notices`)
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setNotices(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchNotices();
    const source = new EventSource(`${API_BASE}/api/v1/events`);
    source.addEventListener('notices_changed', fetchNotices);
    return () => source.close();
  }, []);

  if (notices.length === 0) return null;

  const urgent = notices.find((n) => n.notice_type === 'URGENT');

  return (
    <div className="gov-notice-ticker" role="region" aria-label="Latest announcements">
      <span className="gov-notice-label">
        <Megaphone size={13} /> {urgent ? t('common.urgentNotice') : t('common.latestAnnouncements')}
      </span>
      <div className="gov-notice-track">
        <div className="gov-notice-scroll">
          {notices.map((n) => (
            <span key={n.id} className={`gov-notice-item ${n.notice_type === 'URGENT' ? 'urgent' : ''}`}>
              <strong>{n.title}:</strong> {n.body}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
