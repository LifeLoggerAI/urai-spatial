# URAI Environment Capture and Sensor Modality Authority

Status: contract expansion only; no passive collection or native provider activation.

The canonical owner for external device/environment inputs is the existing External World Interface (EWI). This document does not create a second sensor platform.

## Launch architecture

URAI may support these modality families through EWI adapters:

- explicit camera/video capture;
- device depth sensors;
- LiDAR and room-scan geometry;
- photogrammetry / structure-from-motion;
- visual-inertial odometry and SLAM-style pose reconstruction;
- accelerometer, gyroscope, magnetometer, orientation, barometer, and ambient-light signals;
- GPS/GNSS through the existing location authority;
- BLE proximity;
- UWB ranging where hardware and platform support it;
- Wi-Fi positioning only where platform policy and law permit it;
- environmental/spatial audio and derived room-acoustic features;
- wearable and peripheral sensors through existing federation adapters;
- home/IoT environment state through the existing EWI home adapter.

## Truth boundary

These entries are capability contracts, not production evidence.

A modality marked `planned` or `gated` must not be represented as live until all of the following exist:

1. supported device/platform proof;
2. explicit user permission where required;
3. URAI Privacy purpose/retention grant;
4. data-class registration;
5. authenticated adapter boundary;
6. fallback behavior;
7. exact-head tests;
8. device/browser runtime proof;
9. export/deletion/retention mapping;
10. deployment and rollback receipts.

## Capture-session rule

High-sensitivity environmental capture such as camera, depth, LiDAR, room geometry, microphone/acoustics, or proximity sensing must use a clear capture/session authority. Background collection is not implied by the existence of a sensor API.

## Minimization

Prefer:

- ephemeral sensor fusion over retaining raw streams;
- derived pose/geometry over raw camera frames when raw frames are no longer needed;
- derived acoustic features over retained raw audio where feasible;
- coarse/relative positioning when precise location is unnecessary;
- local/on-device processing when it materially reduces privacy risk.

## Captured Reality relationship

Captured Reality may consume explicitly authorized source packages produced from these modalities, but its current reconstruction PR lineage must be reconciled to current Spatial authority before those capabilities can be certified as launch-ready.

No sensor registry entry bypasses Captured Reality provenance, truth-labeling, consent, or private-by-default requirements.
