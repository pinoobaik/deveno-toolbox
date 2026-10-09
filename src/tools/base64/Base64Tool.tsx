import { useMemo, useState } from 'react'
import { Eraser, FileCode } from 'lucide-react'

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

import { decodeBase64, encodeBase64 } from './logic'
import type { Base64ErrorKind, Base64Mode } from './types'

const DIRECTION_OPTIONS = [
  { value: 'encode', label: 'Encode' },
  { value: 'decode', label: 'Decode' },
] as const satisfies readonly { readonly value: Base64Mode; readonly label: string }[]

const INPUT_DESCRIPTION: Record<Base64Mode, string> = {
  encode: 'Text to encode as standard Base64. Unicode is encoded as UTF-8 bytes.',
  decode: 'Standard Base64 text to decode back to UTF-8. Whitespace is ignored.',
}

const EMPTY_HINT: Record<Base64Mode, string> = {
  encode: 'Type or paste text to see its Base64 form here.',
  decode: 'Paste Base64 text to see the decoded text here.',
}

const ERROR_TITLES: Record<Base64ErrorKind, string> = {
  empty: 'Nothing to convert',
  'too-large': 'Input too large',
  invalid: 'Not valid Base64',
  'not-text': 'Decoded bytes are not text',
}

export function Base64Tool({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<Base64Mode>('encode')

  const result = useMemo(
    () => (mode === 'encode' ? encodeBase64(input) : decodeBase64(input)),
    [input, mode],
  )
  const inputStats = useMemo(() => measureText(input), [input])
  const output = result.ok ? result.text : ''
  const outputStats = useMemo(() => measureText(output), [output])

  const outputDescription = result.ok
    ? `${mode === 'encode' ? 'Encoded to Base64' : 'Decoded to text'} · ${outputStats.characters} chars · ${formatBytes(outputStats.bytes)}`
    : 'Nothing to show for the current input.'

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <SegmentedControl
            label="Direction"
            hideLabel
            options={DIRECTION_OPTIONS}
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
          <CardHeader title="Input" description={INPUT_DESCRIPTION[mode]} />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextArea
              label={mode === 'encode' ? 'Text to encode' : 'Base64 to decode'}
              hideLabel
              placeholder={mode === 'encode' ? 'Hello, World!' : 'SGVsbG8sIFdvcmxkIQ=='}
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
            description={outputDescription}
            actions={
              <CopyButton value={output} label="Copy" size="sm" disabled={output.length === 0} />
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {output.length > 0 ? (
              <pre
                aria-label="Base64 output"
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {output}
              </pre>
            ) : (
              <EmptyState
                icon={<FileCode className="size-6" />}
                title="No output yet"
                description={
                  mode === 'encode'
                    ? 'Encoding runs as you type. Paste some text on the left to fill this panel.'
                    : 'Decoding runs as you paste. Valid Base64 on the left appears here as text.'
                }
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default Base64Tool
