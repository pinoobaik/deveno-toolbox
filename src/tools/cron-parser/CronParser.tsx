import { useMemo, useState } from 'react'
import { CalendarClock, Eraser } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import type { ToolComponentProps } from '@/types/tool'

import { parseCron } from './logic'
import { MAX_CRON_EXPRESSION_CHARS, type CronErrorKind } from './types'

const ERROR_TITLES: Record<CronErrorKind, string> = {
  empty: 'Nothing to parse',
  'too-large': 'Expression too large',
  'field-count': 'Wrong number of fields',
  malformed: 'Malformed expression',
  names: 'Names are not supported',
  'out-of-range': 'Out of range',
  'invalid-step': 'Invalid step',
  'reversed-range': 'Reversed range',
}

const FIELD_BOUNDS: Record<string, string> = {
  Minutes: '0–59',
  Hours: '0–23',
  'Day of month': '1–31',
  Month: '1–12',
  'Day of week': '0–7',
}

export function CronParser({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')

  const result = useMemo(() => parseCron(input), [input])

  const clear = () => setInput('')

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <Button
          variant="ghost"
          icon={<Eraser className="size-4" aria-hidden="true" />}
          onClick={clear}
          disabled={input.length === 0}
        >
          Clear
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Cron expression"
            description="Five standard fields only: minutes, hours, day of month, month, day of week."
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextField
              label="Expression"
              placeholder="*/15 9-17 * * 1-5"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              maxLength={MAX_CRON_EXPRESSION_CHARS}
              className="font-mono"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              errorMessage={!result.ok && result.kind === 'empty' ? 'Enter a cron expression first.' : undefined}
            />

            <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-400">
              Bounds: minutes 0–59 · hours 0–23 · day of month 1–31 · month 1–12 · day of week 0–7.
              Each field accepts <span className="font-mono">*</span>, lists, ranges, and steps.
            </div>

            <StatusMessage tone="info" live="off">
              No seconds, years, names, or <span className="font-mono">@shortcuts</span>. Day of week
              0 and 7 both mean Sunday.
            </StatusMessage>

            <StatusMessage tone="warning" live="off">
              When day of month and day of week are both restricted, cron ORs them. This tool
              expands and validates only — it does not compute run times, because those depend on a
              timezone a browser cannot truthfully claim.
            </StatusMessage>

            {!result.ok && result.kind !== 'empty' ? (
              <StatusMessage tone="danger" title={ERROR_TITLES[result.kind]} live="off">
                {result.message}
              </StatusMessage>
            ) : null}
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Fields"
            description={
              result.ok
                ? 'Each field expanded into the exact clock values it runs at.'
                : 'The breakdown appears once the expression parses.'
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {result.ok ? (
              <div className="flex flex-col gap-3">
                {result.fields.map((field) => (
                    <div
                      key={field.label}
                      className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-sm font-semibold text-neutral-200">{field.label}</h3>
                        <span className="font-mono text-xs text-neutral-500">
                          {field.raw} · {FIELD_BOUNDS[field.label]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">{field.summary}</p>
                      <p className="mt-2 font-mono text-xs leading-6 text-sky-300">
                        {field.values.join(' ')}
                      </p>
                      {field.note ? (
                        <p className="mt-1 text-xs text-neutral-600">{field.note}</p>
                      ) : null}
                    </div>
                  ))}
              </div>
            ) : (
              <EmptyState
                icon={<CalendarClock className="size-6" />}
                title="Nothing parsed yet"
                description="Type a five-field cron expression, such as */15 9-17 * * 1-5."
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default CronParser