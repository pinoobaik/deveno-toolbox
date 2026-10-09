import { useMemo, useState } from 'react'
import { Eraser, Hash } from 'lucide-react'

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

import { DIGEST_FAILED_MESSAGE, computeDigest } from './logic'
import {
  DEFAULT_SHA_ALGORITHM,
  SHA_ALGORITHMS,
  type ShaAlgorithm,
  type ShaErrorKind,
  type ShaResult,
} from './types'

/** Labels carry the compatibility caveat where it matters, on SHA-1. */
const ALGORITHM_LABELS: Record<ShaAlgorithm, string> = {
  'SHA-1': 'SHA-1 (legacy)',
  'SHA-256': 'SHA-256',
  'SHA-384': 'SHA-384',
  'SHA-512': 'SHA-512',
}

const ALGORITHM_OPTIONS = SHA_ALGORITHMS.map((value) => ({
  value,
  label: ALGORITHM_LABELS[value],
}))

const ERROR_TITLES: Record<ShaErrorKind, string> = {
  empty: 'Nothing to hash',
  'too-large': 'Input too large',
  unsupported: 'Unsupported algorithm',
  unavailable: 'Web Crypto unavailable',
  failed: 'Digest failed',
}

interface DigestRun {
  readonly input: string
  readonly algorithm: ShaAlgorithm
  readonly result: ShaResult
}

export function ShaDigest({ tool }: ToolComponentProps) {
  const [input, setInput] = useState('')
  const [algorithm, setAlgorithm] = useState<ShaAlgorithm>(DEFAULT_SHA_ALGORITHM)
  const [run, setRun] = useState<DigestRun | null>(null)
  const [isRunning, setIsRunning] = useState(false)

  const inputStats = useMemo(() => measureText(input), [input])

  const current =
    run !== null && run.input === input && run.algorithm === algorithm ? run : null
  const error = current !== null && !current.result.ok ? current.result : null
  const digest = run !== null && run.result.ok ? run.result.text : null
  const isStale = run !== null && current === null

  const compute = async () => {
    setIsRunning(true)
    try {
      const result = await computeDigest(algorithm, input)
      setRun({ input, algorithm, result })
    } catch {
      setRun({
        input,
        algorithm,
        result: { ok: false, kind: 'failed', message: DIGEST_FAILED_MESSAGE },
      })
    } finally {
      setIsRunning(false)
    }
  }

  const clear = () => {
    setInput('')
    setRun(null)
  }

  const outputDescription =
    digest === null
      ? 'Computed on demand, never automatically.'
      : isStale
        ? `${algorithm} · ${digest.length} hex characters · from an earlier input`
        : `${algorithm} · ${digest.length} hex characters`

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <Select
            label="Algorithm"
            hideLabel
            options={ALGORITHM_OPTIONS}
            value={algorithm}
            onChange={setAlgorithm}
            size="sm"
            containerClassName="w-40"
          />
          <Button
            variant="primary"
            icon={<Hash className="size-4" aria-hidden="true" />}
            onClick={() => void compute()}
            disabled={input.length === 0 || isRunning}
          >
            {isRunning ? 'Hashing…' : 'Compute digest'}
          </Button>
          <Button
            variant="ghost"
            icon={<Eraser className="size-4" aria-hidden="true" />}
            onClick={clear}
            disabled={input.length === 0 && run === null}
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
            description="Text to hash. A digest is one way and irreversible: hashing is not encryption."
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            <TextArea
              label="Text to hash"
              hideLabel
              placeholder="The quick brown fox jumps over the lazy dog"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={16}
              className="min-h-64 flex-1"
              footer={`${inputStats.characters} chars · ${formatBytes(inputStats.bytes)}`}
            />

            {error !== null ? (
              <StatusMessage tone="danger" title={ERROR_TITLES[error.kind]} live="off">
                {error.message}
              </StatusMessage>
            ) : input.length === 0 ? (
              <StatusMessage tone="info" live="off">
                Type or paste text, then press Compute digest. Hashing runs in this tab and never
                sends the text anywhere.
              </StatusMessage>
            ) : isStale ? (
              <StatusMessage tone="warning" live="off">
                The input or the algorithm changed after this digest was computed. Press Compute
                digest to refresh it.
              </StatusMessage>
            ) : null}
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Digest"
            description={outputDescription}
            actions={
              <CopyButton
                value={digest ?? ''}
                label="Copy"
                size="sm"
                disabled={digest === null}
              />
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {digest !== null ? (
              <pre
                aria-label={`${algorithm} digest`}
                className="scrollbar-subtle max-h-96 min-h-64 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
              >
                {digest}
              </pre>
            ) : (
              <EmptyState
                icon={<Hash className="size-6" />}
                title="No digest yet"
                description="Hashing runs only when you press Compute digest, so nothing is computed on every keystroke."
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default ShaDigest
