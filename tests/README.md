# Test plan and evidence

No physical tests have been performed or recorded in this repository.

The teammate reports successful board and sensor functional tests. Those reports do not establish numerical sensor accuracy, water-volume accuracy, or end-to-end system operation.

## Planned checks

| Area | Procedure | Evidence |
| --- | --- | --- |
| Board | Upload diagnostic sketch and observe serial output | Board/core version, port, output |
| Distance | Compare repeated readings with ruler references | Reference distances, raw readings, errors |
| Water response | Measure settled water at fixed mounting | Valid and failed readings by volume |
| Calibration | Validate at volumes outside calibration points | Reference volume, estimate, error |
| Invalid readings | Safely test missing or unsuitable targets | Explicit error; no false empty value |
| Wi-Fi | Disconnect and restore the network | Recovery behavior and timing |
| Cloud | Upload records and exercise failure cases | Stored timestamps and upload status |
| Dashboard | Test valid, missing, stale, and invalid data | Screenshots and expected/observed behavior |
| Integration | Change water volume and follow the full data path | Sensor, cloud, and dashboard consistency |

## Result template

- Date and tester:
- Firmware commit:
- Board, sensor, and wiring:
- Sensor mounting and calibration version:
- Reference instrument and resolution:
- Procedure and conditions:
- Expected behavior:
- Raw observations:
- Measured errors:
- Outcome and limitations:
- Evidence location:

For volume checks, report absolute error in ml. Relative percentage error is undefined at a zero reference volume; use absolute error there. Agree acceptable error limits before claiming the prototype meets them.

Store actual observations separately from example data. Do not mark planned checks as passed.
