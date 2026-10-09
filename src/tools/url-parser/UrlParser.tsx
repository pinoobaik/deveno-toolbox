import { useMemo, useState, type ReactNode } from 'react'
import { Eraser, Globe } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import type { ToolComponentProps } from '@/types/tool'

import { parseUrl } from './logic'
import { MAX_URL_CHARS, type UrlParseErrorKind } from './types'

const ERROR_TITLES: Record<UrlParseErrorKind, string> = {
  empty: 'Nothing to parse',
  'too-large': 'Input too large',
  'missing-base': 'Relative address',
  malformed: 'Invalid URL',
}

const MASKED_PASSWORD = '••••••'

interface BreakdownRow {
  readonly label: string
  readonly value: string
  readonly isSecret?: boolean
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-baseline gap-3 border-b border-neutral-800/70 py-2.5 last:border-b-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-neutral-600">{label}</dt>
      <dd className="break-all font-mono text-sm text-neutral-200">{value}</dd>
    </div>
  )
}

function buildRows(url: {
  readonly href: string
  readonly origin: string | null
  readonly protocol: string
  readonly hostname: string
  readonly port: string
  readonly pathname: string
  readonly search: string
  readonly hash: string
  readonly username: string
  readonly password: string
}): BreakdownRow[] {
  return [
    { label: 'URL', value: url.href },
    { label: 'Origin', value: url.origin === null || url.origin === 'null' ? '(opaque)' : url.origin },
    { label: 'Protocol', value: url.protocol },
    { label: 'Hostname', value: url.hostname },
    { label: 'Port', value: url.port.length > 0 ? url.port : '(scheme default)' },
    { label: 'Path', value: url.pathname },
    { label: 'Query', value: url.search.length > 0 ? url.search : '—' },
    { label: 'Fragment', value: url.hash.length > 0 ? url.hash : '—' },
    { label: 'Username', value: url.username.length > 0 ? url.username : '—' },
    { label: 'Password', value: url.password, isSecret: true },
  ]
}

export function UrlParser({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [base, setBase] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const result = useMemo(() => parseUrl(input, base), [input, base])

  const clear = () => {
    setInput('')
    setBase('')
    setShowSecret(false)
  }

  const hintNode: ReactNode =
    result.ok ? null : result.kind === 'missing-base' ? (
      <StatusMessage tone="info" title={ERROR_TITLES[result.kind]} live="off">
        {result.message}
      </StatusMessage>
    ) : (
      <StatusMessage tone="danger" title={ERROR_TITLES[result.kind]} live="off">
        {result.message}
      </StatusMessage>
    )

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <Button
          variant="ghost"
          icon={<Eraser className="size-4" aria-hidden="true" />}
          onClick={clear}
          disabled={input.length === 0 && base.length === 0}
        >
          Clear
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader
            title="URL"
            description="Parsed with the native URL API. Nothing is fetched, navigated, stored, or sent anywhere."
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextField
              label="URL"
              placeholder="https://user:pw@example.com:8080/a/b?q=1#frag"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              maxLength={MAX_URL_CHARS}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              description="An absolute URL parses on its own. A relative address needs the base below."
            />

            <TextField
              label="Base URL"
              placeholder="https://example.com/"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              maxLength={MAX_URL_CHARS}
              value={base}
              onChange={(event) => setBase(event.target.value)}
              description="Used only to resolve a relative address. Never invented."
            />

            {result.ok ? (
              result.url.isRelative ? (
                <StatusMessage tone="info" live="off">
                  Resolved as a relative address against the base URL.
                </StatusMessage>
              ) : null
            ) : (
              hintNode
            )}
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Components"
            description={
              result.ok
                ? 'Each part of the URL, split for inspection.'
                : 'The breakdown appears once the URL parses.'
            }
            actions={
              <CopyButton
                value={result.ok ? result.url.href : ''}
                label="Copy URL"
                size="sm"
                disabled={!result.ok}
              />
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {result.ok ? (
              <>
                <dl className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1">
                  {buildRows(result.url).map((row) => {
                    const masked =
                      row.isSecret && row.value.length > 0 && !showSecret
                    const display = masked
                      ? MASKED_PASSWORD
                      : row.value.length > 0
                        ? row.value
                        : '—'
                    return <Row key={row.label} label={row.label} value={display} />
                  })}
                </dl>
                {result.url.password.length > 0 ? (
                  <StatusMessage tone="info" live="off">
                    {showSecret
                      ? 'The password field is shown — treat this screen as sensitive.'
                      : 'Credentials are labelled but the password stays masked and is never copied.'}{' '}
                    <button
                      type="button"
                      className="font-medium text-sky-400 underline-offset-2 hover:underline"
                      onClick={() => setShowSecret((current) => !current)}
                    >
                      {showSecret ? 'Hide password' : 'Reveal'}
                    </button>
                  </StatusMessage>
                ) : null}
              </>
            ) : (
              <EmptyState
                icon={<Globe className="size-6" />}
                title="Nothing parsed yet"
                description="Type or paste a URL. The parts appear here as soon as it parses."
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default UrlParser