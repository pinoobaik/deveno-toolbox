import { describe, expect, it } from 'vitest'

import { renderApp, screen, userEvent, waitFor, within } from '@/test/test-utils'

const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function stubRandomUuid(): void {
  let sequence = 0
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => `00000000-0000-4000-8000-${String(sequence++).padStart(12, '0')}`,
  })
}

function cryptoWithout(pick: 'randomUUID' | 'subtle'): void {
  Object.defineProperty(globalThis.crypto, pick, {
    configurable: true,
    value: undefined,
  })
}

describe('UUID Generator', () => {
  it('generates the requested amount of version 4 UUIDs', async () => {
    stubRandomUuid()
    const user = userEvent.setup()
    renderApp({ route: '/tools/uuid-generator' })
    await screen.findByRole('heading', { level: 1, name: 'UUID Generator' })

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    const resultHeading = screen.getByRole('heading', { name: 'Result' })
    const resultSection = resultHeading.closest('section')
    if (resultSection === null) throw new Error('No <section> wraps the "Result" heading.')
    const rows = within(resultSection).getAllByRole('listitem')
    expect(rows).toHaveLength(5)
    for (const row of rows) {
      const code = row.querySelector('code')
      expect(code?.textContent ?? '').toMatch(UUID_V4_PATTERN)
    }
    expect(screen.getByText('5 UUIDs generated.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy all' })).toBeEnabled()
  })

  it('reports when crypto.randomUUID is unavailable', async () => {
    cryptoWithout('randomUUID')
    const user = userEvent.setup()
    renderApp({ route: '/tools/uuid-generator' })
    await screen.findByRole('heading', { level: 1, name: 'UUID Generator' })

    await user.click(screen.getByRole('button', { name: 'Generate' }))
    expect(screen.getByText('Generation failed')).toBeInTheDocument()
    expect(
      screen.getByText('crypto.randomUUID() is not available in this browser.'),
    ).toBeInTheDocument()
  })
})

describe('SHA Hash Generator', () => {
  it('computes a SHA-256 digest on demand', async () => {
    const { webcrypto } = await import('node:crypto')
    Object.defineProperty(globalThis.crypto, 'subtle', {
      configurable: true,
      value: webcrypto.subtle,
    })
    const user = userEvent.setup()
    renderApp({ route: '/tools/sha-digest' })
    await screen.findByRole('heading', { level: 1, name: 'SHA Hash Generator' })

    expect(screen.getByRole('heading', { name: 'No digest yet' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Text to hash' }), 'abc')
    await user.click(screen.getByRole('button', { name: 'Compute digest' }))

    const digest = screen.getByLabelText('SHA-256 digest')
    await waitFor(() =>
      expect(digest.textContent).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    )
    expect(screen.getByText('SHA-256 · 64 hex characters')).toBeInTheDocument()
  })

  it('removes a stale result and reports when Web Crypto is unavailable', async () => {
    cryptoWithout('subtle')
    const user = userEvent.setup()
    renderApp({ route: '/tools/sha-digest' })
    await screen.findByRole('heading', { level: 1, name: 'SHA Hash Generator' })

    await user.type(screen.getByRole('textbox', { name: 'Text to hash' }), 'abc')
    await user.click(screen.getByRole('button', { name: 'Compute digest' }))

    expect(screen.getByText('Web Crypto unavailable')).toBeInTheDocument()
    expect(screen.queryByLabelText('SHA-256 digest')).not.toBeInTheDocument()
  })
})

describe('Password Generator', () => {
  it('generates a password with every selected group present', async () => {
    const user = userEvent.setup()
    const { container } = renderApp({ route: '/tools/password-generator' })
    await screen.findByRole('heading', { level: 1, name: 'Password Generator' })

    await user.click(screen.getByRole('button', { name: 'Generate' }))

    const password = container.querySelector('code')?.textContent ?? ''
    expect(password).toHaveLength(16)
    expect(password).toMatch(/[a-z]/)
    expect(password).toMatch(/[A-Z]/)
    expect(password).toMatch(/[0-9]/)
    expect(screen.getByText('Lowercase, Uppercase, Digits, Symbols')).toBeInTheDocument()
    expect(screen.getByText('Generated with all 4 selected groups.')).toBeInTheDocument()
  })

  it('disables generation when no character group is selected', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/password-generator' })
    await screen.findByRole('heading', { level: 1, name: 'Password Generator' })

    for (const name of ['Lowercase', 'Uppercase', 'Digits', 'Symbols']) {
      await user.click(screen.getByRole('button', { name }))
    }
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled()
  })
})