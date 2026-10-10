import { describe, expect, it } from 'vitest'

import { renderApp, screen, userEvent } from '@/test/test-utils'

describe('Unix Timestamp Converter', () => {
  it('converts a Unix timestamp into seconds, milliseconds, and a UTC date', async () => {
    const user = userEvent.setup()
    const { container } = renderApp({ route: '/tools/timestamp-converter' })
    await screen.findByRole('heading', { level: 1, name: 'Timestamp Converter' })

    await user.type(screen.getByRole('textbox', { name: 'Unix timestamp' }), '1705314600')

    const values = container.querySelectorAll('dd.font-mono')
    expect(Array.from(values).some((el) => el.textContent?.includes('2024') ?? false)).toBe(true)
    expect(screen.getByText('1705314600000')).toBeInTheDocument()
  })

  it('rejects a non-numeric timestamp', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/timestamp-converter' })
    await screen.findByRole('heading', { level: 1, name: 'Timestamp Converter' })

    await user.type(screen.getByRole('textbox', { name: 'Unix timestamp' }), 'abc')
    expect(screen.getByText(/is not a Unix timestamp/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No conversion yet' })).toBeInTheDocument()
  })
})

describe('Number Base Converter', () => {
  it('converts between bases and reports invalid digits', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/number-base' })
    await screen.findByRole('heading', { level: 1, name: 'Number Base Converter' })

    const input = screen.getByRole('textbox', { name: 'Number' })
    await user.type(input, '255')
    expect(screen.getByLabelText('Hexadecimal output').textContent).toBe('0xff')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Output base' }), '2')
    expect(screen.getByLabelText('Binary output').textContent).toBe('0b11111111')

    await user.clear(input)
    await user.type(input, 'ff')
    expect(screen.getByText('Invalid digit')).toBeInTheDocument()
    expect(screen.queryByLabelText('Binary output')).not.toBeInTheDocument()
  })
})

describe('Color Converter', () => {
  it('parses a hex color into rgb and hsl canonical forms', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/color-converter' })
    await screen.findByRole('heading', { level: 1, name: 'Color Converter' })

    await user.type(screen.getByRole('textbox', { name: 'Color' }), '#3498db')

    expect(screen.getByText(/Parsed as HEX\./)).toBeInTheDocument()
    expect(screen.getByText('rgb(52, 152, 219)')).toBeInTheDocument()
    expect(screen.getByText('hsl(204, 70%, 53%)')).toBeInTheDocument()
    expect(screen.getByText('R 52 · G 152 · B 219')).toBeInTheDocument()
    expect(screen.getByText('opaque')).toBeInTheDocument()
  })

  it('reports an unrecognized color format', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/color-converter' })
    await screen.findByRole('heading', { level: 1, name: 'Color Converter' })

    await user.type(screen.getByRole('textbox', { name: 'Color' }), 'red')
    expect(screen.getByText('Unknown color format')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nothing converted yet' })).toBeInTheDocument()
  })
})