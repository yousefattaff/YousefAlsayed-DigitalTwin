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

# What did I build in the ATmega32 project? (en)

My ATmega32 project contains small Embedded C programs organized into applications, device drivers, and pin I/O. Each example is its own program with its own main function. The repository uses AVR-GCC and includes LCD, keypad, LED, motor, and ultrasonic-sensor exercises.

# How are the driver layers organized? (en)

Example applications call LCD, keypad, or motor driver headers. Those device drivers use DIO to access the microcontroller pins. DIO is the implemented microcontroller-driver layer; UART, SPI, and I2C drivers are not written in this repository version.

# بنيت إيه في مشروع ATmega32؟ (ar)

مشروع ATmega32 فيه برامج Embedded C صغيرة متقسمة لتطبيقات و device drivers وطبقة pin I/O. كل مثال برنامج مستقل بدالة main خاصة بيه. المستودع بيستخدم AVR-GCC وفيه تدريبات LCD و keypad و LED وموتورات و ultrasonic sensor.

# طبقات الـ drivers مترتبة إزاي؟ (ar)

التطبيقات بتنادي driver headers للشاشة أو الـ keypad أو الموتور. الـ device drivers بتستخدم DIO للوصول لأطراف المتحكم. DIO هي طبقة microcontroller drivers المنفذة، و UART و SPI و I2C لسه مش مكتوبين في النسخة دي.
