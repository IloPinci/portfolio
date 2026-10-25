---
layout: project
excerpt_separator: ""
title: "Rainfall Simulation in C"
order: 4
featured: false
description: "A real-time rain and snow simulation in C using graphics.h, with wind, temperature and lightning controlled live from the keyboard."
repo: "https://github.com/IloPinci/Rainfall-Simulation-in-C"
video: "/assets/videos/rainfall-simulation.mp4"
tags: ["C", "graphics.h", "Simulation"]
---
{% raw %}
> A real-time weather simulation built in C during my first year of university. Demonstrates low-level graphics programming, animation loops, keyboard-driven interactivity, and basic physics modelling - all without a game engine or framework. Variable and function names are written in Albanian (`Shiu` = rain, `Bore` = snow, `Era` = wind, `Vetetime` = lightning).
---
<video src="https://github.com/user-attachments/assets/44974f6e-60a2-4325-a0f6-ce8ac33537ce" controls playsinline preload="metadata"></video>
## Overview

This project renders an animated rainfall and snowfall simulation directly on the screen using the `graphics.h` library in C. Weather conditions such as wind direction, wind speed, temperature, and lightning; are all controllable at runtime via keyboard input, with simulation statistics persisted to a text file on exit.

The goal was to explore **real-time graphics programming from first principles**: manual frame clearing, coordinate arithmetic, animation timing, and event-driven control flow - well below the abstraction layer of modern game engines or UI toolkits.

---

## Features

| Feature | Details |
|---|---|
| **Rain simulation** | Up to 200 raindrops rendered as angled line segments |
| **Snow simulation** | Activates when temperature <= 0°C; renders snowflakes as filled circles |
| **Wind system** | Adjustable direction (left / right / calm) and speed; affects both rain and snow drift |
| **Lightning** | Toggleable bolt rendered as a randomised multi-segment polyline |
| **Temperature control** | Switch between rain and snow in real time by raising/lowering temperature |
| **Statistics export** | On exit, writes total raindrop and snowflake counts to `Shiu.txt` |
| **Fullscreen window** | Detects screen dimensions at runtime and fills the display |

---

## Controls

| Key | Action |
|---|---|
| `C` | Wind blows left (strong) |
| `X` | Wind blows right (strong) |
| `B` | Calm - no wind |
| `V` | Maximum wind speed |
| `N` | Decrease temperature (towards snow) |
| `M` | Increase temperature (towards rain) |
| `Z` | Toggle lightning |
| `Space` | Save statistics and quit |

---

## Technical Highlights

- **Animation loop** - continuous `cleardevice()` / redraw cycle at ~20 FPS via `delay(50)`
- **Particle system** - position arrays for up to 200 independent rain and snow particles, with wrap-around boundary handling
- **Physics model** - wind speed scales both horizontal drift and vertical fall rate; snow and rain respond differently
- **Lightning rendering** - procedurally generated bolt using randomised segment offsets from a top origin point
- **File I/O** - session statistics written to disk on exit using standard `stdio.h`

---

## Requirements

| Requirement | Details |
|---|---|
| **Language** | C (C99 or later) |
| **IDE** | [Dev-C++](https://www.bloodshed.net/) with `graphics.h` support |
| **Library** | `graphics.h` (WinBGIm) - must be installed and configured |

> **Installation guide for `graphics.h`:** [YouTube tutorial](https://youtu.be/CHFyEnlMnxg?si=Up2FRqtVtF7QFjdh) *(third-party)*

---

## Getting Started

```bash
# 1. Clone or download the repository
git clone https://github.com/your-username/rain-simulation-c.git

# 2. Open Shiu.c in Dev-C++

# 3. Ensure graphics.h is installed (see link above)

# 4. Build and run (F11 in Dev-C++)
```

---

## Context

This was built during **Year 1 of my BSc** as an early exploration of graphics programming and animation in C. The project intentionally avoids high-level libraries to stay close to how drawing and animation work at a lower level - managing pixel coordinates, timing, and input polling manually.

It taught me:
- How animation loops work before game engines abstract them away
- How to model simple physics (gravity, wind) with integer arithmetic
- The value of separating simulation state from rendering logic
- How to handle keyboard input in a polling-based (non-event-driven) environment
{% endraw %}
