---
layout: project
excerpt_separator: ""
title: "SmolVLA Perturbation Study"
order: 1
featured: true
description: "Robustness evaluation of the SmolVLA vision-language-action model on a simulated pick-and-place task, tested across 11 perturbation conditions."
repo: "https://github.com/IloPinci/SmolVLA-Perturbation-Study"
video: "/assets/videos/smolvla-perturbation-study.mp4"
tags: ["VLA", "Imitation Learning", "Genesis", "LeRobot"]
skills: [Python]
---
{% raw %}
<div align="center" markdown="1">
<video src="https://github.com/user-attachments/assets/4fa68e74-05a6-4f1b-920d-dd13814139f3" controls playsinline preload="metadata"></video>
</div>

## Table of Contents

<details markdown="1">
<summary><b>Expand Table of Contents</b></summary>

* [Overview](#overview)
* [System Architecture](#system-architecture)
* [1. Demonstration Collection](#1-demonstration-collection)
    * [Background](#background)
    * [IK Oracle](#ik-oracle)
    * [System Noise](#system-noise)
* [2. Fine-Tuning](#2-fine-tuning)
    * [Background](#background-1)
    * [Implementation Notes](#implementation-notes)
* [3. Perturbation Framework](#3-perturbation-framework)
    * [Camera Perturbations](#camera-perturbations)
    * [Scene Perturbations](#scene-perturbations)
* [Repository Structure](#repository-structure)
* [Setup](#setup)
* [Running the Pipeline](#running-the-pipeline)
* [Perturbation Reference](#perturbation-reference)
* [Results](#results)
* [Key Design Decisions](#key-design-decisions)
* [Acknowledgements](#acknowledgements)

</details>

---

## Overview

This project implements a full robustness evaluation pipeline for [SmolVLA](https://huggingface.co/lerobot/smolvla_base), a 450M-parameter Vision-Language-Action model, on a simulated pick-and-place task. An SO-101 six-degree-of-freedom arm operates inside the [Genesis](https://github.com/Genesis-Embodied-AI/Genesis) physics engine. A scripted inverse-kinematics oracle automatically collects 195 successful demonstrations with no manual teleoperation, fine-tunes the base SmolVLA checkpoint via imitation learning, and evaluates the resulting policy across **11 independent perturbation conditions** at 100 rollouts each.

The pipeline runs end-to-end on a single GPU and is designed to be fully reproducible. Every perturbation axis - camera malfunctions, camera absences, positional offsets, and visual distractors - is controlled via CLI flags, making it straightforward to add new conditions without touching the core code.

**Key findings:**
- The side (context) camera is the primary source of spatial grounding; corrupting it alone collapses TSR to 0%
- Absent camera tensors cause worse failure than equivalent zeroed streams, despite representing less relative information loss - the policy has no mechanism to handle structural changes to its observation space at inference time
- Two flanking distractor spheres produce the largest single performance drop (87% → 20% TSR) short of absolute failure, driven by color salience rather than language-guided object identity

---

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│  two_camera_setup.py  - scene construction           │
│    build_environment()   table, cube, target, spheres│
│    attach_cameras()      context / wrist / top cams  │
│    is_success()          placement check             │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│  oracle_direct.py  - demonstration collection        │
│    SO101Oracle           IK waypoint executor        │
│    collect_demonstrations()  LeRobot v3.0 writer     │
└────────────────────────┬─────────────────────────────┘
                         │  demos/lerobot/
                         ▼
┌──────────────────────────────────────────────────────┐
│  finetune.py  - SmolVLA fine-tuning                  │
│    lerobot-train CLI     20 000 steps, batch 64      │
└────────────────────────┬─────────────────────────────┘
                         │  checkpoints/last/
                         ▼
┌──────────────────────────────────────────────────────┐
│  zeroshot_eval.py  - perturbation evaluation         │
│    SmolVLAAgent          policy wrapper              │
│    run_rollout()         100 episodes per condition  │
│    GraspDetector         sub-goal latching           │
└────────────────────────┬─────────────────────────────┘
                         │  results/<condition>/zeroshot.csv
                         ▼
┌──────────────────────────────────────────────────────┐
│  analyze_all_results.py  - figures                   │
│    TSR bars, PSS strips, 4-panel summary             │
└──────────────────────────────────────────────────────┘
```

All perturbation configuration lives in `scene_params.py` - a single source of truth for cube colors, spawn presets, sphere layouts, and camera blackout modes, shared across collection, fine-tuning, and evaluation.

---

## 1. Demonstration Collection

### Background

Imitation learning requires a dataset of successful task demonstrations. Rather than relying on manual teleoperation, this project uses a scripted **inverse-kinematics oracle** that executes a deterministic six-waypoint trajectory. This approach guarantees a high success rate during collection, keeps the dataset free of failed demonstrations (which are stored separately for inspection), and makes the collection process fully automated.

The oracle follows the LeRobot v3.0 dataset format: three simultaneous 256×256 video streams, the six-dimensional joint state vector, the action vector, and the natural language prompt are recorded at 10 Hz and written directly to disk as the simulation runs.

### IK Oracle

The oracle navigates the SO-101 arm through six waypoints per episode:

| Waypoint | Description |
|---|---|
| 0 | Hover 12 cm above the cube with an open gripper |
| 1 | Descend to grasp height (1 cm above table + gripper finger length) |
| 2 | Stay static while closing the gripper |
| 3 | Lift the cube 15 cm above the table |
| 4 | Move to target center at 15 cm height |
| 5 | Descend toward the target zone; open gripper at 4 cm distance |

Waypoint transitions are executed by linearly interpolating in joint space over 30 steps, followed by a settling phase that allows the physics solver to converge before the next movement begins.

Three cameras are attached to the scene and record every episode:

| Camera | Description |
|---|---|
| Context (side) | Third-person view diagonally right of the workspace |
| Wrist | Attached to the gripper link via a 4×4 homogeneous transform; follows the end effector |
| Top | Orthographic overhead view of the workspace |

A separate witness camera rig at 1280×720 renders the same scene for visual inspection without entering the dataset.

### System Noise

To prevent the dataset collapsing into a single deterministic trajectory, noise is injected at each episode. Cartesian waypoints receive position noise with σ = 4 mm; the vertical component uses a half-normal distribution to prevent downward collisions with the table, and the X/Y components are scaled to 30% to avoid IK failures from large planar deviations. Rotational noise of σ = 1° is applied to the grasping quaternion.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## 2. Fine-Tuning

### Background

SmolVLA is fine-tuned via imitation learning using the `lerobot-train` CLI on the collected dataset. The pretrained `lerobot/smolvla_base` checkpoint is used as the starting point. To ensure consistent normalization between training and inference, the mean and standard deviation of all state and action dimensions are computed from the dataset and stored in `meta/stats.json`; the evaluation agent uses these at inference time to normalize inputs and denormalize predicted actions.

### Implementation Notes

`finetune.py` validates that the dataset is a well-formed LeRobot v3.0 directory (checking `meta/info.json` for the correct `codebase_version`) before launching training, and warns if fewer than 50 episodes are present - the minimum SmolVLA recommends for reliable performance. It streams training output to the terminal in real time, writes a full log to `train_log.txt`, and saves run metadata (dataset path, step count, batch size, final checkpoint path, elapsed time) to `finetune_run.json` on completion.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## 3. Perturbation Framework

All perturbation logic is implemented in `scene_params.py` via two independent config objects that can be combined freely.

### Camera Perturbations

`CameraPerturbation` controls three axes applied at inference time without retraining:

**Blackout / malfunction** - individual camera streams are replaced with black frames (zeroed tensors), simulating the worst case of data corruption while preserving the full tensor structure the policy expects.

**Absence** - individual camera tensors are omitted entirely from the observation dictionary, simulating a sensor that is physically missing rather than malfunctioning. This is distinct from zeroing: the policy receives a structurally different input and must handle a key that was always present during training being gone.

**Position offset and tilt** - cameras are translated or their look-at direction is rotated around the Z-axis, simulating physical mounting drift or a camera that has been knocked out of calibration.

### Scene Perturbations

`ScenePerturbation` controls three axes that affect the environment itself:

**Cube color** - the rendered block color changes (red / blue / green / yellow) and the language instruction passed to the policy is updated to match, keeping the instruction internally consistent with the scene.

**Cube position preset** - the cube and target zone are spawned at fixed named positions instead of the random distribution used during training, testing out-of-distribution spatial generalization.

**Distractor spheres** - additional objects are placed on the table surface near the cube and target zone, testing whether the policy can maintain correct object identity under visual clutter.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Repository Structure

```
.
├── training/
│   ├── scene_params.py          # Cube colors, spawn positions, sphere presets,
│   │                            #   CameraPerturbation and ScenePerturbation configs
│   ├── two_camera_setup.py      # Scene construction, camera attachment, success checks
│   ├── oracle_direct.py         # Scripted IK oracle + LeRobot v3.0 dataset writer
│   ├── finetune.py              # Launches lerobot-train on the collected dataset
│   ├── zeroshot_eval.py         # Runs N rollouts and writes results/zeroshot.csv
│   ├── analyze_zeroshot.py      # TSR bar, sub-goal chart, PSS histogram (one condition)
│   └── analyze_all_results.py   # Full figure set across all conditions
└── so101_arm/
    └── so101_new_calib.xml      # MuJoCo MJCF description of the SO-101 arm
                                 # accessed by training scripts as ../so101_arm/so101_new_calib.xml
```

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Setup

**Requirements:** Python 3.10+, CUDA GPU (A100 recommended; an RTX 3090 works with `--batch_size 16`)

```bash
git clone https://github.com/<your-org>/<this-repo>.git
cd <this-repo>

# 1. Install Genesis
pip install genesis-world

# 2. Install LeRobot with SmolVLA extras (from source)
git clone https://github.com/huggingface/lerobot.git
cd lerobot && pip install -e ".[smolvla]" && cd ..

# 3. Install analysis dependencies
pip install numpy matplotlib scipy imageio[ffmpeg]
```

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Running the Pipeline

### Step 1 - Collect demonstrations

```bash
python training/two_camera_setup.py
```

Runs the IK oracle for 200 episodes and writes a LeRobot v3.0 dataset to `demos/nominal/lerobot/`. Successful episodes (target: ≥195) go into the training dataset; failures are stored separately. Expected runtime: ~2 hours on an A100.

### Step 2 - Fine-tune SmolVLA

```bash
python training/finetune.py \
    --dataset_dir demos/nominal/lerobot/ \
    --repo_id     local/genesis_pickplace \
    --out_dir     outputs/train/smolvla_genesis/ \
    --steps       20000 \
    --batch_size  64
```

The fine-tuned checkpoint is saved to `outputs/train/smolvla_genesis/checkpoints/last/pretrained_model`. Expected runtime: ~3 hours on an A100.

### Step 3 - Evaluate

```bash
CKPT=outputs/train/smolvla_genesis/checkpoints/last/pretrained_model
DATA=demos/nominal/lerobot/

# Baseline
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --out results/baseline/zeroshot.csv

# Single active camera - context only
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode context_only --out results/context_only/zeroshot.csv

# Single active camera - wrist only
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode wrist_only --out results/wrist_only/zeroshot.csv

# Single active camera - top only
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode top_only --out results/top_only/zeroshot.csv

# Single stream corruption - no top
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode no_top --out results/no_top/zeroshot.csv

# Single stream corruption - no wrist
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode no_wrist --out results/no_wrist/zeroshot.csv

# Single stream corruption - no context
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode no_context --out results/no_context/zeroshot.csv

# Absent inputs - top dropped
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode absent_top --out results/absent_top/zeroshot.csv

# Absent inputs - wrist + top dropped
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --blackout_mode absent_wrist_top --out results/absent_wrist_top/zeroshot.csv

# Wrist camera shifted +3 cm along x
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --pos_target wrist --pos_offset 0.03 0.0 0.0 \
    --out results/wrist_shift/zeroshot.csv

# Two flanking distractor spheres
python training/zeroshot_eval.py --checkpoint $CKPT --dataset_dir $DATA \
    --spheres two_flanking --out results/spheres/zeroshot.csv
```

Each run produces a CSV with per-episode `success`, `pss`, `steps`, `reached`, `lifted`, `placed` columns, and saves MP4 videos of successes and failures to `results/<condition>/videos/`.

### Step 4 - Generate figures

```bash
# Single-condition plots (TSR bar, sub-goal chart, PSS histogram)
python training/analyze_zeroshot.py --csv results/baseline/zeroshot.csv

# All conditions - full figure set
python training/analyze_all_results.py --results_root results/
```

Figures are written to `results/figures/` as both PDF and PNG.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Perturbation Reference

### Camera perturbations (`--blackout_mode`)

| Mode | Effect |
|---|---|
| `none` | All three cameras active (baseline) |
| `context_only` | Only side camera stream passed to policy |
| `wrist_only` | Only wrist camera stream passed to policy |
| `top_only` | Only top camera stream passed to policy |
| `no_top` | Top stream zeroed (black frames) |
| `no_wrist` | Wrist stream zeroed |
| `no_context` | Side stream zeroed |
| `absent_top` | Top tensor omitted from observation dict |
| `absent_wrist_top` | Wrist + top tensors omitted |
| `absent_all` | All camera tensors omitted |

Camera position and tilt can be combined with any blackout mode:

```bash
--pos_target  {context,wrist,top}   # which camera to shift
--pos_offset  DX DY DZ              # metres
--tilt_target {context,wrist,top}
--tilt_deg    DEGREES
```

### Scene perturbations

```bash
# Cube colour (also updates the language instruction)
--cube_color {red,blue,green,yellow}

# Fixed spawn position (overrides random training distribution)
--cube_pos {nominal,near_left,far_left,near_right,far_right,
            workspace_edge,target_shift,close_to_target}

# Distractor sphere layout
--spheres {none,single_left,single_right,two_flanking,
           high_clutter,near_target,color_match}
```

Perturbation axes are independent and can be combined freely on a single command.

### Workspace reachability

Before changing spawn ranges, verify IK reachability:

```bash
python training/workspace_reach_sweep.py \
    --xml ../so101_arm/so101_new_calib.xml \
    --out results/workspace_reach.png
```

Sweeps a grid of (x, y) positions at each oracle waypoint height and prints an ASCII reachability map and a radial reach table to the terminal.

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Results

TSR = Task Success Rate (binary, cube placed on target at end of rollout). PSS = Partial Success Score, max 1.6 (reached 0.2 + lifted 0.4 + placed 1.0). All conditions N=100 rollouts.

| Condition | TSR | Mean PSS |
|---|---|---|
| Baseline (all cameras) | **87%** | 1.388 |
| Context camera only | 33% | 0.592 |
| Wrist camera only | 0% | 0.024 |
| Top camera only | 0% | 0.032 |
| No top (ctx + wrist active) | 63% | 1.048 |
| No wrist (ctx + top active) | 58% | 0.994 |
| No context (wrist + top active) | 0% | 0.044 |
| Absent top camera | 0% | 0.020 |
| Absent wrist + top | 0% | 0.000 |
| Wrist camera shifted +3 cm | 80% | 1.326 |
| Two flanking distractor spheres | 20% | 0.390 |

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Scripted IK oracle over teleoperation | Fully automated collection; reproducible across machines |
| LeRobot v3.0 dataset format | Native compatibility with `lerobot-train` and SmolVLA inference |
| Zeroed tensors vs. absent tensors | Tests two distinct failure modes: data corruption vs. structural observation change |
| Independent perturbation axes | Any combination can be applied without code changes |
| `scene_params.py` as single config source | Collection, fine-tuning, and evaluation share identical definitions |
| Witness cameras (1280×720) separate from training cameras (256×256) | High-res inspection videos without affecting the dataset |
| Half-normal vertical noise | Prevents downward IK failures into the table surface |
| Wilson score confidence intervals | More accurate than normal approximation at TSR extremes (0% and 100%) |

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>

---

## Acknowledgements

This project builds on [SmolVLA](https://huggingface.co/lerobot/smolvla_base) by Hugging Face, the [LeRobot](https://github.com/huggingface/lerobot) training framework, the [Genesis](https://github.com/Genesis-Embodied-AI/Genesis) physics engine, and the [SO-101](https://huggingface.co/docs/lerobot/en/so101) robot platform. The perturbation methodology is inspired by [Libero+](https://arxiv.org/abs/2510.13626).

<p align="right">(<a href="#table-of-contents">Back to ToC</a>)</p>
{% endraw %}
