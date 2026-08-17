import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useToast } from '../context/ToastContext.jsx';

// Custom Teardrop GPS Pin Marker Icons (Matching User Design)
const createCustomIcon = (type, label) => {
  const isStart = type === 'start';
  const bgColor = isStart ? '#10b981' : '#ef4444';
  
  return L.divIcon({
    className: 'custom-gps-teardrop-pin',
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -85%);
        cursor: pointer;
      ">
        <div style="
          background: ${bgColor};
          color: #ffffff;
          padding: 3px 9px;
          border-radius: 12px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.3);
          border: 1.5px solid #ffffff;
          white-space: nowrap;
          margin-bottom: 2px;
          text-transform: uppercase;
        ">
          ${label}
        </div>

        <svg width="38" height="46" viewBox="0 0 36 44" fill="none" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));">
          <ellipse cx="18" cy="41" rx="14" ry="2.8" fill="${bgColor}" opacity="0.35"/>
          <ellipse cx="18" cy="41" rx="8" ry="1.8" fill="${bgColor}" opacity="0.65"/>
          <path d="M18 2C10.268 2 4 8.268 4 16C4 26.5 18 37 18 37C18 37 32 26.5 32 16C32 8.268 25.732 2 18 2Z" fill="${bgColor}" stroke="#FFFFFF" stroke-width="2"/>
          <path d="M18 2C25.732 2 32 8.268 32 16C32 26.5 18 37 18 37V2Z" fill="#000000" opacity="0.18"/>
          <circle cx="18" cy="15" r="5.5" fill="#FFFFFF"/>
        </svg>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0]
  });
};

export default function RouteOptimizer({ userSession = null }) {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState('Central Silk Board, Bengaluru');
  const [destination, setDestination] = useState('Manyata Tech Park, Bengaluru');
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [locating, setLocating] = useState(false);
  const [savedCommutes, setSavedCommutes] = useState([]);
  const [departForecast, setDepartForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportForm, setReportForm] = useState({ title: '', location: '', zone_id: 'ZONE_CENTRAL', category: 'CONGESTION', description: '' });

  const token = userSession?.access_token;

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchActiveAlerts = () => {
    fetch('http://localhost:2001/api/v1/alerts')
      .then((res) => res.json())
      .then((data) => {
        const active = (data || []).filter(a => !a.is_resolved);
        setActiveAlerts(active);
      })
      .catch(() => {
        setActiveAlerts([
          {
            alert_id: "ALT-2026-001",
            title: "Multi-Vehicle Collision near Hebbal Junction",
            location: "Hebbal Flyover, North Corridor",
            category: "ACCIDENT",
            estimated_delay_mins: 35
          }
        ]);
      });
  };

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

  // Live updates: when an operator logs/resolves an incident anywhere, the
  // warning banner refreshes instantly without a page reload.
  useEffect(() => {
    const source = new EventSource('http://localhost:2001/api/v1/events');
    source.addEventListener('alerts_changed', () => fetchActiveAlerts());
    return () => source.close();
  }, []);

  const fetchRouteOptimization = (orig, dest) => {
    setLoading(true);
    setRouteError('');
    fetch('http://localhost:2001/api/v1/routes/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: orig, destination: dest })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const err = new Error(data.error || data.detail || 'Could not calculate a route for those locations.');
          err.isApiError = true;
          throw err;
        }
        return data;
      })
      .then((data) => {
        setRouteResult(data);
        if (data.routes && data.routes.length > 0) {
          const rec = data.routes.find(r => r.is_recommended) || data.routes[0];
          setSelectedRouteId(rec.route_id);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.isApiError) {
          // A real error from the backend (e.g. an unrecognized address) - tell
          // the user what went wrong instead of silently showing an empty panel.
          setRouteError(err.message);
          setRouteResult(null);
          setLoading(false);
          showToast(err.message, 'error');
          return;
        }

        console.warn('Backend route optimization server unavailable, using static fallback:', err);
        showToast('Route service unreachable — showing offline demo data.', 'warning');
        const fallbackData = {
          origin: orig,
          destination: dest,
          origin_coords: { lat: 12.9170, lon: 77.6223 },
          destination_coords: { lat: 13.0482, lon: 77.6211 },
          calculated_at: new Date().toISOString(),
          routes: [
            {
              route_id: "ROUTE_ALT_01",
              title: "AI Recommended (Eco-Bypass via Old Airport Rd)",
              distance_km: 23.1,
              est_travel_time_mins: 34,
              delay_time_mins: 3,
              congestion_level: "LOW",
              fuel_efficiency_score: 9.2,
              co2_saved_kg: 1.8,
              path_coords: [
                [12.9170, 77.6223],
                [12.9550, 77.6400],
                [12.9800, 77.6350],
                [13.0482, 77.6211]
              ],
              segments: [
                { segment_name: "Old Airport Road", distance_km: 8.1, avg_speed_kmh: 45.0, congestion_level: "LOW" },
                { segment_name: "Suranjan Das Road", distance_km: 6.0, avg_speed_kmh: 42.0, congestion_level: "LOW" },
                { segment_name: "Hennur Main Road Link", distance_km: 9.0, avg_speed_kmh: 38.0, congestion_level: "MODERATE" }
              ],
              is_recommended: true
            },
            {
              route_id: "ROUTE_PRI_01",
              title: "Primary Direct (Outer Ring Road)",
              distance_km: 21.4,
              est_travel_time_mins: 48,
              delay_time_mins: 16,
              congestion_level: "HEAVY",
              fuel_efficiency_score: 6.8,
              co2_saved_kg: 0.0,
              path_coords: [
                [12.9170, 77.6223],
                [12.9300, 77.6200],
                [12.9900, 77.6150],
                [13.0482, 77.6211]
              ],
              segments: [
                { segment_name: "Silk Board Flyover", distance_km: 3.2, avg_speed_kmh: 12.0, congestion_level: "SEVERE" },
                { segment_name: "Marathahalli Expressway", distance_km: 10.5, avg_speed_kmh: 32.0, congestion_level: "MODERATE" },
                { segment_name: "Nagavara Junction", distance_km: 7.7, avg_speed_kmh: 18.5, congestion_level: "HEAVY" }
              ],
              is_recommended: false
            }
          ]
        };
        setRouteResult(fallbackData);
        setSelectedRouteId("ROUTE_ALT_01");
        setLoading(false);
      });
  };

  // "Best time to leave" — GBDT-model (or heuristic) ETA for the next 5 hours
  const fetchDepartureForecast = (orig, dest) => {
    setForecastLoading(true);
    fetch('http://localhost:2001/api/v1/routes/departure-forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: orig, destination: dest })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'forecast failed');
        return data;
      })
      .then((data) => {
        setDepartForecast(data);
        setForecastLoading(false);
      })
      .catch(() => {
        setDepartForecast(null);
        setForecastLoading(false);
      });
  };

  const runFullSearch = (orig, dest) => {
    fetchRouteOptimization(orig, dest);
    fetchDepartureForecast(orig, dest);
  };

  useEffect(() => {
    runFullSearch(origin, destination);
  }, []);

  // Saved commutes ("My Commute") — only for signed-in users
  const fetchSavedCommutes = () => {
    if (!token) return;
    fetch('http://localhost:2001/api/v1/my-commute', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setSavedCommutes(data))
      .catch(() => {});
  };

  useEffect(() => {
    fetchSavedCommutes();
  }, [token]);

  const handleSaveCommute = () => {
    const label = `${origin.split(',')[0]} → ${destination.split(',')[0]}`.slice(0, 110);
    fetch('http://localhost:2001/api/v1/my-commute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ origin, destination, label })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not save commute');
        return data;
      })
      .then(() => {
        fetchSavedCommutes();
        showToast('Commute saved — one tap from now on.', 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  const handleDeleteCommute = (id, e) => {
    e.stopPropagation();
    fetch(`http://localhost:2001/api/v1/my-commute/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => setSavedCommutes((prev) => prev.filter((c) => c.id !== id)))
      .catch(() => {});
  };

  // Browser geolocation -> reverse geocode -> origin field
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by this browser.', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const name = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setOrigin(name);
          setLocating(false);
          showToast('Origin set to your current location.', 'success');
        } catch {
          setLocating(false);
          showToast('Could not look up your location name.', 'error');
        }
      },
      () => {
        setLocating(false);
        showToast('Location permission denied — type your origin instead.', 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Citizen incident report (needs login; verified by an operator before it
  // affects routing)
  const handleSubmitReport = (e) => {
    e.preventDefault();
    setReportSubmitting(true);
    fetch('http://localhost:2001/api/v1/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(reportForm)
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not submit the report');
        return data;
      })
      .then(() => {
        setReportSubmitting(false);
        setShowReportModal(false);
        setReportForm({ title: '', location: '', zone_id: 'ZONE_CENTRAL', category: 'CONGESTION', description: '' });
        showToast('Report submitted! A traffic operator will verify it shortly.', 'success');
      })
      .catch((err) => {
        setReportSubmitting(false);
        showToast(err.message, 'error');
      });
  };

  // Update Leaflet Map when routeResult or selectedRouteId changes
  useEffect(() => {
    if (!routeResult || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const origCoords = routeResult.origin_coords || { lat: 12.9170, lon: 77.6223 };
    const destCoords = routeResult.destination_coords || { lat: 13.0482, lon: 77.6211 };

    const map = L.map(mapRef.current).setView([origCoords.lat, origCoords.lon], 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // 3D Teardrop GPS Pins
    const startIcon = createCustomIcon('start', 'START');
    const endIcon = createCustomIcon('end', 'DESTINATION');

    L.marker([origCoords.lat, origCoords.lon], { icon: startIcon })
      .addTo(map)
      .bindPopup(`<b>Start Point</b><br>${routeResult.origin || 'Source'}`);

    L.marker([destCoords.lat, destCoords.lon], { icon: endIcon })
      .addTo(map)
      .bindPopup(`<b>Destination Point</b><br>${routeResult.destination || 'Target'}`);

    const bounds = L.latLngBounds([[origCoords.lat, origCoords.lon], [destCoords.lat, destCoords.lon]]);

    const activeId = selectedRouteId || routeResult.routes?.[0]?.route_id;

    // Render Route Polylines
    (routeResult.routes || []).forEach((route) => {
      if (route.path_coords && route.path_coords.length > 0) {
        const isSelected = route.route_id === activeId;
        
        let polyColor = '#34d399';
        if (route.congestion_level === 'MODERATE') polyColor = '#fbbf24';
        else if (route.congestion_level === 'HEAVY') polyColor = '#f97316';
        else if (route.congestion_level === 'SEVERE') polyColor = '#ef4444';

        const polyline = L.polyline(route.path_coords, {
          color: isSelected ? polyColor : '#94a3b8',
          weight: isSelected ? 7 : 3.5,
          opacity: isSelected ? 1.0 : 0.45,
          dashArray: isSelected ? null : '6, 8'
        }).addTo(map);

        // Hover Tooltip popover matching user design (Instant on mouseover)
        polyline.bindTooltip(`
          <div style="
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            padding: 12px 16px;
            background: #ffffff;
            border-radius: 14px;
            box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.25);
            border: 1px solid #e2e8f0;
            min-width: 220px;
            pointer-events: none;
          ">
            <div style="color: ${polyColor}; font-weight: 800; font-size: 13px; margin-bottom: 6px; line-height: 1.3;">
              ${route.title}
            </div>
            <div style="font-size: 12px; color: #334155; margin-bottom: 3px; font-weight: 500;">
              Distance: <strong style="color: #0f172a; font-weight: 800;">${route.distance_km} km</strong>
            </div>
            <div style="font-size: 12px; color: #334155; font-weight: 500;">
              ETA: <strong style="color: #0f172a; font-weight: 800;">${route.est_travel_time_mins} mins</strong>
            </div>
          </div>
        `, {
          sticky: true,
          direction: 'top',
          opacity: 1.0,
          className: 'route-hover-tooltip'
        });

        polyline.on('mouseover', function () {
          this.setStyle({ weight: 9, opacity: 1.0 });
          this.bringToFront();
        });

        polyline.on('mouseout', function () {
          this.setStyle({
            weight: isSelected ? 7 : 3.5,
            opacity: isSelected ? 1.0 : 0.45
          });
        });

        if (isSelected) {
          route.path_coords.forEach(coord => bounds.extend(coord));
        }
      }
    });

    map.fitBounds(bounds, { padding: [40, 40] });

  }, [routeResult, selectedRouteId]);

  const handleSearch = (e) => {
    e.preventDefault();
    runFullSearch(origin, destination);
  };

  const getCongestionColor = (level) => {
    if (level === 'LOW') return 'var(--status-low)';
    if (level === 'MODERATE') return 'var(--status-moderate)';
    if (level === 'HEAVY') return 'var(--status-heavy)';
    return 'var(--status-severe)';
  };

  const activeRoute = routeResult?.routes?.find(r => r.route_id === (selectedRouteId || routeResult?.routes?.[0]?.route_id)) || routeResult?.routes?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Live Active Incident Alert Banner for Normal Users */}
      {activeAlerts && activeAlerts.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1.5px solid #ef4444',
          borderRadius: 'var(--radius-md)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px' }}>🚨</span>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                LIVE CITY TRAFFIC INCIDENT ALERT — {activeAlerts[0].category}
              </div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-on-dark)', marginTop: '2px' }}>
                {activeAlerts[0].title} ({activeAlerts[0].location})
              </div>
            </div>
          </div>
          <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: '800', padding: '4px 14px', borderRadius: '20px', background: '#ef4444', color: '#ffffff', whiteSpace: 'nowrap' }}>
            +{activeAlerts[0].estimated_delay_mins} MINS DELAY
          </span>
        </div>
      )}

      {/* Top Search & Optimization Control Panel */}
      <div className="panel-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--color-hairline)' }}>
          <div>
            <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>
              SMART ROUTE ANALYSIS & OPTIMIZATION
            </span>
            <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>
              Smart Route Optimizer & Travel Time Calculator
            </h2>
          </div>
          <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-low)', border: '1px solid var(--status-low)' }}>
            GIS ROUTER ● ONLINE
          </span>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Single Horizontal Row: Origin + Destination + Optimize Button */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
            
            {/* 1. Origin Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span> ORIGIN POINT:
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={locating}
                  style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#3b82f6', cursor: 'pointer', fontSize: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}
                >
                  {locating ? '⏳ Locating...' : '📍 Use my location'}
                </button>
              </span>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                placeholder="e.g. Central Silk Board, Bengaluru"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-dark-soft)',
                  color: 'var(--color-on-dark)',
                  border: '1px solid var(--color-hairline)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* 2. Destination Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> DESTINATION POINT:
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Manyata Tech Park, Bengaluru"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface-dark-soft)',
                  color: 'var(--color-on-dark)',
                  border: '1px solid var(--color-hairline)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              />
            </div>

            {/* 3. Primary Action Button in the Same Horizontal Row */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-orange)',
                  color: '#ffffff',
                  fontFamily: 'var(--font-display)',
                  fontSize: '12px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(252, 76, 2, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                {loading ? 'Calculating Routes...' : '⚡ Optimize Route'}
              </button>
            </div>

          </div>

          {/* Quick Presets Row Below */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingTop: '4px' }}>
            <span className="mono-label" style={{ fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
              Quick Presets:
            </span>
            <button
              type="button"
              onClick={() => {
                setOrigin('Silk Board, Bengaluru');
                setDestination('Manyata Tech Park, Bengaluru');
                runFullSearch('Silk Board, Bengaluru', 'Manyata Tech Park, Bengaluru');
              }}
              style={{ padding: '6px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}
            >
              📍 BLR: Silk Board ➔ Manyata
            </button>
            <button
              type="button"
              onClick={() => {
                setOrigin('HITEC City, Hyderabad');
                setDestination('Secunderabad Railway Station, Hyderabad');
                runFullSearch('HITEC City, Hyderabad', 'Secunderabad Railway Station, Hyderabad');
              }}
              style={{ padding: '6px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}
            >
              📍 HYD: HITEC City ➔ Secunderabad
            </button>
            <button
              type="button"
              onClick={() => {
                setOrigin('Connaught Place, Delhi');
                setDestination('Cyber Hub, Gurgaon');
                runFullSearch('Connaught Place, Delhi', 'Cyber Hub, Gurgaon');
              }}
              style={{ padding: '6px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}
            >
              📍 DEL: Connaught Place ➔ Cyber Hub
            </button>

            {token && (
              <>
                <span style={{ width: '1px', height: '20px', background: 'var(--color-hairline)', flexShrink: 0 }}></span>
                <button
                  type="button"
                  onClick={handleSaveCommute}
                  style={{ padding: '6px 12px', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid var(--status-moderate)', color: 'var(--status-moderate)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
                >
                  ★ Save this commute
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportForm((f) => ({ ...f, location: origin.split(',').slice(0, 2).join(',') }));
                    setShowReportModal(true);
                  }}
                  style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--status-severe)', color: 'var(--status-severe)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap' }}
                >
                  🚩 Report a jam
                </button>
              </>
            )}
          </div>

          {/* My Commute — one-tap saved routes */}
          {token && savedCommutes.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingTop: '2px' }}>
              <span className="mono-label" style={{ fontSize: '10px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                ★ My Commute:
              </span>
              {savedCommutes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setOrigin(c.origin);
                    setDestination(c.destination);
                    runFullSearch(c.origin, c.destination);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(251, 191, 36, 0.08)', border: '1px solid var(--status-moderate)', color: 'var(--color-on-dark)', borderRadius: '14px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}
                >
                  ★ {c.label || `${c.origin.split(',')[0]} → ${c.destination.split(',')[0]}`}
                  <span
                    role="button"
                    aria-label="Delete saved commute"
                    onClick={(e) => handleDeleteCommute(c.id, e)}
                    style={{ color: 'var(--status-severe)', fontWeight: '800' }}
                  >
                    ✕
                  </span>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {routeError && (
        <div
          className="panel-card"
          role="alert"
          style={{ padding: '16px 20px', borderLeft: '3px solid var(--status-severe)', color: 'var(--status-severe)', fontSize: '13px', fontWeight: '600' }}
        >
          ⚠️ {routeError} — try a more specific address (e.g. add the city name).
        </div>
      )}

      {/* ⏰ Best Time to Leave — commuter's biggest question, answered by the AI model */}
      {(forecastLoading || departForecast) && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="mono-eyebrow" style={{ color: 'var(--accent-mint-text)' }}>⏰ BEST TIME TO LEAVE</span>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>
                {departForecast?.recommended?.saves_mins_vs_now > 0
                  ? `Leave at ${departForecast.recommended.depart_label} — save ${departForecast.recommended.saves_mins_vs_now} mins vs leaving now`
                  : 'Now is the best time to leave'}
              </h3>
            </div>
            {departForecast && (
              <span className="mono-label" style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--color-hairline)', background: 'var(--color-surface-dark-soft)' }}>
                {departForecast.model_used === 'gbdt'
                  ? `🤖 AI GBDT FORECAST${departForecast.matched_corridor ? ` • ${departForecast.matched_corridor.toUpperCase()}` : ''}`
                  : '📈 PEAK-HOUR HEURISTIC'}
              </span>
            )}
          </div>

          {forecastLoading ? (
            <div className="skeleton skeleton-block" style={{ height: '120px', marginTop: '12px' }} />
          ) : (
            <>
              {departForecast.active_incident && (
                <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--status-severe)' }}>
                  🚨 Active incident on this route (+{departForecast.active_incident.delay_mins} mins for the next couple of hours): {departForecast.active_incident.title}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginTop: '16px' }}>
                {departForecast.forecast.map((f) => {
                  const isBest = f.depart_label === departForecast.recommended.depart_label;
                  let barColor = 'var(--status-low)';
                  if (f.congestion === 'MODERATE') barColor = 'var(--status-moderate)';
                  if (f.congestion === 'HEAVY') barColor = 'var(--status-heavy)';
                  if (f.congestion === 'SEVERE') barColor = 'var(--status-severe)';
                  const maxEta = Math.max(...departForecast.forecast.map(x => x.eta_mins));
                  return (
                    <div
                      key={f.offset_hours}
                      style={{
                        background: isBest ? 'rgba(52, 211, 153, 0.1)' : 'var(--color-surface-dark-soft)',
                        border: isBest ? '1.5px solid var(--status-low)' : '1px solid var(--color-hairline)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                      }}
                    >
                      <span className="mono-label" style={{ fontWeight: 'bold', fontSize: '11px' }}>
                        {isBest ? '✅ ' : ''}{f.depart_label}
                      </span>
                      <div style={{ width: '100%', height: '70px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', padding: '3px' }}>
                        <div style={{ width: '100%', height: `${Math.max(12, (f.eta_mins / maxEta) * 100)}%`, background: barColor, borderRadius: '2px', transition: 'height 0.4s ease' }}></div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold', fontSize: '14px' }}>{f.eta_mins} min</div>
                        <span className="mono-label" style={{ fontSize: '9px' }}>+{f.delay_mins}m traffic{f.incident_delay_mins ? ' 🚨' : ''}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {loading && !routeResult && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
          <div className="panel-card skeleton skeleton-block" style={{ height: '420px' }} />
          <div className="panel-card skeleton skeleton-block" style={{ height: '420px' }} />
        </div>
      )}

      {/* Split-Screen Grid (50% Map / 50% Tabbed Taskbar Route Details Panel) */}
      {routeResult && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px', alignItems: 'stretch' }}>
          
          {/* LEFT HALF: Interactive Leaflet GIS Map (50% Width) */}
          <div className="panel-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-header" style={{ marginBottom: '12px' }}>
              <div>
                <span className="mono-eyebrow">INTERACTIVE GIS MAP</span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Live Path & Congestion Geometry</h3>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-low)' }}></span> Low
                </span>
                <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-moderate)' }}></span> Moderate
                </span>
                <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-heavy)' }}></span> Heavy
                </span>
              </div>
            </div>

            <div
              ref={mapRef}
              style={{
                width: '100%',
                height: '520px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-hairline)',
                zIndex: 1
              }}
            ></div>
          </div>

          {/* RIGHT HALF: Browser-Style Task Bar Tabs & Selected Route Details (50% Width) */}
          <div className="panel-card" style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            
            {/* Top Browser Task Bar Tab Strip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px', background: 'var(--color-surface-dark-soft)', borderBottom: '1px solid var(--color-hairline)', overflowX: 'auto' }}>
              {routeResult.routes?.map((route, idx) => {
                const isSelected = activeRoute?.route_id === route.route_id;
                return (
                  <button
                    key={route.route_id}
                    onClick={() => setSelectedRouteId(route.route_id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontFamily: 'var(--font-display)',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent-orange)' : '1px solid var(--color-hairline)',
                      background: isSelected ? 'var(--color-canvas-dark)' : 'transparent',
                      color: isSelected ? 'var(--color-on-dark)' : 'var(--color-body)',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isSelected ? 'var(--accent-orange)' : 'var(--color-body)' }}></span>
                    <span>Route {idx + 1}</span>
                    {route.is_recommended ? (
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(252, 76, 2, 0.2)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)', fontWeight: 'bold' }}>
                        ★ RECOMMENDED
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--color-body)', fontWeight: 'bold' }}>
                        {route.est_travel_time_mins}m
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Route Active Content */}
            {activeRoute && (
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
                
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div>
                      <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>
                        {activeRoute.route_id} ● {activeRoute.is_recommended ? 'RECOMMENDED ROUTE' : 'ALTERNATIVE ROUTE'}
                      </span>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop: '2px' }}>{activeRoute.title}</h3>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '12px',
                        background: 'rgba(52, 211, 153, 0.15)',
                        color: getCongestionColor(activeRoute.congestion_level),
                        border: `1px solid ${getCongestionColor(activeRoute.congestion_level)}`
                      }}
                    >
                      {activeRoute.congestion_level}
                    </span>
                  </div>
                  {activeRoute.affected_by_incident && (
                    <div style={{
                      marginTop: '10px',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid var(--status-severe)',
                      fontSize: '12px',
                      color: 'var(--status-severe)'
                    }}>
                      🚨 Rerouted around active incident: {activeRoute.affected_by_incident.title}
                      {' '}(+{activeRoute.affected_by_incident.added_delay_mins} mins)
                    </div>
                  )}
                </div>

                {/* Metrics Summary Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', padding: '14px', background: 'var(--color-surface-dark-soft)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-hairline)' }}>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>ESTIMATED ETA:</span>
                    <div style={{ fontSize: '20px', fontWeight: '700' }}>{activeRoute.est_travel_time_mins} mins</div>
                  </div>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>CONGESTION DELAY:</span>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: getCongestionColor(activeRoute.congestion_level) }}>
                      +{activeRoute.delay_time_mins} mins
                    </div>
                  </div>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>DISTANCE:</span>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-mint-text)' }}>{activeRoute.distance_km} km</div>
                  </div>
                </div>

                {/* Road Segment Details Table */}
                <div>
                  <span className="mono-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>ROAD SEGMENT ANALYSIS</span>
                  <div className="table-responsive-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Road Segment</th>
                          <th>Distance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeRoute.segments?.map((seg, sIdx) => (
                          <tr key={sIdx}>
                            <td>{seg.segment_name}</td>
                            <td>{seg.distance_km} km</td>
                            <td>
                              <span className={`status-badge ${seg.congestion_level}`}>
                                {seg.congestion_level}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

      {/* 🚩 Citizen Report Modal */}
      {showReportModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
        }}>
          <div className="panel-card" style={{ maxWidth: '480px', width: '100%', border: '2px solid var(--status-severe)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '12px', borderBottom: '1px solid var(--color-hairline)' }}>
              <div>
                <span className="mono-eyebrow" style={{ color: 'var(--status-severe)' }}>🚩 CITIZEN TRAFFIC REPORT</span>
                <h3 style={{ fontSize: '19px', fontWeight: '700', marginTop: '2px' }}>Report a Jam / Incident</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '32px', height: '32px', borderRadius: '50%', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>WHAT'S HAPPENING?</span>
                <input
                  type="text" required value={reportForm.title}
                  onChange={(e) => setReportForm({ ...reportForm, title: e.target.value })}
                  placeholder="e.g. Huge jam near Silk Board flyover"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', fontSize: '14px', fontWeight: '600' }}
                />
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>WHERE?</span>
                <input
                  type="text" required value={reportForm.location}
                  onChange={(e) => setReportForm({ ...reportForm, location: e.target.value })}
                  placeholder="e.g. Silk Board Junction, towards HSR"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', fontSize: '14px', fontWeight: '600' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ZONE:</span>
                  <select
                    value={reportForm.zone_id}
                    onChange={(e) => setReportForm({ ...reportForm, zone_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', fontSize: '13px', fontWeight: '600' }}
                  >
                    {['ZONE_CENTRAL', 'ZONE_NORTH', 'ZONE_SOUTH', 'ZONE_EAST', 'ZONE_WEST'].map((z) => (
                      <option key={z} value={z} style={{ color: '#0f172a', background: '#ffffff' }}>{z}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>TYPE:</span>
                  <select
                    value={reportForm.category}
                    onChange={(e) => setReportForm({ ...reportForm, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', fontSize: '13px', fontWeight: '600' }}
                  >
                    {['CONGESTION', 'ACCIDENT', 'CONSTRUCTION', 'SIGNAL_FAILURE', 'WEATHER'].map((c) => (
                      <option key={c} value={c} style={{ color: '#0f172a', background: '#ffffff' }}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>DETAILS (OPTIONAL):</span>
                <textarea
                  rows={2} value={reportForm.description}
                  onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                  placeholder="Lane blocked? Since when? Any diversion?"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', fontSize: '13px', resize: 'vertical' }}
                />
              </div>
              <p className="mono-label" style={{ fontSize: '10px', lineHeight: 1.5 }}>
                A traffic operator verifies every citizen report before it affects live routing and public alerts.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-hairline)' }}>
                <button
                  type="button" onClick={() => setShowReportModal(false)}
                  style={{ padding: '10px 18px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={reportSubmitting}
                  style={{ padding: '10px 22px', background: 'var(--status-severe)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
                >
                  {reportSubmitting ? 'Submitting...' : '🚩 Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
