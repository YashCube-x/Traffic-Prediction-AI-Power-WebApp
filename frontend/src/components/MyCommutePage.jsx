import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Star, Plus, ArrowLeftRight, Clock, CheckCircle2, AlertTriangle, Loader2,
  Home, Briefcase, GraduationCap, MapPin, Navigation2, X,
} from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const API = 'http://localhost:2001/api/v1';

const PLACE_ICONS = { Home, Office: Briefcase, College: GraduationCap };
const WHAT_IF_PRESETS = [
  { key: 'now', label: 'Now', minutes: 0 },
  { key: '+10', label: '+10 min', minutes: 10 },
  { key: '+20', label: '+20 min', minutes: 20 },
  { key: '+30', label: '+30 min', minutes: 30 },
];

const fieldStyle = {
  width: '100%', padding: '12px 16px', borderRadius: 'var(--radius-md)',
  background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)',
  color: 'var(--color-on-dark)', fontSize: '14px', fontWeight: '600',
};

function congestionColor(level) {
  if (level === 'LOW') return 'var(--status-low)';
  if (level === 'MODERATE') return 'var(--status-moderate)';
  if (level === 'HEAVY') return 'var(--status-heavy)';
  return 'var(--status-severe)';
}

function formatClock(date) {
  return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export default function MyCommutePage({ userSession = null }) {
  const { showToast } = useToast();
  const token = userSession?.access_token;

  // Saved places ("Home"/"Office"/"College") and saved commutes (pairs)
  const [places, setPlaces] = useState([]);
  const [savedCommutes, setSavedCommutes] = useState([]);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [newPlace, setNewPlace] = useState({ label: '', address: '' });

  // Commute setup
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [locating, setLocating] = useState(false);
  const [hasPlanned, setHasPlanned] = useState(false);

  // Route optimization
  const [routeResult, setRouteResult] = useState(null);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');

  // Departure forecast (hourly — "Best Time to Leave" + comparison cards)
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');

  // "What if I leave..." (minute-level, on demand)
  const [whatIfKey, setWhatIfKey] = useState('now');
  const [customTime, setCustomTime] = useState('');
  const [whatIfResult, setWhatIfResult] = useState(null);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [whatIfError, setWhatIfError] = useState('');

  // Active incidents (for the "View Incident" detail expand)
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [showIncidentDetail, setShowIncidentDetail] = useState(false);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const mapAnchorRef = useRef(null);

  // ---- Saved places & commutes -------------------------------------------
  const fetchPlaces = () => {
    if (!token) return;
    fetch(`${API}/my-places`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setPlaces(data))
      .catch(() => {});
  };

  const fetchSavedCommutes = () => {
    if (!token) return;
    fetch(`${API}/my-commute`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setSavedCommutes(data))
      .catch(() => {});
  };

  useEffect(() => { fetchPlaces(); fetchSavedCommutes(); }, [token]);

  // Prefill Home -> Office once places are loaded, so returning users never
  // have to retype an address (only if they haven't started planning yet).
  useEffect(() => {
    if (hasPlanned || origin || destination) return;
    const home = places.find((p) => p.label === 'Home');
    const office = places.find((p) => p.label === 'Office');
    if (home && office) {
      setOrigin(home.address);
      setDestination(office.address);
    }
  }, [places]);

  const handleAddPlace = (e) => {
    e.preventDefault();
    const label = newPlace.label.trim();
    const address = newPlace.address.trim();
    if (!label || !address) return;
    fetch(`${API}/my-places`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ label, address }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not save place');
        return data;
      })
      .then(() => {
        fetchPlaces();
        setShowAddPlace(false);
        setNewPlace({ label: '', address: '' });
        showToast(`Saved "${label}".`, 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  const handleDeletePlace = (id, e) => {
    e.stopPropagation();
    fetch(`${API}/my-places/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(() => setPlaces((prev) => prev.filter((p) => p.id !== id)))
      .catch(() => {});
  };

  const handleSaveCommute = () => {
    if (!origin || !destination) return;
    const label = `${origin.split(',')[0]} → ${destination.split(',')[0]}`.slice(0, 110);
    fetch(`${API}/my-commute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ origin, destination, label }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not save commute');
        return data;
      })
      .then(() => {
        fetchSavedCommutes();
        showToast('Commute saved — pick it up instantly next time.', 'success');
      })
      .catch((err) => showToast(err.message, 'error'));
  };

  const handleDeleteCommute = (id, e) => {
    e.stopPropagation();
    fetch(`${API}/my-commute/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      .then(() => setSavedCommutes((prev) => prev.filter((c) => c.id !== id)))
      .catch(() => {});
  };

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
          setOrigin(data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          setLocating(false);
        } catch {
          setLocating(false);
          showToast('Could not look up your location name.', 'error');
        }
      },
      () => { setLocating(false); showToast('Location permission denied.', 'warning'); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ---- Plan the commute: route optimization + hourly departure forecast --
  const runPlan = (orig, dest) => {
    if (!orig || !dest) {
      showToast('Enter both a starting point and a destination.', 'warning');
      return;
    }
    setHasPlanned(true);
    setRouteError('');
    setForecastError('');
    setRouteLoading(true);
    setForecastLoading(true);
    setWhatIfResult(null);
    setWhatIfKey('now');
    setShowIncidentDetail(false);

    fetch(`${API}/routes/optimize`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: orig, destination: dest }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not calculate a route for those locations.');
        return data;
      })
      .then((data) => {
        setRouteResult(data);
        const rec = data.routes?.find((r) => r.is_recommended) || data.routes?.[0];
        setSelectedRouteId(rec?.route_id || null);
        setRouteLoading(false);
      })
      .catch((err) => {
        setRouteError(err.message);
        setRouteResult(null);
        setRouteLoading(false);
      });

    fetch(`${API}/routes/departure-forecast`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: orig, destination: dest }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not compute a departure forecast.');
        return data;
      })
      .then((data) => {
        setForecast(data);
        setForecastLoading(false);
      })
      .catch((err) => {
        setForecastError(err.message);
        setForecast(null);
        setForecastLoading(false);
      });

    fetch(`${API}/alerts`).then((res) => res.json()).then((data) => Array.isArray(data) && setActiveAlerts(data)).catch(() => {});
  };

  const handlePlanSubmit = (e) => {
    e.preventDefault();
    runPlan(origin, destination);
  };

  // Live updates: if an incident is logged/resolved while this page is open,
  // re-run the plan so the incident-aware banner and route delay stay current.
  useEffect(() => {
    if (!hasPlanned) return;
    const source = new EventSource(`${API}/events`);
    source.addEventListener('alerts_changed', () => runPlan(origin, destination));
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPlanned]);

  // ---- "What if I leave..." -----------------------------------------------
  const runWhatIf = (minutes) => {
    if (!origin || !destination) return;
    setWhatIfLoading(true);
    setWhatIfError('');
    fetch(`${API}/routes/departure-forecast`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, destination, offsets_minutes: [minutes] }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Could not calculate this departure time.');
        return data;
      })
      .then((data) => {
        setWhatIfResult(data.forecast[0]);
        setWhatIfLoading(false);
      })
      .catch((err) => {
        setWhatIfError(err.message);
        setWhatIfResult(null);
        setWhatIfLoading(false);
      });
  };

  const handleWhatIfPreset = (preset) => {
    setWhatIfKey(preset.key);
    runWhatIf(preset.minutes);
  };

  const handleCustomTime = (value) => {
    setCustomTime(value);
    setWhatIfKey('custom');
    if (!value) return;
    const [h, m] = value.split(':').map(Number);
    const target = new Date();
    target.setHours(h, m, 0, 0);
    const diffMins = Math.round((target.getTime() - Date.now()) / 60000);
    if (diffMins < 0) {
      setWhatIfError('That time has already passed today — pick a later time.');
      setWhatIfResult(null);
      return;
    }
    if (diffMins > 300) {
      setWhatIfError('Forecasts are only available up to 5 hours ahead.');
      setWhatIfResult(null);
      return;
    }
    runWhatIf(diffMins);
  };

  // ---- Derived values ------------------------------------------------------
  const activeRoute = routeResult?.routes?.find((r) => r.route_id === selectedRouteId) || routeResult?.routes?.[0];
  const recommendedRoute = routeResult?.routes?.find((r) => r.is_recommended) || routeResult?.routes?.[0];
  const recommended = forecast?.recommended;
  const recommendedForecastEntry = forecast?.forecast?.find((f) => f.depart_label === recommended?.depart_label);
  const arrivalTime = recommended?.depart_at
    ? new Date(new Date(recommended.depart_at).getTime() + recommended.eta_mins * 60000)
    : null;

  const matchedAlertDetail = recommendedRoute?.affected_by_incident
    ? activeAlerts.find((a) => a.alert_id === recommendedRoute.affected_by_incident.alert_id)
    : null;

  const handleFindAlternative = () => {
    const unaffected = (routeResult?.routes || [])
      .filter((r) => !r.affected_by_incident)
      .sort((a, b) => a.est_travel_time_mins - b.est_travel_time_mins)[0];
    if (unaffected) {
      setSelectedRouteId(unaffected.route_id);
      showToast(`Switched to ${unaffected.title} — no active incident on this one.`, 'success');
    } else {
      showToast('No unaffected alternative route is available right now.', 'warning');
    }
  };

  const whatIfDiffMins = whatIfResult && recommendedForecastEntry
    ? whatIfResult.eta_mins - recommendedForecastEntry.eta_mins
    : null;

  // ---- Leaflet map ----------------------------------------------------------
  const mapCallbackRef = useCallback((node) => {
    mapRef.current = node;
  }, []);

  useEffect(() => {
    if (!routeResult || !mapRef.current) return;
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const origCoords = routeResult.origin_coords;
    const destCoords = routeResult.destination_coords;
    const map = L.map(mapRef.current).setView([origCoords.lat, origCoords.lon], 12);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);

    L.circleMarker([origCoords.lat, origCoords.lon], { radius: 9, color: '#10b981', fillColor: '#10b981', fillOpacity: 0.8, weight: 2 })
      .addTo(map).bindPopup(`<b>Start</b><br>${routeResult.origin}`);
    L.circleMarker([destCoords.lat, destCoords.lon], { radius: 9, color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2 })
      .addTo(map).bindPopup(`<b>Destination</b><br>${routeResult.destination}`);

    const bounds = L.latLngBounds([[origCoords.lat, origCoords.lon], [destCoords.lat, destCoords.lon]]);
    const activeId = selectedRouteId || routeResult.routes?.[0]?.route_id;

    (routeResult.routes || []).forEach((route) => {
      if (!route.path_coords?.length) return;
      const isSelected = route.route_id === activeId;
      const color = congestionColor(route.congestion_level);
      const polyline = L.polyline(route.path_coords, {
        color: isSelected ? color : '#94a3b8',
        weight: isSelected ? 7 : 3.5,
        opacity: isSelected ? 1.0 : 0.4,
        dashArray: isSelected ? null : '6, 8',
      }).addTo(map).on('click', () => setSelectedRouteId(route.route_id));
      polyline.bindTooltip(`${route.title}<br>${route.distance_km} km · ${route.est_travel_time_mins} min`, { sticky: true });
      if (isSelected) route.path_coords.forEach((c) => bounds.extend(c));
    });

    map.fitBounds(bounds, { padding: [40, 40] });
    requestAnimationFrame(() => map.invalidateSize());
  }, [routeResult, selectedRouteId]);

  // ---- Render ---------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div className="panel-card" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span className="mono-eyebrow">SMART DAILY COMMUTE</span>
          <h2 style={{ fontSize: '22px', fontWeight: '700', marginTop: '4px' }}>Plan your journey intelligently</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '6px', maxWidth: '520px' }}>
            AI-powered route and departure recommendations based on current and predicted traffic.
          </p>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', padding: '4px 10px', borderRadius: '6px', background: 'rgba(52, 211, 153, 0.15)', color: 'var(--status-low)', border: '1px solid var(--status-low)', whiteSpace: 'nowrap' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--status-low)' }} /> LIVE TRAFFIC
        </span>
      </div>

      {/* Two-column: setup + best time + comparison | summary + traffic + incident */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '24px', alignItems: 'start' }}>

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

          {/* Commute Setup Card */}
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <span className="mono-eyebrow">COMMUTE SETUP</span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Plan Your Commute</h3>
              </div>
            </div>

            <form onSubmit={handlePlanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <span className="mono-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Home size={12} /> FROM
                    <button type="button" onClick={handleUseMyLocation} disabled={locating}
                      style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: '10px', background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#3b82f6', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>
                      {locating ? 'Locating…' : '📍 Current location'}
                    </button>
                  </span>
                  <input type="text" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Home address" style={fieldStyle} />
                </div>
                <button type="button" onClick={() => { setOrigin(destination); setDestination(origin); }} title="Swap"
                  style={{ width: '42px', height: '42px', flexShrink: 0, borderRadius: '50%', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowLeftRight size={16} />
                </button>
              </div>

              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Briefcase size={12} /> TO
                </span>
                <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Office address" style={fieldStyle} />
              </div>

              <button type="submit" disabled={routeLoading || forecastLoading}
                style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(252,76,2,0.3)' }}>
                {routeLoading || forecastLoading ? 'Planning…' : '⚡ Plan My Commute'}
              </button>

              {token && origin && destination && (
                <button type="button" onClick={handleSaveCommute}
                  style={{ alignSelf: 'flex-start', padding: '6px 12px', background: 'rgba(251,191,36,0.12)', border: '1px solid var(--status-moderate)', color: 'var(--status-moderate)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
                  <Star size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Save This Commute
                </button>
              )}
            </form>

            {/* Saved Places */}
            {token && (
              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--color-hairline)' }}>
                <span className="mono-label" style={{ fontSize: '10px', display: 'block', marginBottom: '8px' }}>SAVED PLACES</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {places.map((p) => {
                    const Icon = PLACE_ICONS[p.label] || MapPin;
                    return (
                      <button key={p.id} type="button" onClick={() => (!origin ? setOrigin(p.address) : setDestination(p.address))}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', borderRadius: '14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--color-on-dark)' }}>
                        <Icon size={13} /> {p.label}
                        <span role="button" aria-label={`Delete ${p.label}`} onClick={(e) => handleDeletePlace(p.id, e)} style={{ color: 'var(--status-severe)', fontWeight: '800', marginLeft: '2px' }}>✕</span>
                      </button>
                    );
                  })}
                  <button type="button" onClick={() => setShowAddPlace(true)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'transparent', border: '1px dashed var(--color-hairline)', borderRadius: '14px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', color: 'var(--color-body)' }}>
                    <Plus size={13} /> Add Place
                  </button>
                </div>
              </div>
            )}

            {/* Saved Commutes */}
            {token && savedCommutes.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <span className="mono-label" style={{ fontSize: '10px', display: 'block', marginBottom: '8px' }}>SAVED COMMUTES</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {savedCommutes.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setOrigin(c.origin); setDestination(c.destination); runPlan(c.origin, c.destination); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid var(--status-moderate)', borderRadius: '14px', cursor: 'pointer', fontSize: '11px', fontWeight: '600', color: 'var(--color-on-dark)' }}>
                      <Star size={11} /> {c.label || `${c.origin.split(',')[0]} → ${c.destination.split(',')[0]}`}
                      <span role="button" aria-label="Delete saved commute" onClick={(e) => handleDeleteCommute(c.id, e)} style={{ color: 'var(--status-severe)', fontWeight: '800' }}>✕</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Best Time to Leave */}
          {hasPlanned && (
            <div className="panel-card" style={{ borderLeft: '4px solid var(--accent-orange)' }}>
              <div className="panel-header">
                <div>
                  <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>AI DEPARTURE RECOMMENDATION</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Best time to leave</h3>
                </div>
              </div>

              {forecastLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: 'var(--color-body)', fontSize: '13px' }}>
                  <Loader2 size={14} className="spin" /> Calculating your best departure time...
                </div>
              ) : forecastError ? (
                <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--status-severe)' }}>⚠️ {forecastError}</div>
              ) : forecast ? (
                <>
                  <div style={{ marginTop: '14px', padding: '18px', borderRadius: 'var(--radius-md)', background: 'rgba(252,76,2,0.08)', border: '1.5px solid var(--accent-orange)' }}>
                    <span className="mono-eyebrow" style={{ color: 'var(--accent-orange)' }}>★ RECOMMENDED</span>
                    <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '6px' }}>Leave at {recommended.depart_label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '14px', marginTop: '16px' }}>
                      <div>
                        <span className="mono-label" style={{ fontSize: '10px' }}>TRAVEL TIME</span>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{recommended.eta_mins} min</div>
                      </div>
                      <div>
                        <span className="mono-label" style={{ fontSize: '10px' }}>ARRIVAL</span>
                        <div style={{ fontSize: '20px', fontWeight: '700' }}>{arrivalTime ? formatClock(arrivalTime) : '—'}</div>
                      </div>
                      <div>
                        <span className="mono-label" style={{ fontSize: '10px' }}>TRAFFIC</span>
                        <span className={`status-badge ${recommendedForecastEntry?.congestion || 'LOW'}`}>{recommendedForecastEntry?.congestion || '—'}</span>
                      </div>
                      <div>
                        <span className="mono-label" style={{ fontSize: '10px' }}>TIME SAVED</span>
                        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--status-low)' }}>
                          {recommended.saves_mins_vs_now > 0 ? `${recommended.saves_mins_vs_now} min` : '—'}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '14px' }}>
                      {recommended.saves_mins_vs_now > 0
                        ? `Leaving around ${recommended.depart_label} is expected to avoid the peak congestion window on your route.`
                        : 'Now is already the best time to leave on this route.'}
                    </p>
                    <span className="mono-label" style={{ fontSize: '10px', display: 'inline-block', marginTop: '10px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--color-hairline)' }}>
                      {forecast.model_used === 'tomtom' ? '🛰️ TOMTOM LIVE TRAFFIC' : forecast.model_used === 'gbdt' ? `🤖 AI GBDT FORECAST${forecast.matched_corridor ? ` • ${forecast.matched_corridor.toUpperCase()}` : ''}` : '📈 PEAK-HOUR HEURISTIC'}
                    </span>
                    {forecast.model_used === 'peak-heuristic' && (
                      <div style={{ fontSize: '11px', color: 'var(--status-moderate)', marginTop: '6px' }}>
                        Live AI/TomTom prediction is currently unavailable — showing a peak-hour estimate instead.
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Departure Time Comparison */}
          {hasPlanned && forecast && (
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="mono-eyebrow">DEPARTURE COMPARISON</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Compare departure times</h3>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '12px', marginTop: '14px' }}>
                {forecast.forecast.map((f) => {
                  const isBest = f.depart_label === recommended.depart_label;
                  const status = isBest ? '★ Best' : (f.congestion === 'HEAVY' || f.congestion === 'SEVERE') ? 'Avoid' : 'Good';
                  return (
                    <div key={f.depart_label + f.eta_mins} style={{
                      padding: '12px', borderRadius: 'var(--radius-md)', textAlign: 'center',
                      background: isBest ? 'rgba(52,211,153,0.08)' : 'var(--color-surface-dark-soft)',
                      border: isBest ? '1.5px solid var(--status-low)' : '1px solid var(--color-hairline)',
                    }}>
                      <div className="mono-label" style={{ fontSize: '11px', fontWeight: 'bold' }}>{f.depart_label}</div>
                      <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px' }}>{f.eta_mins} min</div>
                      <span className={`status-badge ${f.congestion}`} style={{ marginTop: '6px', display: 'inline-block' }}>{f.congestion}</span>
                      <div style={{ fontSize: '10px', fontWeight: '700', marginTop: '6px', color: isBest ? 'var(--status-low)' : status === 'Avoid' ? 'var(--status-severe)' : 'var(--color-body)' }}>{status}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minWidth: 0 }}>

          {/* Today's Commute Summary */}
          <div className="panel-card">
            <div className="panel-header">
              <div>
                <span className="mono-eyebrow">TODAY'S COMMUTE</span>
                <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Commute Summary</h3>
              </div>
            </div>
            {!hasPlanned ? (
              <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '10px' }}>Plan a commute to see your summary here.</p>
            ) : (
              <div className="stats-grid" style={{ marginTop: '14px' }}>
                <div className="stat-card">
                  <span className="mono-eyebrow">Distance</span>
                  <div className="stat-value" style={{ fontSize: '18px' }}>{activeRoute ? `${activeRoute.distance_km} km` : '—'}</div>
                </div>
                <div className="stat-card">
                  <span className="mono-eyebrow">Estimated Time</span>
                  <div className="stat-value" style={{ fontSize: '18px' }}>{activeRoute ? `${activeRoute.est_travel_time_mins} min` : '—'}</div>
                </div>
                <div className="stat-card">
                  <span className="mono-eyebrow">Traffic</span>
                  <div className="stat-value" style={{ fontSize: '18px', color: activeRoute ? congestionColor(activeRoute.congestion_level) : undefined }}>{activeRoute?.congestion_level || '—'}</div>
                </div>
                <div className="stat-card">
                  <span className="mono-eyebrow">Best Departure</span>
                  <div className="stat-value" style={{ fontSize: '18px' }}>{recommended?.depart_label || '—'}</div>
                </div>
                <div className="stat-card">
                  <span className="mono-eyebrow">Arrival</span>
                  <div className="stat-value" style={{ fontSize: '18px' }}>{arrivalTime ? formatClock(arrivalTime) : '—'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Incident-aware banner */}
          {hasPlanned && recommendedRoute?.affected_by_incident && (
            <div className="panel-card" style={{ borderLeft: '4px solid var(--status-severe)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🚨</span>
                <div style={{ flex: 1 }}>
                  <span className="mono-eyebrow" style={{ color: 'var(--status-severe)' }}>ROUTE ALERT</span>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>
                    An incident near {recommendedRoute.affected_by_incident.title} is affecting your usual route.
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--status-severe)', marginTop: '4px', fontWeight: '700' }}>
                    Expected delay: +{recommendedRoute.affected_by_incident.added_delay_mins} min
                  </div>
                  {showIncidentDetail && matchedAlertDetail && (
                    <div style={{ marginTop: '10px', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', fontSize: '12px' }}>
                      <div><strong>{matchedAlertDetail.title}</strong></div>
                      <div style={{ marginTop: '4px' }}>📍 {matchedAlertDetail.location}</div>
                      {matchedAlertDetail.description && <div style={{ marginTop: '4px', color: 'var(--color-body)' }}>{matchedAlertDetail.description}</div>}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={handleFindAlternative} style={{ padding: '7px 12px', borderRadius: 'var(--radius-sm)', background: 'rgba(52,211,153,0.15)', border: '1px solid var(--status-low)', color: 'var(--status-low)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Find Alternative</button>
                    <button onClick={() => setShowIncidentDetail((s) => !s)} style={{ padding: '7px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
                      {showIncidentDetail ? 'Hide Incident' : 'View Incident'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {hasPlanned && !recommendedRoute?.affected_by_incident && routeResult && (
            <div className="panel-card" style={{ borderLeft: '4px solid var(--status-low)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} style={{ color: 'var(--status-low)' }} />
                <span style={{ fontSize: '13px', fontWeight: '700' }}>No active incident on your recommended route.</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {!hasPlanned && savedCommutes.length === 0 && (
        <div className="panel-card" style={{ padding: '32px', textAlign: 'center' }}>
          <span className="mono-eyebrow">NO SAVED COMMUTE YET</span>
          <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '8px' }}>
            Save your Home → Office journey to get personalized traffic recommendations.
          </p>
        </div>
      )}

      {/* What if I leave... */}
      {hasPlanned && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={12} /> WHAT-IF ANALYSIS</span>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>What if I leave...</h3>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px', alignItems: 'center' }}>
            {WHAT_IF_PRESETS.map((p) => (
              <button key={p.key} onClick={() => handleWhatIfPreset(p)}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '12px', fontWeight: '700',
                  background: whatIfKey === p.key ? 'var(--accent-orange)' : 'var(--color-surface-dark-soft)',
                  color: whatIfKey === p.key ? '#fff' : 'var(--color-on-dark)',
                  border: whatIfKey === p.key ? 'none' : '1px solid var(--color-hairline)' }}>
                {p.label}
              </button>
            ))}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span className="mono-label" style={{ fontSize: '11px' }}>Custom:</span>
              <input type="time" value={customTime} onChange={(e) => handleCustomTime(e.target.value)}
                style={{ padding: '8px 10px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: whatIfKey === 'custom' ? '1px solid var(--accent-orange)' : '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', fontSize: '12px' }} />
            </span>
          </div>

          <div style={{ marginTop: '16px' }}>
            {whatIfLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-body)', fontSize: '13px' }}>
                <Loader2 size={14} className="spin" /> Calculating...
              </div>
            ) : whatIfError ? (
              <div style={{ fontSize: '13px', color: 'var(--status-severe)' }}>⚠️ {whatIfError}</div>
            ) : whatIfResult ? (
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '700' }}>If you leave at {whatIfResult.depart_label}</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '22px', fontWeight: '800' }}>{whatIfResult.eta_mins} min</div>
                  <span className={`status-badge ${whatIfResult.congestion}`}>{whatIfResult.congestion}</span>
                  {whatIfDiffMins !== null && (
                    <span style={{ fontSize: '12px', fontWeight: '700', color: whatIfDiffMins > 0 ? 'var(--status-severe)' : 'var(--status-low)' }}>
                      {whatIfDiffMins > 0 ? `+${whatIfDiffMins}` : whatIfDiffMins} min vs recommended
                    </span>
                  )}
                </div>
                {whatIfDiffMins !== null && recommended && (
                  <p style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '10px' }}>
                    {whatIfDiffMins > 0
                      ? `Leaving at ${recommended.depart_label} could save approximately ${whatIfDiffMins} minutes.`
                      : whatIfDiffMins < 0
                        ? `This departure is actually ${Math.abs(whatIfDiffMins)} minutes faster than the current recommendation.`
                        : 'This is just as fast as the recommended departure time.'}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--color-body)' }}>Pick a departure time above to see its impact.</p>
            )}
          </div>
        </div>
      )}

      {/* Route recommendation */}
      {hasPlanned && (
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="mono-eyebrow">BEST ROUTE FOR YOUR COMMUTE</span>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Route Options</h3>
            </div>
          </div>
          {routeLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', color: 'var(--color-body)', fontSize: '13px' }}>
              <Loader2 size={14} className="spin" /> Finding the best route...
            </div>
          ) : routeError ? (
            <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--status-severe)' }}>⚠️ {routeError}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginTop: '14px' }}>
              {routeResult?.routes?.map((route, idx) => {
                const isSelected = route.route_id === selectedRouteId;
                return (
                  <div key={route.route_id} style={{
                    padding: '16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: isSelected ? 'rgba(252,76,2,0.06)' : 'var(--color-surface-dark-soft)',
                    border: isSelected ? '1.5px solid var(--accent-orange)' : '1px solid var(--color-hairline)',
                  }} onClick={() => setSelectedRouteId(route.route_id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span className="mono-eyebrow">Route {idx + 1}{route.is_recommended ? ' ★ RECOMMENDED' : ''}</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{route.title}</div>
                    <div style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '6px' }}>{route.distance_km} km • {route.est_travel_time_mins} min</div>
                    <span className={`status-badge ${route.congestion_level}`} style={{ marginTop: '8px', display: 'inline-block' }}>{route.congestion_level}</span>
                    <div style={{ fontSize: '11px', marginTop: '8px', color: route.affected_by_incident ? 'var(--status-severe)' : 'var(--status-low)', fontWeight: '600' }}>
                      {route.affected_by_incident ? `🚨 ${route.affected_by_incident.title}` : '✓ No major incident'}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedRouteId(route.route_id); mapAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                      style={{ marginTop: '10px', width: '100%', padding: '8px', borderRadius: 'var(--radius-sm)', background: isSelected ? 'var(--accent-orange)' : 'var(--color-surface-card)', color: isSelected ? '#fff' : 'var(--color-on-dark)', border: '1px solid var(--color-hairline)', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
                      View Route
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* GIS Map */}
      {hasPlanned && routeResult && (
        <div className="panel-card" ref={mapAnchorRef}>
          <div className="panel-header">
            <div>
              <span className="mono-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Navigation2 size={12} /> YOUR COMMUTE</span>
              <h3 style={{ fontSize: '18px', fontWeight: '600' }}>Live route & congestion conditions</h3>
            </div>
          </div>
          <div ref={mapCallbackRef} style={{ width: '100%', height: '440px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-hairline)', marginTop: '12px' }} />
        </div>
      )}

      {/* Add Place modal */}
      {showAddPlace && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }}>
          <div className="panel-card" style={{ maxWidth: '420px', width: '100%', border: '2px solid var(--accent-mint)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Add a Saved Place</h3>
              <button onClick={() => setShowAddPlace(false)} style={{ background: 'var(--color-surface-dark-soft)', border: '1px solid var(--color-hairline)', color: 'var(--color-on-dark)', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer' }}><X size={14} /></button>
            </div>
            <form onSubmit={handleAddPlace} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>LABEL (e.g. Home, Office, College):</span>
                <input type="text" required value={newPlace.label} onChange={(e) => setNewPlace({ ...newPlace, label: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>ADDRESS:</span>
                <input type="text" required value={newPlace.address} onChange={(e) => setNewPlace({ ...newPlace, address: e.target.value })} style={fieldStyle} />
              </div>
              <button type="submit" className="button-mint" style={{ padding: '10px', marginTop: '6px' }}>Save Place</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
