---
layout: project
excerpt_separator: ""
title: "POSIX Drone Simulator"
order: 3
featured: false
description: "A multi-process, networked 2D drone simulator in C, built on hand-written POSIX IPC: pipes, signals and TCP sockets, with an ncurses interface."
repo: "https://github.com/IloPinci/Posix-Drone-Simulator-ARP_UniGe"
video: "/assets/videos/arp.mp4"
tags: ["C", "POSIX IPC", "TCP/IP", "ncurses"]
---
{% raw %}
<div align="center" markdown="1">

```
                    ██████╗ ██████╗  ██████╗ ███╗   ██╗███████╗    ███████╗██╗███╗   ███╗
                    ██╔══██╗██╔══██╗██╔═══██╗████╗  ██║██╔════╝    ██╔════╝██║████╗ ████║
                    ██║  ██║██████╔╝██║   ██║██╔██╗ ██║█████╗      ███████╗██║██╔████╔██║
                    ██║  ██║██╔══██╗██║   ██║██║╚██╗██║██╔══╝      ╚════██║██║██║╚██╔╝██║
                    ██████╔╝██║  ██║╚██████╔╝██║ ╚████║███████╗    ███████║██║██║ ╚═╝ ██║
                    ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝    ╚══════╝╚═╝╚═╝     ╚═╝
```


**A multi-process, networked drone simulation engine written in C**

[![Language](https://img.shields.io/badge/language-C11-blue?style=flat-square&logo=c)](https://en.wikipedia.org/wiki/C11_(C_standard_revision))
[![IPC](https://img.shields.io/badge/IPC-Anonymous%20Pipes-orange?style=flat-square)](https://man7.org/linux/man-pages/man2/pipe.2.html)
[![UI](https://img.shields.io/badge/UI-ncurses-green?style=flat-square)](https://invisible-island.net/ncurses/)
[![Network](https://img.shields.io/badge/Network-TCP%2FIP-red?style=flat-square)](https://man7.org/linux/man-pages/man7/tcp.7.html)
[![Platform](https://img.shields.io/badge/platform-Linux%20%2F%20POSIX-lightgrey?style=flat-square)](https://pubs.opengroup.org/onlinepubs/9699919799/)
[![Build](https://img.shields.io/badge/build-CMake-blueviolet?style=flat-square&logo=cmake)](https://cmake.org/)
[![License](https://img.shields.io/badge/license-MIT-yellow?style=flat-square)](LICENSE)

*Developed across three progressive assignments for the Advanced and Robot Programming (ARP) course*

[▶ Watch Demo](https://youtu.be/tNpgaJHzdXw?si=1cfWcafKvvoCbWzo) · [Assignment 1](https://github.com/IloPinci/Posix-Drone-Simulator-ARP_UniGe/tree/Assignment-1) · [Assignment 2](https://github.com/IloPinci/Posix-Drone-Simulator-ARP_UniGe/tree/Assignment-2) · [Assignment 3](https://github.com/IloPinci/Posix-Drone-Simulator-ARP_UniGe/tree/Assignment-3)

</div>

---

## What Is This?

A from-scratch, production-quality simulation of a **2D drone with physics** — built entirely in C — where every system component runs as an **independent OS process** coordinated through low-level POSIX IPC. The project evolved over three assignments, each adding a new systems-programming layer on top of a working foundation:

| Assignment | Core Focus | Key Addition |
|---|---|---|
| **1** | Multi-process architecture + physics | Anonymous pipes, ncurses UI, drone dynamics |
| **2** | Reliability + observability | Watchdog process, file-locking logs, fault detection |
| **3** | Distributed systems | TCP/IP networking, state-machine protocol, coordinate transforms |

No frameworks. No abstractions handed to us. Every pipe, every signal handler, every socket — written by hand.

---

## C & Systems Programming Skills Demonstrated

This project is a showcase of low-level systems programming depth. Below is a breakdown of the specific competencies exercised.

### Process Management & POSIX IPC

- **`fork()` / `exec()` / `waitpid()`** — orchestrated spawning of 7-9 independent processes from a single master, each with precise file-descriptor inheritance
- **Anonymous pipes (`pipe()`)** — all IPC is zero-shared-memory, carrying binary structs (`DroneState`, `CommandState`, `Obstacle[]`) between processes
- **`select()` multiplexing** — `bb_server` and `drone` use `select()` with `timeval` timeouts to multiplex reads across 4+ simultaneous pipe file descriptors without blocking
- **File descriptor hygiene** — every child process closes all unused pipe ends immediately after `fork()`, preventing deadlocks from unintentional writer references
- **Exec fallback chains** — each `execlp("konsole", ...)` has a direct `execl("./binary", ...)` fallback for environments without a terminal emulator

### Signals & Asynchronous Safety

- **`volatile sig_atomic_t`** — running flags and code-area trackers are declared with the correct type for async-signal safety everywhere
- **`sigaction()` with `SA_SIGINFO`** — watchdog uses real-time signal queuing (`sigqueue`) to piggyback a `code_area` integer onto every `SIGUSR2` acknowledgment
- **`SIGPIPE` suppression** — all processes that write to pipes set `SIG_IGN` on `SIGPIPE` and check write return values explicitly
- **Signal-safe `SIGINT` handlers** — every process has a clean shutdown path triggered by a signal flag, with `nanosleep()` interrupted by `EINTR` handled in loops

### Concurrency & Watchdog Architecture

The Assignment 2 watchdog implements a full **ping-ack health monitoring protocol**:

```
Watchdog  →  SIGUSR1 (ping)  →  Process
Watchdog  ←  SIGUSR2 + sival_int (ack + code_area)  ←  Process
```

- **Process death detection** via `kill(pid, 0)` / `ESRCH`
- **Hung process detection** — 200ms `WD_ACK_TIMEOUT_MS` with 10ms polling steps
- **PID handshake over pipes** — since `konsole` introduces an intermediate shell layer, child processes write their real `getpid()` back to master over a dedicated pipe, so the watchdog monitors the actual simulation processes rather than their terminal wrappers
- **`SIGKILL` fail-fast** — any failure kills the entire process group immediately, with no restart loops

### Memory & Data Layout

- **Packed binary IPC protocol** — structs are written and read across pipes with `write_full()` / `read_full()` helpers that handle partial writes and `EINTR` interruption in loops
- **Ring-buffer obstacle replacement** — both `obstacles.c` and `targets.c` use a circular `oldest_index` pointer to replace the oldest entry once the cap is reached, without heap allocation
- **Static arrays with active flags** — `WorldState` holds `Obstacle[64]` and `Target[32]` with `.active` bitmask fields, avoiding dynamic allocation in shared structures
- **`struct timespec` arithmetic** — target scoring uses `clock_gettime(CLOCK_REALTIME)` for sub-second time bonuses, with nanosecond-precision deltas

### File I/O & Synchronization

- **`flock(LOCK_EX / LOCK_UN)`** — all processes share a single `processes.log` file; every `sim_log_info()` call acquires an exclusive advisory lock before writing, releasing it after `fflush()`, preventing interleaved log corruption
- **Log architecture decision** — watchdog gets its own file (write mode, fresh per run); all others append to a shared file with locking. Chosen over `fcntl` record locking for simplicity and automatic crash recovery
- **`unlink()` at startup** — master deletes `processes.log` and `processes.pid` on each launch, giving clean logs per run

### TCP/IP Networking (Assignment 3)

- **Non-blocking sockets** — both `network_server` and `network_client` set `O_NONBLOCK` on all sockets and use `select()` to multiplex socket I/O against local pipe I/O
- **Line-based text protocol** — a custom `LineAcc` accumulator and `SendQ` queue handle partial TCP reads/writes correctly, buffering incomplete lines and flushing send queues across multiple `select()` iterations
- **State machine protocol** — the server runs through states `S_WAIT_OOK → S_SEND_SIZE → ... → S_SEND_DRONE → S_WAIT_DOK → S_SEND_OBST → ...` with explicit error transitions
- **`SO_REUSEADDR`** — server sockets set this option to avoid `EADDRINUSE` on rapid restart
- **Reconnection logic** — client retries up to 5 times with 3-second backoff, resetting the protocol state machine and statistics on each fresh connection
- **Coordinate transformation** — a configurable `(flip_y, alpha_deg)` pipeline converts between local UI coordinates and a shared virtual space for cross-instance interoperability

### ncurses UI

- **Multi-window layout** — `map_win` and (in network modes) `stats_win` are created with `newwin()` and `wresize()`/`mvwin()` on terminal resize, using `getmaxyx()` to compute proportional dimensions
- **Non-blocking input** — `timeout(100)` on `getch()` in `input.c` allows the UI loop to service the pipe on every 100ms tick even with no keypress
- **Color pairs** — 6 color pairs initialized with `init_pair()`, used for drone, obstacles, targets, menu highlight, and network stats (green/yellow/red latency coding)

### Physics Simulation

The drone is modeled as a **2D point mass with viscous damping**, integrated with explicit Euler:

$$\sum F = M\ddot{p} + K\dot{p} \quad \Rightarrow \quad a = \frac{F - K \cdot v}{M}$$

- **Latombe / Khatib repulsion** — obstacle and wall repulsion uses the potential field formula $F_\text{rep}(d) = \eta \left(\frac{1}{d} - \frac{1}{\rho_0}\right)\frac{\|v\|}{d^2}$, scaled by drone velocity magnitude
- **Virtual key mapping** — repulsion vectors are projected onto 8 cardinal directions and blended with user input before being forwarded to the drone
- **Segment-circle intersection** — target hit detection tests the drone's motion segment $[p_\text{prev}, p_\text{curr}]$ against each target circle, correctly handling edge cases (endpoint inside circle, degenerate segment)
- **Collision resolution** — drone/obstacle collisions push the drone to the surface normal and zero the inward velocity component, preventing tunneling

---

## Architecture

```
                        ┌──────────────────────────────────────┐
                        │             master.c                 │
                        │  (orchestrator, pipe factory,        │
                        │   PID handshake, env export)         │
                        └───┬───────┬──────┬──────┬────────────┘
                            │       │      │      │
          ┌─────────────────▼─┐   ┌─▼──┐ ┌▼────┐ ┌▼─────────┐
          │    bb_server.c    │   │dron│ │obst │ │targets.c │
          │  (blackboard, UI, │◄──│e.c │ │acles│ │          │
          │   repulsion, score│   │    │ │ .c  │ │          │
          │   network bridge) │   └────┘ └─────┘ └──────────┘
          └──────┬────────────┘
                 │
    ┌────────────▼──────────────────────┐
    │            input.c                │
    │   (ncurses keypad, CommandState)  │
    └───────────────────────────────────┘

    Assignment 2 adds:
    ┌─────────────────────────────────────────────────────────────┐
    │  watchdog.c — SIGUSR1/SIGUSR2 ping-ack, kill-all on failure │
    └─────────────────────────────────────────────────────────────┘

    Assignment 3 adds (server mode):           (client mode):
    ┌──────────────────────┐       ┌──────────────────────────────┐
    │  network_server.c    │◄─────►│  network_client.c            │
    │  TCP accept loop     │  TCP  │  connect + retry (5 attempts)│
    │  state machine proto │       │  state machine protocol      │
    │  coordinate xform    │       │  coordinate xform            │
    └──────────────────────┘       └──────────────────────────────┘
```

---

## Project Structure

```
posix-drone-sim/
├── src/
│   ├── master.c            # Process orchestrator
│   ├── bb_server.c         # Central blackboard + ncurses UI
│   ├── drone.c             # Physics engine (point mass + damping)
│   ├── input.c             # ncurses keyboard input
│   ├── obstacles.c         # Dynamic obstacle generator
│   ├── targets.c           # Dynamic target generator
│   ├── watchdog.c          # Health monitor (Assignment 2)
│   ├── network_server.c    # TCP server process (Assignment 3)
│   ├── network_client.c    # TCP client process (Assignment 3)
│   ├── sim_ipc.c           # read_full / write_full helpers
│   ├── sim_log.c           # flock-based concurrent logging
│   ├── sim_params.c        # Config file parser
│   └── sim_ui.c            # ncurses window management
├── headers/
│   ├── sim_types.h         # DroneState, WorldState, CodeArea
│   ├── sim_ipc.h           # Pipe FD layout constants
│   ├── sim_params.h        # SimParams struct + API
│   ├── sim_network.h       # Protocol tokens + socket helpers
│   ├── sim_ui.h            # UI public API
│   ├── sim_log.h           # Logging API
│   └── sim_const.h         # Physics + world defaults
├── bin/
│   ├── conf/
│   │   └── drone_parameters.conf
│   └── log/                # Runtime logs (created at runtime)
├── CMakeLists.txt
├── run.sh                  # Quick build + run (normal mode)
└── exe.sh                  # Interactive mode selector (A3)
```

---

## Building & Running

### Prerequisites

```bash
# Ubuntu / Debian
sudo apt install cmake gcc libncurses-dev konsole mpg123
```

### Normal Mode (Standalone)

```bash
./run.sh
```

### Networked Mode (Assignment 3)

```bash
# On machine A (server)
./exe.sh   # select option 2 (Server)

# On machine B (client)
SERVER_IP=<machine-A-ip> ./exe.sh   # select option 3 (Client)
```

### Manual Build

```bash
cmake -S . -B build
cmake --build build --target master bb_server drone input obstacles targets watchdog network_server network_client
cd build/src && ./master
```

---

## Configuration

All runtime parameters are loaded from `bin/conf/drone_parameters.conf` at startup. Every process independently calls `sim_params_load(NULL)` and falls back to `sim_const.h` defaults if the file is missing.

```ini
world_width             50        # simulation coordinate space
world_height            50
mass                    1.0       # kg — drone point mass
damping                 4.0       # N·s/m — viscous damping coefficient
dt                      0.05      # seconds — Euler integration step
force_step              1.5       # N — per-keypress force increment
max_force               15.0      # N — force clamp
rho                     1.0       # m — repulsion perception radius
eta                     0.01      # N·m — repulsion gain
max_obstacles           5
initial_obstacles       5
obstacle_spawn_interval 5.0
max_targets             20
initial_targets         10
target_spawn_interval   5.0
server_address          127.0.0.1
server_port             8888
```

---

## Controls

All controls live in the **INPUT** terminal window.

```
+---+---+---+
| q | w | e |   Diagonal / Cardinal forces
+---+---+---+
| a | s | d |   s = brake (zero force)
+---+---+---+
| z | x | c |
+---+---+---+

r  →  reset drone to world center
Q  →  quit simulation
```

---

## Network Protocol (Assignment 3)

A custom line-based, text-oriented, synchronous protocol over TCP:

```
Server                          Client
  │──── ok ──────────────────────►│
  │◄─── ook ───────────────────────│
  │──── size W,H ─────────────────►│
  │◄─── sok ───────────────────────│
  │                                │   ← handshake complete
  │──── drone ────────────────────►│
  │──── X.X, Y.Y ─────────────────►│   ← server drone in virtual coords
  │◄─── dok ───────────────────────│
  │──── obst ─────────────────────►│
  │◄─── X.X, Y.Y ──────────────────│   ← client drone as obstacle
  │──── pok ──────────────────────►│
  │         (repeats) ─────────────│
  │──── q ────────────────────────►│
  │◄─── qok ───────────────────────│
```

Coordinates are exchanged in a **virtual bottom-left-origin system**, with configurable `SIM_NET_FLIP_Y` and `SIM_NET_ALPHA` environment variables for local-to-virtual rotation and Y-axis flip.

The protocol has been **verified interoperable** with an independent third-party implementation.

---

## Logging

```
bin/log/
├── processes.log    # Shared by all simulation processes (flock-protected)
├── watchdog.log     # Watchdog-exclusive log (fresh per run)
└── processes.pid    # PID registry (deleted and recreated each run)
```

```bash
# Monitor in real-time
tail -f bin/log/processes.log
tail -f bin/log/watchdog.log

# Find all target hit events
grep "TARGET HIT" bin/log/processes.log

# Find watchdog fault events
grep "did not ack" bin/log/watchdog.log
```

---

## Contributors

<a href="https://github.com/Cb-dotcom/posix-drone-sim/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Cb-dotcom/posix-drone-sim" alt="Contributors" />
</a>

---

## License

[MIT](https://github.com/IloPinci/Posix-Drone-Simulator-ARP_UniGe/blob/main/LICENSE) © 2025 Cb-dotcom & IloPinci
{% endraw %}
