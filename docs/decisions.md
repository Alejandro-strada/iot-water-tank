# Technical decisions

| Topic | Current direction | State |
| --- | --- | --- |
| Embedded development | C++ with Arduino IDE 2 and Espressif ESP32 support | Selected in team reference |
| Sensor | HC-SR04 with ECHO voltage reduction | Used in teammate prototype |
| Volume calculation | Known-volume calibration and piecewise interpolation | Planned, not implemented |
| Web interface | HTML, CSS, JavaScript | Selected direction |
| Data transport | HTTPS over Wi-Fi | Planned |
| Cloud | ThingSpeak is the initial proposal | Not selected or configured here |
| Relational alternative | Supabase/PostgreSQL if required by the course | Conditional option |
| Chart library and hosting | Choose when dashboard requirements are confirmed | Undecided |
| Team contribution workflow | Agree integration repository and responsibilities | Undecided |

ThingSpeak is proposed for timestamped sensor history and API access. It does not require the team to design its own relational SQL tables. Before selecting it, verify the professor's database requirements and the service's current limits and access model.

If a relational schema is required, evaluate Supabase/PostgreSQL and define device authorization and read permissions. Neither option is an existing backend for this repository.

## Initial scope

Distance measurement, calibration, estimated liters, Wi-Fi uploads, historical storage, and a dashboard with status indicators.

## Deferred ideas

Consumption estimation, prediction of when water will run out, and unusual-behavior detection may be considered after enough valid history exists. AI and automatic pump control are not current deliverables.

## Evidence policy

Use “planned” for design, “implemented” for code that exists, and “tested” only with recorded evidence. Separate teammate-reported observations from independently repeated results.
