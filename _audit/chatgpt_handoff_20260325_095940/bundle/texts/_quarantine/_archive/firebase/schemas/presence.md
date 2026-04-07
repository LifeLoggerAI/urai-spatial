# Presence Collection

- **Collection:** `presence`
- **Document ID:** `{userId}`

This collection stores the real-time location and status of users currently active in the application.

## Schema

| Field       | Type        | Description                                      |
|-------------|-------------|--------------------------------------------------|
| `position`  | `GeoPoint`  | The [x, y, z] coordinates of the user's avatar.   |
| `rotation`  | `Array`     | A [x, y, z, w] quaternion for the avatar's rotation. |
| `lastSeen`  | `Timestamp` | The last time the user's presence was updated.   |
