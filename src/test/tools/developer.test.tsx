import { describe, expect, it } from 'vitest'

import { renderApp, screen, userEvent, within } from '@/test/test-utils'

describe('Regular Expression Tester', () => {
  it('lists matches with positions for a compiled pattern', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/regex-tester' })
    await screen.findByRole('heading', { level: 1, name: 'Regular Expression Tester' })

    await user.type(screen.getByRole('textbox', { name: 'Pattern' }), '\\d+')
    await user.type(screen.getByRole('textbox', { name: 'Test text' }), 'abc 123 xyz 456')
    await user.click(screen.getByRole('button', { name: 'Run match' }))

    const list = screen.getByRole('list', { name: 'Match results' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('2 matches')).toBeInTheDocument()
  })

  it('reports a pattern that does not compile and disables running', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/regex-tester' })
    await screen.findByRole('heading', { level: 1, name: 'Regular Expression Tester' })

    await user.type(screen.getByRole('textbox', { name: 'Pattern' }), '(')
    expect(
      screen.getByText('The pattern is not a valid regular expression.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run match' })).toBeDisabled()
  })
})

describe('URL Parser', () => {
  it('breaks an absolute URL into components and masks the password', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/url-parser' })
    await screen.findByRole('heading', { level: 1, name: 'URL Parser' })

    await user.type(
      screen.getByRole('textbox', { name: 'URL' }),
      'https://user:secret@example.com:8080/a/b?q=1#frag',
    )

    expect(screen.getByText('example.com')).toBeInTheDocument()
    expect(screen.getByText('8080')).toBeInTheDocument()
    expect(screen.getByText('/a/b')).toBeInTheDocument()
    expect(screen.getByText('?q=1')).toBeInTheDocument()
    expect(screen.getByText('#frag')).toBeInTheDocument()
    expect(screen.getByText('••••••')).toBeInTheDocument()
    expect(screen.queryByText('secret')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reveal' }))
    expect(screen.getByText('secret')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('asks for a base URL when the address is relative', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/url-parser' })
    await screen.findByRole('heading', { level: 1, name: 'URL Parser' })

    await user.type(screen.getByRole('textbox', { name: 'URL' }), '/a/b')
    expect(screen.getByText('Relative address')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nothing parsed yet' })).toBeInTheDocument()
  })
})

describe('Cron Expression Parser', () => {
  it('expands every field of a five-field expression', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/cron-parser' })
    await screen.findByRole('heading', { level: 1, name: 'Cron Expression Parser' })

    await user.type(screen.getByRole('textbox', { name: 'Expression' }), '*/15 9-17 * * 1-5')

    for (const label of ['Minutes', 'Hours', 'Day of month', 'Month', 'Day of week']) {
      expect(screen.getByRole('heading', { level: 3, name: label })).toBeInTheDocument()
    }
    expect(screen.getByText('0 15 30 45')).toBeInTheDocument()
  })

  it('rejects the wrong number of fields', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/cron-parser' })
    await screen.findByRole('heading', { level: 1, name: 'Cron Expression Parser' })

    await user.type(screen.getByRole('textbox', { name: 'Expression' }), '1 1')
    expect(screen.getByText('Wrong number of fields')).toBeInTheDocument()
  })
})