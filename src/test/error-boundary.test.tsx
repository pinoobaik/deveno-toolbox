import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderApp, screen, sidebarNav, userEvent, within } from '@/test/test-utils'

/**
 * The JSON Formatter chunk is replaced with one that throws during render, so
 * the shared error boundary is exercised the same way a real render failure or
 * a failed chunk load would trigger it.
 */
vi.mock('@/tools/json-formatter/JsonFormatter', () => ({
  default: () => {
    throw new Error('boom')
  },
}))

describe('error boundary route recovery', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('recovers when navigating from a failing route to a working one', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/json-formatter' })

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'This part of the toolbox failed to load',
      }),
    ).toBeInTheDocument()

    await user.click(within(sidebarNav()).getByRole('link', { name: 'URL Parser' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'URL Parser' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'This part of the toolbox failed to load' }),
    ).not.toBeInTheDocument()
  })
})
