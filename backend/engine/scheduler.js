/**
 * NexOS Scheduling Engine
 * Pure functions — no side effects, no I/O.
 * Each algorithm takes a process list and returns a full simulation result.
 */

/**
 * @typedef {Object} Process
 * @property {number} pid
 * @property {string} name
 * @property {number} arrival
 * @property {number} burst
 * @property {number} priority   — lower number = higher priority
 * @property {number} io         — 0–80, probability % of I/O burst per tick
 * @property {number} deadline   — 0 = none
 * @property {string} color
 */

/**
 * @typedef {Object} SimResult
 * @property {string}   algo
 * @property {number}   avgTAT
 * @property {number}   avgWT
 * @property {number}   avgRT
 * @property {number}   util
 * @property {number}   throughput
 * @property {number}   contextSwitches
 * @property {number}   fairnessIndex
 * @property {Array}    ganttLog
 * @property {Array}    processStats
 * @property {number}   totalTime
 */

const MAX_TICKS = 2000;

function cloneProcesses(processes) {
  return processes.map(p => ({
    ...p,
    remaining:    p.burst,
    state:        'waiting',
    startTime:    -1,
    finishTime:   -1,
    responseTime: -1,
    waitTime:     0,
    queueLevel:   0,
    quantumUsed:  0,
    missedDeadline: false,
  }));
}

function pickRunning(algo, procs, quantum, time) {
  const ready = procs.filter(p => p.state === 'ready' || p.state === 'running');
  if (!ready.length) return null;

  switch (algo) {
    case 'fcfs':
      return ready.sort((a, b) => a.arrival - b.arrival)[0];

    case 'sjf': {
      const cur = procs.find(p => p.state === 'running');
      return cur || ready.sort((a, b) => a.remaining - b.remaining)[0];
    }

    case 'srtf':
      return ready.sort((a, b) => a.remaining - b.remaining)[0];

    case 'priority': {
      const cur = procs.find(p => p.state === 'running');
      return cur || ready.sort((a, b) => a.priority - b.priority)[0];
    }

    case 'rr': {
      const cur = procs.find(p => p.state === 'running');
      if (cur) {
        cur.quantumUsed++;
        if (cur.quantumUsed >= quantum) {
          cur.state = 'ready';
          cur.quantumUsed = 0;
          return procs.filter(p => p.state === 'ready')[0] || null;
        }
        return cur;
      }
      return ready[0];
    }

    case 'mlfq': {
      const cur = procs.find(p => p.state === 'running');
      const q = Math.min(quantum * Math.pow(2, cur ? cur.queueLevel : 0), 16);
      if (cur) {
        cur.quantumUsed++;
        if (cur.quantumUsed >= q) {
          cur.queueLevel = Math.min(cur.queueLevel + 1, 2);
          cur.state = 'ready';
          cur.quantumUsed = 0;
        } else {
          return cur;
        }
      }
      for (let lv = 0; lv <= 2; lv++) {
        const lvReady = procs.filter(p => p.state === 'ready' && p.queueLevel === lv);
        if (lvReady.length) return lvReady[0];
      }
      return null;
    }

    default:
      return ready[0];
  }
}

/**
 * Run a full simulation synchronously.
 * @param {Process[]} processes
 * @param {string} algo
 * @param {number} quantum
 * @returns {SimResult}
 */
function simulate(processes, algo, quantum = 4) {
  const procs = cloneProcesses(processes);
  const ganttLog = [];
  const finished = [];
  let time = 0;
  let contextSwitches = 0;
  let lastPid = -99;

  for (let t = 0; t < MAX_TICKS; t++) {
    // Arrive
    procs.forEach(p => {
      if (p.state === 'waiting' && p.arrival <= time) p.state = 'ready';
    });

    const allDone = procs.every(p => p.state === 'done');
    if (allDone) break;

    const running = pickRunning(algo, procs, quantum, time);

    // Context switch count
    if (running && running.pid !== lastPid && lastPid !== -99) contextSwitches++;
    lastPid = running ? running.pid : -99;

    // Demote running processes that weren't selected
    procs.forEach(p => { if (p.state === 'running' && p !== running) p.state = 'ready'; });

    if (running) {
      if (running.startTime === -1)    running.startTime    = time;
      if (running.responseTime === -1) running.responseTime = time - running.arrival;
      running.state = 'running';
      running.remaining--;

      // Gantt log
      const last = ganttLog[ganttLog.length - 1];
      if (last && last.pid === running.pid) {
        last.end = time + 1;
      } else {
        ganttLog.push({ pid: running.pid, name: running.name, color: running.color, start: time, end: time + 1 });
      }

      if (running.remaining <= 0) {
        running.state      = 'done';
        running.finishTime = time + 1;
        if (running.deadline > 0 && running.finishTime > running.deadline) {
          running.missedDeadline = true;
        }
        finished.push(running);
      }
    } else {
      // Idle
      const last = ganttLog[ganttLog.length - 1];
      if (last && last.pid === -1) {
        last.end = time + 1;
      } else if (time > 0) {
        ganttLog.push({ pid: -1, name: 'IDLE', color: null, start: time, end: time + 1 });
      }
    }

    // Accumulate waiting time
    procs.forEach(p => { if (p.state === 'ready') p.waitTime++; });
    time++;
  }

  if (!finished.length) return null;

  const avgTAT   = finished.reduce((s, p) => s + (p.finishTime - p.arrival), 0) / finished.length;
  const avgWT    = finished.reduce((s, p) => s + p.waitTime, 0) / finished.length;
  const avgRT    = finished.filter(p => p.responseTime !== -1)
                           .reduce((s, p) => s + p.responseTime, 0) / finished.length;
  const busyTime = ganttLog.filter(g => g.pid !== -1).reduce((s, g) => s + (g.end - g.start), 0);
  const util     = Math.round((busyTime / time) * 100);
  const throughput = (finished.length / time) * 100;

  // Fairness index: 1 / (1 + stdev of waiting times). Range 0–1, higher = fairer.
  const wtVariance = finished.reduce((s, p) => s + Math.pow(p.waitTime - avgWT, 2), 0) / finished.length;
  const fairnessIndex = 1 / (1 + Math.sqrt(wtVariance));

  const processStats = procs.map(p => ({
    pid:            p.pid,
    name:           p.name,
    color:          p.color,
    arrival:        p.arrival,
    burst:          p.burst,
    priority:       p.priority,
    deadline:       p.deadline,
    finishTime:     p.finishTime,
    turnaround:     p.finishTime !== -1 ? p.finishTime - p.arrival : null,
    waitTime:       p.waitTime,
    responseTime:   p.responseTime,
    missedDeadline: p.missedDeadline,
    starved:        p.waitTime > p.burst * 3,
  }));

  return {
    algo, avgTAT, avgWT, avgRT, util,
    throughput, contextSwitches, fairnessIndex,
    ganttLog, processStats, totalTime: time,
  };
}

/**
 * Run all algorithms against the same workload and rank by avg waiting time.
 */
function compareAll(processes, quantum = 4) {
  const algos = ['fcfs', 'sjf', 'srtf', 'rr', 'priority', 'mlfq'];
  const results = algos
    .map(a => simulate(processes, a, quantum))
    .filter(Boolean)
    .sort((a, b) => a.avgWT - b.avgWT);
  return results;
}

/**
 * ML-style recommendation with explicit reasoning.
 */
function recommend(processes) {
  if (!processes.length) return { algo: 'fcfs', reasons: [] };

  const avgBurst   = processes.reduce((s, p) => s + p.burst, 0) / processes.length;
  const variance   = processes.reduce((s, p) => s + Math.pow(p.burst - avgBurst, 2), 0) / processes.length;
  const std        = Math.sqrt(variance);
  const hasDeadline = processes.some(p => p.deadline > 0);
  const hasPriority = new Set(processes.map(p => p.priority)).size > 1;
  const hasIO       = processes.some(p => p.io > 20);
  const maxArrival  = Math.max(...processes.map(p => p.arrival));
  const n           = processes.length;

  let best = 'fcfs';
  const reasons = [];

  if (hasDeadline) {
    best = 'priority';
    reasons.push('Processes have deadlines — priority scheduling ensures time-critical tasks run first.');
  } else if (std < 2 && !hasPriority) {
    best = 'fcfs';
    reasons.push(`Burst times are highly uniform (σ = ${std.toFixed(1)} ms) — FCFS performs near-optimally with zero overhead.`);
  } else if (std > 6 && !hasPriority && maxArrival < avgBurst) {
    best = 'sjf';
    reasons.push(`High burst variance (σ = ${std.toFixed(1)} ms) with clustered arrivals — SJF minimises average waiting time.`);
  } else if (hasPriority && std > 3) {
    best = 'priority';
    reasons.push(`${new Set(processes.map(p => p.priority)).size} distinct priority levels — Priority scheduling respects process urgency.`);
  } else if (maxArrival > avgBurst && n > 4) {
    best = 'rr';
    reasons.push(`Arrivals spread over ${maxArrival} ms with ${n} processes — Round Robin ensures fairness and good response times.`);
  } else if (n >= 6 || hasIO) {
    best = 'mlfq';
    reasons.push(`Large or mixed workload (${n} processes${hasIO ? ', I/O-bound' : ''}) — MLFQ adapts dynamically to process behaviour.`);
  } else {
    best = 'srtf';
    reasons.push('Mixed burst sizes — SRTF provides the theoretical minimum average waiting time.');
  }

  if (hasIO)      reasons.push(`I/O-bound processes detected — preemptive algorithms reduce CPU idle time.`);
  if (std > 4)    reasons.push(`High burst variance (σ = ${std.toFixed(1)} ms) — shortest-job algorithms dramatically outperform FCFS.`);
  if (!hasPriority && n > 2) reasons.push('No meaningful priority differences — priority scheduling adds overhead without benefit.');

  return { algo: best, reasons };
}

module.exports = { simulate, compareAll, recommend };
