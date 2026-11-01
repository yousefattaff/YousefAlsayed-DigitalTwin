---
title: ATmega32 Drivers and Applications
slug: atmega32-drivers
type: project
order: 6
category: BARE-METAL EMBEDDED FIRMWARE
role: Embedded Systems Engineer
highlight: Clean MCAL/HAL/App Separation · AVR Bare-Metal C · Hardware Tested
summary: A modular, bare-metal embedded C firmware architecture for the ATmega32 microcontroller, separating hardware registers, peripheral drivers, and test applications across clean MCAL, HAL, and Application layers.
status: active
featured: false
technologies:
  - C
  - ATmega32 AVR
  - MCAL (DIO, Timers, ADC, UART, SPI, I2C)
  - HAL (LCD, Keypad, Stepper, DC Motor, Ultrasonic)
  - AVR-GCC & Make
links:
  repository: https://github.com/yousefattaff/Atmeg32_IMT
media:
  image: /projects/atmega32-drivers.png
what_it_does: |
  Production-grade firmware architecture demonstrating how clean software engineering principles apply to resource-constrained 8-bit microcontrollers. Features strictly layered separation between Microcontroller Abstraction Layer (MCAL), Hardware Abstraction Layer (HAL), and Application layers for DIO, Timers, ADC, UART, SPI, I2C, LCD, Keypads, and motor drivers on the ATmega32 (16MHz, 32KB Flash, 2KB SRAM).
architecture:
  - "MCAL (Microcontroller Layer): Direct bitwise register manipulation for DIO, Timers, ADC, EXTI, UART, SPI, and I2C."
  - "HAL (Hardware Abstraction Layer): Reusable driver APIs for 16x2 LCDs, matrix keypads, stepper motors, and sensors."
  - "Application Layer: Modular state-machine applications including smart traffic lights and sinusoidal LCD plotters."
key_features:
  - "Strictly layered architecture prevents application code from directly touching hardware registers."
  - "Optimized AVR-GCC memory footprint with verified program and SRAM memory utilization."
  - "Drivers for character LCD (4-bit & 8-bit modes), 4x4 keypad scanning, and PWM motor speed control."
  - "Provides reusable foundation for industrial automation and mechatronics systems."
---

Atmeg32_IMT separates low-level microcontroller access, reusable hardware drivers, and test applications. The repository includes DIO in the MCAL layer, LCD, LED, keypad, seven-segment, stepper motor, DC motor, switches, and ultrasonic drivers in the HAL layer, plus applications that exercise them.
