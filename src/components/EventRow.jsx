import { formatTime } from '../lib/dates'
import AlertChip from './AlertChip'
import LineBadge from './LineBadge'

// One event inside a day. On phones the parts stack; from md up they
// sit in three columns: Time, Event, Nearest T.
export default function EventRow({ event }) {
  const { title, niche, neighborhood, going, start, stop, line, change } = event
  // Strike the old time when the time changed or the event is off.
  // A detour only changes the place, so the time stays.
  const timeIsOld = change && change.type !== 'detour'

  return (
    <li className="grid gap-1.5 border-t border-rule-light py-4 first:border-t-0 md:grid-cols-[5.5rem_1fr_11rem] md:gap-4">
      <p className={`font-bold ${timeIsOld ? 'text-muted line-through' : ''}`}>
        {formatTime(start)}
      </p>

      <div>
        <h4 className="text-title font-bold">{title}</h4>
        <p className="mt-1 text-sm">
          {niche}, {neighborhood}, {going} going
        </p>
        {change && <AlertChip change={change} />}
      </div>

      <p className="flex items-center gap-2 self-start text-[15px]">
        <LineBadge line={line} />
        {stop}
      </p>
    </li>
  )
}