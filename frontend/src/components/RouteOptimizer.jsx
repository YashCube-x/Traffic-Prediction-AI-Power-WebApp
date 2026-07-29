import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom Map Marker Icons
const createCustomIcon = (color, label) => {
  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="
        background: ${color};
        color: #fff;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        border: 2px solid #ffffff;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 4px;
      ">
        ${label}
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15]
  });
};

export default function RouteOptimizer() {
  const [origin, setOrigin] = useState('Central Silk Board, Bengaluru');
  const [destination, setDestination] = useState('Manyata Tech Park, Bengaluru');
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const fetchRouteOptimization = (orig, dest) => {
    setLoading(true);
    fetch('http://localhost:2001/api/v1/routes/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: orig, destination: dest })
    })
      .then((res) => res.json())
      .then((data) => {
        setRouteResult(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn('Backend route optimization server unavailable, using static fallback:', err);
        setRouteResult({
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
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRouteOptimization(origin, destination);
  }, []);

  // Update Leaflet Map when routeResult changes
  useEffect(() => {
    if (!routeResult || !mapRef.current) return;

    // Clean up existing map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const origCoords = routeResult.origin_coords || { lat: 12.9170, lon: 77.6223 };
    const destCoords = routeResult.destination_coords || { lat: 13.0482, lon: 77.6211 };

    const map = L.map(mapRef.current).setView([origCoords.lat, origCoords.lon], 12);
    mapInstanceRef.current = map;

    // Add OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add Start & Destination Markers
    const startIcon = createCustomIcon('#10b981', '📍 START');
    const endIcon = createCustomIcon('#ef4444', '🏁 DESTINATION');

    L.marker([origCoords.lat, origCoords.lon], { icon: startIcon })
      .addTo(map)
      .bindPopup(`<b>Start Point</b><br>${routeResult.origin || 'Source'}`);

    L.marker([destCoords.lat, destCoords.lon], { icon: endIcon })
      .addTo(map)
      .bindPopup(`<b>Destination Point</b><br>${routeResult.destination || 'Target'}`);

    const bounds = L.latLngBounds([[origCoords.lat, origCoords.lon], [destCoords.lat, destCoords.lon]]);

    // Render Route Polylines with Congestion Colors
    (routeResult.routes || []).forEach((route) => {
      if (route.path_coords && route.path_coords.length > 0) {
        let polyColor = '#34d399'; // LOW: Green
        if (route.congestion_level === 'MODERATE') polyColor = '#fbbf24'; // Yellow
        else if (route.congestion_level === 'HEAVY') polyColor = '#f97316'; // Orange
        else if (route.congestion_level === 'SEVERE') polyColor = '#ef4444'; // Red

        const polyline = L.polyline(route.path_coords, {
          color: polyColor,
          weight: route.is_recommended ? 6 : 4,
          opacity: route.is_recommended ? 0.9 : 0.6,
          dashArray: route.is_recommended ? null : '6, 8'
        }).addTo(map);

        polyline.bindPopup(`
          <div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: ${polyColor}">${route.title}</strong><br/>
            <span>Distance: <b>${route.distance_km} km</b></span><br/>
            <span>ETA: <b>${route.est_travel_time_mins} mins</b></span><br/>
            <span>Congestion: <b>${route.congestion_level}</b></span>
          </div>
        `);

        // Extend bounds to include full route polyline
        route.path_coords.forEach(coord => bounds.extend(coord));
      }
    });

    // Auto-fit map to route bounds
    map.fitBounds(bounds, { padding: [40, 40] });

  }, [routeResult]);

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

  const recommendedRoute = routeResult?.routes?.find(r => r.is_recommended) || routeResult?.routes?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Card */}
      <div className="panel-card">
        <span className="mono-eyebrow">SMART ROUTE ANALYSIS & OPTIMIZATION</span>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginTop: '4px' }}>Smart Route Optimizer & Travel Time Calculator</h2>
        
        {/* Origin / Destination Search Bar */}
        <form onSubmit={handleSearch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
          <div>
            <span className="mono-label">ORIGIN POINT:</span>
            <input
              type="text"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              placeholder="e.g. Central Silk Board, Bengaluru"
              style={{
                width: '100%',
                padding: '10px 14px',
                marginTop: '6px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-dark-soft)',
                color: 'var(--color-on-dark)',
                border: '1px solid var(--color-hairline)',
                fontFamily: 'var(--font-display)',
                fontSize: '14px'
              }}
            />
          </div>

          <div>
            <span className="mono-label">DESTINATION POINT:</span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Manyata Tech Park, Bengaluru"
              style={{
                width: '100%',
                padding: '10px 14px',
                marginTop: '6px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface-dark-soft)',
                color: 'var(--color-on-dark)',
                border: '1px solid var(--color-hairline)',
                fontFamily: 'var(--font-display)',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', gridColumn: '1 / -1' }}>
            <button
              type="submit"
              className="button-mint"
              style={{ flex: 1, padding: '12px', textAlign: 'center', justifyContent: 'center' }}
              disabled={loading}
            >
              {loading ? 'Calculating Live GIS Routes...' : '⚡ Optimize Route & Render Live Map'}
            </button>

            {/* Quick Location Preset Buttons */}
            <button
              type="button"
              onClick={() => {
                setOrigin('Silk Board, Bengaluru');
                setDestination('Manyata Tech Park, Bengaluru');
                fetchRouteOptimization('Silk Board, Bengaluru', 'Manyata Tech Park, Bengaluru');
              }}
              style={{ padding: '8px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
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
              style={{ padding: '8px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
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
              style={{ padding: '8px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '12px' }}
            >
              📍 DEL: Connaught Place ➔ Cyber Hub
            </button>
          </div>
        </form>
      </div>

      {/* Interactive GIS OpenStreetMap Viewport */}
      <div className="panel-card" style={{ padding: '16px' }}>
        <div className="panel-header" style={{ marginBottom: '12px' }}>
          <div>
            <span className="mono-eyebrow">INTERACTIVE GIS ROUTE MAP</span>
            <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Live Path & Congestion Geometry</h3>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-low)' }}></span> Low
            </span>
            <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-moderate)' }}></span> Moderate
            </span>
            <span className="mono-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--status-heavy)' }}></span> Heavy
            </span>
          </div>
        </div>

        {/* Leaflet Map Div */}
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height: '380px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-hairline)',
            zIndex: 1
          }}
        ></div>
      </div>

      {routeResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Route Highlights */}
          <div className="stats-grid">
            <div className="stat-card mint-tint">
              <span className="mono-eyebrow">Fastest Travel Time</span>
              <div className="stat-value" style={{ color: 'var(--accent-mint-text)' }}>
                {recommendedRoute?.est_travel_time_mins} mins
              </div>
              <span className="mono-label">Via {recommendedRoute?.title}</span>
            </div>

            <div className="stat-card">
              <span className="mono-eyebrow">Max Congestion Delay Avoided</span>
              <div className="stat-value" style={{ color: 'var(--status-low)' }}>
                -{recommendedRoute?.delay_time_mins || 0} mins
              </div>
              <span className="mono-label">Compared to High Traffic Route</span>
            </div>

            <div className="stat-card">
              <span className="mono-eyebrow">Peak Fuel Efficiency</span>
              <div className="stat-value" style={{ color: 'var(--accent-periwinkle)' }}>
                {recommendedRoute?.fuel_efficiency_score} / 10
              </div>
              <span className="mono-label">Eco-Score Optimization</span>
            </div>
          </div>

          {/* Route Options Comparison */}
          <div className="responsive-grid-2">
            {routeResult.routes?.map((route) => (
              <div
                key={route.route_id}
                className="panel-card"
                style={{
                  border: route.is_recommended ? '2px solid var(--accent-orange)' : '1px solid var(--color-hairline)',
                  position: 'relative'
                }}
              >
                {route.is_recommended && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      right: '16px',
                      background: 'var(--accent-orange)',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    ★ RECOMMENDED ROUTE
                  </span>
                )}

                <span className="mono-eyebrow" style={{ fontSize: '10px' }}>{route.route_id}</span>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginTop: '2px' }}>{route.title}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', margin: '16px 0', padding: '12px', background: 'var(--color-surface-dark-soft)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>ESTIMATED ETA:</span>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>{route.est_travel_time_mins} mins</div>
                  </div>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>CONGESTION DELAY:</span>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: getCongestionColor(route.congestion_level) }}>
                      +{route.delay_time_mins} mins
                    </div>
                  </div>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>DISTANCE:</span>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{route.distance_km} km</div>
                  </div>
                  <div>
                    <span className="mono-label" style={{ fontSize: '10px' }}>CONGESTION:</span>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: getCongestionColor(route.congestion_level) }}>
                      {route.congestion_level}
                    </div>
                  </div>
                </div>

                {/* Segment Details Table */}
                <span className="mono-eyebrow">ROAD SEGMENT ANALYSIS</span>
                <div className="table-responsive-wrapper" style={{ marginTop: '8px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Road Segment</th>
                        <th>Distance</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {route.segments?.map((seg, sIdx) => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
