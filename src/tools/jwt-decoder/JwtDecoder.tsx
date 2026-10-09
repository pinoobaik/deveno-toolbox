import { useMemo, useState } from 'react'
import { Eraser, KeyRound } from 'lucide-react'

import { ToolLayout } from '@/components/tools/ToolLayout'
import { Button } from '@/components/ui/Button'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { CopyButton } from '@/components/ui/CopyButton'
import { EmptyState } from '@/components/ui/EmptyState'
import { StatusMessage } from '@/components/ui/StatusMessage'
import { TextArea } from '@/components/ui/TextArea'
import { formatBytes, measureText } from '@/lib/text'
import type { ToolComponentProps } from '@/types/tool'

import { decodeJwt } from './logic'
import type { JwtErrorKind } from './types'

const ERROR_TITLES: Record<JwtErrorKind, string> = {
  empty: 'Nothing to decode',
  'too-large': 'Token too large',
  structure: 'Not a three segment token',
  'header-base64': 'Header not decodable',
  'header-json': 'Header not a JSON object',
  'payload-base64': 'Payload not decodable',
  'payload-json': 'Payload not a JSON object',
}

const VERIFICATION_WARNING = 'Decoding a JWT does not verify its signature or authenticity.'

const EMPTY_HINT = 'Paste a JSON Web Token to read its header and payload here.'

const RESULT_DESCRIPTION = 'Header, payload, and signature appear here.'

export function JwtDecoder({ tool }: ToolComponentProps) {
  const [token, setToken] = useState('')

  const result = useMemo(() => decodeJwt(token), [token])
  const tokenStats = useMemo(() => measureText(token), [token])

  return (
    <ToolLayout
      tool={tool}
      toolbar={
        <Button
          variant="ghost"
          icon={<Eraser className="size-4" aria-hidden="true" />}
          onClick={() => setToken('')}
          disabled={token.length === 0}
        >
          Clear
        </Button>
      }
    >
      <Card as="section" className="flex flex-col">
        <CardHeader
          title="Token"
          description="Paste a JSON Web Token to read its header and payload. Nothing leaves this page, and no signature is checked."
        />
        <CardBody className="flex flex-col gap-3">
          <TextArea
            label="JSON Web Token"
            hideLabel
            placeholder="header.payload.signature"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            rows={5}
            className="font-mono"
            footer={`${tokenStats.characters} chars · ${formatBytes(tokenStats.bytes)}`}
          />

          {result.ok ? null : result.kind === 'empty' ? (
            <StatusMessage tone="info" live="off">
              {EMPTY_HINT}
            </StatusMessage>
          ) : (
            <StatusMessage tone="danger" title={ERROR_TITLES[result.kind]} live="off">
              {result.message}
            </StatusMessage>
          )}
        </CardBody>
      </Card>

      <StatusMessage tone="warning" live="off">
        {VERIFICATION_WARNING}
      </StatusMessage>

      {result.ok ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card as="section" className="flex flex-col">
              <CardHeader
                title="Header"
                description="First segment, decoded from base64url and formatted."
                actions={
                  <CopyButton value={result.header} label="Copy" size="sm" />
                }
              />
              <CardBody className="flex flex-1 flex-col gap-3">
                <pre
                  aria-label="Decoded JWT header"
                  className="scrollbar-subtle max-h-72 min-h-32 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
                >
                  {result.header}
                </pre>
              </CardBody>
            </Card>

            <Card as="section" className="flex flex-col">
              <CardHeader
                title="Payload"
                description="Second segment, decoded from base64url and formatted."
                actions={
                  <CopyButton value={result.payload} label="Copy" size="sm" />
                }
              />
              <CardBody className="flex flex-1 flex-col gap-3">
                <pre
                  aria-label="Decoded JWT payload"
                  className="scrollbar-subtle max-h-72 min-h-32 flex-1 overflow-auto whitespace-pre-wrap break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-200"
                >
                  {result.payload}
                </pre>
              </CardBody>
            </Card>
          </div>

          <Card as="section">
            <CardHeader
              title="Signature"
              description="Third segment, shown exactly as received. It is never decoded or verified."
              actions={
                <CopyButton value={result.signature} label="Copy" size="sm" />
              }
            />
            <CardBody>
              {result.signature.length > 0 ? (
                <code
                  aria-label="Signature segment, not verified"
                  className="scrollbar-subtle block overflow-x-auto whitespace-pre break-all rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-sm text-neutral-400"
                >
                  {result.signature}
                </code>
              ) : (
                <p className="text-sm text-neutral-500">
                  This token ends with an empty signature segment, which means it carries no
                  signature at all.
                </p>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <Card as="section">
          <CardHeader title="Decoded token" description={RESULT_DESCRIPTION} />
          <CardBody>
            <EmptyState
              icon={<KeyRound className="size-6" />}
              title="Nothing decoded yet"
              description={EMPTY_HINT}
            />
          </CardBody>
        </Card>
      )}
    </ToolLayout>
  )
}

export default JwtDecoder
