import { useMemo, useState } from 'react'
import { CaseUpper, Eraser } from 'lucide-react'

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

import { transformCase } from './logic'
import type { CaseMode, CaseResult } from './types'

const MODE_OPTIONS = [
  { value: 'lower', label: 'Lowercase' },
  { value: 'upper', label: 'Uppercase' },
  { value: 'title', label: 'Title Case' },
  { value: 'sentence', label: 'Sentence Case' },
] as const satisfies readonly { readonly value: CaseMode; readonly label: string }[]

const MODE_LABELS: Record<CaseMode, string> = {
  lower: 'Lowercase',
  upper: 'Uppercase',
  title: 'Title Case',
  sentence: 'Sentence Case',
}

const INPUT_DESCRIPTION: Record<CaseMode, string> = {
  lower: 'Lowercases every character. Whitespace and punctuation keep their place.',
  upper: 'Uppercases every character. Whitespace and punctuation keep their place.',
  title: 'Capitalizes the first letter after every run of whitespace and lowercases the rest.',
  sentence: 'Capitalizes the first letter, and the first letter after . ! or ? when whitespace follows.',
}

const EMPTY_HINT = 'Type or paste text to see the transformed result here.'

function describeOutput(result: CaseResult, mode: CaseMode, characters: number, bytes: number) {
  if (!result.ok) return 'Nothing to show for the current input.'
  return `${MODE_LABELS[mode]} · ${characters} chars · ${formatBytes(bytes)}`
}

export function TextCase({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [mode, setMode] = useState<CaseMode>('title')

  const result = useMemo(() => transformCase(input, mode), [input, mode])
  const inputStats = useMemo(() => measureText(input), [input])
  const output = result.ok ? result.text : ''
  const outputStats = useMemo(() => measureText(output), [output])

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <Select
            label="Case"
            hideLabel
            options={MODE_OPTIONS}
            value={mode}
            onChange={setMode}
            size="sm"
            containerClassName="w-40"
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
              label="Text to transform"
              hideLabel
              placeholder="the QUICK brown Fox"
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
                {EMPTY_HINT}
              </StatusMessage>
            ) : (
              <StatusMessage tone="danger" title="Input too large" live="off">
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
                aria-label={`${MODE_LABELS[mode]} output`}
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {output}
              </pre>
            ) : (
              <EmptyState
                icon={<CaseUpper className="size-6" />}
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

export default TextCase
