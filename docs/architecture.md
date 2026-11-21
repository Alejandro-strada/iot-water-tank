# Planned architecture

## Responsibilities

| Layer | Input | Processing or responsibility | Output |
| --- | --- | --- | --- |
| HC-SR04 | Trigger pulse | Measure ultrasonic round-trip time | ECHO pulse |
| ESP32 | ECHO pulse through voltage divider | Validate distance; later filter and apply calibration | Valid measurement or explicit error |
| Connectivity | Measurement record | Wi-Fi connection and authenticated HTTPS upload | Upload result |
| Cloud | Authorized uploads | Retain timestamped history | Read API |
| Dashboard | API response | Display latest values, history, and freshness | User-visible status |

Only distance measurement exists in the teammate's firmware. Networking, storage, and dashboard integration remain planned.

## Measurement processing

The existing distance formula is `distance_cm = echo_time_us * 0.0343 / 2`. The division accounts for the outward and return journey. The speed-of-sound approximation is temperature dependent.

Validate readings before smoothing. Keep missing echoes and implausible values distinct from actual empty-container measurements. The final filtering method will be selected using measured fluctuations.

For calibrated empty and full references, height percentage can be calculated from:
`100 * (empty_distance - measured_distance) / (empty_distance - full_distance)`.
This requires consistent sensor mounting, valid references, and empty_distance > full_distance. Clamping the result does not validate a bad reading.

Volume percentage and height percentage need not match. Estimated liters will use known-volume calibration points.

## Proposed measurement record

These fields are a discussion baseline, not an implemented database schema.

| Field | Meaning |
| --- | --- |
| device_id | Identifier of the prototype |
| distance_cm | Valid measured or filtered distance; exact convention to document |
| volume_l | Estimated volume after calibration |
| level_percent | Percentage with its height/volume definition documented |
| status | Valid measurement or explicit sensor status |
| received_at | Server reception timestamp |
| measured_at | Optional measurement timestamp if device time synchronization is implemented |

Invalid readings should not be stored as zero liters. If error events are recorded, computed quantities should be absent/null.

## Communication and reliability

Measurement and upload intervals will be chosen separately after testing sensor stability and cloud limits. The device should recover from Wi-Fi loss and failed uploads without silently reporting success. Offline buffering is an unresolved optional feature.

The dashboard must display the last-update time and indicate stale or missing data. A successful historical reading does not prove the device is currently connected.

## Access and deployment

Keep device write credentials outside tracked source files. Never include privileged write credentials in browser JavaScript. The team must decide whether measurement history is public or requires authenticated reads. Repository visibility does not determine data visibility.

Cloud platform, hosting, authorization, upload intervals, and stale-data thresholds remain undecided. No deployed service is claimed.
