# NexOS — CPU Scheduler Simulator

A full-featured, interactive CPU process scheduling simulator built for the **Rebuilding the OS: Core System Utilities Hackathon**.

![NexOS Screenshot](https://img.shields.io/badge/NexOS-CPU%20Scheduler-22d3a0?style=for-the-badge&logoColor=white)
![Algorithms](https://img.shields.io/badge/Algorithms-6-8b6fff?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-f0a732?style=flat-square)

---

## Features

- **6 Scheduling Algorithms** — FCFS, SJF, SRTF, Round Robin, Priority, MLFQ
- **Live Gantt Chart** — builds tick-by-tick with colour-coded process bars
- **Side-by-Side Algorithm Comparison** — overlaid Gantt charts, ranked metrics table
- **Tradeoff Visualizer** — scatter plot (Wait vs TAT), radar chart (Throughput vs Fairness)
- **What-If Simulator** — adjust Round Robin quantum and see live impact on metrics
- **ML Advisor** — explainable AI that recommends the best algorithm for your workload
- **Step-by-Step Mode** — pause at each tick with a plain-English explanation of the scheduling decision
- **Experiment History** — save, tag, annotate, and reload past simulation runs
- **Learn Tab** — full algorithm explainer with guided edge-case scenarios
- **I/O Burst Simulation** — realistic I/O wait cycles
- **Starvation Detection** — automatic red-flag banner when processes wait too long
- **Deadline Tracking** — flag processes that miss their deadline
- **6 Presets** — Basic, CPU Heavy, I/O Bound, Stress Test, Starvation, Convoy Effect

---

## Project Structure

```
nexos/
├── frontend/                   # Static web app (no build step required)
│   ├── index.html              # Main HTML — all pages
│   ├── css/
│   │   └── style.css           # Design system & all component styles
│   └── js/
│       ├── main.js             # App logic, UI rendering, state management
│       └── scheduler.js        # Scheduling engine (browser ES module)
│
├── backend/                    # Node.js REST API (optional)
│   ├── server.js               # Express entry point
│   ├── package.json
│   ├── engine/
│   │   └── scheduler.js        # Scheduling engine (Node.js module)
│   └── routes/
│       └── api.js              # REST endpoints
│
└── README.md
```

---

## Running the Frontend (Standalone — No Backend Needed)

The frontend runs entirely in the browser with no build step.

```bash
# Option 1: Open directly
open frontend/index.html

# Option 2: Serve with any static server
npx serve frontend
# or
python3 -m http.server 8080 --directory frontend
```

Then open `http://localhost:8080` in your browser.

---

## Running the Backend (Optional)

The backend exposes the same scheduling engine as a REST API — useful if you want to extend NexOS with server-side processing, logging, or integrate it into another app.

```bash
cd backend
npm install
npm run dev       # development (nodemon)
npm start         # production
```

The backend runs on `http://localhost:3001`.

### API Endpoints

| Method | Path | Body | Description |
|--------|------|------|-------------|
| `POST` | `/api/simulate` | `{ processes, algo, quantum }` | Run one algorithm |
| `POST` | `/api/compare` | `{ processes, algos?, quantum }` | Compare multiple algorithms |
| `POST` | `/api/recommend` | `{ processes }` | Get ML algorithm recommendation |
| `GET`  | `/health` | — | Health check |

#### Example: Simulate FCFS

```bash
curl -X POST http://localhost:3001/api/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "processes": [
      {"pid":1,"name":"P1","arrival":0,"burst":8,"priority":1,"io":0,"deadline":0,"color":"#22d3a0"},
      {"pid":2,"name":"P2","arrival":2,"burst":4,"priority":2,"io":0,"deadline":0,"color":"#f0516a"}
    ],
    "algo": "fcfs",
    "quantum": 4
  }'
```

#### Response

```json
{
  "algo": "fcfs",
  "avgTAT": 9.0,
  "avgWT": 3.0,
  "avgRT": 3.0,
  "util": 100,
  "throughput": 16.67,
  "contextSwitches": 1,
  "fairnessIndex": 0.67,
  "ganttLog": [...],
  "processStats": [...],
  "totalTime": 12
}
```

---

## Connecting Frontend to Backend

By default the frontend runs all computation in the browser (no API calls). To switch to server-side computation, edit `frontend/js/main.js` line 8:

```js
// Change from:
const API_BASE = null;

// To:
const API_BASE = 'http://localhost:3001';
```

---

## Pushing to GitHub

### First time

```bash
# 1. Create a new repo on GitHub (github.com/new), then:

git init
git add .
git commit -m "feat: initial NexOS CPU Scheduler Simulator"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nexos-scheduler.git
git push -u origin main
```

### Subsequent pushes

```bash
git add .
git commit -m "feat: describe your change here"
git push
```

---

## Deploying the Frontend (Free)

**GitHub Pages** — instant, free, no server needed:

1. Push to GitHub (above)
2. Go to your repo → **Settings** → **Pages**
3. Set source to `main` branch, `/frontend` folder
4. Your app will be live at `https://YOUR_USERNAME.github.io/nexos-scheduler`

**Netlify** — drag-and-drop the `frontend/` folder at [netlify.com/drop](https://app.netlify.com/drop)

**Vercel** — `npx vercel --cwd frontend`

---

## Algorithms Implemented

| Algorithm | Type | Starvation | Best For |
|-----------|------|-----------|---------|
| FCFS | Non-preemptive | No | Batch, uniform jobs |
| SJF | Non-preemptive | Possible | Known burst times |
| SRTF | Preemptive | Possible | Minimum avg wait |
| Round Robin | Preemptive | No | Interactive systems |
| Priority | Optional preemptive | Likely | Real-time / deadline |
| MLFQ | Preemptive | Rare | General purpose OS |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML/CSS/JS (ES modules, no framework) |
| Charts | Chart.js |
| Fonts | JetBrains Mono, Syne, Inter |
| Backend | Node.js + Express |
| Storage | localStorage (experiment history) |

---

## License

MIT — free to use, modify, and distribute.
