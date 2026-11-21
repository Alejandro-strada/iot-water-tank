# Hardware and wiring reference

## Planned materials

- ESP32 development board and a data-capable USB cable.
- HC-SR04 ultrasonic distance sensor.
- Breadboard, jumper wires, and resistors for an ECHO voltage divider.
- Transparent test container and a stable sensor mounting support.
- Ruler and a separate graduated vessel for calibration.
- Computer with Arduino IDE 2 and ESP32 board support.

Exact board variant, resistor values, and final wiring should be recorded for this team's physical assembly before reproducing it.

## Existing teammate pin assignment

| HC-SR04 signal | ESP32 connection in teammate's sketch |
| --- | --- |
| TRIG | GPIO 18, output |
| ECHO | GPIO 19, input through voltage divider |
| GND | Common ground |
| VCC | Appropriate 5 V supply for the sensor; verify the board's supply arrangement |

The HC-SR04 ECHO signal must not be connected directly as a 5 V signal to an ESP32 GPIO. Use the documented divider or a suitable level shifter; confirm component values and output voltage before connecting the input.

This is a connection reference, not a verified schematic for every ESP32 board.

## Mechanical arrangement

Mount the sensor above the water, facing the surface, with the electronics kept dry. Avoid a hand-held mount during calibration. The container opening, walls, water movement, and sensor alignment may affect echoes.

The teammate's calibration plan proposes approximately 5 cm or more clearance above the highest intended water level as an initial margin to test. Actual usable minimum distance and reflections must be validated in the assembled setup.

Changing the sensor position invalidates previously measured distance references.

## Setup checklist

1. Confirm the board model and current USB serial port.
2. Verify a basic board sketch with the sensor disconnected.
3. Disconnect power before assembling or changing wiring.
4. Check the ECHO voltage divider and common ground.
5. Run a distance-only test before attempting volume conversion.
6. Record the actual wiring and mounting with the calibration results.

Reference: [teammate wiring documentation](https://github.com/AlfonsoCaBa/iot-water-tank-monitor/blob/d2ad9a06b27a0a1791f8e021465136d35e3d9df2/docs/wiring.md).
