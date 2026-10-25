---
layout: project
excerpt_separator: ""
title: "Modeling & Control of Manipulators"
order: 5
featured: false
description: "MATLAB implementations of rotation representations, kinematic modelling and Cartesian control of a 7-DOF arm, tested on a real Franka Panda."
repo: "https://github.com/IloPinci/Modeling-and-Control-of-Manipulators_UniGe"
video: "/assets/videos/manipulator-control.mp4"
tags: ["MATLAB", "Kinematics", "Franka Panda"]
skills: [MATLAB]
---
{% raw %}
> Three progressive assignments covering rotation representations, geometric/kinematic modelling, and full Cartesian control of a 7-DOF robotic manipulator. All implemented in MATLAB and tested on a real **Franka Panda** robotic arm.  
> **Final grade: 97/100**

---

## Table of Contents

- [Assignment 1 - Rotation Representations](#assignment-1--rotation-representations)
- [Assignment 2 - Geometric & Kinematic Model](#assignment-2--geometric--kinematic-model)
- [Assignment 3 - Cartesian Control on the Franka Panda](#assignment-3--cartesian-control-on-the-franka-panda)

---

## Assignment 1 - Rotation Representations

### Overview
This assignment focuses on the mathematical foundations of 3D rotations. All representations are implemented from scratch in MATLAB, with validation utilities and a full frame-tree visualisation of a 7-DOF manipulator.

### Topics Covered

**Angle-Axis (Rodrigues' Formula)**  
`AngleAxisToRot.m` - Converts a rotation axis `h` and angle `θ` into a 3×3 rotation matrix using the Rodrigues formula. Handles the degenerate cases `θ = 0` (identity) and `h = 0` with a zero `θ`.

**Rotation Matrix Validation**  
`IsRotationMatrix.m` - Checks both the orthonormality condition (`Rᵀ R = I`) and the determinant condition (`det(R) = 1`) with a configurable tolerance.

**Rotation Matrix → Angle-Axis**  
`RotToAngleAxis.m` - Extracts `(h, θ)` from a rotation matrix. Handles all three cases:
- `θ ≈ 0`: axis is arbitrary, returns `[1; 0; 0]`
- `θ ≈ π`: recovers axis from `(R + I) / 2`
- General case: uses the skew-symmetric part `(R − Rᵀ) / 2sin(θ)`

**Eigenvector-Based Angle-Axis**  
`RotToAngleAxisEigen.m` - Alternative extraction using the eigendecomposition of `R`; the eigenvector corresponding to eigenvalue 1 is the rotation axis.

**Yaw-Pitch-Roll (ZYX Euler Angles)**  
`YPRToRot.m` / `RotToYPR.m` - Converts between YPR Euler angles `(ψ, θ, φ)` and rotation matrices. Detects and handles gimbal lock when `|θ| ≈ π/2`.

**Frame Tree Visualisation**  
`PlotRefFrames.m` - Builds and plots the full chain of reference frames for a 7-DOF manipulator using homogeneous transformations, rendered in 3D with RGB axes.


---

## Assignment 2 - Geometric & Kinematic Model


### Overview
This assignment implements a complete object-oriented geometric and kinematic model of a 7-DOF manipulator (6 revolute + 1 prismatic joint). It introduces the frame-tree data structure, direct kinematics, and the geometric Jacobian.

### Topics Covered

**Frame Tree - `BuildTree.m`**  
Constructs the `iTj_0` 3-D matrix (4×4×7) encoding the static transformation between consecutive frames at the zero configuration. Rotations are expressed as products of elementary rotations about Z, Y, X axes, and translations include the link lengths (in metres).

**Geometric Model - `geometricModel.m`**  
A MATLAB class (`handle`) with three core methods:

| Method | Description |
|---|---|
| `updateDirectGeometry(q)` | Updates all `iTj` matrices for a given joint configuration `q` by composing the static `iTj_0` with the joint actuation matrix (Rz for revolute, Tz for prismatic) |
| `getTransformWrtBase(start, end)` | Returns the homogeneous transform `sTe` between any two frames by chaining (or inverting) the relevant `iTj` matrices |

**Kinematic Model - `kinematicModel.m`**  
Computes the geometric Jacobian using the standard column-by-column formula:

- **Revolute joint j:** `Jv_j = z_j × (p_target − p_j)`, `Jω_j = z_j`
- **Prismatic joint j:** `Jv_j = z_j`, `Jω_j = 0`

Includes `checkJacobianNumerically()` which validates the analytical Jacobian against a finite-difference approximation using the SO(3) matrix logarithm.

**Simulation**  
Linearly interpolates joint positions from `qi` to `qf` over 10 seconds and plots the robot's motion using `plotManipulators.m`.


---

## Assignment 3 - Cartesian Control on the Franka Panda


### Overview
This assignment closes the loop: a full **resolved-rate Cartesian controller** that drives the **tool frame** (not just the end-effector) to a desired pose in 3D space. The controller was validated both in simulation and on a real **Franka Emika Panda** robot - and it worked perfectly.

### Topics Covered

**Tool Frame - `geometricModel.m` (extended)**  
The geometric model is extended with a rigid tool transformation `eTt` (end-effector → tool), enabling:
- `getToolTransformWrtBase()` - computes `bTt = bTe · eTt`

**Tool Jacobian - `kinematicModel.m` (extended)**  
Three Jacobian variants:

| Method | Target frame |
|---|---|
| `getJacobianOfEndEffectorWrtBase()` | End-effector |
| `getJacobianOfToolWrtBase()` | Tool tip |
| `getJacobianOfJointWrtBase(i)` | Any intermediate frame |

**Cartesian Error - `cartesianControl.m`**  
**Angle-Axis method** *(used in control)* - converts `tRg = bRtᵀ · bRg` to `(h, θ)` and computes the error as `bRt · (θ · h)`. Numerically stable at all orientations.

**Inverse Kinematics - SVD Pseudoinverse**  
Two pseudoinverse strategies are implemented as local functions:

```matlab
% Truncated SVD pseudoinverse (discards small singular values)
q_dot = svdPinvApprox(J) * x_dot_ref;

% Damped least-squares (smooth behaviour near singularities)
q_dot = svdDampedPinvApprox(J, lambda) * x_dot_ref;
```

**Kinematic Simulation - `KinematicSimulation.m`**  
Single Euler integration step with joint limit enforcement:
```
q ← clip( q + dt · q̇,  q_min,  q_max )
```

**Control Loop**  
The resolved-rate loop runs at 100 samples over 15 seconds:
1. Compute tool pose `bTt`
2. Compute Cartesian error `x_dot = [K_l · Δp; K_a · Δφ]`
3. Compute joint velocities via damped pseudoinverse: `q_dot = J# · x_dot`
4. Integrate: `q ← q + dt · q_dot`
5. Stop when `‖Δp‖ < 0.01` and `‖Δφ‖ < 0.01`

**Velocity Analysis (Ex 2.5)**  
Tool velocity is computed two ways and verified to match:
- *Method 1:* Rigid-body formula - `v_t = v_e + ωₑ × b_r_et`
- *Method 2:* Direct tool Jacobian - `x_dot_t = J_tool · q_dot`


### Demo - Real Franka Panda Robot

The controller was deployed on a real **Franka Emika Panda** and successfully drove the tool to the target pose as seen below:
<video src="https://github.com/user-attachments/assets/4913da74-0153-4850-a631-9fb3c739d144" controls playsinline preload="metadata"></video>
## Repository Structure

```
.
├── README.md                          ← You are here
│
├── a1/                                ← Assignment 1 
│   └── mcm_assignment1_matlab/
│       ├── main.m
│       └── include/
│           ├── AngleAxisToRot.m
│           ├── RotToAngleAxis.m
│           ├── RotToAngleAxisEigen.m
│           ├── YPRToRot.m
│           ├── RotToYPR.m
│           ├── IsRotationMatrix.m
│           └── PlotRefFrames.m
│
├── MCM_Matlab_Code/                   ← Assignment 2 
│   ├── main.m
│   └── include/
│       ├── BuildTree.m
│       ├── geometricModel.m
│       ├── kinematicModel.m
│       └── plotManipulators.m
│
└── include/                           ← Assignment 3 
    ├── BuildTree.m
    ├── geometricModel.m
    ├── kinematicModel.m
    ├── cartesianControl.m
    ├── KinematicSimulation.m
    ├── IsRotationMatrix.m
    ├── RotToAngleAxis.m
    └── plotManipulators.m
```
{% endraw %}
