import { useMemo, useState } from 'react'
import { CircleCheck, Eraser, Minimize2, Sparkles } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select } from '@/components/ui/Select'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextArea } from '@/components/ui/TextArea'
import { formatBytes, measureText } from '@/lib/text'
import type { ToolComponentProps } from '@/types/tool'

import { parseJson, stringifyJson } from './logic'
import type { StringifyOptions } from './types'

const SAMPLE_JSON = '{"name":"John","age":20,"hobbies":["reading","cycling"]}'

type OutputMode = 'pretty' | 'minified'

const INDENT_OPTIONS: ReadonlyArray<{
  value: NonNullable<StringifyOptions['indent']>
  label: string
}> = [
  { value: 2, label: '2 spaces' },
  { value: 4, label: '4 spaces' },
  { value: '\t', label: 'Tab' },
]

export function JsonFormatter({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [outputError, setOutputError] = useState<string | null>(null)
  const [outputMode, setOutputMode] = useState<OutputMode>('pretty')
  const [indent, setIndent] = useState<NonNullable<StringifyOptions['indent']>>(2)
  const [isSorted, setIsSorted] = useState(false)

  const validation = useMemo(() => parseJson(input), [input])
  const inputStats = useMemo(() => measureText(input), [input])
  const outputStats = useMemo(() => measureText(output), [output])

  const run = (mode: OutputMode, sortKeys = false) => {
    if (!validation.valid) return

    const result = stringifyJson(
      validation.value,
      mode === 'pretty' ? { indent, sortKeys } : { sortKeys },
    )

    if (!result.ok) {
      setOutputError(result.message)
      return
    }

    setOutputError(null)
    setOutput(result.text)
    setOutputMode(mode)
    setIsSorted(sortKeys)
  }

  const clear = () => {
    setInput('')
    setOutput('')
    setOutputError(null)
    setIsSorted(false)
  }

  const loadSample = () => {
    setInput(SAMPLE_JSON)
    setOutput('')
    setOutputError(null)
    setIsSorted(false)
  }

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <Button
            variant="primary"
            icon={<Sparkles className="size-4" aria-hidden="true" />}
            onClick={() => run('pretty')}
            disabled={!validation.valid}
          >
            Format
          </Button>
          <Button
            icon={<Minimize2 className="size-4" aria-hidden="true" />}
            onClick={() => run('minified')}
            disabled={!validation.valid}
          >
            Minify
          </Button>
          <Button
            onClick={() => run('pretty', true)}
            disabled={!validation.valid}
            title="Pretty print with object keys sorted alphabetically"
          >
            Format + sort keys
          </Button>
          <Button
            variant="ghost"
            icon={<Eraser className="size-4" aria-hidden="true" />}
            onClick={clear}
            disabled={input.length === 0 && output.length === 0}
          >
            Clear
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader title="Input" description="Paste raw JSON to format or validate." />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextArea
              label="JSON input"
              hideLabel
              placeholder={SAMPLE_JSON}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={16}
              className="min-h-64 flex-1"
              footer={`${inputStats.characters} chars · ${formatBytes(inputStats.bytes)}`}
            />

            {validation.valid ? (
              <StatusMessage tone="success" live="off">
                Input is valid JSON.
              </StatusMessage>
            ) : validation.kind === 'empty' ? (
              <StatusMessage tone="info" live="off">
                Waiting for input. Load the sample to see the tool in action.
              </StatusMessage>
            ) : (
              <StatusMessage tone="danger" title="Invalid JSON" live="off">
                {validation.message}
              </StatusMessage>
            )}

            <div>
              <Button variant="ghost" size="sm" onClick={loadSample}>
                Load sample
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Output"
            description={
              output.length > 0
                ? `${outputMode === 'pretty' ? `Pretty printed${
                    isSorted ? ', keys sorted' : ''
                  }` : 'Minified'} · ${outputStats.characters} chars · ${formatBytes(outputStats.bytes)}`
                : 'Result of the last action.'
            }
            actions={
              <>
                <Select
                  label="Indentation"
                  hideLabel
                  options={INDENT_OPTIONS}
                  value={indent}
                  onChange={setIndent}
                  disabled={outputMode !== 'pretty'}
                  size="sm"
                />
                <CopyButton value={output} label="Copy" size="sm" disabled={output.length === 0} />
              </>
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {outputError ? (
              <StatusMessage tone="danger" title="Cannot format this JSON" live="off">
                {outputError}
              </StatusMessage>
            ) : null}

            {output.length > 0 ? (
              <pre
                aria-label="Formatted JSON output"
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto whitespace-pre rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {output}
              </pre>
            ) : (
              <EmptyState
                icon={<CircleCheck className="size-6" />}
                title="No output yet"
                description="Run Format, Minify, or Format + sort keys to see the result here."
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default JsonFormatter
