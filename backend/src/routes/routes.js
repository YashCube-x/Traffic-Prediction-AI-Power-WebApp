const express = require('express');
const router = express.Router();
const alertsStore = require('../store/alertsStore');
const tomtom = require('../tomtom');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';

// Maps well-known Bengaluru place names to the GBDT model's corridors
// (ml_common.py) so the departure forecast can use real AI predictions
// when a route passes through a modelled corridor.
const CORRIDOR_KEYWORDS = [
  { corridor_id: 'CORRIDOR_SILK_BOARD', corridor: 'Central Silk Board Junction', normal_speed: 18.0, keywords: ['silk board', 'btm layout', 'hsr layout'] },
  { corridor_id: 'CORRIDOR_HEBBAL_FLYOVER', corridor: 'Hebbal Flyover to Airport Expressway', normal_speed: 35.0, keywords: ['hebbal', 'bellary road', 'airport road'] },
  { corridor_id: 'CORRIDOR_ORR_BELLANDUR', corridor: 'Outer Ring Road (Marathahalli - Bellandur)', normal_speed: 20.0, keywords: ['marathahalli', 'bellandur', 'outer ring', 'sarjapur'] },
  { corridor_id: 'CORRIDOR_TIN_FACTORY', corridor: 'Tin Factory & K.R. Puram Junction', normal_speed: 12.0, keywords: ['tin factory', 'k.r. puram', 'kr puram', 'old madras'] },
  { corridor_id: 'CORRIDOR_MG_ROAD', corridor: 'M.G. Road & Trinity Circle Corridor', normal_speed: 22.0, keywords: ['m.g. road', 'mg road', 'trinity', 'brigade road'] },
  { corridor_id: 'CORRIDOR_WHITEFIELD', corridor: 'Whitefield ITPB Main Road', normal_speed: 16.0, keywords: ['whitefield', 'itpb', 'itpl'] },
  { corridor_id: 'CORRIDOR_GORAGUNTEPALYA', corridor: 'Goraguntepalya Tumkur Road Junction', normal_speed: 24.0, keywords: ['goraguntepalya', 'tumkur', 'yeshwanthpur'] },
  { corridor_id: 'CORRIDOR_ELECTRONIC_CITY', corridor: 'Electronic City Elevated Expressway', normal_speed: 48.0, keywords: ['electronic city', 'hosur road'] },
];

// Helper to fetch JSON with User-Agent header (required by Nominatim)
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TrafficVisionAI-SmartCity-Platform/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

const LOCATION_STOPWORDS = new Set([
  'road', 'junction', 'flyover', 'zone', 'corridor', 'north', 'south', 'east', 'west',
  'central', 'near', 'the', 'main', 'link', 'ring', 'outer', 'expressway', 'underpass',
]);

// Best-effort keyword match between an alert's reported location/title and a
// route's road names - there's no real GPS geofencing here, just substring
// matching on the significant place-name tokens (e.g. "Silk Board", "Hebbal").
function extractLocationKeywords(text) {
  return (text || '')
    .split(/[^a-zA-Z]+/)
    .map(w => w.trim())
    .filter(w => w.length >= 4 && !LOCATION_STOPWORDS.has(w.toLowerCase()));
}

function routeMatchesAlert(route, originName, destName, alert) {
  const haystack = [
    originName, destName, route.title,
    ...(route.segments || []).map(s => s.segment_name),
  ].join(' ').toLowerCase();

  const keywords = [
    ...extractLocationKeywords(alert.location),
    ...extractLocationKeywords(alert.title),
  ];
  return keywords.some(kw => haystack.includes(kw.toLowerCase()));
}

const CONGESTION_ESCALATION = { LOW: 'MODERATE', MODERATE: 'HEAVY', HEAVY: 'SEVERE', SEVERE: 'SEVERE' };

router.post('/routes/optimize', async (req, res) => {
  const originQuery = (req.body?.origin || "Central Silk Board").trim();
  const destinationQuery = (req.body?.destination || "Manyata Tech Park").trim();

  try {
    // 1. Geocode Origin & Destination using OpenStreetMap Nominatim API
    const originGeocode = await fetchJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(originQuery)}`);
    const destGeocode = await fetchJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destinationQuery)}`);

    if (!originGeocode || originGeocode.length === 0) {
      return res.status(400).json({ error: `Could not locate origin: "${originQuery}"` });
    }
    if (!destGeocode || destGeocode.length === 0) {
      return res.status(400).json({ error: `Could not locate destination: "${destinationQuery}"` });
    }

    const orig = originGeocode[0];
    const dest = destGeocode[0];

    // 2. Routing: TomTom (REAL live traffic ETA + delay) when a key is
    // configured, otherwise OSRM geometry with a peak-hour delay heuristic.
    let formattedRoutes = null;
    let routingEngine = 'OSRM_HEURISTIC';

    const tomtomResult = await tomtom.calculateRoute(
      parseFloat(orig.lat), parseFloat(orig.lon), parseFloat(dest.lat), parseFloat(dest.lon), { alternatives: 2 }
    );
    if (tomtomResult?.routes?.length) {
      routingEngine = 'TOMTOM_LIVE';
      formattedRoutes = tomtomResult.routes.map((r, index) => {
        const delayMins = r.traffic_delay_mins;
        let congestionLevel = "LOW";
        if (delayMins > 12) congestionLevel = "HEAVY";
        else if (delayMins > 5) congestionLevel = "MODERATE";

        const avgSpeed = r.travel_time_mins > 0 ? Math.round(r.distance_km / (r.travel_time_mins / 60)) : 30;
        const segments = (r.streets || []).slice(0, 4).map((s, i, arr) => {
          const nextOffset = arr[i + 1]?.offset_m ?? r.distance_km * 1000;
          return {
            segment_name: s.name,
            distance_km: parseFloat(Math.max(0.1, (nextOffset - s.offset_m) / 1000).toFixed(1)),
            avg_speed_kmh: avgSpeed,
            congestion_level: congestionLevel,
          };
        });

        const via = r.streets?.[0]?.name || 'Main Corridor';
        return {
          route_id: `ROUTE_LIVE_0${index + 1}`,
          title: index === 0 ? `Fastest Live-Traffic Route (via ${via})` : `Live Alternative ${index} (via ${via})`,
          distance_km: r.distance_km,
          est_travel_time_mins: r.travel_time_mins,
          delay_time_mins: delayMins,
          congestion_level: congestionLevel,
          fuel_efficiency_score: parseFloat(Math.max(1, 10 - delayMins * 0.3).toFixed(1)),
          co2_saved_kg: parseFloat((r.distance_km * 0.08).toFixed(1)),
          is_recommended: index === 0,
          path_coords: r.path_coords,
          segments,
        };
      });
    }

    if (!formattedRoutes) {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson&alternatives=true&steps=true`;
      const osrmData = await fetchJson(osrmUrl);

      if (!osrmData.routes || osrmData.routes.length === 0) {
        return res.status(404).json({ error: "No drivable road route found between selected points" });
      }

      // Peak-hour delay heuristic (no live traffic source available)
      const nowHour = new Date().getHours();
      const isPeakHour = (nowHour >= 8 && nowHour <= 11) || (nowHour >= 17 && nowHour <= 20);

      formattedRoutes = osrmData.routes.map((r, index) => {
        const distKm = parseFloat((r.distance / 1000).toFixed(1));
        const baseMins = Math.round(r.duration / 60);

        const delayFactor = isPeakHour ? (index === 0 ? 0.35 : 0.15) : 0.08;
        const delayMins = Math.round(baseMins * delayFactor);
        const totalMins = baseMins + delayMins;

        let congestionLevel = "LOW";
        if (delayMins > 12) congestionLevel = "HEAVY";
        else if (delayMins > 5) congestionLevel = "MODERATE";

        const ecoScore = (10 - (delayMins * 0.3)).toFixed(1);
        const co2Saved = (distKm * 0.08).toFixed(1);

        // Convert GeoJSON [lon, lat] coordinates to Leaflet [lat, lon] coordinates
        const pathCoords = (r.geometry?.coordinates || []).map(pt => [pt[1], pt[0]]);

        return {
          route_id: `ROUTE_REAL_0${index + 1}`,
          title: index === 0 ? `Primary Route (via ${r.legs[0]?.summary || 'Main Highway'})` : `AI Recommended Bypass (via ${r.legs[0]?.summary || 'Alternate Arterial'})`,
          distance_km: distKm,
          est_travel_time_mins: totalMins,
          delay_time_mins: delayMins,
          congestion_level: congestionLevel,
          fuel_efficiency_score: parseFloat(ecoScore),
          co2_saved_kg: parseFloat(co2Saved),
          is_recommended: index === 0,
          path_coords: pathCoords,
          segments: (r.legs[0]?.steps || []).slice(0, 4).map(step => ({
            segment_name: step.name || "Connecting Expressway Segment",
            distance_km: parseFloat((step.distance / 1000).toFixed(1)),
            avg_speed_kmh: Math.round((step.distance / step.duration) * 3.6) || 35,
            congestion_level: congestionLevel
          }))
        };
      });
    }

    // 4. AI Incident-Aware Rerouting: apply real delay penalties from any
    // active operator-logged alert whose location matches this route's
    // roads, then re-pick the recommended route by lowest resulting ETA.
    // Alerts live in Postgres now; if the DB is briefly unreachable we still
    // return routes, just without incident penalties.
    const activeAlerts = await alertsStore.getActiveAlerts().catch(err => {
      console.warn('Could not load active alerts for rerouting:', err.message);
      return [];
    });
    for (const route of formattedRoutes) {
      const matchedAlert = activeAlerts.find(alert =>
        routeMatchesAlert(route, orig.display_name, dest.display_name, alert)
      );
      if (matchedAlert) {
        route.delay_time_mins += matchedAlert.estimated_delay_mins;
        route.est_travel_time_mins += matchedAlert.estimated_delay_mins;
        route.congestion_level = CONGESTION_ESCALATION[route.congestion_level];
        route.affected_by_incident = {
          alert_id: matchedAlert.alert_id,
          title: matchedAlert.title,
          added_delay_mins: matchedAlert.estimated_delay_mins,
        };
      }
    }
    const fastest = formattedRoutes.reduce((best, r) =>
      r.est_travel_time_mins < best.est_travel_time_mins ? r : best
    , formattedRoutes[0]);
    formattedRoutes.forEach(r => { r.is_recommended = (r === fastest); });

    res.json({
      origin: orig.display_name,
      destination: dest.display_name,
      origin_coords: { lat: parseFloat(orig.lat), lon: parseFloat(orig.lon) },
      destination_coords: { lat: parseFloat(dest.lat), lon: parseFloat(dest.lon) },
      calculated_at: new Date().toISOString(),
      active_incidents_considered: activeAlerts.length,
      routing_engine: routingEngine,
      routes: formattedRoutes
    });

  } catch (err) {
    console.error('Real routing error:', err);
    res.status(500).json({ error: "Failed to fetch real-time route data", details: err.message });
  }
});

// POST /routes/departure-forecast  { origin, destination }
// "Best time to leave": ETA for departing now and each of the next 5 hours.
// If the route passes through a corridor the GBDT model knows, the forecast
// uses real model predictions from the FastAPI AI engine; otherwise (or if
// the engine is down) it falls back to the peak-hour heuristic.
router.post('/routes/departure-forecast', async (req, res) => {
  const originQuery = (req.body?.origin || "Central Silk Board").trim();
  const destinationQuery = (req.body?.destination || "Manyata Tech Park").trim();

  try {
    const originGeocode = await fetchJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(originQuery)}`);
    const destGeocode = await fetchJson(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destinationQuery)}`);
    if (!originGeocode?.length) return res.status(400).json({ error: `Could not locate origin: "${originQuery}"` });
    if (!destGeocode?.length) return res.status(400).json({ error: `Could not locate destination: "${destinationQuery}"` });

    const orig = originGeocode[0];
    const dest = destGeocode[0];
    const osrmData = await fetchJson(
      `https://router.project-osrm.org/route/v1/driving/${orig.lon},${orig.lat};${dest.lon},${dest.lat}?overview=false&steps=true`
    );
    if (!osrmData.routes?.length) return res.status(404).json({ error: "No drivable road route found between selected points" });

    const route = osrmData.routes[0];
    const baseMins = Math.round(route.duration / 60);
    const distKm = parseFloat((route.distance / 1000).toFixed(1));

    // Match the route against a modelled corridor by place-name keywords
    const haystack = [
      orig.display_name, dest.display_name,
      route.legs[0]?.summary || '',
      ...(route.legs[0]?.steps || []).map(s => s.name || ''),
    ].join(' ').toLowerCase();
    const corridor = CORRIDOR_KEYWORDS.find(c => c.keywords.some(kw => haystack.includes(kw)));

    const now = new Date();
    const offsets = [0, 1, 2, 3, 4, 5];
    let modelUsed = 'peak-heuristic';
    let delaysByOffset = null;
    let effectiveBaseMins = baseMins;

    // Best source: TomTom departAt — real historical+live traffic per hour.
    // Requests are SEQUENTIAL with a small gap: the free tier allows ~5
    // queries/second, so a parallel burst of 6 gets 429-throttled.
    if (tomtom.isConfigured()) {
      try {
        const results = [];
        for (const offset of offsets) {
          const departAt = new Date(now.getTime() + Math.max(offset * 3600 * 1000, 90 * 1000));
          const r = await tomtom.calculateRoute(
            parseFloat(orig.lat), parseFloat(orig.lon), parseFloat(dest.lat), parseFloat(dest.lon),
            { alternatives: 0, departAt }
          );
          results.push(r);
          if (offset !== offsets[offsets.length - 1]) {
            await new Promise(resolve => setTimeout(resolve, 250));
          }
        }
        if (results.every(r => r?.routes?.length)) {
          effectiveBaseMins = results[0].routes[0].no_traffic_time_mins;
          delaysByOffset = results.map(r => Math.max(0, r.routes[0].travel_time_mins - effectiveBaseMins));
          modelUsed = 'tomtom';
        }
      } catch (err) {
        console.warn('Departure forecast: TomTom unavailable, trying GBDT:', err.message);
      }
    }

    // Next: GBDT model predictions for each departure hour
    if (!delaysByOffset && corridor) {
      try {
        const predictions = await Promise.all(offsets.map(async (offset) => {
          const hour = (now.getHours() + offset) % 24;
          const upstream = await fetch(`${AI_ENGINE_URL}/api/v1/traffic/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ corridor_id: corridor.corridor_id, hour }),
          });
          if (!upstream.ok) throw new Error(`AI engine ${upstream.status}`);
          const data = await upstream.json();
          return data.forecast_timeline?.[0]?.predicted_speed_kmh;
        }));
        if (predictions.every(p => typeof p === 'number' && p > 0)) {
          delaysByOffset = predictions.map(speed => {
            // Slower predicted corridor speed => proportionally longer trip
            const factor = Math.min(3.0, Math.max(1.0, corridor.normal_speed / speed));
            return Math.min(baseMins, Math.round(baseMins * (factor - 1)));
          });
          modelUsed = 'gbdt';
        }
      } catch (err) {
        console.warn('Departure forecast: AI engine unavailable, using heuristic:', err.message);
      }
    }

    if (!delaysByOffset) {
      delaysByOffset = offsets.map(offset => {
        const hour = (now.getHours() + offset) % 24;
        const isPeak = (hour >= 8 && hour <= 11) || (hour >= 17 && hour <= 20);
        return Math.round(baseMins * (isPeak ? 0.35 : 0.08));
      });
    }

    // Currently-active incidents on this route add delay to the next ~2 hours
    const activeAlerts = await alertsStore.getActiveAlerts().catch(() => []);
    const pseudoRoute = { title: route.legs[0]?.summary || '', segments: (route.legs[0]?.steps || []).slice(0, 8).map(s => ({ segment_name: s.name || '' })) };
    const matchedAlert = activeAlerts.find(a => routeMatchesAlert(pseudoRoute, orig.display_name, dest.display_name, a));

    const forecast = offsets.map((offset, i) => {
      const departAt = new Date(now.getTime() + offset * 3600 * 1000);
      const incidentDelay = matchedAlert && offset <= 1 ? matchedAlert.estimated_delay_mins : 0;
      const delayMins = delaysByOffset[i] + incidentDelay;
      const etaMins = effectiveBaseMins + delayMins;
      const ratio = delayMins / effectiveBaseMins;
      const congestion = ratio > 0.45 ? 'SEVERE' : ratio > 0.25 ? 'HEAVY' : ratio > 0.1 ? 'MODERATE' : 'LOW';
      return {
        offset_hours: offset,
        depart_label: offset === 0 ? 'Now' : departAt.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
        eta_mins: etaMins,
        delay_mins: delayMins,
        congestion,
        incident_delay_mins: incidentDelay || undefined,
      };
    });

    const recommended = forecast.reduce((best, f) => (f.eta_mins < best.eta_mins ? f : best), forecast[0]);

    res.json({
      origin: orig.display_name,
      destination: dest.display_name,
      distance_km: distKm,
      base_eta_mins: effectiveBaseMins,
      model_used: modelUsed,
      matched_corridor: corridor?.corridor || null,
      active_incident: matchedAlert ? { title: matchedAlert.title, delay_mins: matchedAlert.estimated_delay_mins } : null,
      forecast,
      recommended: {
        depart_label: recommended.depart_label,
        eta_mins: recommended.eta_mins,
        saves_mins_vs_now: forecast[0].eta_mins - recommended.eta_mins,
      },
    });
  } catch (err) {
    console.error('Departure forecast error:', err);
    res.status(500).json({ error: 'Failed to compute departure forecast', details: err.message });
  }
});

module.exports = router;
