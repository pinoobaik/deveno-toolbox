import { useState } from 'react'
import { CalendarClock, Timer } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import { cn } from '@/lib/cn'
import type { ToolComponentProps } from '@/types/tool'

import { dateToTimestamp, hasExplicitTimezone, timestampToDate } from './logic'
import type { TimestampResult } from './types'

type Direction = 'timestamp' | 'date'

const TIMESTAMP_EXAMPLE = '1705314600'
const DATE_EXAMPLE = '2024-01-15T14:30:00Z'

export function TimestampConverter({ tool }: ToolComponentProps) {
  const [timestampInput, setTimestampInput] = useState('')
  const [dateInput, setDateInput] = useState('')
  const [direction, setDirection] = useState<Direction>('timestamp')

  const timestampResult = timestampToDate(timestampInput)
  const dateResult = dateToTimestamp(dateInput)
  const activeResult: TimestampResult =
    direction === 'timestamp' ? timestampResult : dateResult

  const useNow = () => {
    const now = new Date()
    setTimestampInput(String(Math.floor(now.getTime() / 1000)))
    setDateInput(now.toISOString())
    setDirection('timestamp')
  }

  const clear = () => {
    setTimestampInput('')
    setDateInput('')
  }

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <Button
            variant="primary"
            icon={<Timer className="size-4" aria-hidden="true" />}
            onClick={useNow}
          >
            Use current time
          </Button>
          <Button variant="ghost" onClick={clear} disabled={!timestampInput && !dateInput}>
            Clear
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section">
          <CardHeader title="Unix timestamp to date" />
          <CardBody className="flex flex-col gap-3">
            <TextField
              label="Unix timestamp"
              inputMode="numeric"
              placeholder={TIMESTAMP_EXAMPLE}
              spellCheck={false}
              value={timestampInput}
              onChange={(event) => {
                setTimestampInput(event.target.value)
                setDirection('timestamp')
              }}
              className="font-mono"
              description="Seconds or milliseconds. Example: 1705314600 (seconds) or 1705314600000 (ms)."
              errorMessage={timestampResult.ok ? undefined : timestampResult.message}
            />

            {timestampResult.ok ? (
              <dl className="flex flex-col gap-2 text-sm">
                <ResultRow label="Local date/time" value={timestampResult.localDisplay} />
                <ResultRow label="UTC date/time" value={timestampResult.utcDisplay} />
                <ResultRow label="Local ISO 8601" value={timestampResult.localIso} />
              </dl>
            ) : null}
          </CardBody>
        </Card>

        <Card as="section">
          <CardHeader title="Date to Unix timestamp" />
          <CardBody className="flex flex-col gap-3">
            <TextField
              label="Date string"
              placeholder={DATE_EXAMPLE}
              spellCheck={false}
              value={dateInput}
              onChange={(event) => {
                setDateInput(event.target.value)
                setDirection('date')
              }}
              className="font-mono"
              description="ISO 8601 is safest. A value without Z or an offset is read as your local time."
              errorMessage={dateResult.ok ? undefined : dateResult.message}
            />

            {dateResult.ok ? (
              <dl className="flex flex-col gap-2 text-sm">
                <ResultRow label="Unix seconds" value={String(dateResult.seconds)} />
                <ResultRow label="Unix milliseconds" value={String(dateResult.milliseconds)} />
              </dl>
            ) : null}

            {!hasExplicitTimezone(dateInput) && dateResult.ok ? (
              <StatusMessage tone="warning" title="No timezone in input">
                The value was interpreted in your local timezone ({dateResult.localDisplay}).
              </StatusMessage>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <Card as="section">
        <CardHeader
          title="Result"
          description={
            direction === 'timestamp'
              ? 'Derived from the Unix timestamp input.'
              : 'Derived from the date input.'
          }
        />
        <CardBody>
          {activeResult.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <ValueTile
                label="Unix seconds"
                value={String(activeResult.seconds)}
                hint="Whole seconds since 1970-01-01 UTC"
              />
              <ValueTile
                label="Unix milliseconds"
                value={String(activeResult.milliseconds)}
                hint="Milliseconds since 1970-01-01 UTC"
              />
              <ValueTile
                label="Local date/time"
                value={activeResult.localDisplay}
                hint="Rendered in your browser timezone"
              />
              <ValueTile
                label="UTC date/time"
                value={activeResult.utcDisplay}
                hint="Coordinated Universal Time"
              />
            </div>
          ) : (
            <EmptyState
              icon={<CalendarClock className="size-6" />}
              title="No conversion yet"
              description="Enter a Unix timestamp or a date string on either side. The example placeholders show accepted formats."
            />
          )}
        </CardBody>
      </Card>
    </ToolLayout>
  )
}

interface ResultRowProps {
  label: string
  value: string
}

function ResultRow({ label, value }: ResultRowProps) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="min-w-0 flex-1 truncate text-right font-mono text-neutral-200" title={value}>
        {value}
      </dd>
    </div>
  )
}

interface ValueTileProps {
  label: string
  value: string
  hint: string
}

function ValueTile({ label, value, hint }: ValueTileProps) {
  return (
    <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-neutral-400">{label}</p>
          <p
            className={cn(
              'scrollbar-subtle mt-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-neutral-100',
            )}
          >
            {value}
          </p>
        </div>
        <CopyButton value={value} ariaLabel={`Copy ${label}`} size="sm" variant="ghost" />
      </div>
      <p className="mt-1.5 text-xs text-neutral-600">{hint}</p>
    </div>
  )
}

export default TimestampConverter
