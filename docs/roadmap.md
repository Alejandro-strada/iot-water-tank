# Development roadmap

Status recorded November 21, 2026. Team progress is based on the reviewed teammate repository; this repository currently contains documentation only.

| Stage | Work | Completion evidence | Team status |
| --- | --- | --- | --- |
| 0. Preparation | Identify board, set up tools, verify uploads | Repeated serial output from the board | Reported complete |
| 1. Distance sensing | Wire sensor and display distance | Response checked against ruler; retain numeric series | Functional test reported; quantitative accuracy pending |
| 2. Calibration | Fix mount, collect references, validate/filter, convert to liters | Comparison against known volumes with recorded errors | In progress |
| 3. Connectivity | Wi-Fi connection and recovery | Network loss and reconnection tests | Pending |
| 4. Storage | Select cloud, authorize uploads, retain history | Actual stored records and communication-error tests | Pending |
| 5. Dashboard | Indicators, history, timestamps, alerts | Interface using real records and missing/stale states | Pending |
| 6. Integration | End-to-end tests and presentation | Reproducible procedure, results, limitations | Pending |

## Immediate work

- Confirm team responsibilities and the integration repository.
- Confirm course requirements for database modeling and final deliverables.
- Collect fixed-mount empty and measured 500 ml readings.
- Review those results before extending the calibration table.
- Document actual wiring, reference equipment, and setup conditions.

## Deliverables to build

- Calibrated ESP32 firmware with configuration examples that contain no secrets.
- A documented storage/API integration.
- A working web dashboard.
- A reproducible test log and project explanation for the final presentation.

No dates, accuracy targets, or individual task assignments have been invented. These should be added when the team agrees on them.
