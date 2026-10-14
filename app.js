/**
 * Woxsen University - Campus Shuttle Routing & Scheduling
 * Main Application Controller: Video Playback, Graph Rendering,
 * Real-time Speech Narration, Sound FX, and UI Synchronization.
 */

// Sound FX Synthesizer using Web Audio API (Offline, Zero-dependency)
class SoundFX {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playStep() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  playRelaxed() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.04);
      gain.gain.setValueAtTime(0.06, now + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.04);
      osc.stop(now + idx * 0.04 + 0.12);
    });
  }

  playFinished() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.08, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }
}

// Voice Narration using Web Speech API
class SpeechNarrator {
  constructor() {
    this.enabled = false;
    this.synth = typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null;
    this.currentUtterance = null;
  }

  speak(text) {
    if (!this.enabled || !this.synth) return;
    this.synth.cancel();
    // Shorten speech for concise live video pacing
    const cleanText = text
      .replace(/∞/g, 'infinity')
      .replace(/→/g, 'to')
      .replace(/dist\[(.*?)\]/g, 'distance to $1')
      .replace(/min/g, 'minutes');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.15;
    utterance.pitch = 1.0;
    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) this.synth.cancel();
  }
}

// Global App State
const AppState = {
  currentTab: 'Dijkstra', // 'Dijkstra', 'Bellman-Ford', 'Floyd-Warshall', 'Shuttle-Simulation'
  sourceNode: 'S1',
  targetNode: 'S5',
  steps: [],
  currentStepIndex: 0,
  isPlaying: false,
  playbackSpeed: 1, // 0.5, 1, 1.5, 2.5
  playTimer: null,
  soundFX: new SoundFX(),
  narrator: new SpeechNarrator(),
  shuttleSim: null
};

// Dynamic edge path & geometry calculation
function computeEdgeGeometry(edge) {
  const uNode = window.CAMPUS_GRAPH ? window.CAMPUS_GRAPH.nodes[edge.u] : null;
  const vNode = window.CAMPUS_GRAPH ? window.CAMPUS_GRAPH.nodes[edge.v] : null;
  if (!uNode || !vNode) {
    return { d: '', mid: { x: 0, y: 0 } };
  }

  const x1 = uNode.x;
  const y1 = uNode.y;
  const x2 = vNode.x;
  const y2 = vNode.y;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  if (edge.curve === 'straight' || !edge.curve) {
    const offX = edge.labelOffsetX || 0;
    const offY = edge.labelOffsetY || 0;
    return {
      d: `M ${x1} ${y1} L ${x2} ${y2}`,
      mid: { x: Math.round(mx + offX), y: Math.round(my + offY) }
    };
  }

  // Curved arcs
  let normal = { x: 0, y: 0 };
  let offset = 0;

  if (edge.curve === 'arc_left') {
    // Normal to the left of directed vector u -> v: (-dy/len, dx/len)
    normal = { x: -dy / len, y: dx / len };
    offset = 135;
  } else if (edge.curve === 'arc_right_wide') {
    // Normal to the right of directed vector u -> v: (dy/len, -dx/len)
    normal = { x: dy / len, y: -dx / len };
    offset = 220;
  } else if (edge.curve === 'arc_right_mid') {
    normal = { x: dy / len, y: -dx / len };
    offset = 110;
  } else {
    normal = { x: dy / len, y: -dx / len };
    offset = edge.curveOffset || 80;
  }

  const cx = mx + normal.x * offset;
  const cy = my + normal.y * offset;

  // Midpoint on quadratic bezier at t = 0.5: B(0.5) = 0.5*M + 0.5*C
  const bx = 0.5 * mx + 0.5 * cx;
  const by = 0.5 * my + 0.5 * cy;

  return {
    d: `M ${x1} ${y1} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2} ${y2}`,
    mid: {
      x: Math.round(bx + (edge.labelOffsetX || 0)),
      y: Math.round(by + (edge.labelOffsetY || 0))
    }
  };
}

// Global update function for dynamic edge paths & weight badges across all graphs
function updateAllSvgEdges() {
  if (!window.CAMPUS_GRAPH || !window.CAMPUS_GRAPH.edges) return;
  window.CAMPUS_GRAPH.edges.forEach(edge => {
    const geom = computeEdgeGeometry(edge);

    // Update main graph SVG
    const base = document.getElementById(`${edge.id}-base`);
    const glow = document.getElementById(`${edge.id}-glow`);
    const label = document.getElementById(`${edge.id}-label`);
    if (base) base.setAttribute('d', geom.d);
    if (glow) glow.setAttribute('d', geom.d);
    if (label) label.setAttribute('transform', `translate(${geom.mid.x}, ${geom.mid.y})`);

    // Update fleet sim SVG
    const simBase = document.getElementById(`sim-${edge.id}-base`);
    const simGlow = document.getElementById(`sim-${edge.id}-glow`);
    const simLabel = document.getElementById(`sim-${edge.id}-label`);
    if (simBase) simBase.setAttribute('d', geom.d);
    if (simGlow) simGlow.setAttribute('d', geom.d);
    if (simLabel) simLabel.setAttribute('transform', `translate(${geom.mid.x}, ${geom.mid.y})`);
  });
}

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupSelectors();
  setupVideoControls();
  setupModals();
  setupKeyboardShortcuts();
  initGraphSVG('campus-graph-svg');

  // Generate initial simulation steps
  recomputeAlgorithm();

  // Initialize Shuttle Simulation Engine
  initShuttleSimulation();
});

// Setup Algorithm Navigation Tabs
function setupNavigation() {
  const tabs = document.querySelectorAll('#algorithm-nav .tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      const tabName = btn.getAttribute('data-tab');
      AppState.currentTab = tabName;

      // Toggle views
      const algoSection = document.getElementById('algo-section');
      const shuttleSection = document.getElementById('shuttle-sim-section');

      if (tabName === 'Shuttle-Simulation') {
        pauseVideo();
        algoSection.style.display = 'none';
        shuttleSection.style.display = 'block';
        if (AppState.shuttleSim) {
          AppState.shuttleSim.start();
        }
      } else {
        algoSection.style.display = 'block';
        shuttleSection.style.display = 'none';
        if (AppState.shuttleSim) {
          AppState.shuttleSim.stop();
        }
        recomputeAlgorithm();
      }
    });
  });
}

// Setup Source & Destination Selectors
function setupSelectors() {
  const srcSelect = document.getElementById('select-source');
  const dstSelect = document.getElementById('select-target');

  srcSelect.addEventListener('change', (e) => {
    AppState.sourceNode = e.target.value;
    recomputeAlgorithm();
  });

  dstSelect.addEventListener('change', (e) => {
    AppState.targetNode = e.target.value;
    recomputeAlgorithm();
  });
}

// Recompute Algorithm Steps
function recomputeAlgorithm() {
  pauseVideo();
  const algo = AppState.currentTab;
  const src = AppState.sourceNode;
  const dst = AppState.targetNode;

  if (algo === 'Dijkstra') {
    AppState.steps = window.generateDijkstraSteps(src, dst);
    document.getElementById('table-card-title').textContent = 'Dijkstra: tentative distances';
    document.getElementById('distances-table').style.display = 'table';
    document.getElementById('fw-matrix-container').style.display = 'none';
  } else if (algo === 'Bellman-Ford') {
    AppState.steps = window.generateBellmanFordSteps(src, dst);
    document.getElementById('table-card-title').textContent = 'Bellman-Ford: distance relaxations';
    document.getElementById('distances-table').style.display = 'table';
    document.getElementById('fw-matrix-container').style.display = 'none';
  } else if (algo === 'Floyd-Warshall') {
    AppState.steps = window.generateFloydWarshallSteps(src, dst);
    document.getElementById('table-card-title').textContent = 'Floyd-Warshall: all-pairs matrix';
    document.getElementById('distances-table').style.display = 'none';
    document.getElementById('fw-matrix-container').style.display = 'block';
  }

  // Update scrubber range
  const scrubber = document.getElementById('sim-scrubber');
  scrubber.max = Math.max(0, AppState.steps.length - 1);
  scrubber.value = 0;
  AppState.currentStepIndex = 0;

  // Render pseudocode for this algorithm
  renderPseudocode(algo);

  // Render first step
  renderStep(0);
}

// Render Pseudocode Lines
function renderPseudocode(algoName) {
  const container = document.getElementById('code-tracker-container');
  container.innerHTML = '';
  const lines = window.PSEUDOCODE[algoName] || [];
  lines.forEach(item => {
    const div = document.createElement('div');
    div.className = 'code-line';
    div.id = `code-line-${item.line}`;
    div.textContent = `${String(item.line).padStart(2, ' ')}  ${item.code}`;
    container.appendChild(div);
  });
}

// Setup Video Player Controls
function setupVideoControls() {
  const playPauseBtn = document.getElementById('btn-play-pause');
  const timelinePlayBtn = document.getElementById('btn-timeline-play');
  const playIcon = document.getElementById('play-pause-icon');
  const playText = document.getElementById('play-pause-text');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const firstBtn = document.getElementById('btn-first');
  const lastBtn = document.getElementById('btn-last');
  const resetBtn = document.getElementById('btn-reset');
  const scrubber = document.getElementById('sim-scrubber');

  // Both play buttons (top controls bar AND bottom-left of simulation) toggle playback
  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayVideo);
  if (timelinePlayBtn) timelinePlayBtn.addEventListener('click', togglePlayVideo);

  if (prevBtn) prevBtn.addEventListener('click', () => { pauseVideo(); stepBackward(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { pauseVideo(); stepForward(); });
  if (firstBtn) firstBtn.addEventListener('click', () => { pauseVideo(); goToStep(0); });
  if (lastBtn) lastBtn.addEventListener('click', () => { pauseVideo(); goToStep(AppState.steps.length - 1); });
  if (resetBtn) resetBtn.addEventListener('click', () => { pauseVideo(); goToStep(0); });

  if (scrubber) {
    scrubber.addEventListener('input', (e) => {
      pauseVideo();
      goToStep(parseInt(e.target.value, 10));
    });
  }

  // Speed selector buttons
  const speedButtons = document.querySelectorAll('#algo-speed-selector .speed-btn');
  speedButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      speedButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      AppState.playbackSpeed = parseFloat(btn.getAttribute('data-speed'));
      // Immediate effect: reschedule playback timer immediately
      if (AppState.isPlaying) {
        restartPlayInterval();
      }
    });
  });

  // Audio & Voice toggles
  const voiceBtn = document.getElementById('btn-toggle-voice');
  if (voiceBtn) {
    voiceBtn.addEventListener('click', () => {
      AppState.narrator.enabled = !AppState.narrator.enabled;
      voiceBtn.classList.toggle('active', AppState.narrator.enabled);
      if (!AppState.narrator.enabled) {
        AppState.narrator.stop();
      } else {
        // Speak current step
        const step = AppState.steps[AppState.currentStepIndex];
        if (step) AppState.narrator.speak(step.description);
      }
    });
  }

  const soundBtn = document.getElementById('btn-toggle-sound');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      AppState.soundFX.enabled = !AppState.soundFX.enabled;
      soundBtn.classList.toggle('active', AppState.soundFX.enabled);
    });
  }
}

function togglePlayVideo() {
  if (AppState.isPlaying) {
    pauseVideo();
  } else {
    playVideo();
  }
}

function playVideo() {
  if (AppState.isPlaying) return;
  if (!AppState.steps || AppState.steps.length === 0) return;

  // If already at the last step, restart from step 0
  if (AppState.currentStepIndex >= AppState.steps.length - 1) {
    goToStep(0);
  }
  AppState.isPlaying = true;
  updatePlayButtonUI(true);
  const statusTag = document.getElementById('video-status-tag');
  if (statusTag) {
    statusTag.textContent = 'Playing';
    statusTag.className = 'status-tag visited';
  }

  restartPlayInterval();
}

function pauseVideo() {
  if (!AppState.isPlaying) return;
  AppState.isPlaying = false;
  if (AppState.playTimer) {
    clearTimeout(AppState.playTimer);
    AppState.playTimer = null;
  }
  updatePlayButtonUI(false);
  const statusTag = document.getElementById('video-status-tag');
  if (statusTag) {
    statusTag.textContent = 'Paused';
    statusTag.className = 'status-tag current';
  }
}

function updatePlayButtonUI(playing) {
  // Top play button
  const topIcon = document.getElementById('play-pause-icon');
  const topText = document.getElementById('play-pause-text');
  const topBtn = document.getElementById('btn-play-pause');

  // Timeline bottom-left play button
  const tlIcon = document.getElementById('timeline-play-icon');
  const tlText = document.getElementById('timeline-play-text');
  const tlBtn = document.getElementById('btn-timeline-play');

  if (playing) {
    if (topIcon) topIcon.textContent = '⏸';
    if (topText) topText.textContent = 'Pause';
    if (topBtn) topBtn.title = 'Pause live simulation (Space)';

    if (tlIcon) tlIcon.textContent = '⏸';
    if (tlText) tlText.textContent = 'Pause';
    if (tlBtn) tlBtn.title = 'Pause live simulation (Space)';
  } else {
    if (topIcon) topIcon.textContent = '▶';
    if (topText) topText.textContent = 'Play';
    if (topBtn) topBtn.title = 'Play live simulation (Space)';

    if (tlIcon) tlIcon.textContent = '▶';
    if (tlText) tlText.textContent = 'Play';
    if (tlBtn) tlBtn.title = 'Play live simulation (Space)';
  }
}

function restartPlayInterval() {
  if (AppState.playTimer) {
    clearTimeout(AppState.playTimer);
    AppState.playTimer = null;
  }
  if (!AppState.isPlaying) return;

  // Pace delay based on speed: base 1000ms / speed
  // 0.25x -> 4000ms
  // 0.5x  -> 2000ms
  // 1x    -> 1000ms
  // 1.5x  -> 667ms
  // 2x    -> 500ms
  // 4x    -> 250ms
  const baseMs = 1000;
  const delay = Math.max(120, Math.round(baseMs / AppState.playbackSpeed));

  AppState.playTimer = setTimeout(() => {
    if (!AppState.isPlaying) return;
    if (AppState.currentStepIndex < AppState.steps.length - 1) {
      goToStep(AppState.currentStepIndex + 1);
      restartPlayInterval();
    } else {
      // Completed video
      pauseVideo();
      AppState.soundFX.playFinished();
      const statusTag = document.getElementById('video-status-tag');
      if (statusTag) {
        statusTag.textContent = 'Complete';
        statusTag.className = 'status-tag visited';
      }
    }
  }, delay);
}

function stepForward() {
  if (AppState.currentStepIndex < AppState.steps.length - 1) {
    goToStep(AppState.currentStepIndex + 1);
  }
}

function stepBackward() {
  if (AppState.currentStepIndex > 0) {
    goToStep(AppState.currentStepIndex - 1);
  }
}

function goToStep(index) {
  AppState.currentStepIndex = Math.max(0, Math.min(index, AppState.steps.length - 1));
  const scrubber = document.getElementById('sim-scrubber');
  if (scrubber) scrubber.value = AppState.currentStepIndex;
  renderStep(AppState.currentStepIndex);
}

// SETUP KEYBOARD SHORTCUTS
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Only if not focused on input or select
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      togglePlayVideo();
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      pauseVideo();
      stepForward();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      pauseVideo();
      stepBackward();
    } else if (e.code === 'Home') {
      e.preventDefault();
      pauseVideo();
      goToStep(0);
    } else if (e.code === 'End') {
      e.preventDefault();
      pauseVideo();
      goToStep(AppState.steps.length - 1);
    } else if (e.key === 'r' || e.key === 'R') {
      pauseVideo();
      goToStep(0);
    }
  });
}

// INITIALIZE SVG GRAPH
function initGraphSVG(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const isSim = (svgId === 'sim-campus-graph-svg');
  const idPrefix = isSim ? 'sim-' : '';

  const edgesGroup = svg.querySelector(isSim ? '#sim-svg-edges-group' : '#svg-edges-group');
  const labelsGroup = svg.querySelector(isSim ? '#sim-svg-edge-labels-group' : '#svg-edge-labels-group');
  const nodesGroup = svg.querySelector(isSim ? '#sim-svg-nodes-group' : '#svg-nodes-group');

  if (!edgesGroup || !labelsGroup || !nodesGroup) return;

  edgesGroup.innerHTML = '';
  labelsGroup.innerHTML = '';
  nodesGroup.innerHTML = '';

  // 1. Draw Edges
  window.CAMPUS_GRAPH.edges.forEach(edge => {
    const pathData = computeEdgeGeometry(edge);
    if (!pathData) return;

    // Glow path
    const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    glowPath.setAttribute('d', pathData.d);
    glowPath.setAttribute('class', 'graph-edge-glow');
    glowPath.setAttribute('id', `${idPrefix}${edge.id}-glow`);
    glowPath.setAttribute('data-edge-id', edge.id);
    edgesGroup.appendChild(glowPath);

    // Main edge path
    const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    mainPath.setAttribute('d', pathData.d);
    mainPath.setAttribute('class', 'graph-edge-base');
    mainPath.setAttribute('id', `${idPrefix}${edge.id}-base`);
    mainPath.setAttribute('data-edge-id', edge.id);
    edgesGroup.appendChild(mainPath);

    // Edge label badge
    const gLabel = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gLabel.setAttribute('transform', `translate(${pathData.mid.x}, ${pathData.mid.y})`);
    gLabel.setAttribute('id', `${idPrefix}${edge.id}-label`);
    gLabel.setAttribute('class', 'edge-label-group');
    gLabel.setAttribute('data-edge-id', edge.id);

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '-24');
    rect.setAttribute('y', '-11');
    rect.setAttribute('width', '48');
    rect.setAttribute('height', '22');
    rect.setAttribute('class', 'edge-weight-tag');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'edge-weight-text');
    text.textContent = edge.label;

    gLabel.appendChild(rect);
    gLabel.appendChild(text);
    labelsGroup.appendChild(gLabel);
  });

  // 2. Draw Nodes
  window.NODE_KEYS.forEach(nodeKey => {
    const node = window.CAMPUS_GRAPH.nodes[nodeKey];
    const gNode = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gNode.setAttribute('class', 'node-group');
    gNode.setAttribute('id', `${idPrefix}node-group-${node.id}`);
    gNode.setAttribute('data-node-id', node.id);
    gNode.setAttribute('transform', `translate(${node.x}, ${node.y})`);

    // Outer glow ring
    const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outerRing.setAttribute('r', '27');
    outerRing.setAttribute('class', 'node-circle-outer');
    outerRing.setAttribute('stroke', node.color);
    outerRing.setAttribute('fill', 'transparent');
    outerRing.setAttribute('id', `${idPrefix}node-ring-${node.id}`);

    // Inner background circle
    const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    innerCircle.setAttribute('r', '24');
    innerCircle.setAttribute('class', 'node-circle-inner');
    innerCircle.setAttribute('id', `${idPrefix}node-inner-${node.id}`);

    // Node code text (S1, S2, etc.)
    const codeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    codeText.setAttribute('class', 'node-code-text');
    codeText.setAttribute('y', '1');
    codeText.textContent = node.id;

    // Node name pill
    const gName = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gName.setAttribute('transform', 'translate(0, 36)');

    const namePill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    namePill.setAttribute('x', '-52');
    namePill.setAttribute('y', '-10');
    namePill.setAttribute('width', '104');
    namePill.setAttribute('height', '20');
    namePill.setAttribute('class', 'node-name-pill');

    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('class', 'node-name-text');
    nameText.textContent = node.name;

    gName.appendChild(namePill);
    gName.appendChild(nameText);

    // Distance badge (top right of node)
    const gDist = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gDist.setAttribute('transform', 'translate(22, -22)');
    gDist.setAttribute('id', `${idPrefix}node-dist-group-${node.id}`);

    const distRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    distRect.setAttribute('x', '-16');
    distRect.setAttribute('y', '-9');
    distRect.setAttribute('width', '32');
    distRect.setAttribute('height', '18');
    distRect.setAttribute('fill', '#11141c');
    distRect.setAttribute('stroke', '#333f52');
    distRect.setAttribute('class', 'node-dist-badge');
    distRect.setAttribute('id', `${idPrefix}node-dist-rect-${node.id}`);

    const distText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    distText.setAttribute('class', 'node-dist-text');
    distText.setAttribute('fill', '#00d2ff');
    distText.setAttribute('id', `${idPrefix}node-dist-text-${node.id}`);
    distText.textContent = '∞';

    gDist.appendChild(distRect);
    gDist.appendChild(distText);

    // Hit circle for rock-solid pointer stability (zero flicker, zero glitch)
    const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    hitArea.setAttribute('r', '30');
    hitArea.setAttribute('fill', 'transparent');
    hitArea.setAttribute('stroke', 'transparent');
    gNode.appendChild(hitArea);

    // Assemble node
    gNode.appendChild(outerRing);
    gNode.appendChild(innerCircle);
    gNode.appendChild(codeText);
    gNode.appendChild(gName);
    if (!isSim) {
      gNode.appendChild(gDist);
    }

    // Click handler on node to set as source or destination
    gNode.addEventListener('click', (e) => {
      e.stopPropagation();
      if (gNode._justDragged) {
        gNode._justDragged = false;
        return;
      }
      if (!isSim) {
        pauseVideo();
        if (AppState.sourceNode !== node.id) {
          document.getElementById('select-target').value = node.id;
          AppState.targetNode = node.id;
        } else {
          document.getElementById('select-source').value = node.id;
          AppState.sourceNode = node.id;
        }
        recomputeAlgorithm();
      }
    });

    nodesGroup.appendChild(gNode);
  });

  // Enable dragging on all nodes in this SVG
  setupDraggableNodes(svgId);
}

// SETUP DRAGGABLE NODES INTERACTIVITY
function setupDraggableNodes(svgId) {
  const svg = document.getElementById(svgId);
  if (!svg) return;

  const nodeGroups = svg.querySelectorAll('.node-group');
  nodeGroups.forEach(gNode => {
    const nodeId = gNode.getAttribute('data-node-id');
    if (!nodeId) return;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let nodeStartX = 0;
    let nodeStartY = 0;
    let hasMoved = false;

    function getSvgCoords(clientX, clientY) {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const pt = svg.createSVGPoint();
        pt.x = clientX;
        pt.y = clientY;
        return pt.matrixTransform(ctm.inverse());
      }
      const rect = svg.getBoundingClientRect();
      const scaleX = 540 / (rect.width || 540);
      const scaleY = 540 / (rect.height || 540);
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    }

    function onPointerDown(e) {
      if (e.button !== undefined && e.button !== 0) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      isDragging = true;
      hasMoved = false;
      dragStartX = clientX;
      dragStartY = clientY;

      const currNode = window.CAMPUS_GRAPH.nodes[nodeId];
      nodeStartX = currNode.x;
      nodeStartY = currNode.y;

      gNode.classList.add('is-dragging');

      // Bring dragged node to front of SVG layer
      gNode.parentNode.appendChild(gNode);

      window.addEventListener('mousemove', onPointerMove, { passive: false });
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
      window.addEventListener('touchcancel', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isDragging) return;

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dist = Math.hypot(clientX - dragStartX, clientY - dragStartY);
      if (dist > 4) {
        hasMoved = true;
        if (e.cancelable) e.preventDefault();
      }

      if (!hasMoved) return;

      const currCoords = getSvgCoords(clientX, clientY);
      const startCoords = getSvgCoords(dragStartX, dragStartY);

      const dx = currCoords.x - startCoords.x;
      const dy = currCoords.y - startCoords.y;

      // Keep node well within canvas bounds
      const newX = Math.round(Math.max(45, Math.min(495, nodeStartX + dx)));
      const newY = Math.round(Math.max(40, Math.min(495, nodeStartY + dy)));

      // Update graph data
      window.CAMPUS_GRAPH.nodes[nodeId].x = newX;
      window.CAMPUS_GRAPH.nodes[nodeId].y = newY;

      // Update current SVG node position
      gNode.setAttribute('transform', `translate(${newX}, ${newY})`);

      // Sync the other SVG if it also contains this node
      const otherSvgId = (svgId === 'campus-graph-svg') ? 'sim-campus-graph-svg' : 'campus-graph-svg';
      const otherSvg = document.getElementById(otherSvgId);
      if (otherSvg) {
        const otherNode = otherSvg.querySelector(`[data-node-id="${nodeId}"]`);
        if (otherNode) {
          otherNode.setAttribute('transform', `translate(${newX}, ${newY})`);
        }
      }

      // Recalculate all connected edges & weight tags dynamically
      updateAllSvgEdges();
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      gNode.classList.remove('is-dragging');

      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('touchcancel', onPointerUp);

      gNode._justDragged = hasMoved;
      if (hasMoved) {
        setTimeout(() => { gNode._justDragged = false; }, 120);
      }
    }

    gNode.addEventListener('mousedown', onPointerDown);
    gNode.addEventListener('touchstart', onPointerDown, { passive: true });
  });
}

// RENDER SINGLE TIMELINE STEP
function renderStep(stepIndex) {
  const step = AppState.steps[stepIndex];
  if (!step) return;

  // Sound effect
  if (step.phase === 'RELAXED') {
    AppState.soundFX.playRelaxed();
  } else {
    AppState.soundFX.playStep();
  }

  // Voice narration
  if (AppState.narrator.enabled) {
    AppState.narrator.speak(step.description);
  }

  // 1. Update Step Counter & Scrubber (Clear Step X / Total Steps indicator)
  const stepCountText = `Step ${stepIndex + 1} of ${AppState.steps.length}`;
  const counterBadge = document.getElementById('step-counter-badge');
  if (counterBadge) counterBadge.textContent = stepCountText;

  const pathStepBadge = document.getElementById('path-step-badge');
  if (pathStepBadge) pathStepBadge.textContent = stepCountText;

  const scrubber = document.getElementById('sim-scrubber');
  if (scrubber) {
    scrubber.max = Math.max(0, AppState.steps.length - 1);
    scrubber.value = stepIndex;
  }

  // 2. Update Narration Banner (Clear current-operation description)
  const narTitle = document.getElementById('narration-title');
  if (narTitle) narTitle.textContent = step.title;

  const narDesc = document.getElementById('narration-desc');
  if (narDesc) narDesc.textContent = step.description;

  // 3. Update Formula & Calculation
  if (step.formula) {
    document.getElementById('formula-rule-text').textContent = step.formula.rule;
    document.getElementById('formula-calc-text').textContent = step.formula.calculation;
    document.getElementById('formula-calc-text').style.color = step.formula.updated ? '#06d6a0' : '#ffb703';
  }

  // 4. Update Final Route & Cost
  if (step.path && step.path.length > 0) {
    document.getElementById('path-cost-badge').textContent = `${step.pathCost} min`;
    const crumbsContainer = document.getElementById('path-breadcrumbs');
    crumbsContainer.innerHTML = '';
    step.path.forEach((nodeId, idx) => {
      const span = document.createElement('span');
      span.className = 'crumb-node';
      span.textContent = `${nodeId} ${window.CAMPUS_GRAPH.nodes[nodeId].name}`;
      crumbsContainer.appendChild(span);

      if (idx < step.path.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'crumb-arrow';
        arrow.textContent = '→';
        crumbsContainer.appendChild(arrow);
      }
    });
  }

  // 5. Update Pseudocode Active Line (Internal scroll only, NEVER scroll page/window)
  document.querySelectorAll('.code-line').forEach(el => el.classList.remove('active'));
  if (step.pseudocodeLine) {
    const activeCodeEl = document.getElementById(`code-line-${step.pseudocodeLine}`);
    const codeContainer = document.getElementById('code-tracker-container');
    if (activeCodeEl && codeContainer) {
      activeCodeEl.classList.add('active');
      // Scroll internally within codeContainer without moving the browser window scroll position
      const relTop = activeCodeEl.offsetTop - codeContainer.offsetTop;
      codeContainer.scrollTop = Math.max(0, relTop - 25);
    }
  }

  // 6. Update Graph Visual Highlights
  updateGraphVisuals(step);

  // 7. Update Distance Table / Matrix
  if (AppState.currentTab === 'Floyd-Warshall') {
    renderFloydWarshallMatrix(step);
  } else {
    renderDistancesTable(step);
  }

  // 8. Shuttle Animation on Final Route
  if (step.phase === 'FINISHED' && step.path && step.path.length > 1) {
    animateShuttleAlongPath(step.path);
  } else {
    clearShuttleAnimation();
  }
}

// UPDATE GRAPH VISUALS FOR STEP
function updateGraphVisuals(step) {
  // Reset all edges
  window.CAMPUS_GRAPH.edges.forEach(e => {
    const base = document.getElementById(`${e.id}-base`);
    const glow = document.getElementById(`${e.id}-glow`);
    if (base) {
      base.className.baseVal = 'graph-edge-base';
      base.style.stroke = '#222938';
    }
    if (glow) {
      glow.style.stroke = 'transparent';
    }
  });

  // Reset all nodes
  window.NODE_KEYS.forEach(k => {
    const ring = document.getElementById(`node-ring-${k}`);
    const inner = document.getElementById(`node-inner-${k}`);
    const distText = document.getElementById(`node-dist-text-${k}`);
    const distRect = document.getElementById(`node-dist-rect-${k}`);

    if (ring) {
      ring.setAttribute('stroke', window.CAMPUS_GRAPH.nodes[k].color);
      ring.setAttribute('stroke-width', '3');
      ring.style.filter = 'none';
    }
    if (inner) {
      inner.setAttribute('fill', '#131722');
    }
    let d = Infinity;
    if (step.distances && step.distances[k] !== undefined) {
      d = step.distances[k];
    } else if (step.matrix && step.matrix[AppState.sourceNode] && step.matrix[AppState.sourceNode][k] !== undefined) {
      d = step.matrix[AppState.sourceNode][k];
    }

    if (distText) {
      distText.textContent = d === Infinity ? '∞' : `${d}m`;
      if (distRect) {
        distRect.setAttribute('stroke', d !== Infinity ? '#06d6a0' : '#333f52');
      }
    }
  });

  // Highlight Floyd-Warshall pivot node k
  if (step.pivotNode) {
    const ring = document.getElementById(`node-ring-${step.pivotNode}`);
    if (ring) {
      ring.setAttribute('stroke', '#8338ec');
      ring.setAttribute('stroke-width', '4.5');
      ring.style.filter = 'drop-shadow(0 0 10px rgba(131, 56, 236, 0.8))';
    }
  }

  // Highlight visited nodes
  if (step.visitedNodes) {
    step.visitedNodes.forEach(k => {
      const ring = document.getElementById(`node-ring-${k}`);
      if (ring) {
        ring.setAttribute('stroke', '#06d6a0');
        ring.setAttribute('stroke-width', '4');
      }
    });
  }

  // Highlight active node u
  if (step.activeNode) {
    const ring = document.getElementById(`node-ring-${step.activeNode}`);
    const inner = document.getElementById(`node-inner-${step.activeNode}`);
    if (ring) {
      ring.setAttribute('stroke', '#ffb703');
      ring.setAttribute('stroke-width', '5');
      ring.style.filter = 'drop-shadow(0 0 10px rgba(255, 183, 3, 0.8))';
    }
    if (inner) {
      inner.setAttribute('fill', '#261f0f');
    }
  }

  // Highlight neighbor node v
  if (step.neighborNode) {
    const ring = document.getElementById(`node-ring-${step.neighborNode}`);
    if (ring) {
      ring.setAttribute('stroke', '#00d2ff');
      ring.setAttribute('stroke-width', '4');
    }
  }

  // Highlight active edge
  if (step.activeEdgeId) {
    const base = document.getElementById(`${step.activeEdgeId}-base`);
    const glow = document.getElementById(`${step.activeEdgeId}-glow`);
    if (base) {
      if (step.edgeState === 'relaxed_success') {
        base.style.stroke = '#06d6a0';
        base.style.strokeWidth = '5px';
      } else {
        base.style.stroke = '#ffb703';
        base.style.strokeWidth = '5px';
      }
    }
    if (glow) {
      glow.style.stroke = step.edgeState === 'relaxed_success' ? 'rgba(6, 214, 160, 0.5)' : 'rgba(255, 183, 3, 0.5)';
    }
  }

  // Highlight final path if finished
  if (step.edgeState === 'final_route' && step.path && step.path.length > 1) {
    for (let i = 0; i < step.path.length - 1; i++) {
      const u = step.path[i];
      const v = step.path[i+1];
      const edge = window.CAMPUS_GRAPH.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
      if (edge) {
        const base = document.getElementById(`${edge.id}-base`);
        const glow = document.getElementById(`${edge.id}-glow`);
        if (base) {
          base.style.stroke = '#00d2ff';
          base.style.strokeWidth = '6px';
        }
        if (glow) {
          glow.style.stroke = 'rgba(0, 210, 255, 0.8)';
        }
      }
    }
  }
}

// RENDER DISTANCES TABLE
function renderDistancesTable(step) {
  const tbody = document.getElementById('distances-table-body');
  tbody.innerHTML = '';

  window.NODE_KEYS.forEach(nodeKey => {
    const dist = step.distances ? step.distances[nodeKey] : Infinity;
    const prev = step.previous ? step.previous[nodeKey] : null;
    const isVisited = step.visitedNodes ? step.visitedNodes.includes(nodeKey) : false;
    const isActive = step.activeNode === nodeKey;
    const isNeighbor = step.neighborNode === nodeKey;

    const tr = document.createElement('tr');
    if (isActive) tr.className = 'active-row';
    else if (isNeighbor && step.phase === 'RELAXED') tr.className = 'relaxed-row';

    // Stop Column
    const tdStop = document.createElement('td');
    tdStop.innerHTML = `<span style="font-weight: 700; color: ${window.CAMPUS_GRAPH.nodes[nodeKey].color};">${nodeKey}</span> ${window.CAMPUS_GRAPH.nodes[nodeKey].name}`;

    // Distance Column
    const tdDist = document.createElement('td');
    tdDist.style.fontFamily = 'var(--font-mono)';
    tdDist.style.fontWeight = '700';
    tdDist.textContent = dist === Infinity ? '∞' : `${dist} min`;
    if (dist !== Infinity) tdDist.style.color = '#06d6a0';

    // Previous Column
    const tdPrev = document.createElement('td');
    tdPrev.style.fontFamily = 'var(--font-mono)';
    tdPrev.textContent = prev ? prev : '—';

    // Status Column
    const tdStatus = document.createElement('td');
    if (isVisited) {
      tdStatus.innerHTML = '<span class="status-tag visited">✓ Settled</span>';
    } else if (isActive) {
      tdStatus.innerHTML = '<span class="status-tag current">Visiting</span>';
    } else {
      tdStatus.innerHTML = '<span class="status-tag unvisited">Unvisited</span>';
    }

    tr.appendChild(tdStop);
    tr.appendChild(tdDist);
    tr.appendChild(tdPrev);
    tr.appendChild(tdStatus);
    tbody.appendChild(tr);
  });
}

// RENDER FLOYD-WARSHALL MATRIX
function renderFloydWarshallMatrix(step) {
  const grid = document.getElementById('fw-matrix-grid');
  grid.innerHTML = '';
  if (!step.matrix) return;

  // Header row
  const emptyCorner = document.createElement('div');
  emptyCorner.className = 'fw-cell header-cell';
  emptyCorner.textContent = 'D(k)';
  grid.appendChild(emptyCorner);

  window.NODE_KEYS.forEach(k => {
    const th = document.createElement('div');
    th.className = 'fw-cell header-cell';
    th.textContent = k;
    if (step.pivotNode === k) th.style.color = '#ffb703';
    grid.appendChild(th);
  });

  // Matrix rows
  window.NODE_KEYS.forEach(i => {
    const rowHeader = document.createElement('div');
    rowHeader.className = 'fw-cell header-cell';
    rowHeader.textContent = i;
    if (step.pivotNode === i) rowHeader.style.color = '#ffb703';
    grid.appendChild(rowHeader);

    window.NODE_KEYS.forEach(j => {
      const cell = document.createElement('div');
      cell.className = 'fw-cell';
      const val = step.matrix[i][j];
      cell.textContent = val === Infinity ? '∞' : val;

      if (step.pivotNode === i || step.pivotNode === j) {
        cell.classList.add('pivot-active');
      }

      if (step.sourceCell === i && step.targetCell === j) {
        cell.classList.add('cell-updated');
      }

      // Click to inspect path between (i, j)
      cell.title = `Click to inspect route ${i} → ${j}`;
      cell.addEventListener('click', () => {
        document.getElementById('select-source').value = i;
        document.getElementById('select-target').value = j;
        AppState.sourceNode = i;
        AppState.targetNode = j;
        recomputeAlgorithm();
      });

      grid.appendChild(cell);
    });
  });
}

// ANIMATE SHUTTLE BUS ALONG OPTIMAL PATH
let shuttleAnimTimer = null;
function animateShuttleAlongPath(path) {
  clearShuttleAnimation();
  const shuttleGroup = document.getElementById('svg-shuttle-group');
  if (!shuttleGroup || path.length < 2) return;

  // Create Shuttle Bus SVG Icon
  const busG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  busG.setAttribute('id', 'moving-shuttle-bus');

  // Shuttle body
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  body.setAttribute('x', '-16');
  body.setAttribute('y', '-10');
  body.setAttribute('width', '32');
  body.setAttribute('height', '20');
  body.setAttribute('rx', '4');
  body.setAttribute('fill', '#00d2ff');
  body.setAttribute('stroke', '#ffffff');
  body.setAttribute('stroke-width', '1.5');
  body.setAttribute('filter', 'url(#glow-cyan)');

  // Bus windshield
  const windshield = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  windshield.setAttribute('x', '5');
  windshield.setAttribute('y', '-7');
  windshield.setAttribute('width', '8');
  windshield.setAttribute('height', '14');
  windshield.setAttribute('rx', '2');
  windshield.setAttribute('fill', '#0a0c10');

  // Text tag
  const busText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  busText.setAttribute('x', '-5');
  busText.setAttribute('y', '3');
  busText.setAttribute('font-size', '8');
  busText.setAttribute('font-weight', '800');
  busText.setAttribute('fill', '#0a0c10');
  busText.setAttribute('text-anchor', 'middle');
  busText.textContent = 'BUS';

  busG.appendChild(body);
  busG.appendChild(windshield);
  busG.appendChild(busText);
  shuttleGroup.appendChild(busG);

// Helper to get exact position (x, y) and rotation angle along an edge (straight or curved)
function getEdgePointAndAngle(uId, vId, progress, svgId = 'campus-graph-svg') {
  const edge = window.CAMPUS_GRAPH ? window.CAMPUS_GRAPH.edges.find(e => 
    (e.u === uId && e.v === vId) || (e.u === vId && e.v === uId)
  ) : null;

  let pathEl = null;
  if (edge) {
    const svg = document.getElementById(svgId);
    if (svg) {
      pathEl = svg.querySelector(`#${edge.id}-base`) || svg.querySelector(`#sim-${edge.id}-base`);
    }
    if (!pathEl) {
      pathEl = document.getElementById(`${edge.id}-base`) || document.getElementById(`sim-${edge.id}-base`);
    }
  }

  // 1. Preferred: Exact SVG path DOM geometry (tracks the real rendered SVG line 100%)
  if (pathEl && typeof pathEl.getTotalLength === 'function') {
    try {
      const totalLen = pathEl.getTotalLength();
      if (totalLen > 0) {
        const isForward = (edge.u === uId);
        const t = Math.max(0, Math.min(1, progress));
        const currentLen = isForward ? (t * totalLen) : ((1 - t) * totalLen);
        const pt = pathEl.getPointAtLength(currentLen);

        const delta = 2;
        let nextLen;
        if (isForward) {
          nextLen = Math.min(totalLen, currentLen + delta);
        } else {
          nextLen = Math.max(0, currentLen - delta);
        }
        const ptNext = pathEl.getPointAtLength(nextLen);

        let angle = 0;
        if (isForward) {
          angle = Math.atan2(ptNext.y - pt.y, ptNext.x - pt.x) * (180 / Math.PI);
        } else {
          angle = Math.atan2(pt.y - ptNext.y, pt.x - ptNext.x) * (180 / Math.PI);
        }

        return { x: pt.x, y: pt.y, angle: angle };
      }
    } catch (err) {
      // Fall through to dynamic fallback
    }
  }

  // 2. Analytical Fallback using dynamic computeEdgeGeometry
  if (edge && window.CAMPUS_GRAPH) {
    const geom = computeEdgeGeometry(edge);
    const uNode = window.CAMPUS_GRAPH.nodes[uId];
    const vNode = window.CAMPUS_GRAPH.nodes[vId];
    const isForward = (edge.u === uId);
    const rawT = Math.max(0, Math.min(1, progress));
    const t = isForward ? rawT : (1 - rawT);

    if (geom.d.includes('Q')) {
      const parts = geom.d.trim().split(/\s+/);
      const p0 = { x: parseFloat(parts[1]), y: parseFloat(parts[2]) };
      const p1 = { x: parseFloat(parts[4]), y: parseFloat(parts[5]) };
      const p2 = { x: parseFloat(parts[6]), y: parseFloat(parts[7]) };

      const oneMinusT = 1 - t;
      const x = oneMinusT * oneMinusT * p0.x + 2 * oneMinusT * t * p1.x + t * t * p2.x;
      const y = oneMinusT * oneMinusT * p0.y + 2 * oneMinusT * t * p1.y + t * t * p2.y;

      const dx = 2 * oneMinusT * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const dy = 2 * oneMinusT * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      if (!isForward) angle += 180;

      return { x, y, angle };
    } else if (uNode && vNode) {
      const curX = uNode.x + (vNode.x - uNode.x) * rawT;
      const curY = uNode.y + (vNode.y - uNode.y) * rawT;
      const angle = Math.atan2(vNode.y - uNode.y, vNode.x - uNode.x) * (180 / Math.PI);
      return { x: curX, y: curY, angle: isForward ? angle : angle + 180 };
    }
  }

  return { x: 0, y: 0, angle: 0 };
}

  let hopIdx = 0;
  let progress = 0;

  function animLoop() {
    if (hopIdx >= path.length - 1) {
      hopIdx = 0;
      progress = 0;
    }
    const uId = path[hopIdx];
    const vId = path[hopIdx + 1];

    const ptInfo = getEdgePointAndAngle(uId, vId, progress, 'campus-graph-svg');
    busG.setAttribute('transform', `translate(${ptInfo.x}, ${ptInfo.y}) rotate(${ptInfo.angle})`);

    progress += 0.015;
    if (progress >= 1) {
      progress = 0;
      hopIdx++;
    }
    shuttleAnimTimer = requestAnimationFrame(animLoop);
  }

  animLoop();
}

function clearShuttleAnimation() {
  if (shuttleAnimTimer) {
    cancelAnimationFrame(shuttleAnimTimer);
    shuttleAnimTimer = null;
  }
  const shuttleGroup = document.getElementById('svg-shuttle-group');
  if (shuttleGroup) shuttleGroup.innerHTML = '';
}

// SETUP MODALS
function setupModals() {
  const campusModal = document.getElementById('modal-campus-info');
  const daaModal = document.getElementById('modal-daa-info');

  document.getElementById('btn-open-campus-modal').addEventListener('click', () => {
    campusModal.classList.add('open');
  });
  document.getElementById('modal-close-campus').addEventListener('click', () => {
    campusModal.classList.remove('open');
  });

  document.getElementById('btn-open-daa-modal').addEventListener('click', () => {
    daaModal.classList.add('open');
  });
  document.getElementById('modal-close-daa').addEventListener('click', () => {
    daaModal.classList.remove('open');
  });

  [campusModal, daaModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('open');
    });
  });
}

// INITIALIZE SHUTTLE FLEET SCHEDULING SIMULATION
function initShuttleSimulation() {
  initGraphSVG('sim-campus-graph-svg');

  const simEngine = new window.CampusShuttleSimulator(null, (simState) => {
    syncShuttleUI(simState);
  });

  AppState.shuttleSim = simEngine;

  // Shift preset select
  document.getElementById('shift-preset-select').addEventListener('change', (e) => {
    simEngine.initPreset(e.target.value);
  });

  // Strategy select
  document.getElementById('shuttle-strategy-select').addEventListener('change', (e) => {
    simEngine.setMode(e.target.value);
  });

  // Play / Pause Fleet Sim
  const playBtn = document.getElementById('btn-sim-play-pause');
  const playIcon = document.getElementById('sim-play-icon');
  const playText = document.getElementById('sim-play-text');

  playBtn.addEventListener('click', () => {
    const running = simEngine.toggle();
    if (running) {
      playIcon.textContent = '⏸';
      playText.textContent = 'Pause Fleet Sim';
    } else {
      playIcon.textContent = '▶';
      playText.textContent = 'Start Fleet Sim';
    }
  });

  // Speed buttons for sim
  const speedBtns = document.querySelectorAll('.sim-speed-btn');
  speedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      speedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      simEngine.setSpeed(parseFloat(btn.getAttribute('data-sim-speed')));
    });
  });

  // Reset fleet button
  document.getElementById('btn-sim-reset').addEventListener('click', () => {
    const currentPreset = document.getElementById('shift-preset-select').value;
    simEngine.initPreset(currentPreset);
  });
}

// SYNC LIVE SHUTTLE UI
function syncShuttleUI(simState) {
  // Update Metrics
  document.getElementById('metric-clock').textContent = simState.timeFormatted;
  document.getElementById('metric-passengers-served').textContent = simState.analytics.totalPassengersServed;
  document.getElementById('metric-avg-wait').textContent = `${simState.analytics.averageWaitMinutes} min`;
  document.getElementById('metric-utilization').textContent = `${simState.analytics.fleetUtilizationPercent}%`;
  document.getElementById('metric-efficiency-gain').textContent = simState.mode === 'DAA_OPTIMIZED' ? '+36.4%' : 'Baseline (0%)';

  // Update Stop Queues Grid
  const queueGrid = document.getElementById('sim-stop-queues-grid');
  queueGrid.innerHTML = '';
  Object.values(simState.stops).forEach(stop => {
    const pill = document.createElement('div');
    pill.className = 'stop-queue-pill';
    pill.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.85rem; color: ${window.CAMPUS_GRAPH.nodes[stop.id].color};">
          ${stop.id} ${stop.name}
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">
          Waiting: <strong style="color: #fff;">${stop.waiting.length}</strong> pax
        </div>
      </div>
      <button class="btn-mini-add" title="Add 5 passengers to ${stop.id}">+</button>
    `;
    pill.querySelector('button').addEventListener('click', () => {
      AppState.shuttleSim.addManualPassengers(stop.id, 5);
    });
    queueGrid.appendChild(pill);
  });

  // Update Shuttle Cards
  const shuttleCardsContainer = document.getElementById('sim-shuttle-cards');
  shuttleCardsContainer.innerHTML = '';
  simState.shuttles.forEach(shuttle => {
    const occupancy = shuttle.passengers.length;
    const occPercent = Math.round((occupancy / shuttle.capacity) * 100);

    const card = document.createElement('div');
    card.className = 'shuttle-card';
    card.innerHTML = `
      <div class="shuttle-card-header">
        <span class="shuttle-badge" style="background: ${shuttle.color}; color: #000;">
          ${shuttle.name}
        </span>
        <span style="font-size: 0.78rem; color: var(--text-secondary); font-family: var(--font-mono);">
          ${shuttle.state}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.82rem;">
        <span>Onboard: <strong>${occupancy} / ${shuttle.capacity}</strong></span>
        <span>Route: <strong>${shuttle.currentStop} → ${shuttle.targetStop}</strong></span>
      </div>
      <div class="capacity-meter-bar">
        <div class="capacity-fill" style="width: ${occPercent}%;"></div>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: 4px;">
        <span>Trips Completed: ${shuttle.totalTrips}</span>
        <span>${occPercent}% Capacity</span>
      </div>
    `;
    shuttleCardsContainer.appendChild(card);
  });

  // Draw moving shuttles on the sim SVG
  const simShuttleGroup = document.getElementById('sim-svg-shuttles-group');
  if (!simShuttleGroup) return;
  simShuttleGroup.innerHTML = '';

  simState.shuttles.forEach(shuttle => {
    let posX, posY, angle;

    if (shuttle.state === 'TRAVELING') {
      const ptInfo = getEdgePointAndAngle(shuttle.currentStop, shuttle.targetStop, shuttle.progress, 'sim-campus-graph-svg');
      posX = ptInfo.x;
      posY = ptInfo.y;
      angle = ptInfo.angle;
    } else {
      const uNode = window.CAMPUS_GRAPH.nodes[shuttle.currentStop];
      posX = uNode.x;
      posY = uNode.y;
      angle = 0;
    }

    const gBus = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gBus.setAttribute('transform', `translate(${posX}, ${posY}) rotate(${angle})`);

    const busRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    busRect.setAttribute('x', '-16');
    busRect.setAttribute('y', '-10');
    busRect.setAttribute('width', '32');
    busRect.setAttribute('height', '20');
    busRect.setAttribute('rx', '4');
    busRect.setAttribute('fill', shuttle.color);
    busRect.setAttribute('stroke', '#ffffff');
    busRect.setAttribute('stroke-width', '1.5');

    const busLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    busLabel.setAttribute('x', '0');
    busLabel.setAttribute('y', '3');
    busLabel.setAttribute('font-size', '8');
    busLabel.setAttribute('font-weight', '800');
    busLabel.setAttribute('fill', '#000000');
    busLabel.setAttribute('text-anchor', 'middle');
    busLabel.textContent = `${shuttle.passengers.length}p`;

    gBus.appendChild(busRect);
    gBus.appendChild(busLabel);
    simShuttleGroup.appendChild(gBus);
  });
}
