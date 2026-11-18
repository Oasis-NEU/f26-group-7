// Distances, measured the same way as the engine (engine/stops.py) and
// the database (distance_m in migration 0007).

// Average walking speed, from engine/settings.py.
export const WALK_METERS_PER_MINUTE = 80

// Straight-line distance in meters between two { lat, lng } points.
export function distanceMeters(a, b) {
  const radians = (degrees) => (degrees * Math.PI) / 180
  const dLat = radians(b.lat - a.lat)
  const dLng = radians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}
