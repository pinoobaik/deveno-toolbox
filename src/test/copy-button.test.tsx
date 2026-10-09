// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CopyButton } from '@/components/ui/CopyButton'
import { userEvent } from '@/test/test-utils'

describe('CopyButton', () => {
  it('copies the value and shows copied feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const user = userEvent.setup()

    render(<CopyButton label="Copy" value="hello" />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith('hello')
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows failed feedback when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', {})
    vi.spyOn(document, 'execCommand').mockReturnValue(false)
    const user = userEvent.setup()

    render(<CopyButton label="Copy" value="hello" />)
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(await screen.findByRole('button', { name: 'Failed' })).toBeInTheDocument()
  })

  it('is disabled for an empty value or an explicit disabled flag', () => {
    const { rerender } = render(<CopyButton label="Copy" value="" />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()

    rerender(<CopyButton label="Copy" value="x" disabled />)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
  })
})