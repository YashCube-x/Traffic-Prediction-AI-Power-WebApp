// Admin "control room" — live health of every service this platform
// depends on: the database, the Python AI engine, TomTom live traffic,
// and outbound email. Every check is independent and time-bounded so one
// slow/dead dependency can't hang the whole health check.
const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, requireRoles } = require('../middleware/auth');
const tomtom = require('../tomtom');
const { SMTP_CONFIGURED } = require('../mailer');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';

async function timed(fn) {
  const start = Date.now();
  try {
    const result = await fn();
    return { ok: true, latency_ms: Date.now() - start, ...result };
  } catch (err) {
    return { ok: false, latency_ms: Date.now() - start, error: err.message };
  }
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

router.get('/system/health', verifyToken, requireRoles(['ADMIN']), async (req, res) => {
  const [database, aiEngine] = await Promise.all([
    timed(async () => {
      const { rows } = await withTimeout(pool.query('SELECT 1 AS ok'), 5000);
      return { detail: rows[0]?.ok === 1 ? 'Connected' : 'Unexpected response' };
    }),
    timed(async () => {
      const r = await withTimeout(fetch(`${AI_ENGINE_URL}/api/v1/health`), 4000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return { detail: 'Reachable' };
    }),
  ]);

  const tomtomStatus = tomtom.isConfigured()
    ? { ok: true, detail: 'Configured', ...tomtom.getUsageStats() }
    : { ok: false, detail: 'No TOMTOM_API_KEY set — using simulated/OSRM fallback' };

  const smtpStatus = SMTP_CONFIGURED
    ? { ok: true, detail: 'Configured — real emails sending' }
    : { ok: false, detail: 'Not configured — reset links print to console (dev mode)' };

  // The database is load-bearing (auth, alerts, everything) — if it's down
  // the platform is CRITICAL. The AI engine degrades gracefully (routing
  // falls back to TomTom/OSRM), so its absence is only DEGRADED.
  const overallStatus = !database.ok ? 'CRITICAL' : !aiEngine.ok ? 'DEGRADED' : 'HEALTHY';

  res.json({
    overall_status: overallStatus,
    checked_at: new Date().toISOString(),
    services: {
      database: { name: 'Neon PostgreSQL', ...database },
      ai_engine: { name: 'FastAPI GBDT Model', ...aiEngine, note: aiEngine.ok ? undefined : 'Predictions fall back to a live-traffic/heuristic estimate' },
      tomtom: { name: 'TomTom Live Traffic', ...tomtomStatus },
      smtp: { name: 'Email (Password Reset)', ...smtpStatus },
    },
    process: {
      node_version: process.version,
      uptime_seconds: Math.round(process.uptime()),
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
  });
});

module.exports = router;
