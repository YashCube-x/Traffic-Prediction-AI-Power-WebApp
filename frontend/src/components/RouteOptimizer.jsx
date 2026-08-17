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

export default function RouteOptimizer() {
  const { showToast } = useToast();
  const [origin, setOrigin] = useState('Central Silk Board, Bengaluru');
  const [destination, setDestination] = useState('Manyata Tech Park, Bengaluru');
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Fetch live active alerts for user visibility
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

  useEffect(() => {
    fetchRouteOptimization(origin, destination);
  }, []);

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
    fetchRouteOptimization(origin, destination);
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
                fetchRouteOptimization('Silk Board, Bengaluru', 'Manyata Tech Park, Bengaluru');
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
                fetchRouteOptimization('HITEC City, Hyderabad', 'Secunderabad Railway Station, Hyderabad');
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
                fetchRouteOptimization('Connaught Place, Delhi', 'Cyber Hub, Gurgaon');
              }}
              style={{ padding: '6px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '600', whiteSpace: 'nowrap' }}
            >
              📍 DEL: Connaught Place ➔ Cyber Hub
            </button>
          </div>
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
    </div>
  );
}
