// Server-Sent Events (SSE) broadcaster for live updates.
//
// Clients subscribe to GET /api/v1/events; when an incident is logged or
// resolved every connected browser gets a signal and refetches through the
// normal authenticated endpoints. Only the event TYPE is broadcast (no alert
// payload) so zone-scoping can never leak: each client refetches via
// GET /alerts, which filters by that client's own token.
const express = require('express');
const router = express.Router();

const clients = new Set();

router.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');

  clients.add(res);
  req.on('close', () => clients.delete(res));
});

// Keep intermediary proxies from dropping idle connections
setInterval(() => {
  for (const res of clients) res.write(': heartbeat\n\n');
}, 25000).unref();

function broadcast(eventType, data = {}) {
  const frame = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try {
      res.write(frame);
    } catch {
      clients.delete(res);
    }
  }
}

module.exports = { router, broadcast };
