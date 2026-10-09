import { useMemo, useState } from 'react'
import { FingerprintPattern, RefreshCw, Trash } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import type { ToolComponentProps } from '@/types/tool'

import { generateUuids, parseUuidCount } from './logic'
import { DEFAULT_UUID_COUNT, MAX_UUIDS, MIN_UUIDS } from './types'

export function UuidGenerator({ tool }: ToolComponentProps) {
  const [count, setCount] = useState<string>(String(DEFAULT_UUID_COUNT))
  const [uuids, setUuids] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const countResult = useMemo(() => parseUuidCount(count), [count])

  const generate = () => {
    if (!countResult.ok) return

    try {
      setUuids(generateUuids(countResult.value))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Failed to generate UUIDs.')
      setUuids([])
    }
  }

  const clear = () => {
    setUuids([])
    setError(null)
  }

  return (
    <ToolLayout tool={tool}>
      <Card as="section">
        <CardHeader
          title="Generate"
          description={`Between ${MIN_UUIDS} and ${MAX_UUIDS} UUIDs per run.`}
        />
        <CardBody>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <TextField
              label="Amount"
              type="number"
              inputMode="numeric"
              min={MIN_UUIDS}
              max={MAX_UUIDS}
              value={count}
              onChange={(event) => setCount(event.target.value)}
              errorMessage={countResult.ok ? undefined : countResult.message}
              className="w-full sm:w-32"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                icon={<RefreshCw className="size-4" aria-hidden="true" />}
                onClick={generate}
                disabled={!countResult.ok}
              >
                Generate
              </Button>
              <Button
                variant="ghost"
                icon={<Trash className="size-4" aria-hidden="true" />}
                onClick={clear}
                disabled={uuids.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {error ? (
        <StatusMessage tone="danger" title="Generation failed">
          {error}
        </StatusMessage>
      ) : null}

      <Card as="section">
        <CardHeader
          title="Result"
          description={
            uuids.length > 0
              ? `${uuids.length} UUID${uuids.length > 1 ? 's' : ''} generated.`
              : 'No UUIDs yet.'
          }
          actions={
            <CopyButton
              value={uuids.join('\n')}
              label="Copy all"
              size="sm"
              disabled={uuids.length === 0}
            />
          }
        />
        <CardBody>
          {uuids.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {uuids.map((uuid) => (
                <li
                  key={uuid}
                  className="flex items-center justify-between gap-3 rounded-md border border-neutral-800 bg-neutral-900/40 px-3 py-2"
                >
                  <code className="scrollbar-subtle min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-neutral-200">
                    {uuid}
                  </code>
                  <CopyButton
                    value={uuid}
                    ariaLabel={`Copy UUID ${uuid}`}
                    size="sm"
                    variant="ghost"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FingerprintPattern className="size-6" />}
              title="Nothing generated yet"
              description="Pick an amount and press Generate. UUIDs come from crypto.randomUUID(), so no custom randomness is involved."
            />
          )}
        </CardBody>
      </Card>
    </ToolLayout>
  )
}

export default UuidGenerator
