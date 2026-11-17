import { useState } from 'react'
import { Link, useParams } from 'react-router'
import AlertChip from '../components/AlertChip'
import { ArrowUpRightIcon } from '../components/Icons'
import LineBadge from '../components/LineBadge'
import RsvpButtons from '../components/RsvpButtons'
import { Button, ButtonLink } from '../components/ui/Button'
import { downloadIcs, googleCalendarUrl } from '../lib/calendar'
import { timeRange } from '../lib/dates'
import { directionsUrl } from '../lib/directions'
import { priceText } from '../lib/prices'
import {
  actualEnd,
  actualStart,
  actualVenue,
  isCancelled,
  isOver,
} from '../lib/schedule'
import { sourceLinkText } from '../lib/sources'
import { useEvent } from '../lib/useEvent'

function Page({ children }) {
  return (
    <main className="mx-auto max-w-content px-4 pb-20 md:px-10">
      <Link to="/" className="mt-8 inline-block font-bold hover:underline">
        ← This week
      </Link>
      {children}
    </main>
  )
}

function Tag({ children }) {
  return (
    <span className="border-2 border-ink px-2.5 py-1 text-sm font-bold">
      {children}
    </span>
  )
}

// One row of the facts list: a label on the left, the detail beside it.
function Fact({ label, children }) {
  return (
    <div className="grid gap-1 border-t border-rule-light py-4 first:border-t-0 sm:grid-cols-[7rem_1fr] sm:gap-4">
      <dt className="font-bold">{label}</dt>
      <dd className="text-[17px]">{children}</dd>
    </div>
  )
}

// The phone's share sheet where there is one; otherwise copy the link.
function ShareButton({ title }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // They closed the share sheet; nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this link:', url)
    }
  }

  return (
    <Button variant="outline" onClick={share}>
      {copied ? 'Link copied' : 'Share'}
    </Button>
  )
}

export default function EventDetail() {
  const { id } = useParams()
  const { data: event, isPending, isError, refetch } = useEvent(id)

  if (isPending) {
    return (
      <Page>
        <div className="mt-8 grid gap-4" aria-label="Loading event">
          <span className="h-24 w-3/4 bg-rule-light" />
          <span className="h-6 w-1/2 bg-rule-light" />
          <span className="h-6 w-1/3 bg-rule-light" />
        </div>
      </Page>
    )
  }

  if (isError) {
    return (
      <Page>
        <h1 className="mt-8 text-display font-extrabold text-balance">
          This event didn’t load
        </h1>
        <Button onClick={() => refetch()} className="mt-6">
          Try again
        </Button>
      </Page>
    )
  }

  if (!event) {
    return (
      <Page>
        <h1 className="mt-8 text-display font-extrabold text-balance">
          This event isn’t on the schedule
        </h1>
        <p className="mt-6 text-lg">
          It may have been removed, or the link is wrong.
        </p>
      </Page>
    )
  }

  const now = new Date()
  const cancelled = isCancelled(event)
  const over = isOver(event, now)
  const canGo = !cancelled && !over
  const pageUrl = window.location.href

  return (
    <Page>
      <div className="mt-8 flex flex-wrap gap-2">
        <Tag>{event.niche}</Tag>
        {event.adultsOnly && <Tag>21+</Tag>}
      </div>
      <h1 className="mt-4 text-display font-extrabold text-balance">
        {event.title}
      </h1>
      {event.change && <AlertChip change={event.change} />}
      {over && !cancelled && (
        <p className="mt-4 text-lg font-bold">This event is over.</p>
      )}

      <div className="mt-10 grid gap-12 border-t-[6px] border-ink pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="min-w-0">
          <dl>
            <Fact label="When">
              {timeRange(actualStart(event), actualEnd(event))}
            </Fact>
            <Fact label="Where">
              {actualVenue(event)}
              {event.address && event.change?.type !== 'detour' && (
                <span className="block text-muted">{event.address}</span>
              )}
              <span className="mt-2 flex flex-wrap items-center gap-2 text-[15px]">
                <LineBadge line={event.line} />
                {event.stop}, {event.walkMinutes} minute walk
              </span>
            </Fact>
            <Fact label="Price">{priceText(event.price, event.isFree)}</Fact>
            <Fact label="Going">{event.going} going</Fact>
          </dl>

          {event.description && (
            <p className="mt-6 max-w-2xl text-lg">{event.description}</p>
          )}

          {event.sourceUrl && (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 font-bold underline underline-offset-4"
            >
              {sourceLinkText(event.source)}
              <ArrowUpRightIcon className="size-4" />
            </a>
          )}
        </div>

        <aside className="grid content-start gap-3">
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt=""
              className="mb-3 aspect-4/3 w-full border-2 border-ink object-cover"
            />
          )}
          {canGo && (
            <>
              <RsvpButtons eventId={event.id} />
              <ButtonLink href={directionsUrl(event)} className="mt-3">
                Directions in Google Maps
                <ArrowUpRightIcon className="size-4" />
              </ButtonLink>
              <ButtonLink
                variant="outline"
                href={googleCalendarUrl(event, pageUrl)}
              >
                Add to Google Calendar
              </ButtonLink>
              <Button
                variant="outline"
                onClick={() => downloadIcs(event, pageUrl)}
              >
                Download for Apple or Outlook
              </Button>
            </>
          )}
          <ShareButton title={event.title} />
        </aside>
      </div>
    </Page>
  )
}
