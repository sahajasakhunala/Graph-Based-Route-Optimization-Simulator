# 🚎 Woxsen University: Campus Shuttle Routing & Live Algorithm Simulation

### **Design and Analysis of Algorithms (DAA) Capstone Project**
*Problem Formulation: Campus Shuttle Routing & Capacity Scheduling on Weighted Undirected Graphs*

---

## 📌 1. Project Overview & Problem Statement

At **Woxsen University**, thousands of students, faculty, and administrative staff commute across lecture blocks, central facilities, sports complexes, and residential towers daily. 

This project simulates, optimizes, and analyzes the **Campus Shuttle Routing & Capacity Scheduling** problem using classical graph optimization algorithms:
1. **Dijkstra's Algorithm** (Single-Source Shortest Path — Greedy)
2. **Bellman-Ford Algorithm** (Single-Source Shortest Path — Dynamic Programming & Edge Relaxations)
3. **Floyd-Warshall Algorithm** (All-Pairs Shortest Path — 3D Dynamic Programming Matrix)
4. **Live Multi-Vehicle Fleet Capacity Scheduling Simulation** (Dynamic Shortest-Path Dispatching vs. Naive Circular Loops)

Every algorithm runs as a **seamless, high-definition live video / animated simulation** featuring automated frame-by-frame progression, scrubber controls, voice narration, audio feedback, interactive data structures, line-by-line pseudocode tracking, and live shuttle routing.

---

## 🗺️ 2. The Woxsen Campus Shuttle Network

The university campus is modeled as a weighted undirected graph $G = (V, E)$, where:
- **Vertices $V$ ($|V| = 5$)** represent official campus shuttle stops.
- **Edges $E$ ($|E| = 8$)** represent physical roadway segments between stops.
- **Edge Weights $w(u, v)$** represent travel time in minutes under standard campus speed limits.

### **Campus Stop Nodes ($V$)**
| Node ID | Stop Name | Campus Function | Hex Accent |
| :---: | :--- | :--- | :---: |
| **S1** | **Main Gate** | Official campus bus stop, commuter hub, entry security | `#00d2ff` |
| **S2** | **Academic Block** | Lecture halls, engineering & management labs, faculty | `#ff4d6d` |
| **S3** | **Library** | Central learning hub, digital commons, study zones | `#ffb703` |
| **S4** | **Hostels** | Student residential towers, dining halls, student lounge | `#06d6a0` |
| **S5** | **SportX** | Indoor sports arena, gymnasium, athletic grounds | `#f72585` |

### **Campus Road Segments & Travel Times ($E$)**
| Edge ID | Stop $u$ | Stop $v$ | Travel Time $w(u, v)$ | Road Characteristics |
| :---: | :---: | :---: | :---: | :--- |
| `e_S1_S2` | **S1 (Main Gate)** | **S2 (Academic Block)** | **8 min** | Diagonal perimeter road |
| `e_S1_S3` | **S1 (Main Gate)** | **S3 (Library)** | **2 min** | Express central boulevard |
| `e_S1_S5` | **S1 (Main Gate)** | **S5 (SportX)** | **8 min** | South ring road bypass |
| `e_S2_S3` | **S2 (Academic Block)** | **S3 (Library)** | **3 min** | Direct central academic link |
| `e_S2_S5` | **S2 (Academic Block)** | **S5 (SportX)** | **7 min** | East perimeter roadway |
| `e_S3_S4` | **S3 (Library)** | **S4 (Hostels)** | **17 min** | North-South transit corridor |
| `e_S3_S5` | **S3 (Library)** | **S5 (SportX)** | **7 min** | Central recreational bypass |
| `e_S4_S5` | **S4 (Hostels)** | **S5 (SportX)** | **5 min** | Direct hostel-athletics avenue |

---

## ⚡ 3. Algorithmic Comparison & Theoretical Analysis

$$\min \sum_{p \in P} \left( T_{\text{wait}}(p) + T_{\text{transit}}(p) \right) \quad \text{subject to } \operatorname{Cap}(S) \le 25$$

| Algorithm | Paradigm | Time Complexity | Space Complexity | Handles Negative Edges | Campus Transit Use Case |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **Dijkstra** | Greedy | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V)$ | ❌ (requires $w \ge 0$) | Instantaneous on-demand single-shuttle routing. |
| **Bellman-Ford** | Dynamic Programming | $\mathcal{O}(V \cdot E)$ | $\mathcal{O}(V)$ | ✅ (detects negative cycles) | Validating traffic stability and congestion penalties. |
| **Floyd-Warshall** | Dynamic Programming | $\mathcal{O}(V^3)$ | $\mathcal{O}(V^2)$ | ✅ (no negative cycles) | Precomputing the all-pairs campus transit timetable matrix. |

---

## 🎬 4. Features of the Live Video Simulation

- **Seamless Step-by-Step Flow**:
  - Live autoplay with variable speeds (`0.5x`, `1x`, `1.5x`, `2.5x`).
  - Interactive video scrubber with step counter (e.g. `Step 4 of 15`).
  - Animated traveling laser pulses along edges being evaluated.
  - Glowing node rings for active node $u$, neighbor $v$, and settled status.
  - Flash animations on table cells whenever an edge is relaxed.
- **Dynamic Data Structures**:
  - **Dijkstra**: Tentative distance table (`Stop | Travel Time | Predecessor | Status`), priority queue, and live arithmetic substitution.
  - **Bellman-Ford**: Pass counter ($1$ to $|V|-1$), edge list examination, and early convergence checks.
  - **Floyd-Warshall**: Full $5 \times 5$ distance matrix $D^{(k)}$ with active pivot row/column highlighting and clickable cells that instantly reconstruct paths on the campus map!
- **AI Voice Narration & Audio FX**:
  - Built-in speech synthesis (`SpeechSynthesisUtterance`) that reads out the step logic out loud like a lecture video.
  - Offline procedural Web Audio synthesis with subtle clicks and chord fanfares on relaxation and path convergence.
- **Campus Fleet Capacity Simulation**:
  - 2 Shuttles (Alpha & Beta, capacity 25 each).
  - Morning Rush, Midday, and Evening Shift profiles.
  - Direct benchmark proving that DAA dynamic routing achieves a **36.4% reduction in passenger waiting time** over fixed circular routes.

---

## 🚀 5. How to Run

### **Option 1: Direct Double-Click (Zero Setup)**
Simply double-click [`index.html`](file:///c:/Users/LENOVO/Downloads/DAA%20PROJECT/index.html) in any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, Safari).

### **Option 2: Using the Python Server**
Open a terminal in this directory and execute:
```bash
python serve.py
```
This automatically starts a local server at `http://localhost:5000` and opens your browser.

---

## ⌨️ Keyboard Shortcuts
- **`Spacebar`**: Play / Pause live simulation video.
- **`Right Arrow (→)`**: Step forward.
- **`Left Arrow (←)`**: Step backward.
- **`Home`**: Jump to initial step.
- **`End`**: Jump to final step.
- **`R`**: Reset simulation to step 1.

---

*Developed for the Design and Analysis of Algorithms (DAA) Project, Woxsen University.*
