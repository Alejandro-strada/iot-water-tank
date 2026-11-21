# ESP32 firmware

No firmware source has been added to this repository yet.

The teammate's [distance sketch](https://github.com/AlfonsoCaBa/iot-water-tank-monitor/blob/d2ad9a06b27a0a1791f8e021465136d35e3d9df2/firmware/water_tank_monitor/water_tank_monitor.ino) currently:

- Uses GPIO 18 for TRIG and GPIO 19 for ECHO.
- Prints over Serial at 115200 baud.
- Sends a 10 microsecond trigger pulse.
- Waits up to 30000 microseconds for an ECHO pulse.
- Converts travel time to centimeters and rejects values outside 2–400 cm.
- Reports a timeout as an error.
- Pauses 500 milliseconds between measurement cycles.

It does not yet perform filtering, volume calculation, Wi-Fi connection, or cloud uploads. Functional sensor response was reported by the teammate; a quantitative accuracy claim is not available.

## Planned additions

1. Calibration configuration based on real measurements.
2. Validation and a filtering method justified by recorded data.
3. Estimated liters and clearly defined percentage.
4. Wi-Fi connection and recovery.
5. Authorized HTTPS uploads with explicit failure handling.

Document board/core versions and compilation results when source is integrated. Preserve source attribution. Keep credentials in an ignored local configuration file and provide a placeholder example.

See [calibration](../docs/calibration.md) and [test plan](../tests/README.md).
