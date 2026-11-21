# Container and calibration plan

## Reported observations

The following values come from the teammate's container record. They have not been independently measured here.

| Observation | Reported value | Limitation |
| --- | --- | --- |
| Bottom-to-rim height | 23 cm | Internal/external baseline not confirmed |
| Top diameter | 12.6 cm | Internal diameter versus rim diameter not confirmed |
| Lower feature height | 1 cm | Could include an external foot |
| Lower feature diameter | 9.2 cm | Does not establish wetted internal geometry |
| Highest reported graduation | 2500 ml | Nominal marking, not calibrated usable capacity |
| Bottom to 2500 ml marking | 19.6 cm | Baseline ambiguity remains |
| Marking to rim | 3.4 cm | Must verify actual sensor clearance |
| Preliminary sensor-to-bottom distance | 21.9 cm | Single reading; fixed mount not documented |

Do not use the difference between 23 cm and 21.9 cm as an automatic sensor correction. Different reference surfaces or mounting positions could explain it.

The lower shape and approximate external measurements do not justify assuming a perfect cylinder or cone. Do not derive a final liters factor from these values.

## Calibration approach

Build a table of independently known water volumes and measured sensor distances. Later, estimate intermediate volumes with piecewise linear interpolation. This reduces reliance on uncertain geometry but still requires validation.

1. Fix the sensor mount and verify clearance above the highest intended water level.
2. Empty the container and collect ten valid readings, retaining a record of failures.
3. Add a measured 500 ml sample using a separate graduated vessel where available.
4. Let the surface settle and collect ten valid readings without moving the sensor.
5. Review repeatability and outliers before collecting further points.
6. Add intermediate reference volumes, including low-volume points that characterize the base.
7. Establish a measured upper endpoint with sufficient sensor clearance.
8. Validate estimates at additional known volumes not used to build the table.

Record reference-vessel resolution, mounting, raw readings, and relevant conditions. The container's markings can support a preliminary demonstration but cannot independently validate their own accuracy.

## Data template

| Known volume (ml) | Raw distances (cm) | Invalid readings | Selected representative distance (cm) | Notes |
| --- | --- | --- | --- | --- |
| 0 | Pending | Pending | Pending | Fixed mount |
| 500 target; actual volume to record | Pending | Pending | Pending | Settled water |
| Additional points | Pending | Pending | Pending | To be measured |

No calibration data is fabricated or implied by this template.

## Future interpolation

For adjacent measured calibration points (d1, V1) and (d2, V2), estimate:
`V = V1 + (d - d1) * (V2 - V1) / (d2 - d1)`.

Require distinct distances and a consistent, reviewed calibration table. Distances should generally decrease as volume increases. Define handling for out-of-range values rather than extrapolating silently.

Report volume in liters by dividing milliliters by 1000. Define volume percentage using calibrated usable capacity, not the nominal label. Height percentage is a separate quantity.

Source: [container measurements](https://github.com/AlfonsoCaBa/iot-water-tank-monitor/blob/d2ad9a06b27a0a1791f8e021465136d35e3d9df2/docs/container-measurements.md).
