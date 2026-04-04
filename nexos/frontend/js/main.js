/**
 * NexOS Frontend — main.js
 * All simulation runs client-side (scheduler.js).
 * If a backend is running (API_BASE != null), API calls are used instead.
 */

import { simulate, compareAll, recommend } from './scheduler.js';

// ── Config ────────────────────────────────────────────────
// Set to your backend URL when running the server, e.g. 'http://localhost:3001'
// When null, all computation runs in the browser.
const API_BASE = null;

// ── State ─────────────────────────────────────────────────
const state = {
  processes:      [],
  selectedAlgo:   'fcfs',
  quantum:        4,
  simRunning:     false,
  simTime:        0,
  tick:           0,
  ganttLog:       [],
  simProcs:       [],
  simFinished:    [],
  contextSwitches:0,
  lastRunPid:     -99,
  simInterval:    null,
  stepMode:       false,
  compareResults: {},
  pidCounter:     1,
  colorIdx:       0,
  history:        JSON.parse(localStorage.getItem('nexos_history') || '[]'),
  scatterChart:   null,
  radarChart:     null,
  whatifBase:     { wt: 0, ctx: 0, util: 0 },
};

const COLORS = [
  '#22d3a0','#f0516a','#f0a732','#8b6fff','#3b9eff',
  '#ff9f43','#ee5a24','#9980fa','#1dd1a1','#fd79a8'
];
const ALGO_NAMES = { fcfs:'FCFS', sjf:'SJF', rr:'Round Robin', priority:'Priority', mlfq:'MLFQ', srtf:'SRTF' };

// ── Page routing ──────────────────────────────────────────
window.switchPage = function(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (el) el.classList.add('active');
  if (id === 'compare') updateCompareInfo();
  if (id === 'history') renderHistory();
  if (id === 'tradeoff') renderTradeoff();
};

window.switchLearn = function(id, el) {
  document.querySelectorAll('.learn-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.learn-nav-item').forEach(i => i.classList.remove('active'));
  document.getElementById('ls-' + id).classList.add('active');
  el.classList.add('active');
};

// ── Algorithm selection ───────────────────────────────────
window.selectAlgo = function(algo, btn) {
  state.selectedAlgo = algo;
  document.querySelectorAll('.algo-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const show = algo === 'rr' || algo === 'mlfq';
  document.getElementById('quantumRow').style.display = show ? 'flex' : 'none';
  document.getElementById('algoLabel').textContent = ALGO_NAMES[algo];
};

// ── Process management ────────────────────────────────────
window.addProcess = function(data) {
  const g  = id => document.getElementById(id);
  const name     = data ? data.name     : (g('pName').value.trim()   || `P${state.pidCounter}`);
  const arrival  = data ? data.arrival  : (parseInt(g('pArrival').value) || 0);
  const burst    = data ? data.burst    : (parseInt(g('pBurst').value)   || 8);
  const priority = data ? data.priority : (parseInt(g('pPriority').value)|| 1);
  const io       = data ? (data.io || 0): (parseInt(g('pIO').value)      || 0);
  const deadline = data ? (data.deadline||0) : (parseInt(g('pDeadline').value)||0);
  const color    = data ? data.color    : g('pColor').value;

  state.processes.push({ pid: state.pidCounter++, name, arrival, burst, priority, io, deadline, color });
  renderProcList();

  if (!data) {
    g('pName').value = '';
    g('pArrival').value = '0';
    g('pBurst').value  = '8';
    g('pPriority').value='1';
    g('pIO').value='0';
    g('pDeadline').value='0';
    g('pColor').value = COLORS[state.colorIdx % COLORS.length];
    state.colorIdx++;
  }
};

window.removeProcess = function(pid) {
  state.processes = state.processes.filter(p => p.pid !== pid);
  renderProcList();
};

function renderProcList() {
  const el = document.getElementById('procList');
  document.getElementById('procCount').textContent = state.processes.length;
  if (!state.processes.length) {
    el.innerHTML = `<div class="empty-state"><div class="ei">⬡</div>No processes yet</div>`;
    return;
  }
  el.innerHTML = state.processes.map(p => `
    <div class="proc-item" style="border-left-color:${p.color}">
      <div style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;"></div>
      <div class="proc-item-name">${p.name}</div>
      <div class="proc-item-meta">B:${p.burst} A:${p.arrival}${p.deadline?` D:${p.deadline}`:''}</div>
      <button class="btn btn-ghost btn-sm" onclick="removeProcess(${p.pid})" style="padding:2px 6px;">×</button>
    </div>`).join('');
}

// ── Presets ───────────────────────────────────────────────
const PRESETS = {
  basic:[
    {name:'P1',arrival:0,burst:8,priority:2,color:'#22d3a0'},
    {name:'P2',arrival:1,burst:4,priority:1,color:'#f0516a'},
    {name:'P3',arrival:2,burst:9,priority:3,color:'#f0a732'},
    {name:'P4',arrival:3,burst:5,priority:2,color:'#8b6fff'},
  ],
  heavy:[
    {name:'Compiler',arrival:0,burst:20,priority:3,color:'#22d3a0'},
    {name:'Linker',  arrival:2,burst:15,priority:2,color:'#f0516a'},
    {name:'Render',  arrival:5,burst:18,priority:1,color:'#f0a732'},
    {name:'Shader',  arrival:8,burst:12,priority:2,color:'#8b6fff'},
  ],
  io:[
    {name:'NetIO', arrival:0,burst:3,priority:1,io:60,color:'#3b9eff'},
    {name:'DiskRW',arrival:1,burst:5,priority:2,io:40,color:'#22d3a0'},
    {name:'DBConn',arrival:2,burst:4,priority:1,io:50,color:'#ff9f43'},
    {name:'Cache', arrival:3,burst:2,priority:3,io:30,color:'#9980fa'},
    {name:'Logger',arrival:4,burst:3,priority:1,io:40,color:'#1dd1a1'},
  ],
  stress:[
    {name:'S1',arrival:0, burst:10,priority:3,color:'#22d3a0'},
    {name:'S2',arrival:1, burst:6, priority:1,color:'#f0516a'},
    {name:'S3',arrival:2, burst:14,priority:4,color:'#f0a732'},
    {name:'S4',arrival:3, burst:8, priority:2,color:'#8b6fff'},
    {name:'S5',arrival:4, burst:5, priority:5,color:'#3b9eff'},
    {name:'S6',arrival:5, burst:12,priority:1,color:'#ff9f43'},
    {name:'S7',arrival:7, burst:7, priority:3,color:'#9980fa'},
    {name:'S8',arrival:10,burst:9, priority:2,color:'#1dd1a1'},
  ],
  starvation:[
    {name:'HiA',  arrival:0,burst:15,priority:1,color:'#f0516a'},
    {name:'HiB',  arrival:3,burst:12,priority:1,color:'#f0a732'},
    {name:'LoPri',arrival:1,burst:8, priority:5,color:'#8b6fff'},
    {name:'HiC',  arrival:8,burst:10,priority:1,color:'#22d3a0'},
  ],
  convoy:[
    {name:'Giant',arrival:0,burst:24,priority:2,color:'#f0516a'},
    {name:'Fast1',arrival:1,burst:2, priority:2,color:'#22d3a0'},
    {name:'Fast2',arrival:2,burst:3, priority:2,color:'#f0a732'},
    {name:'Fast3',arrival:3,burst:2, priority:2,color:'#8b6fff'},
  ],
};

window.loadPreset = function(name) {
  state.processes = []; state.pidCounter = 1; state.colorIdx = 0;
  (PRESETS[name] || PRESETS.basic).forEach(p => addProcess(p));
  resetSim();
};

window.loadScenario = function(name) {
  loadPreset(name);
  switchPage('sim', document.querySelectorAll('.nav-tab')[0]);
};

// ── Simulation control ────────────────────────────────────
window.toggleRun = function() { state.simRunning ? pauseSim() : startSim(); };

window.doStep = function() {
  if (state.simTime === 0) initSim();
  simStep();
};

function initSim() {
  state.ganttLog = []; state.simFinished = []; state.simTime = 0;
  state.tick = 0; state.contextSwitches = 0; state.lastRunPid = -99;
  state.simProcs = state.processes.map(p => ({
    ...p, remaining: p.burst, state: 'waiting',
    startTime: -1, finishTime: -1, responseTime: -1,
    waitTime: 0, queueLevel: 0, quantumUsed: 0,
    isInIO: false, ioTimer: 0, missedDeadline: false,
  }));
}

function startSim() {
  if (!state.processes.length) return;
  if (state.simTime === 0) initSim();
  state.simRunning = true;
  const runBtn = document.getElementById('runBtn');
  runBtn.textContent = '⏸ Pause';
  runBtn.classList.replace('btn-primary', 'btn-ghost');
  setNavStatus('RUNNING', true);
  const speed = 11 - parseInt(document.getElementById('speedSlider').value);
  state.simInterval = setInterval(simStep, speed * 45);
}

function pauseSim() {
  state.simRunning = false;
  clearInterval(state.simInterval);
  const runBtn = document.getElementById('runBtn');
  runBtn.textContent = '▶ Run';
  runBtn.classList.replace('btn-ghost', 'btn-primary');
  setNavStatus('PAUSED', false);
}

window.resetSim = function() {
  pauseSim();
  Object.assign(state, { simTime:0, tick:0, contextSwitches:0, lastRunPid:-99,
    ganttLog:[], simFinished:[], simProcs:[] });
  setNavStatus('IDLE', false);
  document.getElementById('runBtn').textContent = '▶ Run';
  document.getElementById('tickDisp').textContent = '0';
  document.getElementById('navTick').textContent  = '0';
  renderGantt(); renderStateCards([]); renderStatsTable([]);
  clearMetrics();
  document.getElementById('mlPanel').style.display = 'none';
  document.getElementById('stepBox').style.display  = 'none';
  document.getElementById('starveWarn').style.display = 'none';
};

function setNavStatus(txt, live) {
  document.getElementById('navStatus').textContent = txt;
  const dot = document.getElementById('navDot');
  dot.className = 'dot' + (live ? ' live' : '');
}

// ── Simulation tick ───────────────────────────────────────
function simStep() {
  const procs = state.simProcs;
  const quantum = parseInt(document.getElementById('quantumInput').value) || 4;

  // Handle I/O
  procs.forEach(p => {
    if (p.isInIO) { p.ioTimer--; if (p.ioTimer <= 0) { p.isInIO = false; p.state = 'ready'; } }
  });

  // Arrive
  procs.forEach(p => { if (p.state === 'waiting' && p.arrival <= state.simTime) p.state = 'ready'; });

  if (procs.every(p => p.state === 'done')) {
    pauseSim(); setNavStatus('COMPLETE', false);
    computeMetrics(); showML(); renderStatsTable(procs); return;
  }

  const ready = procs.filter(p => p.state === 'ready' || p.state === 'running');
  let running = null;
  const algo = state.selectedAlgo;

  if (algo === 'fcfs') {
    running = ready.sort((a,b) => a.arrival - b.arrival)[0] || null;
  } else if (algo === 'sjf') {
    const cur = procs.find(p => p.state === 'running');
    running = cur || ready.sort((a,b) => a.remaining - b.remaining)[0] || null;
  } else if (algo === 'srtf') {
    running = ready.sort((a,b) => a.remaining - b.remaining)[0] || null;
  } else if (algo === 'priority') {
    const cur = procs.find(p => p.state === 'running');
    running = cur || ready.sort((a,b) => a.priority - b.priority)[0] || null;
  } else if (algo === 'rr') {
    const cur = procs.find(p => p.state === 'running');
    if (cur) {
      cur.quantumUsed++;
      if (cur.quantumUsed >= quantum) { cur.state='ready'; cur.quantumUsed=0; running=procs.filter(p=>p.state==='ready')[0]||null; }
      else running = cur;
    } else running = ready[0] || null;
  } else if (algo === 'mlfq') {
    const cur = procs.find(p => p.state === 'running');
    const q = Math.min(quantum * Math.pow(2, cur ? cur.queueLevel : 0), 16);
    if (cur) {
      cur.quantumUsed++;
      if (cur.quantumUsed >= q) { cur.queueLevel=Math.min(cur.queueLevel+1,2); cur.state='ready'; cur.quantumUsed=0; }
      else running = cur;
    }
    if (!running) {
      for (let lv=0; lv<=2; lv++) { const r=procs.filter(p=>p.state==='ready'&&p.queueLevel===lv); if(r.length){running=r[0];break;} }
    }
  }

  // Context switches
  if (running && running.pid !== state.lastRunPid && state.lastRunPid !== -99) state.contextSwitches++;
  state.lastRunPid = running ? running.pid : -99;
  procs.forEach(p => { if (p.state==='running' && p!==running) p.state='ready'; });

  if (running) {
    if (running.startTime === -1)    running.startTime    = state.simTime;
    if (running.responseTime === -1) running.responseTime = state.simTime - running.arrival;
    running.state = 'running'; running.remaining--;

    // I/O burst chance
    if (running.remaining > 0 && running.io > 0 && Math.random()*100 < running.io * 0.05) {
      running.isInIO = true; running.state = 'io';
      running.ioTimer = Math.ceil(Math.random()*3)+1;
      state.lastRunPid = -99;
    }

    const last = state.ganttLog[state.ganttLog.length - 1];
    if (last && last.pid === running.pid) last.end = state.simTime + 1;
    else state.ganttLog.push({ pid: running.pid, name: running.name, color: running.color, start: state.simTime, end: state.simTime + 1 });

    if (running.remaining <= 0) {
      running.state = 'done'; running.finishTime = state.simTime + 1;
      if (running.deadline > 0 && running.finishTime > running.deadline) running.missedDeadline = true;
      state.simFinished.push(running);
    }
  } else {
    const last = state.ganttLog[state.ganttLog.length - 1];
    if (last && last.pid === -1) last.end = state.simTime + 1;
    else if (state.simTime > 0) state.ganttLog.push({ pid:-1, name:'IDLE', color:null, start:state.simTime, end:state.simTime+1 });
  }

  procs.forEach(p => { if (p.state === 'ready') p.waitTime++; });

  // Starvation detection
  const starved = procs.filter(p => p.state === 'ready' && p.waitTime > p.burst * 3);
  const sw = document.getElementById('starveWarn');
  if (starved.length) {
    document.getElementById('starveList').textContent = starved.map(p=>p.name).join(', ');
    sw.style.display = 'flex';
  } else sw.style.display = 'none';

  state.simTime++; state.tick++;
  document.getElementById('tickDisp').textContent = state.tick;
  document.getElementById('navTick').textContent  = state.tick;
  document.getElementById('mCtx').textContent = state.contextSwitches;

  renderGantt(); renderStateCards(procs);
  if (state.simFinished.length) renderStatsTable(procs);
  if (state.stepMode) showStepExplain(running);
}

// ── Render: Gantt ─────────────────────────────────────────
function renderGantt() {
  const track = document.getElementById('ganttTrack');
  const axis  = document.getElementById('ganttAxis');
  if (!state.ganttLog.length) { track.innerHTML = ''; axis.innerHTML = ''; return; }
  const total = state.ganttLog[state.ganttLog.length-1].end;
  if (!total) return;

  track.innerHTML = state.ganttLog.map(e => {
    const l = (e.start/total)*100, w = ((e.end-e.start)/total)*100;
    if (e.pid === -1) return `<div class="gantt-bar idle" style="left:${l}%;width:${w}%">${w>3?'IDLE':''}</div>`;
    return `<div class="gantt-bar" style="left:${l}%;width:${w}%;background:${e.color}">${w>4?e.name:''}</div>`;
  }).join('');

  const step = Math.ceil(total / Math.min(total,20));
  let ticks = '';
  for (let t=0; t<=total; t+=step) ticks += `<div class="tick" style="left:${(t/total)*100}%">${t}</div>`;
  axis.innerHTML = ticks;
}

// ── Render: State cards ───────────────────────────────────
function renderStateCards(procs) {
  const grid = document.getElementById('stateGrid');
  if (!procs.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">◈</div>Add processes and click Run</div>`;
    return;
  }
  grid.innerHTML = procs.map(p => {
    const s = p.isInIO ? 'io' : p.state;
    const label = p.isInIO ? 'I/O WAIT' : s.toUpperCase();
    const pct = Math.round(((p.burst - p.remaining) / p.burst) * 100);
    return `<div class="state-card s-${s}">
      <div class="sc-name" style="color:${p.color}">${p.name}</div>
      <div><span class="sc-badge ${s}">${label}</span></div>
      <div class="caption" style="font-family:var(--mono)">Rem: ${p.remaining}ms${p.deadline?` · DL:${p.deadline}`:''}${p.isInIO?` · IO:${p.ioTimer}`:''}</div>
      <div class="sc-prog-bg"><div class="sc-prog-fill" style="width:${pct}%;background:${p.color}"></div></div>
    </div>`;
  }).join('');
}

// ── Render: Stats table ───────────────────────────────────
function renderStatsTable(procs) {
  const body = document.getElementById('statsBody');
  const all  = procs.filter(p => p.startTime !== -1);
  if (!all.length) { body.innerHTML = `<tr><td colspan="10" class="empty-state">No data yet</td></tr>`; return; }
  body.innerHTML = all.map(p => {
    const tat = p.finishTime !== -1 ? p.finishTime - p.arrival : state.simTime - p.arrival;
    const ft  = p.finishTime !== -1 ? p.finishTime : '…';
    const rt  = p.responseTime !== -1 ? p.responseTime : '—';
    const missed = p.missedDeadline ? `<span style="margin-left:4px;padding:1px 5px;background:var(--red-dim);border:1px solid rgba(240,81,106,.3);color:var(--red);font-size:10px;">MISSED</span>` : '';
    const starved = p.waitTime > p.burst*3 ? `<span style="margin-left:4px;padding:1px 5px;background:var(--red-dim);border:1px solid rgba(240,81,106,.3);color:var(--red);font-size:10px;">STARVED</span>` : '';
    return `<tr>
      <td class="c-muted">${p.pid}</td>
      <td style="color:${p.color};font-weight:600">${p.name}${starved}</td>
      <td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td>
      <td>${p.deadline||'—'}</td>
      <td class="${p.finishTime!==-1?'c-green':''}">${ft}${missed}</td>
      <td class="c-green">${tat}</td>
      <td class="${p.waitTime>p.burst*1.5?'c-red':'c-amber'}">${p.waitTime}</td>
      <td>${rt}</td>
    </tr>`;
  }).join('');
}

// ── Metrics ───────────────────────────────────────────────
function computeMetrics() {
  const done = state.simFinished; if (!done.length) return;
  const avgTAT = done.reduce((s,p) => s+(p.finishTime-p.arrival),0)/done.length;
  const avgWT  = done.reduce((s,p) => s+p.waitTime,0)/done.length;
  const avgRT  = done.filter(p=>p.responseTime!==-1).reduce((s,p)=>s+p.responseTime,0)/done.length;
  const busy   = state.ganttLog.filter(g=>g.pid!==-1).reduce((s,g)=>s+(g.end-g.start),0);
  const util   = Math.round((busy/state.simTime)*100);
  const thru   = ((done.length/state.simTime)*100).toFixed(1);

  document.getElementById('mTAT').textContent  = avgTAT.toFixed(1);
  document.getElementById('mWT').textContent   = avgWT.toFixed(1);
  document.getElementById('mRT').textContent   = avgRT.toFixed(1);
  document.getElementById('mUtil').textContent = util + '%';
  document.getElementById('mThru').textContent = thru;
  document.getElementById('mCtx').textContent  = state.contextSwitches;
  state.whatifBase = { wt: avgWT, ctx: state.contextSwitches, util };
}

function clearMetrics() {
  ['mTAT','mWT','mRT','mUtil','mThru'].forEach(id => document.getElementById(id).textContent = '—');
  document.getElementById('mCtx').textContent = '0';
}

// ── ML advisor ────────────────────────────────────────────
function showML() {
  if (!state.processes.length) return;
  const rec = recommend(state.processes);
  const panel = document.getElementById('mlPanel');
  panel.style.display = 'block';
  const isBest = rec.algo === state.selectedAlgo;
  panel.innerHTML = `
    <span class="ml-tag">⬡ ML Advisor — Explainable Recommendation</span>
    <div class="ml-verdict">${isBest
      ? `✓ <strong style="color:var(--green)">${ALGO_NAMES[rec.algo]}</strong> is optimal for this workload.`
      : `Recommends <strong style="color:var(--green)">${ALGO_NAMES[rec.algo]}</strong> over ${ALGO_NAMES[state.selectedAlgo]}.`}
    </div>
    ${rec.reasons.map(r => `<div class="ml-reason">${r}</div>`).join('')}`;
}

// ── Step explainer ────────────────────────────────────────
function showStepExplain(running) {
  const box = document.getElementById('stepBox');
  box.style.display = 'block';
  if (!running) { box.textContent = `Tick ${state.simTime-1}: CPU IDLE — no processes in ready queue.`; return; }
  const reasons = { fcfs:'arrived first', sjf:'has shortest remaining time', srtf:'has shortest remaining time (preemptive)', priority:'has highest priority', rr:'is next in round-robin queue', mlfq:'is at highest queue level' };
  box.innerHTML = `<strong>Tick ${state.simTime-1} [${ALGO_NAMES[state.selectedAlgo]}]:</strong> Running <strong style="color:${running.color}">${running.name}</strong> — ${reasons[state.selectedAlgo] || 'selected'}. Remaining: <strong>${running.remaining} ms</strong>.`;
}

// ── Save / History ────────────────────────────────────────
let pendingSave = null;

window.openSaveModal = function() {
  if (!state.simFinished.length && !state.simProcs.length) return;
  pendingSave = {
    algo: state.selectedAlgo, algoName: ALGO_NAMES[state.selectedAlgo],
    time: new Date().toISOString(),
    processes: state.processes.map(p=>({...p})),
    metrics: {
      tat: document.getElementById('mTAT').textContent,
      wt:  document.getElementById('mWT').textContent,
      rt:  document.getElementById('mRT').textContent,
      util:document.getElementById('mUtil').textContent,
      thru:document.getElementById('mThru').textContent,
      ctx: document.getElementById('mCtx').textContent,
    }
  };
  document.getElementById('saveModal').classList.add('open');
};

window.closeSaveModal = function() { document.getElementById('saveModal').classList.remove('open'); };

window.confirmSave = function() {
  if (!pendingSave) return;
  const tags  = document.getElementById('saveTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const notes = document.getElementById('saveNotes').value.trim();
  state.history.unshift({ ...pendingSave, tags, notes, id: Date.now() });
  localStorage.setItem('nexos_history', JSON.stringify(state.history));
  closeSaveModal();
  document.getElementById('saveTags').value  = '';
  document.getElementById('saveNotes').value = '';
};

window.deleteHistoryItem = function(id) {
  state.history = state.history.filter(h => h.id !== id);
  localStorage.setItem('nexos_history', JSON.stringify(state.history));
  renderHistory();
};

window.clearHistory = function() {
  if (!confirm('Clear all saved runs?')) return;
  state.history = [];
  localStorage.setItem('nexos_history', '[]');
  renderHistory();
};

function renderHistory() {
  const search = document.getElementById('histSearch').value.toLowerCase();
  const grid   = document.getElementById('histGrid');
  const items  = state.history.filter(h =>
    !search ||
    h.algoName.toLowerCase().includes(search) ||
    (h.notes||'').toLowerCase().includes(search) ||
    (h.tags||[]).some(t => t.toLowerCase().includes(search))
  );

  const allTags = [...new Set(state.history.flatMap(h => h.tags||[]))];
  document.getElementById('tagPills').innerHTML = allTags.map(t =>
    `<button class="tag-pill" onclick="filterHistoryTag('${t}',this)">${t}</button>`).join('');

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="ei">◷</div>No saved runs yet. Run a simulation and click Save.</div>`;
    return;
  }

  grid.innerHTML = items.map(h => `
    <div class="hist-card">
      <div class="flex justify-between items-center" style="margin-bottom:10px;">
        <div class="hc-algo">${h.algoName}</div>
        <div class="hc-time">${new Date(h.time).toLocaleString()}</div>
      </div>
      ${h.tags&&h.tags.length?`<div class="flex gap-2" style="flex-wrap:wrap;margin-bottom:10px;">${h.tags.map(t=>`<span class="hc-tag">${t}</span>`).join('')}</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">
        ${[['Avg TAT',h.metrics.tat],['Avg Wait',h.metrics.wt],['CPU Util',h.metrics.util]].map(([l,v])=>`
          <div style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:8px 10px;">
            <div style="font-family:var(--mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--text-3);margin-bottom:3px;">${l}</div>
            <div style="font-family:var(--display);font-size:16px;font-weight:700;color:var(--green);">${v}</div>
          </div>`).join('')}
      </div>
      ${h.notes?`<div class="hc-note" style="margin-bottom:10px;">${h.notes}</div>`:''}
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-sm flex-1" onclick="reloadFromHistory(${h.id})">↺ Reload</button>
        <button class="btn btn-danger btn-sm" onclick="deleteHistoryItem(${h.id})">× Delete</button>
      </div>
    </div>`).join('');
}

window.filterHistoryTag = function(tag, el) {
  const active = el.classList.contains('active');
  document.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('active'));
  document.getElementById('histSearch').value = active ? '' : tag;
  if (!active) el.classList.add('active');
  renderHistory();
};

window.reloadFromHistory = function(id) {
  const item = state.history.find(h => h.id === id);
  if (!item) return;
  state.processes = []; state.pidCounter = 1; state.colorIdx = 0;
  (item.processes||[]).forEach(p => addProcess(p));
  const btn = document.querySelector(`[onclick*="'${item.algo}'"]`);
  if (btn) selectAlgo(item.algo, btn);
  resetSim();
  switchPage('sim', document.querySelectorAll('.nav-tab')[0]);
};

// ── Compare ───────────────────────────────────────────────
function updateCompareInfo() {
  const el = document.getElementById('cmpInfo');
  if (!state.processes.length) { el.textContent = 'No workload loaded. Add processes in the Simulator tab.'; return; }
  const avg = (state.processes.reduce((s,p)=>s+p.burst,0)/state.processes.length).toFixed(1);
  el.innerHTML = `${state.processes.length} processes · Avg burst ${avg} ms`;
}

window.runCompare = function() {
  if (!state.processes.length) return;
  const selected = [...document.querySelectorAll('.cmp-check:checked')].map(c=>c.value);
  if (selected.length < 2) { alert('Select at least 2 algorithms.'); return; }
  const q = parseInt(document.getElementById('cmpQuantum').value)||4;
  state.compareResults = {};
  selected.forEach(a => {
    const r = simulate(state.processes, a, q);
    if (r) state.compareResults[a] = r;
  });
  renderCompareResults();
};

window.runAllAlgos = function() {
  if (!state.processes.length) return;
  const q = parseInt(document.getElementById('cmpQuantum').value)||4;
  state.compareResults = {};
  const results = compareAll(state.processes, q);
  results.forEach(r => { state.compareResults[r.algo] = r; });
  renderCompareResults();
};

function renderCompareResults() {
  const main = document.getElementById('compareMain');
  const results = Object.values(state.compareResults).sort((a,b)=>a.avgWT-b.avgWT);
  if (!results.length) {
    main.innerHTML = `<div class="empty-state"><div class="ei">⇄</div>No results yet.</div>`;
    return;
  }
  const winner = results[0];
  const maxTime = Math.max(...results.map(r=>r.totalTime));

  main.innerHTML = `
    <div class="winner-card">
      <div style="font-size:28px;">🏆</div>
      <div>
        <div class="wc-algo">${ALGO_NAMES[winner.algo]}</div>
        <div class="wc-sub">Best avg waiting time (${winner.avgWT.toFixed(1)} ms) · Ranked #1 for this workload</div>
      </div>
    </div>

    <div class="panel">
      <div class="section-header"><span class="label">Metrics Comparison</span></div>
      <div style="overflow-x:auto;padding:0;">
        <table class="data-table">
          <thead><tr>
            <th>Rank</th><th>Algorithm</th><th>Avg TAT</th><th>Avg Wait</th>
            <th>Avg Response</th><th>CPU Util</th><th>Throughput</th><th>Ctx Switches</th><th>Fairness</th>
          </tr></thead>
          <tbody>
            ${results.map((r,i) => {
              const rankCls = ['rank-1','rank-2','rank-3'][i]||'rank-n';
              const isWinner = i===0;
              return `<tr style="${isWinner?'background:rgba(34,211,160,.03)':''}">
                <td><span class="rank ${rankCls}">${i+1}</span></td>
                <td style="font-weight:600;font-family:var(--mono)">${ALGO_NAMES[r.algo]}</td>
                <td class="c-green">${r.avgTAT.toFixed(1)}</td>
                <td class="${r.avgWT===Math.min(...results.map(x=>x.avgWT))?'c-green':'c-amber'}">${r.avgWT.toFixed(1)}</td>
                <td>${r.avgRT.toFixed(1)}</td>
                <td>${r.util}%</td>
                <td>${r.throughput.toFixed(1)}</td>
                <td class="${r.contextSwitches===Math.min(...results.map(x=>x.contextSwitches))?'c-green':''}">${r.contextSwitches}</td>
                <td class="${r.fairnessIndex===Math.max(...results.map(x=>x.fairnessIndex))?'c-green':''}">${r.fairnessIndex.toFixed(2)}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="section-header"><span class="label">Overlaid Gantt Charts</span></div>
      <div style="padding:14px;display:flex;flex-direction:column;gap:8px;">
        ${results.map(r => `
          <div class="multi-gantt-row">
            <div class="multi-gantt-label">${ALGO_NAMES[r.algo]}</div>
            <div class="multi-gantt-track">
              ${r.ganttLog.map(e => {
                const l=(e.start/maxTime)*100, w=((e.end-e.start)/maxTime)*100;
                if (e.pid===-1) return `<div class="mg-bar" style="left:${l}%;width:${w}%;background:repeating-linear-gradient(45deg,#131920,#131920 3px,#0d1117 3px,#0d1117 6px);top:1px;height:24px;"></div>`;
                return `<div class="mg-bar" style="left:${l}%;width:${w}%;background:${e.color};top:1px;height:24px;"></div>`;
              }).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`;

  renderTradeoff();
}

// ── Tradeoff page ─────────────────────────────────────────
function renderTradeoff() {
  const results = Object.values(state.compareResults);
  const rows    = document.getElementById('tradeoffRows');
  if (!results.length) {
    rows.innerHTML = '<div class="empty-state">Run a comparison first.</div>';
    if (state.scatterChart) { state.scatterChart.destroy(); state.scatterChart=null; }
    if (state.radarChart)   { state.radarChart.destroy();   state.radarChart=null; }
    return;
  }

  const PALETTE = ['#22d3a0','#f0516a','#f0a732','#8b6fff','#3b9eff','#1dd1a1'];

  // Scatter chart
  const sc = document.getElementById('chartScatter').getContext('2d');
  if (state.scatterChart) state.scatterChart.destroy();
  state.scatterChart = new Chart(sc, {
    type: 'scatter',
    data: { datasets: results.map((r,i)=>({
      label: ALGO_NAMES[r.algo],
      data: [{ x: r.avgWT, y: r.avgTAT }],
      backgroundColor: PALETTE[i%PALETTE.length],
      pointRadius: 9, pointHoverRadius: 12,
    }))},
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{ legend:{ labels:{ color:'#7a9ab0', font:{ family:'JetBrains Mono', size:11 }}}},
      scales:{
        x:{ title:{display:true,text:'Avg Waiting Time (ms)',color:'#3d5568'}, ticks:{color:'#3d5568'}, grid:{color:'rgba(30,42,58,.4)'}},
        y:{ title:{display:true,text:'Avg Turnaround Time (ms)',color:'#3d5568'}, ticks:{color:'#3d5568'}, grid:{color:'rgba(30,42,58,.4)'}}
      }
    }
  });

  // Radar chart
  const rc = document.getElementById('chartRadar').getContext('2d');
  if (state.radarChart) state.radarChart.destroy();
  const maxThru = Math.max(...results.map(r=>r.throughput));
  const maxFair = Math.max(...results.map(r=>r.fairnessIndex));
  state.radarChart = new Chart(rc, {
    type: 'radar',
    data: {
      labels: ['Throughput','Fairness','CPU Util','Low Wait','Low TAT'],
      datasets: results.map((r,i)=>({
        label: ALGO_NAMES[r.algo],
        data: [
          (r.throughput/maxThru)*100,
          (r.fairnessIndex/maxFair)*100,
          r.util,
          100-((r.avgWT/Math.max(...results.map(x=>x.avgWT)))*100),
          100-((r.avgTAT/Math.max(...results.map(x=>x.avgTAT)))*100),
        ],
        borderColor: PALETTE[i%PALETTE.length],
        backgroundColor: PALETTE[i%PALETTE.length]+'20',
        borderWidth: 2, pointRadius: 3,
      }))
    },
    options: {
      responsive:true, maintainAspectRatio:true,
      plugins:{legend:{labels:{color:'#7a9ab0',font:{family:'JetBrains Mono',size:11}}}},
      scales:{r:{
        min:0,max:100,
        ticks:{color:'#3d5568',backdropColor:'transparent',font:{size:10}},
        grid:{color:'rgba(30,42,58,.5)'},
        pointLabels:{color:'#7a9ab0',font:{family:'JetBrains Mono',size:11}},
        angleLines:{color:'rgba(30,42,58,.4)'}
      }}
    }
  });

  // Profile bars
  const maxWT = Math.max(...results.map(r=>r.avgWT));
  rows.innerHTML = results.map((r,i) => `
    <div style="background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:14px;">
      <div style="font-family:var(--display);font-size:14px;font-weight:700;color:${PALETTE[i%PALETTE.length]};margin-bottom:10px;">${ALGO_NAMES[r.algo]}</div>
      <div class="profile-bar-row"><div class="profile-bar-label">Wait</div><div class="profile-bar-bg"><div class="profile-bar-fill" style="width:${(r.avgWT/maxWT)*100}%;background:var(--red);"></div></div><div class="profile-bar-val">${r.avgWT.toFixed(1)}</div></div>
      <div class="profile-bar-row"><div class="profile-bar-label">Util</div><div class="profile-bar-bg"><div class="profile-bar-fill" style="width:${r.util}%;background:var(--green);"></div></div><div class="profile-bar-val">${r.util}%</div></div>
      <div class="profile-bar-row"><div class="profile-bar-label">Fairness</div><div class="profile-bar-bg"><div class="profile-bar-fill" style="width:${(r.fairnessIndex/maxFair)*100}%;background:var(--purple);"></div></div><div class="profile-bar-val">${r.fairnessIndex.toFixed(2)}</div></div>
      <div class="profile-bar-row"><div class="profile-bar-label">Ctx-SW</div><div class="profile-bar-bg"><div class="profile-bar-fill" style="width:${r.contextSwitches>0?(r.contextSwitches/Math.max(...results.map(x=>x.contextSwitches)))*100:5}%;background:var(--amber);"></div></div><div class="profile-bar-val">${r.contextSwitches}</div></div>
    </div>`).join('');

  // What-if baseline from RR
  const rr = state.compareResults['rr'];
  if (rr) {
    state.whatifBase = { wt: rr.avgWT, ctx: rr.contextSwitches, util: rr.util };
    updateWhatIf(document.getElementById('wiQuantum').value);
  }
}

window.updateWhatIf = function(q) {
  q = parseInt(q);
  document.getElementById('wiQuantumVal').textContent = q + ' ms';
  if (!state.processes.length) return;
  const r = simulate(state.processes, 'rr', q);
  if (!r) return;

  const showChange = (newVal, base, valEl, chgEl, unit, lowerBetter) => {
    valEl.textContent = newVal.toFixed(1) + unit;
    const diff = newVal - base;
    if (Math.abs(diff) < 0.1) { chgEl.textContent = '≈ no change'; chgEl.className = 'wi-change'; return; }
    const better = (lowerBetter && diff < 0) || (!lowerBetter && diff > 0);
    chgEl.textContent = (diff>0?'+':'') + diff.toFixed(1) + unit + (better?' ↑':' ↓');
    chgEl.className = 'wi-change ' + (better?'pos':'neg');
  };

  showChange(r.avgWT, state.whatifBase.wt, document.getElementById('wiWT'), document.getElementById('wiWTchg'), ' ms', true);
  showChange(r.contextSwitches, state.whatifBase.ctx, document.getElementById('wiCtx'), document.getElementById('wiCtxchg'), '', true);
  showChange(r.util, state.whatifBase.util, document.getElementById('wiUtil'), document.getElementById('wiUtilchg'), '%', false);

  const note = q<=2 ? 'Very small quantum → excessive context switches, high overhead, but excellent response time.'
    : q<=5 ? 'Small quantum → good responsiveness with moderate overhead. Ideal for interactive workloads.'
    : q<=10 ? 'Medium quantum → balanced fairness and performance. Good for general-purpose.'
    : 'Large quantum → approaches FCFS. Low context switches but poor response for short processes.';
  document.getElementById('whatifNote').textContent = note;
};

// ── Speed slider ──────────────────────────────────────────
document.getElementById('speedSlider').addEventListener('input', function() {
  document.getElementById('speedVal').textContent = this.value;
  if (state.simRunning) {
    clearInterval(state.simInterval);
    state.simInterval = setInterval(simStep, (11-parseInt(this.value))*45);
  }
});

// ── Step mode toggle ──────────────────────────────────────
document.getElementById('stepModeChk').addEventListener('change', function() {
  state.stepMode = this.checked;
  document.getElementById('stepBtn').style.display = this.checked ? '' : 'none';
  document.getElementById('runBtn').style.display  = this.checked ? 'none' : '';
  if (this.checked) { pauseSim(); }
  else { document.getElementById('stepBox').style.display = 'none'; }
});

// ── Init ──────────────────────────────────────────────────
loadPreset('basic');
renderHistory();
