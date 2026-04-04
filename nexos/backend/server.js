const express = require('express');
const cors    = require('cors');
const path    = require('path');
const api     = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ─────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ─────────────────────────────────────────────
app.use('/api', api);

// ── Health check ───────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ── Serve frontend (when deployed together) ────────────────
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));

app.listen(PORT, () => {
  console.log(`\n  NexOS Backend running at http://localhost:${PORT}`);
  console.log(`  API:    http://localhost:${PORT}/api`);
  console.log(`  Health: http://localhost:${PORT}/health\n`);
});
