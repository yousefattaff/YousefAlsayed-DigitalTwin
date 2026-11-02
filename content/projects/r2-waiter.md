---
title: R2-WAITER
slug: r2-waiter
type: project
order: 4
category: AUTONOMOUS RESTAURANT ROBOTICS
role: Robotics & Control Engineer
highlight: ROS 2 Foxy · 3 tray slots · animated face
summary: A PyQt5 controller for a TurtleBot3 Waffle in a Gazebo restaurant. Pick up to three tables, and it sends them to Nav2 one at a time, then returns to the kitchen.
status: completed
featured: true
technologies:
  - Python
  - PyQt5
  - ROS 2 Foxy
  - Nav2
  - TurtleBot3
  - Gazebo
links:
  repository: https://github.com/yousefattaff/R2-WAITER
media:
  image: /graduation/r2_waiter_portfolio_renders.png
  video: /projects/r2-waiter.mp4
what_it_does: |
  The Orders screen maps up to three selected tables onto tray labels. SET OFF sends those tables as sequential Nav2 goals and appends the kitchen. The bridge waits for each result and shows distance from odometry. The face thinks while the robot moves, celebrates at a table, and looks left or right from angular velocity. If ROS Python is missing, the desktop app opens in mock mode.
architecture:
  - "The PyQt5 window dispatches table keys, then kitchen, through Ros2Bridge."
  - "Ros2Bridge sends one NavigateToPose goal at a time. A failed goal is reported, and the button unlocks when the mission emits done."
  - "The table navigator marks a goal stuck if remaining distance does not improve by 0.2 m for 30 seconds, cancels it, and speaks. Nav2's own recoveries run before that check."
  - "The face is an HTML page inside Qt WebEngine. rosbridge feeds /cmd_vel so the gaze can follow turns."
key_features:
  - "The simulation is ROS 2 Foxy, a Gazebo restaurant world, a TurtleBot3 Waffle, and Nav2 with the DWB controller."
  - "The map image is built once with SLAM. It is not committed, so Nav2 cannot plan until that file exists."
  - "Tables 8–12 and home are still origin placeholders in locations.json."
  - "The state-machine unit tests run without a ROS install."
---

R2-WAITER is the ROS 2 restaurant simulation and desktop controller. The operator picks tables, Nav2 drives the TurtleBot, and the face follows the robot's motion.
