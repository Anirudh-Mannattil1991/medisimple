/**
 * NexOS Scheduling Engine — Browser Module
 * Mirrors backend/engine/scheduler.js exactly, for offline/client-side use.
 */

const MAX_TICKS = 2000;

function cloneProcesses(processes) {
  return processes.map(p => ({
    ...p,
    remaining: p.burst, state: 'waiting',
    startTime: -1, finishTime: -1, responseTime: -1,
    waitTime: 0, queueLevel: 0, quantumUsed: 0, missedDeadline: false,
  }));
}

function pickRunning(algo, procs, quantum) {
  const ready = procs.filter(p => p.state === 'ready' || p.state === 'running');
  if (!ready.length) return null;

  switch (algo) {
    case 'fcfs':    return ready.sort((a,b) => a.arrival - b.arrival)[0];
    case 'sjf': {   const c=procs.find(p=>p.state==='running'); return c||ready.sort((a,b)=>a.remaining-b.remaining)[0]; }
    case 'srtf':    return ready.sort((a,b) => a.remaining - b.remaining)[0];
    case 'priority':{ const c=procs.find(p=>p.state==='running'); return c||ready.sort((a,b)=>a.priority-b.priority)[0]; }
    case 'rr': {
      const c = procs.find(p=>p.state==='running');
      if (c) {
        c.quantumUsed++;
        if (c.quantumUsed >= quantum) { c.state='ready'; c.quantumUsed=0; return procs.filter(p=>p.state==='ready')[0]||null; }
        return c;
      }
      return ready[0];
    }
    case 'mlfq': {
      const c = procs.find(p=>p.state==='running');
      const q = Math.min(quantum*Math.pow(2,c?c.queueLevel:0),16);
      if (c) {
        c.quantumUsed++;
        if (c.quantumUsed>=q) { c.queueLevel=Math.min(c.queueLevel+1,2); c.state='ready'; c.quantumUsed=0; }
        else return c;
      }
      for (let lv=0;lv<=2;lv++) { const r=procs.filter(p=>p.state==='ready'&&p.queueLevel===lv); if(r.length) return r[0]; }
      return null;
    }
    default: return ready[0];
  }
}

export function simulate(processes, algo, quantum=4) {
  const procs = cloneProcesses(processes);
  const ganttLog=[], finished=[];
  let time=0, contextSwitches=0, lastPid=-99;

  for (let t=0; t<MAX_TICKS; t++) {
    procs.forEach(p => { if(p.state==='waiting'&&p.arrival<=time) p.state='ready'; });
    if (procs.every(p=>p.state==='done')) break;

    const running = pickRunning(algo, procs, quantum);
    if (running&&running.pid!==lastPid&&lastPid!==-99) contextSwitches++;
    lastPid = running?running.pid:-99;
    procs.forEach(p=>{ if(p.state==='running'&&p!==running) p.state='ready'; });

    if (running) {
      if (running.startTime===-1)    running.startTime=time;
      if (running.responseTime===-1) running.responseTime=time-running.arrival;
      running.state='running'; running.remaining--;
      const last=ganttLog[ganttLog.length-1];
      if(last&&last.pid===running.pid) last.end=time+1;
      else ganttLog.push({pid:running.pid,name:running.name,color:running.color,start:time,end:time+1});
      if(running.remaining<=0){
        running.state='done'; running.finishTime=time+1;
        if(running.deadline>0&&running.finishTime>running.deadline) running.missedDeadline=true;
        finished.push(running);
      }
    } else {
      const last=ganttLog[ganttLog.length-1];
      if(last&&last.pid===-1) last.end=time+1;
      else if(time>0) ganttLog.push({pid:-1,name:'IDLE',color:null,start:time,end:time+1});
    }

    procs.forEach(p=>{ if(p.state==='ready') p.waitTime++; });
    time++;
  }

  if (!finished.length) return null;

  const avgTAT = finished.reduce((s,p)=>s+(p.finishTime-p.arrival),0)/finished.length;
  const avgWT  = finished.reduce((s,p)=>s+p.waitTime,0)/finished.length;
  const avgRT  = finished.filter(p=>p.responseTime!==-1).reduce((s,p)=>s+p.responseTime,0)/finished.length;
  const busy   = ganttLog.filter(g=>g.pid!==-1).reduce((s,g)=>s+(g.end-g.start),0);
  const util   = Math.round((busy/time)*100);
  const wtVar  = finished.reduce((s,p)=>s+Math.pow(p.waitTime-avgWT,2),0)/finished.length;

  return {
    algo, avgTAT, avgWT, avgRT, util,
    throughput: (finished.length/time)*100,
    contextSwitches,
    fairnessIndex: 1/(1+Math.sqrt(wtVar)),
    ganttLog, processStats: procs, totalTime: time,
  };
}

export function compareAll(processes, quantum=4) {
  return ['fcfs','sjf','srtf','rr','priority','mlfq']
    .map(a => simulate(processes, a, quantum))
    .filter(Boolean)
    .sort((a,b) => a.avgWT-b.avgWT);
}

export function recommend(processes) {
  if (!processes.length) return { algo:'fcfs', reasons:[] };
  const avgB    = processes.reduce((s,p)=>s+p.burst,0)/processes.length;
  const variance= processes.reduce((s,p)=>s+Math.pow(p.burst-avgB,2),0)/processes.length;
  const std     = Math.sqrt(variance);
  const hasDeadline = processes.some(p=>p.deadline>0);
  const hasPriority = new Set(processes.map(p=>p.priority)).size>1;
  const hasIO       = processes.some(p=>p.io>20);
  const maxArrival  = Math.max(...processes.map(p=>p.arrival));
  const n           = processes.length;

  let best='fcfs'; const reasons=[];

  if (hasDeadline)           { best='priority'; reasons.push('Processes have deadlines — priority scheduling ensures time-critical tasks run first.'); }
  else if (std<2&&!hasPriority){ best='fcfs'; reasons.push(`Burst times are uniform (σ=${std.toFixed(1)} ms) — FCFS performs near-optimally with zero overhead.`); }
  else if (std>6&&!hasPriority&&maxArrival<avgB){ best='sjf'; reasons.push(`High burst variance (σ=${std.toFixed(1)} ms) — SJF minimises average waiting time.`); }
  else if (hasPriority&&std>3){ best='priority'; reasons.push(`${new Set(processes.map(p=>p.priority)).size} distinct priority levels — Priority scheduling respects urgency.`); }
  else if (maxArrival>avgB&&n>4){ best='rr'; reasons.push(`Arrivals spread over ${maxArrival} ms — Round Robin ensures fairness.`); }
  else if (n>=6||hasIO)      { best='mlfq'; reasons.push(`Mixed/large workload — MLFQ adapts dynamically.`); }
  else                       { best='srtf'; reasons.push('Mixed burst sizes — SRTF provides theoretical minimum waiting time.'); }

  if (hasIO) reasons.push('I/O-bound processes detected — preemptive algorithms reduce CPU idle time.');
  if (std>4) reasons.push(`High burst variance (σ=${std.toFixed(1)} ms) — shortest-job algorithms outperform FCFS.`);
  return { algo: best, reasons };
}
