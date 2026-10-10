import { fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderApp, screen, userEvent } from '@/test/test-utils'

describe('JSON Formatter', () => {
  it('validates, pretty-prints, and minifies JSON', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/json-formatter' })
    await screen.findByRole('heading', { level: 1, name: 'JSON Formatter' })

    const input = screen.getByRole('textbox', { name: 'JSON input' })
    fireEvent.change(input, { target: { value: '{"a":1,"b":2}' } })
    expect(screen.getByText('Input is valid JSON.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Format' }))
    const output = screen.getByLabelText('Formatted JSON output')
    expect(output.textContent?.replace(/\s+/g, ' ').trim()).toBe('{ "a": 1, "b": 2 }')

    await user.click(screen.getByRole('button', { name: 'Minify' }))
    expect(output.textContent).toBe('{"a":1,"b":2}')
  })

  it('reports invalid JSON and disables the actions', async () => {
    renderApp({ route: '/tools/json-formatter' })
    await screen.findByRole('heading', { level: 1, name: 'JSON Formatter' })

    fireEvent.change(screen.getByRole('textbox', { name: 'JSON input' }), { target: { value: '{' } })
    expect(screen.getByText('Invalid JSON')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Format' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Minify' })).toBeDisabled()
    expect(screen.queryByLabelText('Formatted JSON output')).not.toBeInTheDocument()
  })
})

describe('Text Case Converter', () => {
  it('transforms case live based on the selected mode', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/text-case' })
    await screen.findByRole('heading', { level: 1, name: 'Text Case Converter' })

    await user.type(screen.getByRole('textbox', { name: 'Text to transform' }), 'the QUICK brown Fox')

    const title = screen.getByLabelText('Title Case output')
    expect(title.textContent?.replace(/\s+/g, ' ').trim()).toBe('The Quick Brown Fox')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Case' }), 'upper')
    expect(screen.getByLabelText('Uppercase output').textContent).toBe('THE QUICK BROWN FOX')
  })
})