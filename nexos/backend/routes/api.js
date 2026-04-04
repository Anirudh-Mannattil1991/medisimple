const express = require('express');
const router  = express.Router();
const { simulate, compareAll, recommend } = require('../engine/scheduler');

// POST /api/simulate
// Body: { processes, algo, quantum }
router.post('/simulate', (req, res) => {
  const { processes, algo, quantum = 4 } = req.body;
  if (!Array.isArray(processes) || !processes.length)
    return res.status(400).json({ error: 'processes array is required' });
  if (!algo)
    return res.status(400).json({ error: 'algo is required' });

  const result = simulate(processes, algo, quantum);
  if (!result) return res.status(422).json({ error: 'Simulation produced no results' });
  res.json(result);
});

// POST /api/compare
// Body: { processes, algos?, quantum }
router.post('/compare', (req, res) => {
  const { processes, algos, quantum = 4 } = req.body;
  if (!Array.isArray(processes) || !processes.length)
    return res.status(400).json({ error: 'processes array is required' });

  let results = compareAll(processes, quantum);
  if (algos && Array.isArray(algos)) {
    results = results.filter(r => algos.includes(r.algo));
  }
  res.json(results);
});

// POST /api/recommend
// Body: { processes }
router.post('/recommend', (req, res) => {
  const { processes } = req.body;
  if (!Array.isArray(processes) || !processes.length)
    return res.status(400).json({ error: 'processes array is required' });
  res.json(recommend(processes));
});

module.exports = router;
