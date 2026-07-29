const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'TrafficVision AI Core Express API',
    runtime: `Node.js ${process.version}`,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database_connections: {
      postgresql: 'configured',
      mongodb: 'configured',
      redis: 'configured'
    }
  });
});

module.exports = router;
