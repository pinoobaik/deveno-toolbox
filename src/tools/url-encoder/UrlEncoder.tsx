import { useMemo, useState } from 'react'
import { Eraser, Link2 } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Select } from '@/components/ui/Select'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextArea } from '@/components/ui/TextArea'
import { formatBytes, measureText } from '@/lib/text'
import type { ToolComponentProps } from '@/types/tool'

import { transformUrl } from './logic'
import type { UrlErrorKind, UrlMode, UrlResult, UrlScope } from './types'

const MODE_OPTIONS = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
] as const satisfies readonly { readonly value: UrlMode; readonly label: string }[]

const SCOPE_OPTIONS = [
  { value: 'component', label: 'Component' },
  { value: 'full', label: 'Full URI' },
] as const satisfies readonly { readonly value: UrlScope; readonly label: string }[]

const SCOPE_NOTE = 'Percent-encoding only: this tool does not parse, validate, or resolve URLs.'

const INPUT_DESCRIPTION: Record<UrlMode, Record<UrlScope, string>> = {
  encode: {
    component: 'Text for one query parameter, path segment, or other URI component.',
    full: 'A whole URI to encode while leaving ?, # and & in place.',
  },
  decode: {
    component: 'A percent-encoded URI component to turn back into text.',
    full: 'A percent-encoded URI to turn back into text.',
  },
}

const EMPTY_HINT: Record<UrlMode, string> = {
  encode: 'Encoding runs as you type. The result appears on the right.',
  decode: 'Decoding runs as you paste. The result appears on the right.',
}

const ERROR_TITLES: Record<UrlErrorKind, string> = {
  empty: 'Nothing to convert',
  'too-large': 'Input too large',
  malformed: 'Cannot be converted',
}

function describeOutput(result: UrlResult, mode: UrlMode, characters: number, bytes: number) {
  if (!result.ok) return 'Nothing to show for the current input.'
  const action = mode === 'encode' ? 'Percent-encoded' : 'Decoded'
  return `${action} · ${characters} chars · ${formatBytes(bytes)}`
}

export function UrlEncoder({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<UrlMode>('encode')
  const [scope, setScope] = useState<UrlScope>('component')

  const result = useMemo(() => transformUrl(input, mode, scope), [input, mode, scope])
  const inputStats = useMemo(() => measureText(input), [input])
  const output = result.ok ? result.text : ''
  const outputStats = useMemo(() => measureText(output), [output])

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <SegmentedControl label="Action" hideLabel options={MODE_OPTIONS} value={mode} onChange={setMode} />
          <Select
            label="Scope"
            hideLabel
            options={SCOPE_OPTIONS}
            value={scope}
            onChange={setScope}
            size="sm"
            containerClassName="w-32"
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
          <CardHeader
            title="Input"
            description={`${INPUT_DESCRIPTION[mode][scope]} ${SCOPE_NOTE}`}
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextArea
              label={mode === 'encode' ? 'Text to encode' : 'Percent-encoded text'}
              hideLabel
              placeholder={mode === 'encode' ? 'https://example.com/a b' : 'https%3A%2F%2Fexample.com'}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={16}
              className="min-h-64 flex-1"
              footer={`${inputStats.characters} chars · ${formatBytes(inputStats.bytes)}`}
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
            description={describeOutput(result, mode, outputStats.characters, outputStats.bytes)}
            actions={
              <CopyButton value={output} label="Copy" size="sm" disabled={output.length === 0} />
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {output.length > 0 ? (
              <pre
                aria-label="Percent-encoded output"
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {output}
              </pre>
            ) : (
              <EmptyState
                icon={<Link2 className="size-6" />}
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

export default UrlEncoder
