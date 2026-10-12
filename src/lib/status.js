import { formatTime, longDate } from './dates'

// Changed plans are written like T service alerts.
export const CHANGE_LABELS = {
  delayed: 'Delayed',
  early: 'Running early',
  cancelled: 'Cancelled',
  detour: 'Venue change',
}

// The text inside the yellow alert chip.
export function changeMessage(change) {
  const label = CHANGE_LABELS[change.type]
  if (change.type === 'cancelled') return label
  if (change.type === 'detour') return `${label}: now at ${change.newVenue}`
  return `${label}: now ${longDate(change.newStart)} at ${formatTime(change.newStart)}`
}