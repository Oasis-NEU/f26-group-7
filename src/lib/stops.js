// The T stops Espial covers. Copied from engine/stops.py on engine-v1;
// keep the two in step until they share one file.
export const STOPS = [
  {
    name: 'Kenmore',
    line: 'GL',
    area: 'Fenway',
    lat: 42.348949,
    lng: -71.095169,
  },
  {
    name: 'Fenway',
    line: 'GL D',
    area: 'Fenway',
    lat: 42.345403,
    lng: -71.104213,
  },
  {
    name: 'Longwood',
    line: 'GL D',
    area: 'Fenway',
    lat: 42.341702,
    lng: -71.109956,
  },
  {
    name: 'Museum of Fine Arts',
    line: 'GL E',
    area: 'Fenway',
    lat: 42.337711,
    lng: -71.095512,
  },
  {
    name: 'Northeastern University',
    line: 'GL E',
    area: 'Fenway',
    lat: 42.340401,
    lng: -71.088806,
  },
  {
    name: 'Symphony',
    line: 'GL E',
    area: 'Fenway',
    lat: 42.342687,
    lng: -71.085056,
  },
  {
    name: 'Massachusetts Avenue',
    line: 'OL',
    area: 'Fenway',
    lat: 42.341512,
    lng: -71.083423,
  },
  {
    name: 'Ruggles',
    line: 'OL',
    area: 'Fenway',
    lat: 42.336377,
    lng: -71.088961,
  },
  {
    name: 'Park Street',
    line: 'RL',
    area: 'Downtown',
    lat: 42.3563946,
    lng: -71.0624242,
  },
  {
    name: 'Downtown Crossing',
    line: 'OL',
    area: 'Downtown',
    lat: 42.355518,
    lng: -71.060225,
  },
  {
    name: 'State',
    line: 'OL',
    area: 'Downtown',
    lat: 42.358978,
    lng: -71.057598,
  },
  {
    name: 'Government Center',
    line: 'BL',
    area: 'Downtown',
    lat: 42.359705,
    lng: -71.059215,
  },
  {
    name: 'Boylston',
    line: 'GL',
    area: 'Downtown',
    lat: 42.35302,
    lng: -71.06459,
  },
  {
    name: 'Chinatown',
    line: 'OL',
    area: 'Chinatown',
    lat: 42.352547,
    lng: -71.062752,
  },
  {
    name: 'Tufts Medical Center',
    line: 'OL',
    area: 'Chinatown',
    lat: 42.349662,
    lng: -71.063917,
  },
  {
    name: 'South Station',
    line: 'RL',
    area: 'Downtown',
    lat: 42.352271,
    lng: -71.055242,
  },
]

export function findStop(name) {
  return STOPS.find((stop) => stop.name === name) ?? null
}

// For a <Select>: "Kenmore (GL), Fenway", plus an empty first choice.
export const STOP_OPTIONS = [
  { value: '', label: 'Choose a stop' },
  ...STOPS.map((stop) => ({
    value: stop.name,
    label: `${stop.name} (${stop.line}), ${stop.area}`,
  })),
]
