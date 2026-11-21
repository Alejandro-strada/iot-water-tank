# Web dashboard

Status: planned. No HTML, CSS, JavaScript application or deployed site exists in this repository yet.

## Planned interface

| Element | Intended behavior |
| --- | --- |
| Water indicator | Show a clearly defined calibrated percentage |
| Volume card | Show estimated liters and usable capacity |
| History chart | Display timestamped measurements |
| Last-update label | Show when the latest measurement was received |
| Low-water indicator | Use a threshold agreed by the team |
| Data status | Distinguish current, stale, missing, and invalid data |
| Responsive layout | Support phones and computers |

Use HTML, CSS, and JavaScript. Decide the chart library and hosting after requirements are confirmed.

## Integration requirements

- Agree on API fields, units, timestamps, and percentage definitions.
- Use read-only access appropriate to the selected service.
- Keep privileged write credentials out of browser code.
- Define refresh frequency and stale-data thresholds after selecting upload intervals.
- Handle loading, empty history, sensor errors, and network failures.
- Label any future demonstration values as simulated.

Testing should cover both real records and controlled missing/error cases. See the [architecture](../docs/architecture.md).
