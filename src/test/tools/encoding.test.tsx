// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { renderApp, screen, userEvent } from '@/test/test-utils'

describe('Base64 Encoder & Decoder', () => {
  it('encodes and decodes text', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/base64' })
    await screen.findByRole('heading', { level: 1, name: 'Base64 Encoder & Decoder' })

    await user.type(screen.getByRole('textbox', { name: 'Text to encode' }), 'Hello, World!')
    expect(screen.getByLabelText('Base64 output').textContent).toBe('SGVsbG8sIFdvcmxkIQ==')

    await user.click(screen.getByRole('radio', { name: 'Decode' }))
    const decode = screen.getByRole('textbox', { name: 'Base64 to decode' })
    await user.clear(decode)
    await user.type(decode, 'SGVsbG8sIFdvcmxkIQ==')
    expect(screen.getByLabelText('Base64 output').textContent).toBe('Hello, World!')
  })

  it('rejects input that is not valid Base64', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/base64' })
    await screen.findByRole('heading', { level: 1, name: 'Base64 Encoder & Decoder' })

    await user.click(screen.getByRole('radio', { name: 'Decode' }))
    await user.type(screen.getByRole('textbox', { name: 'Base64 to decode' }), '%%%')
    expect(screen.getByText('Not valid Base64')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'No output yet' })).toBeInTheDocument()
  })
})

describe('URL Encoder', () => {
  it('percent-encodes a component and decodes it back', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/url-encoder' })
    await screen.findByRole('heading', { level: 1, name: 'URL Encoder' })

    const input = screen.getByRole('textbox', { name: 'Text to encode' })
    await user.type(input, 'hello world & friends')
    expect(screen.getByLabelText('Percent-encoded output').textContent).toBe(
      'hello%20world%20%26%20friends',
    )

    await user.click(screen.getByRole('radio', { name: 'Decode' }))
    const decode = screen.getByRole('textbox', { name: 'Percent-encoded text' })
    await user.clear(decode)
    await user.type(decode, 'hello%20world')
    expect(screen.getByLabelText('Percent-encoded output').textContent).toBe('hello world')
  })

  it('reports malformed percent sequences when decoding', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/url-encoder' })
    await screen.findByRole('heading', { level: 1, name: 'URL Encoder' })

    await user.click(screen.getByRole('radio', { name: 'Decode' }))
    await user.type(screen.getByRole('textbox', { name: 'Percent-encoded text' }), 'https://a/%')
    expect(screen.getByText('Cannot be converted')).toBeInTheDocument()
  })
})

const JWT_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

describe('JWT Decoder', () => {
  it('decodes a valid token into header, payload, and signature segments', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/jwt-decoder' })
    await screen.findByRole('heading', { level: 1, name: 'JWT Decoder' })

    await user.type(screen.getByRole('textbox', { name: 'JSON Web Token' }), JWT_TOKEN)

    expect(screen.getByLabelText('Decoded JWT header')).toHaveTextContent('"alg": "HS256"')
    expect(screen.getByLabelText('Decoded JWT payload')).toHaveTextContent('"sub": "123"')
    expect(screen.getByLabelText('Signature segment, not verified').textContent).toBe(
      JWT_TOKEN.split('.')[2],
    )
    expect(
      screen.getByText('Decoding a JWT does not verify its signature or authenticity.'),
    ).toBeInTheDocument()
  })

  it('reports a token without three segments', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/jwt-decoder' })
    await screen.findByRole('heading', { level: 1, name: 'JWT Decoder' })

    await user.type(screen.getByRole('textbox', { name: 'JSON Web Token' }), 'abc')
    expect(screen.getByText('Not a three segment token')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Nothing decoded yet' })).toBeInTheDocument()
  })
})

describe('HTML Entity Encoder & Decoder', () => {
  it('encodes and decodes named and numeric references', async () => {
    const user = userEvent.setup()
    renderApp({ route: '/tools/html-entities' })
    await screen.findByRole('heading', { level: 1, name: 'HTML Entity Encoder & Decoder' })

    await user.type(screen.getByRole('textbox', { name: 'Text to encode' }), 'a & b < c')
    expect(screen.getByLabelText('Encoded output').textContent).toBe('a &amp; b &lt; c')

    await user.click(screen.getByRole('radio', { name: 'Decode' }))
    const decode = screen.getByRole('textbox', { name: 'Text to decode' })
    await user.clear(decode)
    await user.type(decode, '&lt;p&gt; &amp; &#65;')
    expect(screen.getByLabelText('Decoded output').textContent).toBe('<p> & A')
  })
})