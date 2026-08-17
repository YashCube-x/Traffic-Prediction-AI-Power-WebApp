// TomTom live traffic integration (free tier: 2,500 requests/day).
//
// Configured via TOMTOM_API_KEY in backend/.env. Every helper returns null
// on any failure (no key, quota exhausted, network error) so callers can
// fall back to the simulated/OSRM path — the app never breaks without it.
require('dotenv').config();

const TOMTOM_KEY = process.env.TOMTOM_API_KEY || '';
const BASE = 'https://api.tomtom.com';

const isConfigured = () => !!TOMTOM_KEY;

// ── tiny in-memory TTL cache (keeps well within the free daily quota) ──────
const cache = new Map();
function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return producer().then((value) => {
    if (value !== null) cache.set(key, { at: Date.now(), value });
    return value;
  });
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TomTom ${res.status}`);
  return res.json();
}

/**
 * Live speed at a point (Traffic Flow Segment Data API). Cached 60s.
 * Returns { current_speed_kmh, free_flow_speed_kmh, confidence } or null.
 */
function getFlowSegment(lat, lon) {
  if (!isConfigured()) return Promise.resolve(null);
  const key = `flow:${lat.toFixed(4)},${lon.toFixed(4)}`;
  return cached(key, 60 * 1000, async () => {
    try {
      const data = await getJson(
        `${BASE}/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lon}&unit=KMPH&key=${TOMTOM_KEY}`
      );
      const seg = data.flowSegmentData;
      if (!seg) return null;
      return {
        current_speed_kmh: seg.currentSpeed,
        free_flow_speed_kmh: seg.freeFlowSpeed,
        confidence: seg.confidence,
      };
    } catch (err) {
      console.warn('TomTom flow error:', err.message);
      return null;
    }
  });
}

/**
 * Route with live traffic (Routing API). Cached 45s per od-pair(+departAt hour).
 * departAt (optional Date) uses TomTom's historical+live traffic model —
 * perfect for "best time to leave".
 * Returns { routes: [{ travel_time_mins, traffic_delay_mins, distance_km,
 *                      summary, path_coords }] } or null.
 */
function calculateRoute(origLat, origLon, destLat, destLon, { alternatives = 2, departAt = null } = {}) {
  if (!isConfigured()) return Promise.resolve(null);
  const departKey = departAt ? departAt.toISOString().slice(0, 13) : 'now';
  const key = `route:${origLat.toFixed(4)},${origLon.toFixed(4)}:${destLat.toFixed(4)},${destLon.toFixed(4)}:${alternatives}:${departKey}`;
  return cached(key, 45 * 1000, async () => {
    try {
      let url =
        `${BASE}/routing/1/calculateRoute/${origLat},${origLon}:${destLat},${destLon}/json` +
        `?traffic=true&maxAlternatives=${alternatives}&computeTravelTimeFor=all&instructionsType=text&key=${TOMTOM_KEY}`;
      if (departAt) url += `&departAt=${encodeURIComponent(departAt.toISOString())}`;

      const data = await getJson(url);
      if (!data.routes?.length) return null;

      return {
        routes: data.routes.map((r) => {
          // Distinct street names along the route (for segment display and
          // incident keyword matching), from turn-by-turn guidance.
          const streets = [];
          for (const ins of r.guidance?.instructions || []) {
            const name = ins.street || (ins.roadNumbers || []).join('/') || null;
            if (name && streets[streets.length - 1]?.name !== name) {
              streets.push({ name, offset_m: ins.routeOffsetInMeters || 0 });
            }
          }
          return {
            travel_time_mins: Math.round(r.summary.travelTimeInSeconds / 60),
            traffic_delay_mins: Math.round((r.summary.trafficDelayInSeconds || 0) / 60),
            no_traffic_time_mins: Math.round((r.summary.noTrafficTravelTimeInSeconds || r.summary.travelTimeInSeconds) / 60),
            distance_km: parseFloat((r.summary.lengthInMeters / 1000).toFixed(1)),
            path_coords: (r.legs || []).flatMap((leg) => (leg.points || []).map((p) => [p.latitude, p.longitude])),
            streets,
          };
        }),
      };
    } catch (err) {
      console.warn('TomTom routing error:', err.message);
      return null;
    }
  });
}

module.exports = { isConfigured, getFlowSegment, calculateRoute };
