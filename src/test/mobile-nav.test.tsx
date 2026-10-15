import { beforeEach, describe, expect, it, vi } from 'vitest'

import { renderApp, screen, userEvent, within } from '@/test/test-utils'

/**
 * jsdom does not implement `window.matchMedia`, which the drawer uses to
 * auto-close past the `lg` breakpoint. Stub it as a non-desktop viewport so the
 * dialog stays open for the duration of each test.
 */
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

async function openMenu() {
  const user = userEvent.setup()
  renderApp()
  await user.click(screen.getByRole('button', { name: 'Open tools menu' }))
  const dialog = screen.getByRole('dialog', { name: 'Tools menu' })
  return { user, dialog }
}

describe('mobile navigation dialog', () => {
  it('moves focus into the dialog when it opens', async () => {
    const { dialog } = await openMenu()

    expect(dialog).toHaveFocus()
  })

  it('wraps focus forward from the last control and backward from the first', async () => {
    const { user, dialog } = await openMenu()

    const close = within(dialog).getByRole('button', { name: 'Close tools menu' })
    const links = within(dialog).getAllByRole('link')
    const lastLink = links[links.length - 1]
    if (lastLink === undefined) throw new Error('expected the dialog to contain navigation links')

    // The panel container starts focused; Tab pulls focus to the first control.
    await user.tab()
    expect(close).toHaveFocus()

    // Shift+Tab from the first control wraps to the last link.
    await user.tab({ shift: true })
    expect(lastLink).toHaveFocus()

    // Tab from the last control wraps back to the first.
    await user.tab()
    expect(close).toHaveFocus()
  })

  it('keeps focus inside the dialog across repeated Tab and Shift+Tab presses', async () => {
    const { user, dialog } = await openMenu()
    const trigger = screen.getByRole('button', { name: 'Open tools menu' })

    for (let step = 0; step < 30; step += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
      expect(document.activeElement).not.toBe(trigger)
    }

    for (let step = 0; step < 30; step += 1) {
      await user.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
      expect(document.activeElement).not.toBe(trigger)
    }
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    const { user } = await openMenu()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Tools menu' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open tools menu' })).toHaveFocus()
  })

  it('closes when the backdrop is activated', async () => {
    const { user } = await openMenu()

    await user.click(screen.getByRole('button', { name: 'Close navigation overlay' }))

    expect(screen.queryByRole('dialog', { name: 'Tools menu' })).not.toBeInTheDocument()
  })
})
