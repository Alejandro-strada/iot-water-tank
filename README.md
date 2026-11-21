# IoT Water Tank Monitor

A university team project to estimate the water available in a small container representing a storage tank, save measurements in the cloud, and display them on a web dashboard.

## Project goal

Help users check how much water remains and review changes over time without inspecting the container directly. The prototype will connect physical sensing, embedded processing, Wi-Fi communication, cloud storage, and browser visualization.

This is a monitoring prototype. Automatic pump control, drinking-water quality assessment, and deployment in a real household tank are outside the initial scope.

## Current status

**Documentation and planning in this repository; team prototype at the container-calibration stage.**

As of November 21, 2026, Alfonso's repository reports successful board and distance-sensor functional tests. Its current firmware measures distance only. Numeric accuracy and repeatability have not yet been established, and water-volume calibration remains pending.

This repository does not yet contain firmware, a working dashboard, or a deployed backend. Test reports from the teammate's repository are reference evidence, not tests independently performed here.

## How the system will work

1. An HC-SR04 ultrasonic sensor measures the gap between its transducers and the water surface.
2. An ESP32 validates readings and will filter fluctuations.
3. Calibration converts valid distances into water level and estimated volume.
4. The ESP32 will send measurements over Wi-Fi using HTTPS.
5. A cloud service will store timestamped records.
6. A web dashboard will display the latest level, estimated liters, history, and status alerts.

As water rises, the measured distance decreases. Missing echoes must be treated as measurement failures, not as an empty tank.

## Components and technologies

| Part | Selected or proposed approach | Status |
| --- | --- | --- |
| Microcontroller | ESP32, programmed with C++ in Arduino IDE 2 | Used in teammate's prototype |
| Sensor | HC-SR04 with an ECHO voltage divider | Functional distance test reported |
| Container | Transparent container with graduations through 2500 ml | Selected; usable capacity unverified |
| Calibration | Known-volume/distance pairs and later piecewise linear interpolation | Planned; reference readings pending |
| Connectivity | Wi-Fi and HTTPS | Not implemented |
| Cloud storage | ThingSpeak proposed; Supabase/PostgreSQL if relational modeling is required | Decision pending course requirements |
| Dashboard | HTML, CSS, and JavaScript | Not implemented |
| Version control | Git and GitHub | Repository initialized |

## Planned dashboard

- Latest valid water level and estimated volume in liters.
- Clearly labeled percentage: height or volume, depending on calibration.
- Measurement history chart and last-update time.
- Low-water indication with a threshold agreed by the team.
- Separate states for sensor errors, missing data, and stale measurements.
- Usable layout on phones and computers.

A zero value, an invalid measurement, and a connection failure must not look identical.

## Documentation

| Document | Contents |
| --- | --- |
| [Architecture](docs/architecture.md) | Data flow, responsibilities, and proposed measurement fields |
| [Hardware and wiring](docs/hardware.md) | Components, existing pin assignment, and electrical precautions |
| [Container and calibration](docs/calibration.md) | Reported dimensions, missing references, and calibration procedure |
| [Technical decisions](docs/decisions.md) | Selected technologies and unresolved choices |
| [Development roadmap](docs/roadmap.md) | Stages, deliverables, and completion criteria |
| [Firmware](firmware/README.md) | Current teammate implementation and planned additions |
| [Dashboard](dashboard/README.md) | Planned interface behavior and integration |
| [Test plan](tests/README.md) | Evidence needed to validate the system |

## Team and reference repository

- **Alejandro Estrada:** owner of this repository.
- **Alfonso Carranza:** teammate; maintains [iot-water-tank-monitor](https://github.com/AlfonsoCaBa/iot-water-tank-monitor).

The complete team roster and individual responsibilities are still to be recorded. This documentation summarizes the shared project direction based on Alfonso's repository, reviewed at commit [d2ad9a0](https://github.com/AlfonsoCaBa/iot-water-tank-monitor/commit/d2ad9a06b27a0a1791f8e021465136d35e3d9df2). His source code and photographs have not been copied here.

Before integrating implementation work, the team should agree which repository is the integration source and how contributions will be reviewed.

## Working conventions

- Keep documentation, code comments, and commit messages in English.
- Describe planned work separately from implemented and physically tested behavior.
- Record actual measurements, setup conditions, errors, and limitations.
- Keep Wi-Fi passwords, write API keys, and other secrets out of commits.
- Use small commits with descriptive messages and preserve attribution when integrating teammate contributions.

## Next milestone

Fix the sensor mount and collect repeated measurements for an empty container and a known 500 ml water sample. Confirm the course's database requirements before selecting cloud storage. See the [roadmap](docs/roadmap.md).
