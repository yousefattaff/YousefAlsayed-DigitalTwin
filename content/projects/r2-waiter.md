---
title: R2-WAITER
slug: r2-waiter
type: project
order: 4
category: AUTONOMOUS RESTAURANT ROBOTICS
role: Robotics & Control Engineer
highlight: ROS 2 · 3 trays · animated face
summary: Pick up to three tables. A TurtleBot in Gazebo delivers them, then returns to the kitchen.
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
what_it_does: A desktop app sends one Nav2 goal at a time. The face follows the robot as it moves and turns.
architecture:
  - "Choose up to three tables."
  - "Nav2 drives to each table, then the kitchen."
  - "The face reacts to motion. A stuck goal is canceled."
key_features:
  - "ROS 2 Foxy, Gazebo, and a TurtleBot3 Waffle."
  - "Failed goals are reported. They are not counted as arrivals."
---

# Graduation project

R2-Waiter is my autonomous service robot graduation project at MUST in 2024. It won 3rd place at the International Gathering of Artificial Intelligence in Egypt. The physical robot uses ROS2, LiDAR, an Intel RealSense D435i camera, and NVIDIA Jetson Nano running Ubuntu Linux.

# Repository implementation

The linked R2-WAITER repository contains a ROS 2 restaurant simulation with a PyQt5 controller and an animated face. It uses TurtleBot3 and Gazebo; the physical graduation robot's hardware is documented separately above.

# What was my personal contribution? (en)

In R2-WAITER, I built the operator interface that sent ROS navigation goals so the restaurant robot could move from table to table, as recorded in my public resume. I worked with a six-person graduation team. The physical robot integrated SLAM, sensor fusion, navigation, customer ordering, and an interactive face.

# How does the restaurant simulation work? (en)

In the public simulation, the operator selects up to three tables using a PyQt5 desktop controller. Nav2 drives a TurtleBot3 Waffle in Gazebo to each table and then back to the kitchen. The animated face reacts to motion, stuck goals are canceled, and failed goals are reported without being counted as arrivals.

# إيه مساهمتي في روبوت التخرج؟ (ar)

سيرتي الذاتية بتوثّق إني بنيت واجهة المشغّل اللي بتبعت ROS navigation goals عشان روبوت المطعم يتحرك بين الترابيزات. اشتغلت ضمن فريق تخرج من ستة أشخاص. الروبوت الفعلي دمج SLAM و sensor fusion والملاحة وطلبات العملاء ووجه تفاعلي.

# محاكاة المطعم بتشتغل إزاي؟ (ar)

في المحاكاة العامة، المشغّل بيختار لحد ثلاث ترابيزات باستخدام واجهة PyQt5. Nav2 بيحرّك TurtleBot3 Waffle داخل Gazebo لكل ترابيزة وبعدها يرجّعه للمطبخ. الوجه بيتفاعل مع الحركة، والـ goals المتعطلة بتتلغي، وفشل الوصول بيتسجّل من غير اعتباره وصول ناجح.
