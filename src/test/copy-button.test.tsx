import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CopyButton } from '@/components/ui/CopyButton'
import { userEvent } from '@/test/test-utils'

describe('CopyButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (document as { execCommand?: unknown }).execCommand
  })

  it('copies the value via the Clipboard API and shows copied feedback', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)

    render(<CopyButton label="Copy" value="hello" />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows failed feedback when the Clipboard API and fallback both fail', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    const execCommand = vi.fn(() => false)
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    })

    render(<CopyButton label="Copy" value="hello" />)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Failed' })).toBeInTheDocument()
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('is disabled for an empty value or an explicit disabled flag', () => {
    const { rerender } = render(<CopyButton label="Copy" value="" />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()

    rerender(<CopyButton label="Copy" value="x" disabled />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })
})
