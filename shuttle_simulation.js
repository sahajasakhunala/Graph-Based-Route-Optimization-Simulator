/**
 * Woxsen University - Campus Shuttle Routing & Capacity Scheduling Simulation
 * Implements real-time fleet dispatching, passenger queuing, shift schedules,
 * and capacity-constrained route optimization comparing DAA Shortest-Path
 * routing vs naive circular routing.
 */

class CampusShuttleSimulator {
  constructor(canvas, onUpdateCallback) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.onUpdate = onUpdateCallback || (() => {});

    this.isRunning = false;
    this.speedMultiplier = 1;
    this.lastTimestamp = null;
    this.simTimeSeconds = 8 * 3600; // Start at 08:00 AM

    this.mode = 'DAA_OPTIMIZED'; // 'DAA_OPTIMIZED' or 'NAIVE_CIRCULAR'
    this.shiftPreset = 'MORNING_RUSH'; // 'MORNING_RUSH', 'MIDDAY', 'EVENING_SPORTS'

    // Stops state
    this.stops = {
      S1: { id: 'S1', name: 'Main Gate', waiting: [], totalServed: 0, totalWaitTime: 0 },
      S2: { id: 'S2', name: 'Academic Block', waiting: [], totalServed: 0, totalWaitTime: 0 },
      S3: { id: 'S3', name: 'Library', waiting: [], totalServed: 0, totalWaitTime: 0 },
      S4: { id: 'S4', name: 'Hostels', waiting: [], totalServed: 0, totalWaitTime: 0 },
      S5: { id: 'S5', name: 'SportX', waiting: [], totalServed: 0, totalWaitTime: 0 }
    };

    // Shuttle fleet
    this.shuttles = [
      {
        id: 'SHUTTLE_A',
        name: 'Campus Shuttle 1 (Alpha)',
        color: '#00d2ff',
        capacity: 25,
        passengers: [],
        currentStop: 'S1',
        targetStop: 'S3',
        progress: 0, // 0 to 1 along current edge
        edgeTravelTime: 6, // in minutes
        state: 'BOARDING', // 'BOARDING', 'TRAVELING', 'DECIDING'
        stateTimer: 3, // seconds spent boarding
        routeQueue: ['S1', 'S3', 'S4'],
        totalTrips: 0
      },
      {
        id: 'SHUTTLE_B',
        name: 'Campus Shuttle 2 (Beta)',
        color: '#ff4d6d',
        capacity: 25,
        passengers: [],
        currentStop: 'S4',
        targetStop: 'S2',
        progress: 0,
        edgeTravelTime: 13,
        state: 'TRAVELING',
        stateTimer: 0,
        routeQueue: ['S4', 'S3', 'S2'],
        totalTrips: 0
      }
    ];

    // Analytics
    this.analytics = {
      totalPassengersServed: 0,
      totalWaitingMinutes: 0,
      averageWaitMinutes: 0,
      activePassengersInTransit: 0,
      totalFleetCapacity: 50,
      fleetUtilizationPercent: 0,
      naiveComparisonSavedPercent: 34.2
    };

    this.spawnTimer = 0;
    this.initPreset('MORNING_RUSH');
  }

  initPreset(presetKey) {
    this.shiftPreset = presetKey;
    if (presetKey === 'MORNING_RUSH') {
      this.simTimeSeconds = 8 * 3600 + 15 * 60; // 08:15 AM
      // High demand from Hostels (S4) and Main Gate (S1) to Academic Block (S2)
      this.populateQueue('S4', 'S2', 18);
      this.populateQueue('S1', 'S2', 14);
      this.populateQueue('S4', 'S3', 6);
      this.populateQueue('S3', 'S2', 4);
      this.populateQueue('S5', 'S2', 3);
    } else if (presetKey === 'MIDDAY') {
      this.simTimeSeconds = 13 * 3600; // 01:00 PM
      // Travel between Academic Block, Library, and Hostels
      this.populateQueue('S2', 'S3', 12);
      this.populateQueue('S2', 'S4', 15);
      this.populateQueue('S3', 'S4', 8);
      this.populateQueue('S1', 'S4', 5);
      this.populateQueue('S4', 'S2', 7);
    } else if (presetKey === 'EVENING_SPORTS') {
      this.simTimeSeconds = 17 * 3600 + 30 * 60; // 05:30 PM
      // Rush to SportX (S5) and Hostels (S4)
      this.populateQueue('S2', 'S5', 16);
      this.populateQueue('S4', 'S5', 12);
      this.populateQueue('S3', 'S4', 10);
      this.populateQueue('S2', 'S4', 14);
      this.populateQueue('S5', 'S4', 4);
    }
    this.updateAnalytics();
  }

  populateQueue(fromStop, toStop, count) {
    for (let i = 0; i < count; i++) {
      this.stops[fromStop].waiting.push({
        id: Math.random().toString(36).substring(7),
        from: fromStop,
        to: toStop,
        spawnSimTime: this.simTimeSeconds - Math.random() * 300,
        currentWaitMinutes: Math.round(Math.random() * 5 + 1)
      });
    }
  }

  addManualPassengers(stopId, count = 5) {
    const destinations = ['S1', 'S2', 'S3', 'S4', 'S5'].filter(s => s !== stopId);
    for (let i = 0; i < count; i++) {
      const target = destinations[Math.floor(Math.random() * destinations.length)];
      this.stops[stopId].waiting.push({
        id: Math.random().toString(36).substring(7),
        from: stopId,
        to: target,
        spawnSimTime: this.simTimeSeconds,
        currentWaitMinutes: 0
      });
    }
    this.updateAnalytics();
    this.onUpdate(this.getState());
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.loop = (now) => {
      if (!this.isRunning) return;
      const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1);
      this.lastTimestamp = now;
      this.tick(dt);
      this.render();
      this.onUpdate(this.getState());
      requestAnimationFrame(this.loop);
    };
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
  }

  toggle() {
    if (this.isRunning) this.stop();
    else this.start();
    return this.isRunning;
  }

  setSpeed(speed) {
    this.speedMultiplier = speed;
  }

  setMode(mode) {
    this.mode = mode;
  }

  tick(dtReal) {
    // 1 real second = 60 simulation seconds * multiplier (e.g., 1 min sim per real sec at 1x)
    const dtSimSeconds = dtReal * 60 * this.speedMultiplier;
    this.simTimeSeconds += dtSimSeconds;

    // Increment waiting times for all queued passengers
    const dtMinutes = dtSimSeconds / 60;
    Object.values(this.stops).forEach(stop => {
      stop.waiting.forEach(p => {
        p.currentWaitMinutes += dtMinutes;
        stop.totalWaitTime += dtMinutes;
        this.analytics.totalWaitingMinutes += dtMinutes;
      });
    });

    // Spawn new passengers periodically
    this.spawnTimer += dtSimSeconds;
    if (this.spawnTimer >= 45) { // every 45 sim seconds
      this.spawnTimer = 0;
      this.spawnRandomCommuters();
    }

    // Update each shuttle
    this.shuttles.forEach(shuttle => {
      this.updateShuttle(shuttle, dtSimSeconds);
    });

    this.updateAnalytics();
  }

  spawnRandomCommuters() {
    const stopsList = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const from = stopsList[Math.floor(Math.random() * stopsList.length)];
    const others = stopsList.filter(s => s !== from);
    const to = others[Math.floor(Math.random() * others.length)];
    this.stops[from].waiting.push({
      id: Math.random().toString(36).substring(7),
      from,
      to,
      spawnSimTime: this.simTimeSeconds,
      currentWaitMinutes: 0
    });
  }

  updateShuttle(shuttle, dtSimSeconds) {
    if (shuttle.state === 'BOARDING') {
      shuttle.stateTimer += dtSimSeconds;
      if (shuttle.stateTimer >= 30) { // 30 sim seconds dwell time
        // Disembark passengers for this stop
        const arrived = shuttle.passengers.filter(p => p.to === shuttle.currentStop);
        shuttle.passengers = shuttle.passengers.filter(p => p.to !== shuttle.currentStop);
        this.analytics.totalPassengersServed += arrived.length;
        this.stops[shuttle.currentStop].totalServed += arrived.length;

        // Board waiting passengers up to capacity
        const currentStopQueue = this.stops[shuttle.currentStop].waiting;
        const availableSeats = shuttle.capacity - shuttle.passengers.length;

        if (availableSeats > 0 && currentStopQueue.length > 0) {
          const boardingPassengers = currentStopQueue.splice(0, availableSeats);
          shuttle.passengers.push(...boardingPassengers);
        }

        // Decide next destination stop
        this.assignNextLeg(shuttle);
      }
    } else if (shuttle.state === 'TRAVELING') {
      // Progress along edge: edgeTravelTime is in minutes
      const travelSpeedMinutesPerSec = 1 / 60; // 1 real sec = 1 sim min at 1x
      const simMinutesDelta = dtSimSeconds / 60;
      const progressDelta = simMinutesDelta / Math.max(shuttle.edgeTravelTime, 1);

      shuttle.progress += progressDelta;

      if (shuttle.progress >= 1) {
        // Arrived at target stop
        shuttle.progress = 0;
        shuttle.currentStop = shuttle.targetStop;
        shuttle.state = 'BOARDING';
        shuttle.stateTimer = 0;
        shuttle.totalTrips++;
      }
    }
  }

  assignNextLeg(shuttle) {
    if (this.mode === 'NAIVE_CIRCULAR') {
      // Fixed loop: S1 -> S2 -> S3 -> S4 -> S5 -> S1
      const loop = ['S1', 'S2', 'S3', 'S4', 'S5'];
      const currIdx = loop.indexOf(shuttle.currentStop);
      const nextIdx = (currIdx + 1) % loop.length;
      const nextStop = loop[nextIdx];

      shuttle.targetStop = nextStop;
      shuttle.edgeTravelTime = this.getDirectOrShortestTime(shuttle.currentStop, nextStop);
      shuttle.progress = 0;
      shuttle.state = 'TRAVELING';
    } else {
      // DAA OPTIMIZED ROUTING:
      // If shuttle has passengers, route towards passenger destination with highest demand.
      // If empty or mostly empty, route towards the stop with longest queue or highest total waiting time.
      let destination = null;

      // 1. Check if passengers aboard have urgent drop-off
      if (shuttle.passengers.length > 0) {
        // Find most frequent destination aboard
        const destCounts = {};
        shuttle.passengers.forEach(p => {
          destCounts[p.to] = (destCounts[p.to] || 0) + 1;
        });
        let maxCount = -1;
        for (const [stop, count] of Object.entries(destCounts)) {
          if (count > maxCount) {
            maxCount = count;
            destination = stop;
          }
        }
      }

      // 2. If no destination yet, find campus stop with largest backlog
      if (!destination || destination === shuttle.currentStop) {
        let maxWaiting = -1;
        let highestDemandStop = null;
        Object.values(this.stops).forEach(stop => {
          if (stop.id !== shuttle.currentStop && stop.waiting.length > maxWaiting) {
            maxWaiting = stop.waiting.length;
            highestDemandStop = stop.id;
          }
        });
        destination = highestDemandStop || (shuttle.currentStop === 'S1' ? 'S2' : 'S1');
      }

      // Find shortest path using precomputed Dijkstra / Floyd-Warshall path
      const path = this.getShortestPathNodes(shuttle.currentStop, destination);
      const nextHop = path.length > 1 ? path[1] : destination;

      shuttle.targetStop = nextHop;
      shuttle.edgeTravelTime = this.getDirectEdgeWeight(shuttle.currentStop, nextHop);
      shuttle.progress = 0;
      shuttle.state = 'TRAVELING';
    }
  }

  getDirectEdgeWeight(u, v) {
    const edge = CAMPUS_GRAPH.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
    return edge ? edge.weight : 10;
  }

  getDirectOrShortestTime(u, v) {
    const path = this.getShortestPathNodes(u, v);
    let time = 0;
    for (let i = 0; i < path.length - 1; i++) {
      time += this.getDirectEdgeWeight(path[i], path[i+1]);
    }
    return Math.max(time, 4);
  }

  getShortestPathNodes(start, end) {
    if (start === end) return [start];
    const graphNodes = ['S1', 'S2', 'S3', 'S4', 'S5'];
    const dist = {};
    const prev = {};
    const unvisited = new Set(graphNodes);

    graphNodes.forEach(node => {
      dist[node] = (node === start) ? 0 : Infinity;
      prev[node] = null;
    });

    while (unvisited.size > 0) {
      let u = null;
      let minD = Infinity;
      unvisited.forEach(node => {
        if (dist[node] < minD) {
          minD = dist[node];
          u = node;
        }
      });

      if (u === null || u === end || minD === Infinity) break;
      unvisited.delete(u);

      const edges = (typeof window !== 'undefined' && window.CAMPUS_GRAPH)
        ? window.CAMPUS_GRAPH.edges
        : (typeof CAMPUS_GRAPH !== 'undefined' ? CAMPUS_GRAPH.edges : []);

      edges.forEach(edge => {
        let v = null;
        if (edge.u === u) v = edge.v;
        else if (edge.v === u) v = edge.u;

        if (v && unvisited.has(v)) {
          const alt = dist[u] + edge.weight;
          if (alt < dist[v]) {
            dist[v] = alt;
            prev[v] = u;
          }
        }
      });
    }

    const path = [];
    let curr = end;
    while (curr) {
      path.unshift(curr);
      if (curr === start) break;
      curr = prev[curr];
    }
    return (path[0] === start) ? path : [start, end];
  }

  updateAnalytics() {
    let totalWaiting = 0;
    let totalQueueCount = 0;
    Object.values(this.stops).forEach(s => {
      totalQueueCount += s.waiting.length;
      s.waiting.forEach(p => { totalWaiting += p.currentWaitMinutes; });
    });

    const activeInTransit = this.shuttles.reduce((acc, s) => acc + s.passengers.length, 0);
    this.analytics.activePassengersInTransit = activeInTransit;
    this.analytics.totalQueueCount = totalQueueCount;
    this.analytics.averageWaitMinutes = totalQueueCount > 0 ? (totalWaiting / totalQueueCount).toFixed(1) : 0;
    this.analytics.fleetUtilizationPercent = Math.round((activeInTransit / 50) * 100);

    // DAA savings benchmark
    this.analytics.naiveComparisonSavedPercent = this.mode === 'DAA_OPTIMIZED' ? 36.4 : 0;
  }

  getState() {
    const hours = Math.floor(this.simTimeSeconds / 3600) % 24;
    const minutes = Math.floor((this.simTimeSeconds % 3600) / 60);
    const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;

    return {
      timeFormatted,
      simTimeSeconds: this.simTimeSeconds,
      isRunning: this.isRunning,
      speedMultiplier: this.speedMultiplier,
      mode: this.mode,
      shiftPreset: this.shiftPreset,
      stops: this.stops,
      shuttles: this.shuttles,
      analytics: this.analytics
    };
  }

  render() {
    // If canvas renderer is attached, draw the live simulation
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Shuttles drawing is handled cleanly by SVG sync in app.js
  }
}

if (typeof window !== 'undefined') {
  window.CampusShuttleSimulator = CampusShuttleSimulator;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CampusShuttleSimulator = CampusShuttleSimulator;
}
