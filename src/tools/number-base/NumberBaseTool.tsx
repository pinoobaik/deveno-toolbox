import { useMemo, useState } from 'react'
import { Binary, Eraser } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, type SelectOption } from '@/components/ui/Select'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import type { ToolComponentProps } from '@/types/tool'

import { convertBase } from './logic'
import {
  BASE_LABELS,
  DEFAULT_FROM_BASE,
  DEFAULT_TO_BASE,
  type NumberBase,
  type NumberErrorKind,
  type NumberResult,
} from './types'

const BASE_VALUES: readonly NumberBase[] = [2, 8, 10, 16]

const BASE_OPTIONS: readonly SelectOption<NumberBase>[] = BASE_VALUES.map((value) => ({
  value,
  label: BASE_LABELS[value],
}))

const ERROR_TITLES: Record<NumberErrorKind, string> = {
  empty: 'Nothing to convert',
  'too-large': 'Input too large',
  invalid: 'No digits found',
  'invalid-digit': 'Invalid digit',
}

const INPUT_DESCRIPTION =
  'Integer to convert. An optional sign is allowed, and 0b, 0o or 0x is accepted when it matches the input base.'

const EMPTY_HINT = 'Enter an integer to see it written in the output base.'

function describeOutput(
  result: NumberResult,
  from: NumberBase,
  to: NumberBase,
  characters: number,
): string {
  if (!result.ok) return `${BASE_LABELS[from]} to ${BASE_LABELS[to]}.`
  return `${BASE_LABELS[from]} to ${BASE_LABELS[to]} · ${characters} chars`
}

export function NumberBaseTool({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [from, setFrom] = useState<NumberBase>(DEFAULT_FROM_BASE)
  const [to, setTo] = useState<NumberBase>(DEFAULT_TO_BASE)

  const result = useMemo(() => convertBase(input, from, to), [input, from, to])
  const output = result.ok ? result.text : ''

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <Button
          variant="ghost"
          icon={<Eraser className="size-4" aria-hidden="true" />}
          onClick={() => setInput('')}
          disabled={input.length === 0}
        >
          Clear
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Input"
            description={INPUT_DESCRIPTION}
            actions={
              <Select
                label="Input base"
                hideLabel
                options={BASE_OPTIONS}
                value={from}
                onChange={setFrom}
                size="sm"
                containerClassName="w-32"
              />
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextField
              label="Number"
              hideLabel
              placeholder="255"
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="font-mono"
            />

            {result.ok ? null : result.kind === 'empty' ? (
              <StatusMessage tone="info" live="off">
                {EMPTY_HINT}
              </StatusMessage>
            ) : (
              <StatusMessage tone="danger" title={ERROR_TITLES[result.kind]} live="off">
                {result.message}
              </StatusMessage>
            )}
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Output"
            description={describeOutput(result, from, to, output.length)}
            actions={
              <>
                <Select
                  label="Output base"
                  hideLabel
                  options={BASE_OPTIONS}
                  value={to}
                  onChange={setTo}
                  size="sm"
                  containerClassName="w-32"
                />
                <CopyButton value={output} label="Copy" size="sm" disabled={output.length === 0} />
              </>
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {output.length > 0 ? (
              <pre
                aria-label={`${BASE_LABELS[to]} output`}
                className="scrollbar-subtle max-h-96 min-h-24 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {output}
              </pre>
            ) : (
              <EmptyState
                icon={<Binary className="size-6" />}
                title="No output yet"
                description={EMPTY_HINT}
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default NumberBaseTool
