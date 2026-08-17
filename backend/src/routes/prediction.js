const express = require('express');
const router = express.Router();

// The real AI inference lives in the Python FastAPI service (trained
// GradientBoostingRegressor loaded from backend/app/ml/bengaluru_gbdt_model.joblib).
// This gateway just proxies to it so the frontend keeps a single API origin.
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:8000';

router.get('/traffic/predictions', async (req, res) => {
  try {
    const qs = req.query.rain ? `?rain=${encodeURIComponent(req.query.rain)}` : '';
    const upstream = await fetch(`${AI_ENGINE_URL}/api/v1/traffic/predictions${qs}`);
    if (!upstream.ok) {
      throw new Error(`AI engine responded with ${upstream.status}`);
    }
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    console.error('Could not reach Python AI inference engine:', err.message);
    res.status(503).json({
      error: 'AI prediction engine unavailable',
      detail: 'Start the FastAPI service (uvicorn app.main:app --port 8000) to serve live predictions.',
    });
  }
});

router.post('/traffic/predict', async (req, res) => {
  try {
    const upstream = await fetch(`${AI_ENGINE_URL}/api/v1/traffic/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Could not reach Python AI inference engine:', err.message);
    res.status(503).json({
      error: 'AI prediction engine unavailable',
      detail: 'Start the FastAPI service (uvicorn app.main:app --port 8000) to serve live predictions.',
    });
  }
});

module.exports = router;
