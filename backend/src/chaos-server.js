// chaos-server.js
// A controllable fake server for testing your uptime monitor's behavior.
// Run with: node chaos-server.js
import express from 'express';

const app = express();
const PORT = 4000;

// Mutable state you can flip via requests below
let state = {
  isHealthy: true,
  delayMs: 0,
  forcedStatusCode: null,
};

// This is the endpoint your Monitor's `url` should point to
app.get('/health', async (req, res) => {
  if (state.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, state.delayMs));
  }

  if (state.forcedStatusCode) {
    return res.status(state.forcedStatusCode).send('Forced status code');
  }

  if (!state.isHealthy) {
    return res.status(500).send('Service is down');
  }

  res.status(200).send('OK');
});

// Control endpoints — hit these to change behavior on demand

app.post('/control/down', (req, res) => {
  state.isHealthy = false;
  console.log('🔴 Chaos server set to DOWN');
  res.send({ status: 'down' });
});

app.post('/control/up', (req, res) => {
  state.isHealthy = true;
  state.forcedStatusCode = null;
  state.delayMs = 0;
  console.log('✅ Chaos server set to UP');
  res.send({ status: 'up' });
});

app.post('/control/status/:code', (req, res) => {
  state.forcedStatusCode = parseInt(req.params.code, 10);
  console.log(`⚠️  Chaos server forcing status code ${state.forcedStatusCode}`);
  res.send({ forcedStatusCode: state.forcedStatusCode });
});

app.post('/control/delay/:ms', (req, res) => {
  state.delayMs = parseInt(req.params.ms, 10);
  console.log(`🐢 Chaos server delay set to ${state.delayMs}ms`);
  res.send({ delayMs: state.delayMs });
});

app.post('/control/timeout', (req, res) => {
  state.delayMs = 15000; // longer than your worker's 10s timeout
  console.log('⏱️  Chaos server set to hang (simulates timeout)');
  res.send({ status: 'will hang for 15s' });
});

app.listen(PORT, () => {
  console.log(`Chaos server running at http://localhost:${PORT}`);
  console.log(`Point a Monitor's url to: http://localhost:${PORT}/health`);
});