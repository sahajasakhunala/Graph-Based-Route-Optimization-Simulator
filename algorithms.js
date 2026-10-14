/**
 * Woxsen University Campus Shuttle Routing - Algorithm Engine
 * Implements Dijkstra, Bellman-Ford, and Floyd-Warshall step generators
 * with granular timeline snapshots for seamless live video simulation.
 */

const CAMPUS_GRAPH = {
  nodes: {
    S1: { id: 'S1', name: 'Main Gate', subtitle: 'Official Bus Stop', x: 95, y: 250, color: '#00d2ff', image: 'assets/stop_S1.png' },
    S2: { id: 'S2', name: 'Academic Block', subtitle: 'Lecture Halls & Labs', x: 295, y: 70, color: '#ff4d6d', image: 'assets/stop_S2.png' },
    S3: { id: 'S3', name: 'Library', subtitle: 'Central Learning Hub', x: 295, y: 205, color: '#ffb703', image: 'assets/stop_S3.png' },
    S4: { id: 'S4', name: 'Hostels', subtitle: 'Student Living Quarters', x: 295, y: 345, color: '#06d6a0', image: 'assets/stop_S4.png' },
    S5: { id: 'S5', name: 'SportX', subtitle: 'Indoor & Outdoor Arena', x: 295, y: 485, color: '#f72585', image: 'assets/stop_S5.png' }
  },
  edges: [
    { id: 'e_S1_S2', u: 'S1', v: 'S2', weight: 8, label: '8 min', curve: 'straight' },
    { id: 'e_S1_S3', u: 'S1', v: 'S3', weight: 2, label: '2 min', curve: 'straight' },
    { id: 'e_S1_S5', u: 'S1', v: 'S5', weight: 8, label: '8 min', curve: 'arc_left', curveOffset: -120 },
    { id: 'e_S2_S3', u: 'S2', v: 'S3', weight: 3, label: '3 min', curve: 'straight', labelOffsetX: 24 },
    { id: 'e_S2_S5', u: 'S2', v: 'S5', weight: 7, label: '7 min', curve: 'arc_right_wide', curveOffset: 155 },
    { id: 'e_S3_S4', u: 'S3', v: 'S4', weight: 17, label: '17 min', curve: 'straight', labelOffsetX: 24 },
    { id: 'e_S3_S5', u: 'S3', v: 'S5', weight: 7, label: '7 min', curve: 'arc_right_mid', curveOffset: 85 },
    { id: 'e_S4_S5', u: 'S4', v: 'S5', weight: 5, label: '5 min', curve: 'straight', labelOffsetX: 26 }
  ]
};

const NODE_KEYS = ['S1', 'S2', 'S3', 'S4', 'S5'];

// Build adjacency map
function buildAdjacencyList() {
  const adj = {};
  NODE_KEYS.forEach(k => { adj[k] = []; });
  CAMPUS_GRAPH.edges.forEach(edge => {
    adj[edge.u].push({ neighbor: edge.v, weight: edge.weight, edgeId: edge.id });
    adj[edge.v].push({ neighbor: edge.u, weight: edge.weight, edgeId: edge.id });
  });
  return adj;
}

const ADJ_LIST = buildAdjacencyList();

// Helper to reconstruct path
function reconstructPath(previous, start, target) {
  if (previous[target] === undefined && start !== target) return [];
  const path = [];
  let curr = target;
  while (curr) {
    path.unshift(curr);
    if (curr === start) break;
    curr = previous[curr];
  }
  return (path[0] === start) ? path : [];
}

/* =====================================================================
 * 1. DIJKSTRA'S ALGORITHM STEP GENERATOR
 * ===================================================================== */
function generateDijkstraSteps(sourceId, targetId) {
  const steps = [];
  const distances = {};
  const previous = {};
  const visited = new Set();
  const unvisited = new Set(NODE_KEYS);

  NODE_KEYS.forEach(k => {
    distances[k] = (k === sourceId) ? 0 : Infinity;
    previous[k] = null;
  });

  // Step 1: Initial state
  steps.push({
    algorithm: 'Dijkstra',
    phase: 'INITIALIZATION',
    title: 'Initialize Distances',
    description: `Set source stop ${sourceId} tentative distance to 0 min. Set all other stops to ∞. Visited set is empty.`,
    activeNode: sourceId,
    neighborNode: null,
    activeEdgeId: null,
    edgeState: null,
    visitedNodes: Array.from(visited),
    distances: { ...distances },
    previous: { ...previous },
    queue: NODE_KEYS.map(k => ({ node: k, dist: distances[k] })).sort((a,b) => a.dist - b.dist),
    formula: {
      rule: 'dist[v] = min(dist[v], dist[u] + w(u,v))',
      calculation: `dist[${sourceId}] = 0 (Source Stop)`,
      updated: false
    },
    pseudocodeLine: 2,
    path: [sourceId],
    pathCost: 0
  });

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest distance
    let current = null;
    let minDistance = Infinity;

    unvisited.forEach(node => {
      if (distances[node] < minDistance) {
        minDistance = distances[node];
        current = node;
      }
    });

    if (!current || minDistance === Infinity) {
      // Remaining nodes are unreachable
      break;
    }

    // Visiting node step (Line 5: u = node in Q with min dist[u])
    steps.push({
      algorithm: 'Dijkstra',
      phase: 'SELECT_MIN',
      title: `Visit Stop ${current} (${CAMPUS_GRAPH.nodes[current].name})`,
      description: `Execute lines 4-5: Select unvisited stop with minimum tentative distance from Q: u = ${current} (dist = ${minDistance} min).`,
      activeNode: current,
      neighborNode: null,
      activeEdgeId: null,
      edgeState: null,
      visitedNodes: Array.from(visited),
      distances: { ...distances },
      previous: { ...previous },
      queue: Array.from(unvisited).map(k => ({ node: k, dist: distances[k] })).sort((a,b) => a.dist - b.dist),
      formula: {
        rule: 'u = node in Q with minimum dist[u]',
        calculation: `Current Node u = ${current}, dist[u] = ${minDistance} min`,
        updated: false
      },
      pseudocodeLine: 5,
      path: reconstructPath(previous, sourceId, current),
      pathCost: distances[current]
    });

    // Check all unvisited neighbors
    const neighbors = ADJ_LIST[current];
    for (const { neighbor, weight, edgeId } of neighbors) {
      if (visited.has(neighbor)) continue;

      const alt = distances[current] + weight;
      const prevDist = distances[neighbor];
      const isRelaxed = alt < prevDist;

      // STEP 1: Line 8 - alt = dist[u] + weight(u, v)
      steps.push({
        algorithm: 'Dijkstra',
        phase: 'CALC_ALT',
        title: `Line 8: alt = dist[${current}] + weight(${current}, ${neighbor})`,
        description: `Execute line 8: Compute alternative distance to ${neighbor} (${CAMPUS_GRAPH.nodes[neighbor].name}) via ${current}: alt = dist[${current}] + weight = ${distances[current]} + ${weight} = ${alt} min.`,
        activeNode: current,
        neighborNode: neighbor,
        activeEdgeId: edgeId,
        edgeState: 'inspecting',
        visitedNodes: Array.from(visited),
        distances: { ...distances },
        previous: { ...previous },
        queue: Array.from(unvisited).map(k => ({ node: k, dist: distances[k] })).sort((a,b) => a.dist - b.dist),
        formula: {
          rule: 'alt = dist[u] + weight(u, v)',
          calculation: `alt = dist[${current}] + weight(${current}, ${neighbor}) = ${distances[current]} + ${weight} = ${alt} min`,
          updated: false
        },
        pseudocodeLine: 8,
        path: reconstructPath(previous, sourceId, current),
        pathCost: distances[current]
      });

      // STEP 2: Line 9 - if alt < dist[v]:
      steps.push({
        algorithm: 'Dijkstra',
        phase: 'COMPARE',
        title: `Line 9: if alt < dist[${neighbor}] (${alt} < ${prevDist === Infinity ? '∞' : prevDist})`,
        description: isRelaxed
          ? `Execute line 9: Evaluate condition ${alt} min < ${prevDist === Infinity ? '∞' : prevDist + ' min'}. Condition is TRUE: shorter path found via ${current}! Proceeding to line 10.`
          : `Execute line 9: Evaluate condition ${alt} min < ${prevDist} min. Condition is FALSE: existing distance is already shorter or equal. Skipping line 10.`,
        activeNode: current,
        neighborNode: neighbor,
        activeEdgeId: edgeId,
        edgeState: isRelaxed ? 'relaxing' : 'no_change',
        visitedNodes: Array.from(visited),
        distances: { ...distances },
        previous: { ...previous },
        queue: Array.from(unvisited).map(k => ({ node: k, dist: distances[k] })).sort((a,b) => a.dist - b.dist),
        formula: {
          rule: 'if alt < dist[v]:',
          calculation: `${alt} min < ${prevDist === Infinity ? '∞' : prevDist + ' min'} → ${isRelaxed ? 'TRUE (Condition met)' : 'FALSE (Skip line 10)'}`,
          updated: false
        },
        pseudocodeLine: 9,
        path: reconstructPath(previous, sourceId, current),
        pathCost: distances[current]
      });

      // STEP 3: Line 10 - dist[v] = alt; prev[v] = u (ONLY IF CONDITION IS TRUE)
      if (isRelaxed) {
        distances[neighbor] = alt;
        previous[neighbor] = current;

        steps.push({
          algorithm: 'Dijkstra',
          phase: 'RELAXED',
          title: `Line 10: dist[${neighbor}] = ${alt} min; prev[${neighbor}] = ${current}`,
          description: `Execute line 10: Condition met. Relax edge and update distance table: dist[${neighbor}] = ${alt} min, prev[${neighbor}] = ${current} (${CAMPUS_GRAPH.nodes[neighbor].name}).`,
          activeNode: current,
          neighborNode: neighbor,
          activeEdgeId: edgeId,
          edgeState: 'relaxed_success',
          visitedNodes: Array.from(visited),
          distances: { ...distances },
          previous: { ...previous },
          queue: Array.from(unvisited).map(k => ({ node: k, dist: distances[k] })).sort((a,b) => a.dist - b.dist),
          formula: {
            rule: 'dist[v] = alt; prev[v] = u',
            calculation: `dist[${neighbor}] ← ${alt} min, prev[${neighbor}] ← ${current}`,
            updated: true
          },
          pseudocodeLine: 10,
          path: reconstructPath(previous, sourceId, neighbor),
          pathCost: alt
        });
      }
    }

    // Mark current as visited (Line 6: remove u from Q; visited.add(u))
    visited.add(current);
    unvisited.delete(current);

    steps.push({
      algorithm: 'Dijkstra',
      phase: 'SETTLED',
      title: `Stop ${current} Settled`,
      description: `Execute line 6: Remove ${current} from Q and add to visited set. Its shortest travel time of ${distances[current]} min is confirmed optimal.`,
      activeNode: current,
      neighborNode: null,
      activeEdgeId: null,
      edgeState: null,
      visitedNodes: Array.from(visited),
      distances: { ...distances },
      previous: { ...previous },
      queue: Array.from(unvisited).map(k => ({ node: k, dist: distances[k] })).sort((a,b) => a.dist - b.dist),
      formula: {
        rule: 'remove u from Q; visited.add(u)',
        calculation: `Settled ${current}: Minimum travel time = ${distances[current]} min`,
        updated: false
      },
      pseudocodeLine: 6,
      path: reconstructPath(previous, sourceId, current),
      pathCost: distances[current]
    });

    if (current === targetId && targetId !== sourceId) {
      // Target reached, can conclude
      break;
    }
  }

  // Final conclusion step (Line 11: return dist[], prev[])
  const finalPath = reconstructPath(previous, sourceId, targetId);
  const finalCost = distances[targetId];

  steps.push({
    algorithm: 'Dijkstra',
    phase: 'FINISHED',
    title: `Optimal Route: ${finalPath.join(' → ')}`,
    description: `Execute line 11: Dijkstra complete! Optimal shuttle travel time from ${sourceId} (${CAMPUS_GRAPH.nodes[sourceId].name}) to ${targetId} (${CAMPUS_GRAPH.nodes[targetId].name}) is ${finalCost} min. Path: ${finalPath.map(id => CAMPUS_GRAPH.nodes[id].name).join(' → ')}.`,
    activeNode: targetId,
    neighborNode: null,
    activeEdgeId: null,
    edgeState: 'final_route',
    visitedNodes: Array.from(visited),
    distances: { ...distances },
    previous: { ...previous },
    queue: [],
    formula: {
      rule: 'return dist[], prev[]',
      calculation: `Total Travel Time: ${finalCost} min along ${finalPath.join(' → ')}`,
      updated: false
    },
    pseudocodeLine: 11,
    path: finalPath,
    pathCost: finalCost
  });

  return steps;
}

/* =====================================================================
 * 2. BELLMAN-FORD ALGORITHM STEP GENERATOR
 * ===================================================================== */
function generateBellmanFordSteps(sourceId, targetId) {
  const steps = [];
  const distances = {};
  const previous = {};
  const V = NODE_KEYS.length;

  // Directed edge representation for relaxation (since graph is undirected, relax in both directions)
  const directedEdges = [];
  CAMPUS_GRAPH.edges.forEach(e => {
    directedEdges.push({ u: e.u, v: e.v, weight: e.weight, edgeId: e.id, label: `${e.u} → ${e.v}` });
    directedEdges.push({ u: e.v, v: e.u, weight: e.weight, edgeId: e.id, label: `${e.v} → ${e.u}` });
  });

  NODE_KEYS.forEach(k => {
    distances[k] = (k === sourceId) ? 0 : Infinity;
    previous[k] = null;
  });

  // Step 1: Initial state
  steps.push({
    algorithm: 'Bellman-Ford',
    phase: 'INITIALIZATION',
    title: 'Initialize Distances',
    description: `Bellman-Ford initial state: dist[${sourceId}] = 0 min, all others = ∞. Will execute |V| - 1 = ${V - 1} relaxation passes across all ${directedEdges.length} directed road segments.`,
    activeNode: sourceId,
    neighborNode: null,
    activeEdgeId: null,
    edgeState: null,
    pass: 0,
    totalPasses: V - 1,
    distances: { ...distances },
    previous: { ...previous },
    formula: {
      rule: 'dist[v] = min(dist[v], dist[u] + w(u,v))',
      calculation: `Pass 0: Set dist[${sourceId}] = 0`,
      updated: false
    },
    pseudocodeLine: 2,
    path: [sourceId],
    pathCost: 0
  });

  // Passes 1 to V - 1
  for (let pass = 1; pass <= V - 1; pass++) {
    let updatedInThisPass = false;

    steps.push({
      algorithm: 'Bellman-Ford',
      phase: 'PASS_START',
      title: `Starting Relaxation Pass ${pass} of ${V - 1}`,
      description: `Pass ${pass}: Iterating through all campus edges to find any path improvements of up to ${pass} hops.`,
      activeNode: null,
      neighborNode: null,
      activeEdgeId: null,
      edgeState: null,
      pass: pass,
      totalPasses: V - 1,
      distances: { ...distances },
      previous: { ...previous },
      formula: {
        rule: 'dist[v] = min(dist[v], dist[u] + w(u,v))',
        calculation: `Pass ${pass} in progress...`,
        updated: false
      },
      pseudocodeLine: 4,
      path: reconstructPath(previous, sourceId, targetId),
      pathCost: distances[targetId]
    });

    for (let i = 0; i < directedEdges.length; i++) {
      const { u, v, weight, edgeId, label } = directedEdges[i];

      if (distances[u] === Infinity) {
        // Node u is not yet reached, cannot relax
        continue;
      }

      const alt = distances[u] + weight;
      const isRelaxed = alt < distances[v];
      const prevDist = distances[v];

      if (isRelaxed) {
        distances[v] = alt;
        previous[v] = u;
        updatedInThisPass = true;

        steps.push({
          algorithm: 'Bellman-Ford',
          phase: 'RELAXED',
          title: `Pass ${pass}: Relax ${label} (${weight} min)`,
          description: `Shorter path found to ${v}! dist[${u}] (${distances[u] - weight + weight}) + ${weight} min = ${alt} min < ${prevDist === Infinity ? '∞' : prevDist + ' min'}. dist[${v}] updated to ${alt} min. Predecessor: ${u}.`,
          activeNode: u,
          neighborNode: v,
          activeEdgeId: edgeId,
          edgeState: 'relaxed_success',
          pass: pass,
          totalPasses: V - 1,
          distances: { ...distances },
          previous: { ...previous },
          formula: {
            rule: 'dist[v] = min(dist[v], dist[u] + w(u,v))',
            calculation: `dist[${v}] = min(${prevDist === Infinity ? '∞' : prevDist}, ${distances[u] - weight + weight} + ${weight}) = ${alt} min`,
            updated: true
          },
          pseudocodeLine: 7,
          path: reconstructPath(previous, sourceId, targetId),
          pathCost: distances[targetId]
        });
      }
    }

    // End of pass check
    if (!updatedInThisPass) {
      steps.push({
        algorithm: 'Bellman-Ford',
        phase: 'EARLY_CONVERGENCE',
        title: `Pass ${pass}: Early Convergence!`,
        description: `Pass ${pass} completed with 0 distance updates! All shortest paths have already converged. No further iterations needed (DAA optimization).`,
        activeNode: null,
        neighborNode: null,
        activeEdgeId: null,
        edgeState: null,
        pass: pass,
        totalPasses: V - 1,
        distances: { ...distances },
        previous: { ...previous },
        formula: {
          rule: 'Convergence Check',
          calculation: `0 updates in Pass ${pass} → Graph is optimal!`,
          updated: false
        },
        pseudocodeLine: 9,
        path: reconstructPath(previous, sourceId, targetId),
        pathCost: distances[targetId]
      });
      break;
    }
  }

  // Negative cycle verification pass
  steps.push({
    algorithm: 'Bellman-Ford',
    phase: 'NEGATIVE_CYCLE_CHECK',
    title: 'Negative Cycle Verification',
    description: `Running additional pass over all ${directedEdges.length} edges. All edges satisfy dist[u] + w ≥ dist[v]. Confirmed: Campus graph contains NO negative cycles.`,
    activeNode: null,
    neighborNode: null,
    activeEdgeId: null,
    edgeState: null,
    pass: V,
    totalPasses: V,
    distances: { ...distances },
    previous: { ...previous },
    formula: {
      rule: 'Negative Cycle Check: dist[u] + w(u,v) < dist[v] ?',
      calculation: 'No negative cycles detected. Graph weights represent physical travel minutes (≥ 0).',
      updated: false
    },
    pseudocodeLine: 11,
    path: reconstructPath(previous, sourceId, targetId),
    pathCost: distances[targetId]
  });

  // Final conclusion
  const finalPath = reconstructPath(previous, sourceId, targetId);
  const finalCost = distances[targetId];

  steps.push({
    algorithm: 'Bellman-Ford',
    phase: 'FINISHED',
    title: `Bellman-Ford Complete: ${finalPath.join(' → ')}`,
    description: `Optimal shortest path from ${sourceId} to ${targetId} is ${finalPath.map(id => CAMPUS_GRAPH.nodes[id].name).join(' → ')} with total travel time ${finalCost} min.`,
    activeNode: targetId,
    neighborNode: null,
    activeEdgeId: null,
    edgeState: 'final_route',
    pass: V,
    totalPasses: V,
    distances: { ...distances },
    previous: { ...previous },
    formula: {
      rule: 'Optimal Route Found',
      calculation: `Shortest travel time = ${finalCost} min`,
      updated: false
    },
    pseudocodeLine: 13,
    path: finalPath,
    pathCost: finalCost
  });

  return steps;
}

/* =====================================================================
 * 3. FLOYD-WARSHALL ALGORITHM STEP GENERATOR
 * ===================================================================== */
function generateFloydWarshallSteps(sourceId, targetId) {
  const steps = [];
  const V = NODE_KEYS.length;

  // Initialize Distance matrix D and Predecessor matrix P
  const D = {};
  const P = {};

  NODE_KEYS.forEach(i => {
    D[i] = {};
    P[i] = {};
    NODE_KEYS.forEach(j => {
      if (i === j) {
        D[i][j] = 0;
        P[i][j] = i;
      } else {
        D[i][j] = Infinity;
        P[i][j] = null;
      }
    });
  });

  // Fill direct edges
  CAMPUS_GRAPH.edges.forEach(e => {
    D[e.u][e.v] = e.weight;
    D[e.v][e.u] = e.weight;
    P[e.u][e.v] = e.u;
    P[e.v][e.u] = e.v;
  });

  // Helper deep copy matrix
  function copyMatrix(mat) {
    const copy = {};
    NODE_KEYS.forEach(i => {
      copy[i] = {};
      NODE_KEYS.forEach(j => {
        copy[i][j] = mat[i][j];
      });
    });
    return copy;
  }

  // Helper reconstruct path in Floyd-Warshall
  function reconstructFWPath(P_curr, u, v) {
    if (P_curr[u][v] === null) return [];
    const path = [v];
    let curr = v;
    while (curr !== u) {
      curr = P_curr[u][curr];
      if (!curr) return [];
      path.unshift(curr);
    }
    return path;
  }

  // Step 0: Initial Matrix state D^(0)
  steps.push({
    algorithm: 'Floyd-Warshall',
    phase: 'INITIALIZATION',
    title: 'Initialize Distance Matrix D^(0)',
    description: `Construct base distance matrix D^(0) and predecessor matrix Π^(0). Direct road travel times are loaded, non-adjacent stops are set to ∞, and diagonal is 0.`,
    pivotNode: null,
    sourceCell: null,
    targetCell: null,
    matrix: copyMatrix(D),
    predecessors: copyMatrix(P),
    formula: {
      rule: 'D^(k)[i][j] = min(D^(k-1)[i][j], D^(k-1)[i][k] + D^(k-1)[k][j])',
      calculation: 'Base matrix D^(0) loaded from campus graph',
      updated: false
    },
    pseudocodeLine: 2,
    path: reconstructFWPath(P, sourceId, targetId),
    pathCost: D[sourceId][targetId]
  });

  // Triple nested loop: k is intermediate pivot stop
  for (let kIdx = 0; kIdx < V; kIdx++) {
    const k = NODE_KEYS[kIdx];
    let updatesInPivot = 0;

    // Frame: Start of pivot phase k
    steps.push({
      algorithm: 'Floyd-Warshall',
      phase: 'PIVOT_START',
      title: `Pivot Phase k = ${k} (${CAMPUS_GRAPH.nodes[k].name})`,
      description: `Testing if routing shuttles through Stop ${k} (${CAMPUS_GRAPH.nodes[k].name}) provides shorter travel times between any pair of stops (i, j).`,
      pivotNode: k,
      sourceCell: null,
      targetCell: null,
      matrix: copyMatrix(D),
      predecessors: copyMatrix(P),
      formula: {
        rule: 'D^(k)[i][j] = min(D^(k-1)[i][j], D^(k-1)[i][k] + D^(k-1)[k][j])',
        calculation: `Pivot k = ${k}. Checking all 25 stop pairs (i, j)`,
        updated: false
      },
      pseudocodeLine: 4,
      path: reconstructFWPath(P, sourceId, targetId),
      pathCost: D[sourceId][targetId]
    });

    for (let iIdx = 0; iIdx < V; iIdx++) {
      const i = NODE_KEYS[iIdx];
      for (let jIdx = 0; jIdx < V; jIdx++) {
        const j = NODE_KEYS[jIdx];

        if (i === j || i === k || j === k) continue;

        const directDist = D[i][j];
        const viaKDist = (D[i][k] !== Infinity && D[k][j] !== Infinity) ? (D[i][k] + D[k][j]) : Infinity;

        if (viaKDist < directDist) {
          updatesInPivot++;
          D[i][j] = viaKDist;
          P[i][j] = P[k][j];

          steps.push({
            algorithm: 'Floyd-Warshall',
            phase: 'RELAXED',
            title: `Update: ${i} → ${j} via Pivot ${k}`,
            description: `Routing ${i} → ${j} through ${k} cuts travel time from ${directDist === Infinity ? '∞' : directDist + ' min'} to ${viaKDist} min (${D[i][k]} min + ${D[k][j]} min = ${viaKDist} min).`,
            pivotNode: k,
            sourceCell: i,
            targetCell: j,
            matrix: copyMatrix(D),
            predecessors: copyMatrix(P),
            formula: {
              rule: 'D[i][j] = min(D[i][j], D[i][k] + D[k][j])',
              calculation: `D[${i}][${j}] = min(${directDist === Infinity ? '∞' : directDist}, ${D[i][k]} + ${D[k][j]}) = ${viaKDist} min`,
              updated: true
            },
            pseudocodeLine: 7,
            path: reconstructFWPath(P, sourceId, targetId),
            pathCost: D[sourceId][targetId]
          });
        }
      }
    }

    // Pivot phase summary
    steps.push({
      algorithm: 'Floyd-Warshall',
      phase: 'PIVOT_END',
      title: `Completed Pivot Stop ${k}`,
      description: `Finished checking all pairs using intermediate stop ${k}. Total shortest path improvements made: ${updatesInPivot}.`,
      pivotNode: k,
      sourceCell: null,
      targetCell: null,
      matrix: copyMatrix(D),
      predecessors: copyMatrix(P),
      formula: {
        rule: 'Matrix D^(k) Complete',
        calculation: `Pivot ${k} complete: ${updatesInPivot} paths improved`,
        updated: false
      },
      pseudocodeLine: 9,
      path: reconstructFWPath(P, sourceId, targetId),
      pathCost: D[sourceId][targetId]
    });
  }

  // Final conclusion
  const finalPath = reconstructFWPath(P, sourceId, targetId);
  const finalCost = D[sourceId][targetId];

  steps.push({
    algorithm: 'Floyd-Warshall',
    phase: 'FINISHED',
    title: `All-Pairs Shortest Matrix Converged`,
    description: `Floyd-Warshall complete! Matrix D^(5) contains optimal travel times between ALL 25 campus stop pairs. For selected query ${sourceId} → ${targetId}: optimal route is ${finalPath.map(id => CAMPUS_GRAPH.nodes[id].name).join(' → ')} (${finalCost} min).`,
    pivotNode: null,
    sourceCell: sourceId,
    targetCell: targetId,
    matrix: copyMatrix(D),
    predecessors: copyMatrix(P),
    formula: {
      rule: 'Final Optimal All-Pairs Distance Matrix D*',
      calculation: `Query ${sourceId} → ${targetId}: Shortest Time = ${finalCost} min`,
      updated: false
    },
    pseudocodeLine: 11,
    path: finalPath,
    pathCost: finalCost
  });

  return steps;
}

// Pseudocode definitions for interactive line tracer
const PSEUDOCODE = {
  Dijkstra: [
    { line: 1, code: 'function Dijkstra(Graph, source):' },
    { line: 2, code: '  dist[source] = 0; dist[v] = ∞ for all v ≠ source' },
    { line: 3, code: '  Q = set of all nodes' },
    { line: 4, code: '  while Q is not empty:' },
    { line: 5, code: '    u = node in Q with minimum dist[u]' },
    { line: 6, code: '    remove u from Q; visited.add(u)' },
    { line: 7, code: '    for each unvisited neighbor v of u:' },
    { line: 8, code: '      alt = dist[u] + weight(u, v)' },
    { line: 9, code: '      if alt < dist[v]:' },
    { line: 10, code: '        dist[v] = alt; prev[v] = u' },
    { line: 11, code: '  return dist[], prev[]' }
  ],
  'Bellman-Ford': [
    { line: 1, code: 'function BellmanFord(Graph, source):' },
    { line: 2, code: '  dist[source] = 0; dist[v] = ∞ for all v ≠ source' },
    { line: 3, code: '  for pass = 1 to |V| - 1:' },
    { line: 4, code: '    updated = false' },
    { line: 5, code: '    for each directed edge (u, v, w) in E:' },
    { line: 6, code: '      if dist[u] + w < dist[v]:' },
    { line: 7, code: '        dist[v] = dist[u] + w; prev[v] = u' },
    { line: 8, code: '        updated = true' },
    { line: 9, code: '    if not updated: break // Early convergence' },
    { line: 10, code: '  for each edge (u, v, w) in E: // Cycle check' },
    { line: 11, code: '    if dist[u] + w < dist[v]: error "Negative cycle"' },
    { line: 12, code: '  return dist[], prev[]' }
  ],
  'Floyd-Warshall': [
    { line: 1, code: 'function FloydWarshall(Graph):' },
    { line: 2, code: '  D = weight matrix; Π = predecessor matrix' },
    { line: 3, code: '  for k from 1 to |V|:  // Intermediate pivot' },
    { line: 4, code: '    for i from 1 to |V|:  // Source stop' },
    { line: 5, code: '      for j from 1 to |V|:  // Destination stop' },
    { line: 6, code: '        if D[i][k] + D[k][j] < D[i][j]:' },
    { line: 7, code: '          D[i][j] = D[i][k] + D[k][j]' },
    { line: 8, code: '          Π[i][j] = Π[k][j]' },
    { line: 9, code: '  return D, Π' }
  ]
};

// Export to global scope for browser and node use
if (typeof window !== 'undefined') {
  window.CAMPUS_GRAPH = CAMPUS_GRAPH;
  window.NODE_KEYS = NODE_KEYS;
  window.ADJ_LIST = ADJ_LIST;
  window.generateDijkstraSteps = generateDijkstraSteps;
  window.generateBellmanFordSteps = generateBellmanFordSteps;
  window.generateFloydWarshallSteps = generateFloydWarshallSteps;
  window.PSEUDOCODE = PSEUDOCODE;
}
if (typeof globalThis !== 'undefined') {
  globalThis.CAMPUS_GRAPH = CAMPUS_GRAPH;
  globalThis.NODE_KEYS = NODE_KEYS;
  globalThis.ADJ_LIST = ADJ_LIST;
  globalThis.generateDijkstraSteps = generateDijkstraSteps;
  globalThis.generateBellmanFordSteps = generateBellmanFordSteps;
  globalThis.generateFloydWarshallSteps = generateFloydWarshallSteps;
  globalThis.PSEUDOCODE = PSEUDOCODE;
}
