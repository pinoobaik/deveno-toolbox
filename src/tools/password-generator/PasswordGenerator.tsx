import { useState } from 'react'
import { Eraser, KeySquare, ShieldCheck } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextField } from '@/components/ui/TextField'
import type { ToolComponentProps } from '@/types/tool'

import {
  generatePassword,
  RandomnessUnavailableError,
  type RandomByteSource,
} from './logic'
import {
  CHARACTER_GROUP_ORDER,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type CharacterGroupId,
  type PasswordErrorKind,
  type PasswordFailure,
} from './types'

const GROUP_NAMES: Readonly<Record<CharacterGroupId, string>> = {
  lowercase: 'Lowercase',
  uppercase: 'Uppercase',
  digits: 'Digits',
  symbols: 'Symbols',
}

const GROUP_EXAMPLES: Readonly<Record<CharacterGroupId, string>> = {
  lowercase: 'a–z',
  uppercase: 'A–Z',
  digits: '0–9',
  symbols: '!@#$…',
}

const ERROR_TITLES: Readonly<Record<PasswordErrorKind, string>> = {
  'no-groups': 'Nothing to generate',
  'length-out-of-range': 'Length out of range',
  'length-too-small': 'Length too small',
  unavailable: 'Randomness unavailable',
  failed: 'Generation failed',
}

const GENERATION_NOTE =
  'Candidates are drawn uniformly from the combined alphabet using rejection sampling, so no group is over- or underweighted. A candidate is only accepted once every selected group is present. Nothing is stored or sent.'

const cryptoRandomBytes: RandomByteSource = (count) => {
  const cryptoObject = (globalThis as { crypto?: Crypto }).crypto
  if (cryptoObject === undefined || typeof cryptoObject.getRandomValues !== 'function') {
    throw new RandomnessUnavailableError()
  }
  return cryptoObject.getRandomValues(new Uint8Array(count))
}

export function PasswordGenerator({ tool }: ToolComponentProps) {
  const [lengthText, setLengthText] = useState('16')
  const [groups, setGroups] = useState<CharacterGroupId[]>([...CHARACTER_GROUP_ORDER])
  const [generated, setGenerated] = useState<{
    password: string
    length: number
    groups: CharacterGroupId[]
  } | null>(null)
  const [failure, setFailure] = useState<PasswordFailure | null>(null)

  const lengthNumber = Number.parseInt(lengthText, 10)
  const lengthValid =
    /^\d+$/.test(lengthText) &&
    Number.isInteger(lengthNumber) &&
    lengthNumber >= MIN_PASSWORD_LENGTH &&
    lengthNumber <= MAX_PASSWORD_LENGTH

  const handleGenerate = () => {
    if (groups.length === 0 || !lengthValid) return
    const result = generatePassword({ length: lengthNumber, groups }, cryptoRandomBytes)
    if (result.ok) {
      setGenerated({ password: result.password, length: result.password.length, groups: [...groups] })
      setFailure(null)
    } else {
      setGenerated(null)
      setFailure(result)
    }
  }

  const handleLengthChange = (value: string) => {
    setLengthText(value)
    setGenerated(null)
    setFailure(null)
  }

  const toggleGroup = (group: CharacterGroupId) => {
    setGroups((prev) =>
      prev.includes(group) ? prev.filter((entry) => entry !== group) : [...prev, group],
    )
    setGenerated(null)
    setFailure(null)
  }

  const reset = () => {
    setLengthText('16')
    setGroups([...CHARACTER_GROUP_ORDER])
    setGenerated(null)
    setFailure(null)
  }

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <>
          <Button
            variant="ghost"
            icon={<Eraser className="size-4" aria-hidden="true" />}
            onClick={reset}
            disabled={lengthText === '16' && groups.length === 4 && generated === null && failure === null}
          >
            Reset
          </Button>
          <Button
            icon={<KeySquare className="size-4" aria-hidden="true" />}
            onClick={handleGenerate}
            disabled={!lengthValid || groups.length === 0}
          >
            Generate
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Options"
            description={GENERATION_NOTE}
          />
          <CardBody className="flex flex-1 flex-col gap-4">
            <TextField
              label="Length"
              type="number"
              inputMode="numeric"
              min={MIN_PASSWORD_LENGTH}
              max={MAX_PASSWORD_LENGTH}
              placeholder="16"
              value={lengthText}
              onChange={(event) => handleLengthChange(event.target.value)}
              errorMessage={
                lengthText.length > 0 && !lengthValid
                  ? `Enter a whole number between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH}.`
                  : undefined
              }
            />

            <fieldset>
              <legend className="text-sm font-medium text-neutral-200">Character groups</legend>
              <p className="mt-1 text-xs text-neutral-500">
                Every selected group appears at least once in the result. Deselect to exclude it.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CHARACTER_GROUP_ORDER.map((group) => {
                  const active = groups.includes(group)
                  return (
                    <Button
                      key={group}
                      type="button"
                      variant={active ? 'secondary' : 'ghost'}
                      aria-pressed={active}
                      aria-label={GROUP_NAMES[group]}
                      onClick={() => toggleGroup(group)}
                    >
                      {GROUP_NAMES[group]}
                      <span className="ml-1 font-mono text-xs opacity-70">{GROUP_EXAMPLES[group]}</span>
                    </Button>
                  )
                })}
              </div>
            </fieldset>
          </CardBody>
        </Card>

        <Card as="section" className="flex flex-col">
          <CardHeader
            title="Password"
            description={
              generated === null
                ? 'The generated password appears here and is never stored or sent anywhere.'
                : `Generated with all ${generated.groups.length} selected groups.`
            }
          />
          <CardBody className="flex flex-1 flex-col gap-3">
            {generated !== null ? (
              <>
                <div className="flex items-start gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-3">
                  <code className="min-w-0 flex-1 select-all break-all font-mono text-sm leading-relaxed text-neutral-100">
                    {generated.password}
                  </code>
                  <CopyButton value={generated.password} size="sm" />
                </div>
                <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-1 text-sm">
                  <div className="flex items-center gap-3 border-b border-neutral-800/70 py-2.5 last:border-b-0">
                    <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-600">Length</span>
                    <span className="font-mono text-neutral-200">{generated.length}</span>
                  </div>
                  <div className="flex items-center gap-3 border-b border-neutral-800/70 py-2.5 last:border-b-0">
                    <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-600">Groups</span>
                    <span className="text-neutral-200">
                      {generated.groups.map((group) => GROUP_NAMES[group]).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 border-b border-neutral-800/70 py-2.5 last:border-b-0">
                    <span className="w-16 shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-600">Source</span>
                    <span className="text-neutral-200">crypto.getRandomValues, local only</span>
                  </div>
                </div>
                <StatusMessage tone="info" live="off">
                  Generated locally with up to {MAX_PASSWORD_LENGTH.toLocaleString('en-US')} characters from{' '}
                  {generated.groups.length} group{generated.groups.length === 1 ? '' : 's'}. Nothing is stored or
                  sent; treat this out as a draft, not a place to keep secrets.
                </StatusMessage>
              </>
            ) : failure !== null ? (
              <StatusMessage tone="danger" title={ERROR_TITLES[failure.kind]} live="off">
                {failure.message}
              </StatusMessage>
            ) : (
              <EmptyState
                icon={<ShieldCheck className="size-6" />}
                title="No password yet"
                description="Set a length, pick your character groups, and press Generate. The output stays on this page."
                className="flex-1"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </ToolLayout>
  )
}

export default PasswordGenerator