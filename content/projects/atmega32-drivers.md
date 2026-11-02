---
title: ATmega32 Drivers and Applications
slug: atmega32-drivers
type: project
order: 6
category: BARE-METAL EMBEDDED FIRMWARE
role: Embedded Systems Engineer
highlight: DIO plus HAL drivers · one example app at a time
summary: Layered C exercises for the ATmega32. Microcontroller code is DIO. Device drivers cover the LCD, keypad, motors, and a few other peripherals. Each application is its own main.
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
what_it_does: |
  Application files call driver headers instead of writing AVR port registers themselves. DIO sets direction and reads or writes pins, using hardcoded ATmega32 port addresses. The examples blink LEDs, show keypad input on a seven-segment display, animate a name on an LCD, run a DC motor or stepper from switches, and step through a traffic-light sequence.
architecture:
  - "MCAL is DIO only. Timers, ADC, UART, SPI, and I2C are listed as future work, not as drivers in the tree."
  - "HAL covers the LCD, 4x4 keypad, LED, seven-segment display, stepper, DC motor, switches, and ultrasonic sensor. The ultrasonic driver uses Timer1 and has no demo application."
  - "Every file in APP defines main, so each one is built as a separate firmware image."
  - "The repository has no Makefile. The README builds one example with avr-gcc for the ATmega32 at 16 MHz."
key_features:
  - "The checked-in pin map shares PORTA and PORTD, so those drivers cannot all run at once without moving a module."
  - "The LCD defaults to two lines and a 5x7 font. The bus is written one bit at a time."
  - "The DC motor driver selects direction or stop. It does not set PWM speed."
  - "This is a learning repository. It does not include a test suite or recorded hardware-test results."
---

Atmeg32_IMT is a set of ATmega32 driver exercises. The split is application, device drivers, and a DIO layer.
