# Woxsen University: Campus Shuttle Routing and Live Algorithm Simulation

### Design and Analysis of Algorithms (DAA) Project
*Problem Formulation: Campus Shuttle Routing and Optimization on Weighted Undirected Graphs*

---

## 1. Project Overview

At Woxsen University, efficient mobility across academic zones, residential blocks, central facilities, and transit access points is critical for daily operations.

This project implements an interactive simulation and comparative analysis of graph-based route optimization algorithms applied to the Woxsen University campus shuttle network:
1. **Dijkstra's Algorithm** (Single-Source Shortest Path - Greedy Paradigm)
2. **Bellman-Ford Algorithm** (Single-Source Shortest Path - Dynamic Programming Paradigm)
3. **Floyd-Warshall Algorithm** (All-Pairs Shortest Path - Dynamic Programming Matrix Formulation)
4. **Campus Shuttle Simulation** (Interactive route traversal and state verification)

The platform provides a step-by-step visualizer with synchronized playback controls, speed regulation, real-time node and distance table updates, dynamic edge evaluations, and line-by-line pseudocode execution tracking.

---

## 2. Academic Metadata

- **Student Name**: Sakhunala Sahaja
- **Roll Number**: 25WU0102237
- **Course**: Design and Analysis of Algorithms
- **Course Code**: 25TU03MJM1
- **Faculty Supervisor**: Dr. Ali Nadim Alhaj
- **Institution**: Woxsen University

---

## 3. Campus Network Graph Model

The campus transit network is modeled as a weighted undirected graph G = (V, E):
- **Vertices (V, |V| = 5)**: Designated transit stops across campus.
- **Edges (E, |E| = 8)**: Physical road corridors connecting adjacent stops.
- **Weights w(u, v)**: Standard transit times measured in minutes.

### Vertices Definition
| Node ID | Stop Name | Functional Zone |
| :---: | :--- | :--- |
| S1 | Main Gate | Campus transit terminal and security check |
| S2 | Academic Block | Classrooms, academic departments, faculty offices |
| S3 | Library | Central Library and digital study resource center |
| S4 | Hostels | Student residential halls and dining spaces |
| S5 | SportX | Sports complex and physical recreation facilities |

### Edge Definitions and Weights
| Edge ID | Source Node (u) | Target Node (v) | Weight w(u, v) [minutes] |
| :---: | :---: | :---: | :---: |
| e_S1_S2 | S1 (Main Gate) | S2 (Academic Block) | 8 |
| e_S1_S3 | S1 (Main Gate) | S3 (Library) | 2 |
| e_S1_S5 | S1 (Main Gate) | S5 (SportX) | 8 |
| e_S2_S3 | S2 (Academic Block) | S3 (Library) | 3 |
| e_S2_S5 | S2 (Academic Block) | S5 (SportX) | 7 |
| e_S3_S4 | S3 (Library) | S4 (Hostels) | 17 |
| e_S3_S5 | S3 (Library) | S5 (SportX) | 7 |
| e_S4_S5 | S4 (Hostels) | S5 (SportX) | 5 |

---

## 4. Theoretical Analysis of Implemented Algorithms

### Algorithmic Comparison
| Parameter | Dijkstra's Algorithm | Bellman-Ford Algorithm | Floyd-Warshall Algorithm |
| :--- | :--- | :--- | :--- |
| Design Paradigm | Greedy | Dynamic Programming | Dynamic Programming |
| Scope | Single-Source Shortest Path | Single-Source Shortest Path | All-Pairs Shortest Path |
| Time Complexity | O((V + E) log V) with min-heap | O(V * E) | O(V³) |
| Space Complexity | O(V) | O(V) | O(V²) |
| Negative Edge Support | Not supported (requires w >= 0) | Supported | Supported |
| Negative Cycle Detection | Unable to detect | Detects negative cycles | Detects negative cycles |
| Optimal Application | Real-time single-vehicle dispatch | Routing under traffic penalties | Precomputed campus routing matrix |

### Recurrence Formulations

#### Dijkstra Relaxation Condition
$$\text{alt} = \text{dist}[u] + w(u, v)$$
$$\text{if } \text{alt} < \text{dist}[v] \implies \text{dist}[v] = \text{alt}, \quad \text{prev}[v] = u$$

#### Bellman-Ford Recurrence
$$\text{dist}^{(k)}[v] = \min \left( \text{dist}^{(k-1)}[v], \; \text{dist}^{(k-1)}[u] + w(u, v) \right) \quad \forall (u, v) \in E$$
$$\text{for iteration } k = 1, 2, \dots, |V| - 1$$

#### Floyd-Warshall Recurrence
$$d^{(k)}[i][j] = \min \left( d^{(k-1)}[i][j], \; d^{(k-1)}[i][k] + d^{(k-1)}[k][j] \right)$$
$$\text{for intermediate vertex } k = 1, 2, \dots, |V|$$

---

## 5. System Features

1. **Step-by-Step State Visualization**:
   - Automated playback and pause controls for all three algorithms.
   - Variable playback speeds: 0.25x, 0.5x, 1x, 1.5x, 2x, and 4x.
   - Interactive manual controls: Previous Step, Next Step, and Reset.
   - Discrete step counter indicating active step index and total steps.

2. **Synchronized Execution Tracking**:
   - Explicit highlighting of tentative weight calculation, comparison, and relaxation.
   - Simultaneous tabular updates of distances and predecessor pointers.
   - Floyd-Warshall intermediate pivot row and column visualization on a 5x5 distance matrix.

3. **Graph Layout and Usability**:
   - Stable canvas rendering preventing element jumping or style distortion during cursor interactions.
   - Draggable node anchors to optimize visual clarity and eliminate edge label overlap.
   - Constrained campus shuttle animation following validated edge paths.

---

## 6. Project Structure

```text
DAA PROJECT/
|-- index.html                 # Main interface and interactive visualizer
|-- styles.css                 # Application styling and layout rules
|-- app.js                     # Core application coordinator and graph rendering
|-- algorithms.js              # Implementations and step generators for Dijkstra, Bellman-Ford, Floyd-Warshall
|-- shuttle_simulation.js      # Dynamic vehicle path animation and trajectory logic
|-- serve.py                   # Local development server
|-- README.md                  # Project documentation
|-- PROJECT_REPORT.md          # Comprehensive academic report
|-- DAA_PROJECT_REPORT.html    # Formatted printable academic report
`-- assets/                    # Node icons and media resources
```

---

## 7. Execution Instructions

### Method 1: Local File Execution
Open `index.html` directly in any standard modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox).

### Method 2: Local HTTP Server
Run the included Python script to serve the application locally:
```powershell
python serve.py
```
The server will start at `http://localhost:5000` and automatically launch the default browser.

---

## 8. Keyboard Controls

| Key | Action |
| :--- | :--- |
| Spacebar | Play or Pause simulation playback |
| Right Arrow | Advance to next step |
| Left Arrow | Return to previous step |
| R | Reset simulation to initial state |
| Home (or Fn + Left Arrow on compact laptops) | Jump directly to step 1 |
| End (or Fn + Right Arrow on compact laptops) | Jump directly to final step |
