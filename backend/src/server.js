const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const trafficRoutes = require('./routes/traffic');
const predictionRoutes = require('./routes/prediction');
const routeOptRoutes = require('./routes/routes');
const alertsRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 2001;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1', healthRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', trafficRoutes);
app.use('/api/v1', predictionRoutes);
app.use('/api/v1', routeOptRoutes);
app.use('/api/v1', alertsRoutes);
app.use('/api/v1', analyticsRoutes);




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
