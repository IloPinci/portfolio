---
layout: project
excerpt_separator: ""
title: "Research Track 2"
order: 2
featured: false
description: "A ROS2 navigation pipeline for a differential-drive robot in Gazebo: a C++ action server and client running as composable nodes, closed-loop control grounded by tf2, and a Python control UI."
repo: "https://github.com/IloPinci/Research_Track_2-Unige/tree/assignment"
video: "/assets/videos/rt_2.mp4"
tags: ["ROS2", "C++", "Gazebo", "tf2"]
skills: [ROS2, C++, Python]
---
{% raw %}
<div align="center" markdown="1">
<video src="https://github.com/user-attachments/assets/4ca848a8-a43a-407c-9754-8701e1ae2e2d" controls playsinline preload="metadata"></video>
</div>

## Table of Contents

<details markdown="1">
<summary><b>Expand Table of Contents</b></summary>

* [Overview](#overview)
* [System Architecture](#system-architecture)
* [1. ROS2 Actions](#1-ros2-actions)
    * [Academic Background](#academic-background)
    * [Why Actions Here](#why-actions-here)
    * [Implementation Notes](#implementation-notes)
* [2. ROS2 Composable Nodes (Components)](#2-ros2-composable-nodes-components)
    * [Academic Background](#academic-background-1)
    * [Why Components Here](#why-components-here-1)
    * [Implementation Notes](#implementation-notes-1)
* [3. tf2 - Transform Library](#3-tf2---transform-library)
    * [Academic Background](#academic-background-2)
    * [Why tf2 Here](#why-tf2-here-1)
    * [Angular Error Normalization](#angular-error-normalization)
* [Package Structure](#package-structure)
* [Building and Running](#building-and-running)
* [Dependencies](#dependencies)
* [Key Design Decisions](#key-design-decisions)

</details>

---

## Overview

This assignment implements a complete autonomous navigation pipeline for a differential-drive robot simulated in Gazebo. The robot is capable of receiving a target pose `(x, y, θ)` from a user interface, navigating to that position using closed-loop control, and reporting its progress in real time. The architecture deliberately separates concerns across three foundational ROS2 mechanisms - **Actions**, **Components**, and **tf2** - each of which addresses a distinct challenge in robot software engineering.

---

## System Architecture

```
┌─────────────┐     /target_pose      ┌──────────────────────┐
│   ui_node   │ ─────────────────────>│  PoseClientComponent │
│  (Python)   │     /cancel_goal      │                      │
└─────────────┘ ─────────────────────>│  Action Client       │
                                      └──────────┬───────────┘
                                                 │  move_to_pose
                                                 │  Action RPC
                                      ┌──────────▼───────────┐
                                      │  PoseServerComponent │
                                      │                      │
                                      │  Action Server       │
                                      │  tf2 Listener        │◀──── /tf (odom → base_footprint)
                                      │  /cmd_vel Publisher  │────▶ Gazebo DiffDrive
                                      └──────────────────────┘
```

Both server and client run as **composable nodes** inside a single **multi-threaded component container**, communicating via an **action interface** whose feedback loop is grounded by **tf2** coordinate transforms.

---

## 1. ROS2 Actions

### Academic Background

The action paradigm in ROS2 is a formalization of the *preemptable long-running task* pattern. Unlike a service call - which is synchronous and blocking - an action encodes a three-phase protocol:

1. **Goal**: the client sends a typed goal and the server either accepts or rejects it.
2. **Feedback**: the server publishes incremental state at arbitrary frequency while the goal is active.
3. **Result**: upon completion, cancellation, or failure, the server returns a typed result.

Formally, this maps onto a finite-state machine where goals can be in states `ACCEPTED`, `EXECUTING`, `CANCELING`, `SUCCEEDED`, `CANCELED`, or `ABORTED`. The underlying transport uses DDS (Data Distribution Service), meaning goal, feedback, and result each have quality-of-service guarantees independent of one another. This is critical for real robotic systems where a network partition during navigation must not leave the robot in an undefined state.

The action definition in this assignment (`MovePose.action`) follows the canonical three-section schema:

```
# Goal
float64 target_x
float64 target_y
float64 target_theta
---
# Result
bool success
---
# Feedback
float64 current_x
float64 current_y
float64 current_theta
```

### Why Actions Here

Navigation to a pose is inherently a *long-running, preemptable* task. A naive topic-based approach would require an additional cancellation topic, a separate result topic, and manual state tracking - recreating the action protocol when necessary and without the reliability guarantees it provides. Using `rclcpp_action` instead gives us:

- **Preemption with consistency**: the client cancels an in-flight goal before issuing a new one (see `pose_callback` in `pose_client_component.cpp`), preventing race conditions where two simultaneous goals fight over `/cmd_vel`.
- **Introspectable feedback**: the server publishes `(current_x, current_y, current_θ)` at 10 Hz so any monitoring node can observe convergence without polling.
- **Typed, versioned interfaces**: `rosidl_generate_interfaces` compiles the `.action` file into strongly-typed C++ and Python stubs, eliminating message-format mismatches at compile time rather than runtime.

### Implementation Notes

The server (`PoseServerComponent`) spawns a **detached `std::thread`** for each accepted goal. This is required because the action execution must not block the node's executor - blocking the executor would prevent the cancel callback (`handle_cancel`) from being processed, making cancellation impossible. The thread runs the proportional-control navigation loop, checks `goal_handle->is_canceling()` at every iteration, and calls `stop_robot()` before returning if a cancel is detected.

The two-phase controller implemented inside the action:

1. **Translation phase**: while Euclidean distance to target exceeds 0.1 m, compute a heading error and apply `v = min(0.5·d, 0.5)` m/s, `ω = 1.0·Δψ` rad/s.
2. **Orientation phase**: once in position, rotate in place until `|Δθ| < 0.05` rad (~3°).

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## 2. ROS2 Composable Nodes (Components)

### Academic Background

A standard ROS2 node runs as an independent OS process. While this provides fault isolation, it imposes two costs that become significant in real-time robotics:

- **Inter-process communication overhead**: even on localhost, data passing through DDS serialization, kernel network stack, and deserialization adds microseconds of latency and copies memory unnecessarily.
- **Scheduling jitter**: each process competes independently with the OS scheduler, degrading determinism.

*Composable nodes* (implemented via `rclcpp_components`) solve both by allowing multiple nodes to be loaded into a single process, the **component container**, sharing the same heap and executor. Communication between nodes in the same container uses **intra-process communication (IPC)**, which can pass `std::shared_ptr` messages with zero copies and zero serialization. This is architecturally equivalent to a component model: each node is a shared library (`.so`) exposing a factory symbol, and the container dynamically loads and instantiates it at runtime.

The pattern is analogous to the *microkernel* approach in operating systems: the container provides scheduling and lifecycle services, while components provide domain logic. Components can also be launched in separate containers for fault isolation when needed, making the architecture reconfigurable without code changes.

### Why Components Here

The `PoseServerComponent` and `PoseClientComponent` are co-located in `pose_component_container` (see `architecture.launch.py`). This means:

- When the server publishes feedback and the client receives it, **no serialization occurs** - the shared pointer is handed directly across the thread boundary.
- The `component_container_mt` (multi-threaded) variant is used, which runs a `MultiThreadedExecutor`. This is essential because the action server spawns a thread per goal - the executor must remain responsive to cancel callbacks and new goal requests while a navigation thread is running.
- Deployment flexibility is preserved: `component_server.launch.py` shows the server can be run in isolation in its own container, with the client in a different process, without any code change.

### Implementation Notes

Each component is registered with the macro:

```cpp
RCLCPP_COMPONENTS_REGISTER_NODE(a1_pkg::PoseServerComponent)
RCLCPP_COMPONENTS_REGISTER_NODE(a1_pkg::PoseClientComponent)
```

This writes a factory symbol into the shared library. The `CMakeLists.txt` compiles each as `SHARED` and registers it with `rclcpp_components_register_node`, which also generates a standalone executable (`pose_server_node`, `pose_client_node`) for debugging. A composable node is simultaneously a library and a runnable binary.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## 3. tf2 - Transform Library

### Academic Background

Robot kinematics require representing the same physical point in multiple coordinate frames: the world frame, the robot body frame, a sensor frame, and so on. The relationship between any two frames is a **rigid body transformation** - an element of the special Euclidean group SE(3), composed of a rotation R ∈ SO(3) and a translation t ∈ ℝ³:

```
T_AB = [R | t]
       [0 | 1]
```

For a differential-drive robot operating on a planar surface, the relevant transforms are:

| Frame | Description |
|---|---|
| `odom` | World-fixed inertial frame; origin at robot start position |
| `base_footprint` | Robot reference frame projected onto the ground plane |
| `base_link` | Robot body frame (elevated by wheel radius) |
| `scan_link` | LiDAR sensor frame |

The transform `T_odom→base_footprint` is published by the Gazebo differential drive plugin at 30 Hz and represents the robot's estimated pose in the world. It encodes both translation `(x, y)` and rotation `θ` around the Z-axis.

`tf2` maintains a **transform tree** which is a directed graph of frames with time-stamped history. A lookup `lookupTransform(target_frame, source_frame, time)` traverses the graph and composes intermediate transforms:

```
T_A→C = T_A→B · T_B→C
```

The time argument allows interpolation: requesting a transform at `tf2::TimePointZero` returns the most recent available, which is appropriate for a control loop that doesn't need temporal synchronization with a sensor.

### Why tf2 Here

The action server needs the robot's current pose `(x, y, θ)` at every control iteration to compute:

```
dx = target_x - current_x
dy = target_y - current_y
distance = √(dx² + dy²)
target_heading = atan2(dy, dx)
angular_error = target_heading - current_yaw
```

Rather than subscribing to `/odom` directly, the server queries tf2:

```cpp
transform = tf_buffer_->lookupTransform(
    "odom", "base_footprint", tf2::TimePointZero);

double current_x   = transform.transform.translation.x;
double current_y   = transform.transform.translation.y;
double current_yaw = tf2::getYaw(transform.transform.rotation);
```

This design choice is principled for several reasons:

**1. Frame abstraction.** The controller is expressed in the `odom` frame regardless of how that pose is produced - whether from wheel odometry, a fused EKF (`ekf.yaml` configures `robot_localization` for exactly this), or a SLAM system. Swapping the localization backend requires zero changes to the controller.

**2. Sensor frame support.** When the navigation target is expressed in a sensor frame (e.g., a camera detecting a landmark), `lookupTransform` composes the full chain automatically. The controller code remains identical.

**3. Graceful degradation.** If a transform is temporarily unavailable (e.g., the localization node has not yet published), `lookupTransform` throws `tf2::TransformException`. The server catches this, logs a warning, and retries on the next iteration, hence the robot simply pauses rather than crashing or driving blind.

**4. Quaternion → Euler extraction.** The rotation is stored as a quaternion `(x, y, z, w)` in the transform message. `tf2::getYaw()` extracts the yaw angle from the quaternion via:

```
θ = atan2(2(wz + xy), 1 - 2(y² + z²))
```

This avoids gimbal lock that would occur with a Euler parameterization and is numerically stable for all orientations.

### Angular Error Normalization

A subtle but critical detail in the controller:

```cpp
while (angular_error > M_PI)  angular_error -= 2.0 * M_PI;
while (angular_error < -M_PI) angular_error += 2.0 * M_PI;
```

Without this normalization, a robot facing 170° trying to reach -170° would spin 340° rather than 20°. The wrapping maps all angular errors into `(-π, π]`, ensuring the controller always chooses the shortest rotation.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Package Structure

```
a1_pkg/
├── action/
│   └── MovePose.action          # Action interface definition
├── src/
│   ├── pose_server_component.cpp  # Action server + tf2 + control loop
│   └── pose_client_component.cpp  # Action client + topic subscriptions
├── scripts/
│   └── ui_node.py               # Terminal UI (goal/cancel publisher)
├── launch/
│   ├── architecture.launch.py   # Both components in one container
│   ├── component_server.launch.py
│   ├── spawn_robot.launch.py    # Full simulation stack
│   └── world.launch.py
├── config/
│   └── ekf.yaml                 # robot_localization EKF configuration
├── urdf/
│   ├── mogi_bot.urdf            # Robot model with LiDAR
│   └── mogi_bot.gazebo          # Gazebo plugins (DiffDrive, LiDAR)
├── worlds/
│   └── my.sdf                   # Simulation environment
├── rviz/
│   └── rviz.rviz
├── CMakeLists.txt
└── package.xml
```

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Building and Running

> **WSL users:** Before building or running anything, make sure to set the following environment variables in every terminal you open:
> ```bash
> export LIBGL_ALWAYS_SOFTWARE=1
> source /opt/ros/humble/setup.bash
> ```


```bash
# Build
cd ~/<your directory>
colcon build --packages-select a1_pkg
source install/setup.bash

# Launch simulation + robot with an empty world (no obstacles)
ros2 launch a1_pkg spawn_robot.launch.py world:=world_empty.sdf

# Launch action server + client (in a new terminal)
ros2 launch a1_pkg architecture.launch.py

# Run the UI (in a new terminal)
ros2 run a1_pkg ui_node.py
```

**Sending a goal from the UI:**
```
> 5.0 3.0 1.57
Goal sent: x=5.0, y=3.0, theta=1.57

> c
Cancel request sent.
```

**Direct action call via CLI:**
```bash
ros2 action send_goal /move_to_pose a1_pkg/action/MovePose \
  "{target_x: 5.0, target_y: 3.0, target_theta: 1.57}"
```

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Dependencies

| Package | Role |
|---|---|
| `rclcpp` | C++ client library |
| `rclcpp_action` | Action client/server implementation |
| `rclcpp_components` | Composable node infrastructure |
| `tf2` / `tf2_ros` / `tf2_geometry_msgs` | Transform tree lookup and geometry utilities |
| `geometry_msgs` | `Twist`, `Pose2D`, `TransformStamped` |
| `std_msgs` | `Bool` for cancel signal |
| `rosidl_default_generators` | Code generation from `.action` files |
| `robot_localization` | EKF sensor fusion (odom + IMU → `/tf`) |
| `ros_gz_bridge` | ROS2 ↔ Gazebo topic bridging |

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Action over service | Navigation is long-running and preemptable |
| Action over topics | Typed result, built-in cancellation, goal rejection |
| tf2 over `/odom` subscription | Frame abstraction, supports any localization backend |
| Composable nodes | Zero-copy IPC between client and server |
| MultiThreadedExecutor | Cancel callbacks must not be blocked by navigation threads |
| Detached `std::thread` per goal | Executor remains free to handle cancel/new-goal events |
| Proportional controller | Sufficient for low-speed navigation; no overshoot tuning required |

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>
{% endraw %}
