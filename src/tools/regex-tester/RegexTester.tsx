import { useMemo, useState } from 'react'
import { Eraser, Play, Regex } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextArea } from '@/components/ui/TextArea'
import { TextField } from '@/components/ui/TextField'
import { formatBytes, measureText } from '@/lib/text'
import type { ToolComponentProps } from '@/types/tool'

import { buildPattern, findMatches, matchesToLines } from './logic'
import {
  DEFAULT_FLAGS,
  MAX_MATCH_LIMIT,
  MAX_PATTERN_CHARS,
  type MatchErrorKind,
  type MatchResult,
} from './types'

const ERROR_TITLES: Record<MatchErrorKind, string> = {
  'empty-text': 'Nothing to match',
  'too-large-text': 'Test text too large',
}

interface MatchRun {
  readonly pattern: string
  readonly flags: string
  readonly text: string
  readonly result: MatchResult
}

function patternErrorMessage(kind: string | undefined): string | undefined {
  if (kind === 'empty') return 'Enter a pattern first.'
  if (kind === 'too-large') return `Pattern is longer than ${MAX_PATTERN_CHARS.toLocaleString('en-US')} characters.`
  if (kind === 'bad-syntax') return 'The pattern is not a valid regular expression.'
  return undefined
}

export function RegexTester({ tool }: ToolComponentProps) {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState<string>(DEFAULT_FLAGS)
  const [text, setText] = useState('')
  const [run, setRun] = useState<MatchRun | null>(null)

  const patternCheck = useMemo(() => buildPattern(pattern, flags), [pattern, flags])
  const textStats = useMemo(() => measureText(text), [text])

  const runnable = patternCheck.ok && text.length > 0
  const current = run !== null && run.pattern === pattern && run.flags === flags && run.text === text ? run : null
  const isStale = run !== null && current === null

  const runMatch = () => {
    if (!patternCheck.ok) return
    const result = findMatches(patternCheck.regex, text)
    setRun({ pattern, flags, text, result })
  }

  const clear = () => {
    setPattern('')
    setFlags(DEFAULT_FLAGS)
    setText('')
    setRun(null)
  }

  const result = current?.result ?? null
  const matches = result !== null && result.ok ? result.matches : null
  const copyText = matches === null ? '' : matchesToLines(matches)

  const outputDescription = (() => {
    if (current === null) return 'Matching runs only when you press Run match.'
    if (!current.result.ok) return 'Nothing to show for the current input.'
    if (current.result.count === 0) return '0 matches'
    const count = current.result.count.toLocaleString('en-US')
    if (current.result.truncated) return `first ${count} shown · more exist`
    return `${count} matches`
  })()

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <Button
            variant="primary"
            icon={<Play className="size-4" aria-hidden="true" />}
            onClick={runMatch}
            disabled={!runnable}
          >
            Run match
          </Button>
          <Button
            variant="ghost"
            icon={<Eraser className="size-4" aria-hidden="true" />}
            onClick={clear}
            disabled={pattern.length === 0 && flags === DEFAULT_FLAGS && text.length === 0 && run === null}
          >
            Clear
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Pattern & test text"
            description="Matching is synchronous and native to the engine: a pattern with heavy backtracking can stall the tab, so lengths are capped and matching only runs on demand."
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextArea
              label="Pattern"
              hideLabel
              placeholder="(ftp|https)://[^\s]+"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              rows={4}
              className="min-h-24"
              errorMessage={patternErrorMessage(patternCheck.ok ? undefined : patternCheck.kind)}
              footer={`${pattern.length} chars`}
            />

            <TextField
              label="Flags"
              value={flags}
              onChange={(event) => setFlags(event.target.value)}
              maxLength={6}
              spellCheck={false}
              className="w-28 font-mono"
              containerClassName="w-fit"
              description="Supported flags: g i m s u y, each at most once."
              errorMessage={
                !patternCheck.ok && patternCheck.kind === 'bad-flag'
                  ? 'Flags may only use: g i m s u y, each at most once.'
                  : undefined
              }
            />

            <TextArea
              label="Test text"
              hideLabel
              placeholder="Paste text to match against"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={10}
              className="min-h-40 flex-1"
              footer={`${textStats.characters.toLocaleString('en-US')} chars · ${formatBytes(textStats.bytes)}`}
            />

            {patternCheck.ok ? (
              text.length === 0 ? (
                <StatusMessage tone="info" live="off">
                  Type or paste test text, then press Run match. Zero-width matches such as an
                  empty pattern are handled without hanging.
                </StatusMessage>
              ) : (
                <StatusMessage tone="info" live="off">
                  The pattern compiles. Press Run match to see where it matches. Nothing is run on
                  every keystroke.
                </StatusMessage>
              )
            ) : null}
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Matches"
            description={outputDescription}
            actions={
              <CopyButton value={copyText} label="Copy" size="sm" disabled={copyText.length === 0} />
            }
          />

          <CardBody className="flex flex-1 flex-col gap-3">
            {isStale ? (
              <StatusMessage tone="warning" live="off">
                The pattern, flags, or test text changed after this run. Press Run match to refresh
                the results.
              </StatusMessage>
            ) : null}

            {run !== null && result !== null && !result.ok ? (
              <StatusMessage tone="danger" title={ERROR_TITLES[result.kind]} live="off">
                {result.message}
              </StatusMessage>
            ) : null}

            {run !== null && result !== null && result.ok && result.truncated ? (
              <StatusMessage tone="warning" live="off">
                The test text holds more matches than can be shown. The first{' '}
                {MAX_MATCH_LIMIT.toLocaleString('en-US')} are listed.
              </StatusMessage>
            ) : null}

            {matches === null ? (
              <EmptyState
                icon={<Regex className="size-6" />}
                title="No matches yet"
                description="Type a pattern and test text, then press Run match."
                className="flex-1"
              />
            ) : matches.length === 0 ? (
              <EmptyState
                icon={<Regex className="size-6" />}
                title="No matches"
                description="The pattern matched nothing in the test text."
                className="flex-1"
              />
            ) : (
              <ol
                aria-label="Match results"
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto rounded-md border border-neutral-800 bg-neutral-950"
              >
                {matches.map((match, index) => (
                  <li
                    key={`${match.start}-${match.end}-${index}`}
                    className="flex flex-col gap-1 border-b border-neutral-800/70 px-3 py-2 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-3 font-mono text-xs">
                      <span className="text-neutral-500">#{index + 1}</span>
                      <span className="text-neutral-500">
                        {match.start}..{match.end}
                      </span>
                      <span className="break-all text-emerald-300">{JSON.stringify(match.text)}</span>
                    </div>
                    {match.groups.length > 0 ? (
                      <p className="break-all font-mono text-xs text-neutral-600">
                        groups:{' '}
                        {match.groups
                          .map((group) => (group === undefined ? '(no match)' : JSON.stringify(group)))
                          .join(' · ')}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default RegexTester