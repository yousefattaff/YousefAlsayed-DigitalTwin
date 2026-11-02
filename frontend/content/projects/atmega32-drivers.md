---
title: ATmega32 Drivers and Applications
slug: atmega32-drivers
type: project
order: 6
category: BARE-METAL EMBEDDED FIRMWARE
role: Embedded Systems Engineer
highlight: DIO · LCD · keypad · motors
summary: Small C programs for the ATmega32, split into apps, device drivers, and pin I/O.
status: active
featured: false
technologies:
  - C
  - ATmega32
  - AVR-GCC
  - DIO
  - LCD
  - Keypad
links:
  repository: https://github.com/yousefattaff/Atmeg32_IMT
media:
  image: /projects/atmega32-drivers.png
what_it_does: Example apps call driver headers. The only microcontroller driver in the repo is DIO.
architecture:
  - "Pick one example. Each file is its own program."
  - "The app calls the LCD, keypad, or motor driver."
  - "Those drivers use DIO for the pins."
key_features:
  - "LCD, keypad, LEDs, stepper, DC motor, and an ultrasonic sensor."
  - "UART, SPI, and I2C are not written yet."
---

Layered ATmega32 exercises. DIO is the microcontroller layer. Each demo has its own main.
