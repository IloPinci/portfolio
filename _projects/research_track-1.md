---
layout: project
excerpt_separator: ""
title: "Research Track 1"
order: 1.5
featured: false
description: "Two ROS2 assignments from the Research Track course at UniGe: multi-turtle control in turtlesim, then an autonomous collision-avoidance safety controller, written in C++ and re-implemented in Python."
repo: "https://github.com/IloPinci/Research-Track_UniGe"
video: "/assets/videos/rt_1.mp4"
tags: ["ROS2","C++","Python","Turtlesim"]
skills: [ROS2, C++, Python]
---
{% raw %}
<div align="center" markdown="1">

<br/>

<pre>
██████╗  ██████╗ ███████╗██████╗     
██╔══██╗██╔═══██╗██╔════╝╚════██╗    
██████╔╝██║   ██║███████╗ █████╔╝    
██╔══██╗██║   ██║╚════██║██╔═══╝     
██║  ██║╚██████╔╝███████║███████╗    
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝    
</pre>

### *Research Track - University of Genova*

---

<br/>

[![Assignment 1](https://img.shields.io/badge/Branch-Assignment%201-4A90D9?style=for-the-badge&logo=git&logoColor=white)](../../tree/Assignment-1)
[![Assignment 2 C++](https://img.shields.io/badge/Branch-Assignment%202%20%7C%20C%2B%2B-C0392B?style=for-the-badge&logo=cplusplus&logoColor=white)](../../tree/Assignment-2)
[![Assignment 2 Python](https://img.shields.io/badge/Branch-Assignment%202%20%7C%20Python-3776AB?style=for-the-badge&logo=python&logoColor=white)](../../tree/Assignment_2-Python)

<br/>

</div>

---

## Table of Contents

- [Overview](#-overview)
- [Assignment 1 - Multi-Turtle Turtlesim Control](#-assignment-1--multi-turtle-turtlesim-control)
- [Assignment 2 - Autonomous Collision Avoidance](#-assignment-2--autonomous-collision-avoidance)
- [Why C++ *and* Python?](#-why-c-and-python)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)

---

## Overview

This repository is the product of two robotics assignments completed during the **Research Track** course at the University of Genova. Each assignment progressively builds on core ROS2 competencies - from interactive multi-robot control to fully autonomous, sensor-driven navigation with safety systems.

The work spans **three branches**, each representing a distinct technical deliverable:

| Branch | Language | Focus |
|--------|----------|-------|
| [`Assignment-1`](https://github.com/IloPinci/Research-Track_UniGe/tree/Assignment-1) | Python | Real-time multi-turtle control with collision avoidance |
| [`Assignment-2`](https://github.com/IloPinci/Research-Track_UniGe/tree/Assignment-2) | C++ | Autonomous safety controller with custom ROS2 interfaces |
| [`Assignment_2-Python`](https://github.com/IloPinci/Research-Track_UniGe/tree/Assignment_2-Python) | Python | Identical system re-implemented in Python |

<div align="right" markdown="1"><a href="#top">↑ Back to top</a></div>

---

## Assignment 1 - Multi-Turtle Turtlesim Control

> **Branch →** [`Assignment-1`](https://github.com/IloPinci/Research-Track_UniGe/tree/Assignment-1) &nbsp;|&nbsp; 📹 [Demo Video](https://youtu.be/ZyCxgk-yXOY)

A real-time, interactive two-turtle control system built on **ROS2** and **Turtlesim**. The system runs as three coordinated nodes launched simultaneously from a single launch file. The user selects a turtle from the terminal, inputs velocities, and the turtle moves for exactly 1 second before stopping - while a background node continuously monitors safety.

<details markdown="1">
<summary><strong>Node Architecture (click to expand)</strong></summary>

<br/>

**`ui_node.py`** - Interactive terminal controller
- Prompts the user to select a turtle (`1` or `2`) and input linear/angular velocities
- Clamps values to safe ranges (`linear ∈ [-2, 2]`, `angular ∈ [-3, 3]`) with a console warning when clamping occurs
- Publishes commands for exactly **1 second**, then zeroes the twist to stop the turtle
- Pressing `q` publishes a `Bool` on `/shutdown_signal` and exits cleanly - all other nodes shut down as a result

**`distance_node.py`** - Real-time safety monitor (10 Hz)
- Calculates the **Euclidean distance** between both turtles and publishes it to `/turtle_distance`
- **Collision Avoidance**: When turtles are within `1.0` units, both are commanded to reverse at `0.5 u/s` simultaneously until they exceed the threshold
- **Boundary Protection**: When a turtle exits the `[1.0, 10.0]` window, the node computes the closest wall, calculates the angle toward the geometric center of the arena, and either rotates to face it or drives forward - this prevents the turtle from getting trapped in a corner where a naive backup would immediately hit the opposite wall

**`turtle_spawn.py`** - Calls the `/spawn` service to place `turtle2` at `(7.0, 7.0, θ=0)`

**`run.py`** - Single-command launch for all nodes; registers an `OnProcessExit` handler so the entire session terminates when the UI node exits

</details>

<details markdown="1">
<summary><strong>Key Design Decisions (click to expand)</strong></summary>

<br/>

- **Why rotate toward center on boundary hit?** A naive "back up" approach fails in corners - the turtle reverses into another wall, creating an infinite oscillation loop. Rotating toward the geometric center guarantees there is always a safe escape vector regardless of which wall was hit.
- **Why 1-second command windows?** This matches the assignment specification and creates a predictable, discrete control cycle - important for the safety monitor to have stable pose readings between commands.
- **Why a shutdown signal topic?** Using a `Bool` publisher on `/shutdown_signal` allows clean inter-node communication for termination, rather than relying on `SIGINT` propagation through `konsole` subprocess trees which can leave orphaned processes.

</details>

<div align="right" markdown="1"><a href="#top">↑ Back to top</a></div>

---

## Assignment 2 - Autonomous Collision Avoidance

> 📹 [Demo Video](https://youtu.be/LJHyMQzdmR8)

A production-grade safety middleware for a differential-drive robot operating in **Gazebo**, using live **LiDAR** data to autonomously prevent collisions - while monitoring velocity statistics through a background service node.

The system was implemented **twice**: once in C++, once in Python. See [Why C++ and Python?](#-why-c-and-python) for the reasoning.

---

### C++ Implementation

> **Branch →** [`Assignment-2`](https://github.com/IloPinci/Research-Track_UniGe/tree/Assignment-2)

Built as a proper `ament_cmake` package with **custom ROS2 interface generation** - messages and services are defined in `.msg` / `.srv` files and compiled directly into the package via `rosidl_generate_interfaces`.

<details markdown="1">
<summary><strong>Node Details (click to expand)</strong></summary>

<br/>

**`control_node.cpp`** - Safety-aware velocity relay
- Subscribes to `/cmd_vel_input` (user commands via teleop) and `/scan` (LaserScan)
- Finds the minimum non-zero, non-infinite range value across all scan rays
- If `min_dist < safety_threshold` (default `0.5 m`): blocks user input, publishes `-0.3 m/s` for 10 scan cycles (~1 second), then stops and clears the safety flag
- Publishes `ObstacleInfo` with minimum distance, obstacle direction (`Front` / `Left` / `Right` computed from ray index vs scan midpoint ± 50 rays), and the current threshold
- Exposes `set_safety_threshold` service - the threshold can be updated at runtime without restarting any node
- Yellow `RCLCPP_WARN_THROTTLE` messages fire at most once per second to avoid log flooding

**`stat_node.cpp`** - Sliding-window velocity tracker
- Maintains two `std::deque<float>` buffers capped at size 5 for linear (`x`) and angular (`z`) velocities
- Subscribes to `/cmd_vel` - the *filtered* output, so statistics reflect only commands that actually reached the robot
- Exposes `get_velocity_stats` service returning running averages; returns `0.0` if history is empty

**Custom Interfaces** (generated at build time inside the same package):
```
msg/ObstacleInfo.msg        → float32 min_distance, string direction, float32 current_threshold
srv/SetSafetyThreshold.srv  → float32 new_threshold  ---  bool success
srv/GetVelocityStats.srv    →  ---  float32 avg_linear_vel, float32 avg_angular_vel
```

</details>

---

### Python Implementation

> **Branch →** [`Assignment_2-Python`](https://github.com/IloPinci/Research-Track_UniGe/tree/Assignment_2-Python)

Functionally identical system re-implemented in Python, deliberately split across two packages (`a2_python` + `a2_interfaces_python`) to mirror the interface/implementation separation found in professional ROS2 workspaces.

<details markdown="1">
<summary><strong>Node Details (click to expand)</strong></summary>

<br/>

**`control_node.py`** - Same safety logic, Python idioms
- Uses `enumerate` over scan ranges instead of index-based iteration
- Log throttling implemented manually via `get_clock().now()` nanosecond comparison since `rclpy` has no built-in `WARN_THROTTLE`
- Backup counter and safety flag mirror the C++ state machine exactly

**`stat_node.py`** - Clean, Pythonic stats tracker
- `deque(maxlen=5)` gives automatic FIFO eviction with no manual size check
- Linear and angular histories are tracked in separate deques - fixing a subtle bug where a naive implementation would overwrite the linear average with the angular result before returning the response

**`a2_interfaces_python`** - Standalone `ament_cmake` package
- Contains the same `.msg` and `.srv` definitions as the C++ package
- Must be built and sourced *before* `a2_python` - otherwise the Python import of `ObstacleInfo`, `GetVelocityStats`, and `SetSafetyThreshold` will fail at runtime

</details>

<div align="right" markdown="1"><a href="#top">↑ Back to top</a></div>

---

## Why C++ *and* Python?

The assignment required one implementation. The second was a deliberate choice to understand the ROS2 ecosystem at both levels of the stack.

In practice, safety-critical control loops are written in C++ for deterministic timing and zero GIL contention. Higher-level orchestration and tooling are written in Python for development speed. Implementing the same system in both languages makes the tradeoffs concrete rather than theoretical:

| Dimension | C++ | Python |
|-----------|-----|--------|
| Interface binding | `rosidl_target_interfaces()` at compile time | Runtime import from separately-built package |
| Buffer management | Manual `std::deque` with `pop_front()` | `deque(maxlen=5)` auto-eviction |
| Callback binding | `std::bind` + `_1`, `_2` placeholders | Direct method reference |
| Build system | `ament_cmake` + `CMakeLists.txt` | `ament_python` + `setup.py` |
| Log throttling | `RCLCPP_WARN_THROTTLE` built-in | Manual clock comparison |
| Startup dependency | Single self-contained package | Interface package must be built first |

Both branches produce identical ROS2 node graphs. The architecture diagram below applies to both.

<div align="right" markdown="1"><a href="#top">↑ Back to top</a></div>

---

## Architecture

```
┌───────────────────────────────────────────────────────┐
│                   ASSIGNMENT 1                        │
│                                                       │
│   User Input ──► ui_node ──► /turtle1/cmd_vel         │
│                          └──► /turtle2/cmd_vel        │
│                                                       │
│   /turtle1/pose ──► distance_node ──► /turtle_distance│
│   /turtle2/pose ──┘          └──► /turtle1/cmd_vel    │
│                               └──► /turtle2/cmd_vel   │
└───────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              ASSIGNMENT 2 (C++ and Python)              │
│                                                         │
│   User (Teleop) ──► /cmd_vel_input                      │
│                          │                              │
│                          ▼                              │
│                   control_node                          │
│            ┌─────────────────────────┐                  │
│  /scan ───►│  Safety Filter          │──► /cmd_vel      │
│            │  • Obstacle Detection   │                  │
│            │  • Auto Backup (~1s)    │──► /obstacle_info│
│            │  • set_safety_threshold │                  │
│            └─────────────────────────┘                  │
│                          │                              │
│                    /cmd_vel (monitored)                 │
│                          ▼                              │
│                     stat_node                           │
│            ┌─────────────────────────┐                  │
│            │  Sliding Window (n=5)   │                  │
│            │  • avg_linear_vel       │                  │
│            │  • avg_angular_vel      │                  │
│            │  • get_velocity_stats   │                  │
│            └─────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

<div align="right" markdown="1"><a href="#top">↑ Back to top</a></div>

---

## Getting Started

<details markdown="1">
<summary><strong>Assignment 1 - Turtlesim Control</strong></summary>

<br/>

```bash
git checkout Assignment-1

colcon build --packages-select assignment1_rt
source install/setup.bash

sudo apt install konsole

ros2 launch assignment1_rt run.py
```

</details>

<details markdown="1">
<summary><strong>Assignment 2 - C++ Controller</strong></summary>

<br/>

```bash
git checkout Assignment-2

colcon build --packages-select a2_controller --symlink-install
source install/setup.bash

# Launch (Gazebo + RViz + both nodes)
ros2 launch a2_controller controller.launch.py

# Drive the robot (separate terminal)
ros2 run teleop_twist_keyboard teleop_twist_keyboard \
  --ros-args --remap cmd_vel:=cmd_vel_input

# Query stats
ros2 service call /get_velocity_stats a2_controller/srv/GetVelocityStats

# Update detection threshold at runtime
ros2 service call /set_safety_threshold \
  a2_controller/srv/SetSafetyThreshold "{new_threshold: 1.0}"
```

</details>

<details markdown="1">
<summary><strong>Assignment 2 - Python Controller</strong></summary>

<br/>

```bash
git checkout Assignment_2-Python

# Interface package must be built first
colcon build --packages-select a2_interfaces_python
source install/setup.bash

colcon build --packages-select a2_python --symlink-install
source install/setup.bash

ros2 launch a2_python system.launch.py

# Drive the robot (separate terminal)
ros2 run teleop_twist_keyboard teleop_twist_keyboard \
  --ros-args --remap cmd_vel:=/cmd_vel_input

# Query stats
ros2 service call /get_velocity_stats \
  a2_interfaces_python/srv/GetVelocityStats "{}"

# Update detection threshold at runtime
ros2 service call /set_safety_threshold \
  a2_interfaces_python/srv/SetSafetyThreshold "new_threshold: 1.0"
```

</details>

<div align="right" markdown="1"><a href="#top">↑ Back to top</a></div>

---

<div align="center" markdown="1">

*Built with ROS2 Jazzy on WSL · Turtlesim · Gazebo · C++17 · Python 3.10*

<br/>

**[↑ Back to Navigation Menu](#top)**

</div>
{% endraw %}