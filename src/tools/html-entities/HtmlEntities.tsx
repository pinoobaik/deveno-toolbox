import { useMemo, useState } from 'react'
import { Eraser, Tags } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextArea } from '@/components/ui/TextArea'
import { formatBytes, measureText } from '@/lib/text'
import type { ToolComponentProps } from '@/types/tool'

import { convertEntities } from './logic'
import type { HtmlErrorKind, HtmlMode } from './types'

const MODE_OPTIONS = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
] as const satisfies readonly { readonly value: HtmlMode; readonly label: string }[]

const COVERAGE_NOTE =
  'Exactly five named references (amp, lt, gt, quot, apos) plus numeric decimal and hex references. Unknown or unterminated references are left exactly as written.'

const AI_PATTERNS = {
  encode: '&amp; &lt; &gt; &quot; &apos;',
  decode: '&amp; &lt; &#65; &#x41;',
} as const

const EMPTY_HINT: Record<HtmlMode, string> = {
  encode: 'Encoding runs as you type. The result appears on the right.',
  decode: 'Decoding runs as you paste. The result appears on the right.',
}

const ERROR_TITLES: Record<HtmlErrorKind, string> = {
  empty: 'Nothing to convert',
  'too-large': 'Input too large',
}

function describeOutput(replacements: number | null, mode: HtmlMode, characters: number, bytes: number) {
  if (replacements === null) return 'Nothing to show for the current input.'
  const action = mode === 'encode' ? 'Encoded' : 'Decoded'
  return `${action} · ${characters.toLocaleString('en-US')} chars · ${formatBytes(bytes)} · ${replacements.toLocaleString('en-US')} replaced`
}

export function HtmlEntities({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<HtmlMode>('encode')

  const result = useMemo(() => convertEntities(input, mode), [input, mode])
  const inputStats = useMemo(() => measureText(input), [input])
  const output = result.ok ? result.text : ''
  const outputStats = useMemo(() => measureText(output), [output])

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <SegmentedControl
            label="Action"
            hideLabel
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
          />
          <Button
            variant="ghost"
            icon={<Eraser className="size-4" aria-hidden="true" />}
            onClick={() => setInput('')}
            disabled={input.length === 0}
          >
            Clear
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader title="Input" description={COVERAGE_NOTE} />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextArea
              label={mode === 'encode' ? 'Text to encode' : 'Text to decode'}
              hideLabel
              placeholder={AI_PATTERNS[mode]}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={16}
              className="min-h-64 flex-1"
              footer={`${inputStats.characters.toLocaleString('en-US')} chars · ${formatBytes(inputStats.bytes)}`}
            />

            {result.ok ? null : result.kind === 'empty' ? (
              <StatusMessage tone="info" live="off">
                {EMPTY_HINT[mode]}
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
            description={describeOutput(
              result.ok ? result.replacements : null,
              mode,
              outputStats.characters,
              outputStats.bytes,
            )}
            actions={
              <CopyButton value={output} label="Copy" size="sm" disabled={output.length === 0} />
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {output.length > 0 ? (
              <pre
                aria-label={`${mode === 'encode' ? 'Encoded' : 'Decoded'} output`}
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {output}
              </pre>
            ) : (
              <EmptyState
                icon={<Tags className="size-6" />}
                title="No output yet"
                description={EMPTY_HINT[mode]}
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default HtmlEntities