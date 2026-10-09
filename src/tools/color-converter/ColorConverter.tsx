import { useMemo, useState } from 'react'
import { Eraser, Palette } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import type { ToolComponentProps } from '@/types/tool'

import { parseColor } from './logic'
import { MAX_COLOR_CHARS, type ColorErrorKind } from './types'

const ERROR_TITLES: Record<ColorErrorKind, string> = {
  empty: 'Nothing to convert',
  'too-large': 'Input too large',
  unrecognized: 'Unknown color format',
  malformed: 'Malformed color',
  'out-of-range': 'Out of range',
}

const SYNTAX_NOTE =
  '#RGB #RGBA #RRGGBB #RRGGBBAA, rgb()/rgba() and hsl()/hsla() in comma or space-slash form. RGB channels are integers or percentages; saturation, lightness, and alpha are percentages; hue wraps. No CSS Color 4 keywords.'

function ValueRow({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-neutral-800/70 py-2.5 last:border-b-0">
      <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-600">
        {label}
      </span>
      <code className="min-w-0 flex-1 break-all font-mono text-sm text-neutral-200">{value}</code>
      {copy === undefined ? null : <CopyButton value={copy} size="sm" variant="ghost" />}
    </div>
  )
}

export function ColorConverter({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')

  const result = useMemo(() => parseColor(input), [input])

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
          <CardHeader title="Color" description={SYNTAX_NOTE} />
          <CardBody className="flex-1">
            <TextField
              label="Color"
              placeholder="#3498db"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              maxLength={MAX_COLOR_CHARS}
              className="font-mono"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              errorMessage={
                result.ok || result.kind === 'empty'
                  ? undefined
                  : result.kind === 'too-large'
                    ? `Input is longer than ${MAX_COLOR_CHARS.toLocaleString('en-US')} characters.`
                    : undefined
              }
            />

            {result.ok ? (
              <StatusMessage tone="info" live="off">
                Parsed as {result.color.source.toUpperCase()}. Nothing is sent anywhere.
              </StatusMessage>
            ) : result.kind === 'empty' ? (
              <StatusMessage tone="info" live="off">
                Type or paste a color. Every canonical form appears on the right as you type, and
                each representation stays copyable.
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
            title="Canonical forms"
            description={
              result.ok
                ? 'Hex, rgb, and hsl shown together so they stay in sync.'
                : 'The conversion appears once the color parses.'
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {result.ok ? (
              <>
                <div
                  aria-hidden="true"
                  className="h-16 rounded-md border border-neutral-800"
                  style={{ backgroundColor: result.color.hex }}
                />
                <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1">
                  <ValueRow label="Hex" value={result.color.hex} copy={result.color.hex} />
                  <ValueRow label="RGB" value={result.color.rgb} copy={result.color.rgb} />
                  <ValueRow label="HSL" value={result.color.hsl} copy={result.color.hsl} />
                  <ValueRow
                    label="Channels"
                    value={`R ${result.color.r} · G ${result.color.g} · B ${result.color.b}`}
                  />
                  <ValueRow
                    label="Hue"
                    value={`${result.color.h}° · S ${result.color.s}% · L ${result.color.l}%`}
                  />
                  <ValueRow
                    label="Alpha"
                    value={result.color.alpha === 1 ? 'opaque' : String(result.color.alpha)}
                  />
                </div>
              </>
            ) : (
              <EmptyState
                icon={<Palette className="size-6" />}
                title="Nothing converted yet"
                description="Enter a hex, rgb, or hsl color and all three canonical forms appear."
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default ColorConverter