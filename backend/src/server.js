const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');
const predictionRoutes = require('./routes/prediction');
const routeOptRoutes = require('./routes/routes');
const alertsRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');
const usersRoutes = require('./routes/users');
const { router: eventsRouter } = require('./events');
const reportsRoutes = require('./routes/reports');
const commuteRoutes = require('./routes/commute');
const noticesRoutes = require('./routes/notices');
const statsRoutes = require('./routes/stats');
const safetyRoutes = require('./routes/safety');
const placesRoutes = require('./routes/places');
const systemRoutes = require('./routes/system');
const settingsRoutes = require('./routes/settings');
const helplinesRoutes = require('./routes/helplines');

const app = express();
const PORT = process.env.PORT || 2001;

// In production, restrict cross-origin requests to the deployed frontend
// (set FRONTEND_URL, e.g. https://your-app.vercel.app). Left wide open
// outside production so local dev on any port keeps working unchanged —
// FRONTEND_URL is already used for password-reset email links locally and
// isn't necessarily the same origin you're testing the frontend from.
const isProd = process.env.NODE_ENV === 'production';
app.use(cors(isProd && process.env.FRONTEND_URL ? { origin: process.env.FRONTEND_URL } : {}));
// Raised from the 100kb default so registration's base64-encoded Aadhaar
// photo (sent as a JSON string, no multipart/multer setup in this API) fits.
app.use(express.json({ limit: '6mb' }));

// API Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', trafficRoutes);
app.use('/api/v1', predictionRoutes);
app.use('/api/v1', routeOptRoutes);
app.use('/api/v1', alertsRoutes);
app.use('/api/v1', analyticsRoutes);
app.use('/api/v1', usersRoutes);
app.use('/api/v1', eventsRouter);
app.use('/api/v1', reportsRoutes);
app.use('/api/v1', commuteRoutes);
app.use('/api/v1', noticesRoutes);
app.use('/api/v1', statsRoutes);
app.use('/api/v1', safetyRoutes);
app.use('/api/v1', placesRoutes);
app.use('/api/v1', systemRoutes);
app.use('/api/v1', settingsRoutes);
app.use('/api/v1', helplinesRoutes);




app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to TrafficVision AI Node.js Express Backend API Gateway',
    health_check: '/api/v1/health',
    traffic_status: '/api/v1/traffic/status'
  });
});

app.listen(PORT, () => {
  console.log(`[TrafficVision AI] Node.js Express server running on port ${PORT}`);
});
