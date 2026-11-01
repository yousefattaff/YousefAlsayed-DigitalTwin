---
title: R2-WAITER
slug: r2-waiter
type: project
order: 4
category: AUTONOMOUS RESTAURANT ROBOTICS
role: Robotics & Control Engineer
highlight: ROS 2 Nav2 · Dynamic 3-Tray Routing · Live Animated Face
summary: An autonomous TurtleBot3 restaurant service robot built on ROS 2, featuring dynamic three-tray order fulfillment, AMCL localization with Nav2 obstacle avoidance, and live animated facial expressions driven by robot state.
status: completed
featured: true
technologies:
  - Python
  - PyQt5
  - ROS 2 Foxy
  - Nav2
  - TurtleBot3
  - Gazebo Simulation
links:
  repository: https://github.com/yousefattaff/R2-WAITER
media:
  image: /graduation/r2_waiter_portfolio_renders.png
  video: /projects/r2-waiter.mp4
what_it_does: |
  Built to automate dining room operations. R2-WAITER navigates restaurant floorplans using ROS 2 Nav2, maps dining tables with LIDAR and sensor fusion, assigns meals across a three-tray delivery queue, tracks real-time odometry, handles stuck-robot recovery routines, and interacts with diners through an animated facial expression system driven by live robot topics.
architecture:
  - "Table & Tray Dispatcher: Assigns incoming orders to delivery trays and plans sequential table visits."
  - "Nav2 Path Planning: Executes AMCL localization, global costmaps, and dynamic obstacle avoidance."
  - "Recovery Watchdogs: Detects blocked aisles or stuck goals and executes autonomous clearance maneuvers."
  - "Expressive Gaze Interface: PyQt5 animated robot face responds to motion, arrival states, and diner interactions."
key_features:
  - "Tested in realistic Gazebo 3D restaurant simulations with TurtleBot3 Waffle hardware configuration."
  - "Multi-waypoint sequential navigation with dynamic goal preemption."
  - "Layered driver architecture separating mission logic from ROS 2 motor control topics."
  - "Includes live video demonstration of animated expressions and autonomous service."
---

R2-WAITER controls a TurtleBot3 Waffle in a restaurant simulation. It provides a three-tray order workflow, table selection, sequential Nav2 goals, odometry feedback, dynamic robot gaze, animated expressions, and recovery handling for failed or stuck navigation goals.
