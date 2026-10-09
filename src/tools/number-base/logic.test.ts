import { describe, expect, it } from 'vitest'

import { convertBase } from './logic'
import { MAX_NUMBER_INPUT_CHARS, type NumberBase, type NumberResult } from './types'

const failureKind = (result: NumberResult) => (result.ok ? null : result.kind)

const convert = (input: string, from: NumberBase, to: NumberBase) => convertBase(input, from, to)

describe('convertBase', () => {
  it('reports an empty input', () => {
    expect(failureKind(convert('', 10, 16))).toBe('empty')
  })

  it('reports whitespace only input as empty rather than invalid', () => {
    expect(failureKind(convert('   \n\t ', 10, 16))).toBe('empty')
  })

  it('rejects input past the documented character limit', () => {
    expect(failureKind(convert('1'.repeat(MAX_NUMBER_INPUT_CHARS + 1), 10, 2))).toBe('too-large')
  })

  const conversions: ReadonlyArray<{
    readonly input: string
    readonly from: NumberBase
    readonly to: NumberBase
    readonly expected: string
  }> = [
    { input: '255', from: 10, to: 16, expected: '0xff' },
    { input: '255', from: 10, to: 8, expected: '0o377' },
    { input: '255', from: 10, to: 2, expected: '0b11111111' },
    { input: '1024', from: 10, to: 2, expected: '0b10000000000' },
    { input: '1010', from: 2, to: 10, expected: '10' },
    { input: '17', from: 8, to: 10, expected: '15' },
    { input: 'ff', from: 16, to: 10, expected: '255' },
    { input: 'deadBEEF', from: 16, to: 10, expected: '3735928559' },
    { input: 'ff', from: 16, to: 8, expected: '0o377' },
    { input: '4294967295', from: 10, to: 16, expected: '0xffffffff' },
    { input: '1000000', from: 10, to: 16, expected: '0xf4240' },
    { input: '0', from: 10, to: 16, expected: '0x0' },
    { input: '64', from: 10, to: 8, expected: '0o100' },
  ]

  it.each(conversions)('converts $input from base $from to base $to', ({ input, from, to, expected }) => {
    expect(convert(input, from, to)).toEqual({ ok: true, text: expected })
  })

  it('accepts a prefix that matches the selected input base', () => {
    expect(convert('0xff', 16, 10)).toEqual({ ok: true, text: '255' })
    expect(convert('0XFF', 16, 10)).toEqual({ ok: true, text: '255' })
    expect(convert('0b1010', 2, 10)).toEqual({ ok: true, text: '10' })
    expect(convert('0B1010', 2, 10)).toEqual({ ok: true, text: '10' })
    expect(convert('0o17', 8, 10)).toEqual({ ok: true, text: '15' })
  })

  it('ignores a prefix that does not match the selected input base', () => {
    expect(convert('0x10', 10, 10).ok).toBe(false)
    expect(convert('0b10', 10, 10).ok).toBe(false)
  })

  it('honours an explicit sign and keeps it on the output', () => {
    expect(convert('-255', 10, 16)).toEqual({ ok: true, text: '-0xff' })
    expect(convert('+255', 10, 16)).toEqual({ ok: true, text: '0xff' })
    expect(convert('-0b1010', 2, 10)).toEqual({ ok: true, text: '-10' })
  })

  it('drops the sign for negative zero rather than printing -0', () => {
    expect(convert('-0', 10, 16)).toEqual({ ok: true, text: '0x0' })
    expect(convert('-0', 10, 10)).toEqual({ ok: true, text: '0' })
  })

  it('drops leading zeros from the input', () => {
    expect(convert('007', 10, 10)).toEqual({ ok: true, text: '7' })
    expect(convert('0000ff', 16, 10)).toEqual({ ok: true, text: '255' })
  })

  it('converts integers past the safe Number range exactly', () => {
    expect(convert('18446744073709551615', 10, 16)).toEqual({
      ok: true,
      text: '0xffffffffffffffff',
    })
    expect(convert('18446744073709551615', 10, 2)).toEqual({
      ok: true,
      text: `0b${'1'.repeat(64)}`,
    })
    expect(convert('123456789012345678901234567890', 10, 16)).toEqual({
      ok: true,
      text: '0x18ee90ff6c373e0ee4e3f0ad2',
    })
    expect(convert('1000000000000000000000000000000', 10, 16)).toEqual({
      ok: true,
      text: '0xc9f2c9cd04674edea40000000',
    })
  })

  const badDigits: ReadonlyArray<{
    readonly input: string
    readonly base: NumberBase
    readonly position: number
  }> = [
    { input: '2', base: 2, position: 1 },
    { input: '18', base: 2, position: 2 },
    { input: 'g', base: 16, position: 1 },
    { input: '9', base: 8, position: 1 },
    { input: '12 34', base: 10, position: 3 },
  ]

  it.each(badDigits)('rejects $input in base $base at position $position', ({ input, base, position }) => {
    const result = convert(input, base, 10)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.kind).toBe('invalid-digit')
    expect(!result.ok && result.message).toBe(
      `Position ${position} is not a digit valid in base ${base}.`,
    )
  })

  it('reports a position relative to the trimmed input after sign and prefix', () => {
    const result = convert('  -0x1z', 16, 10)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message).toBe('Position 5 is not a digit valid in base 16.')
  })

  it('rejects a sign or prefix with no digits behind it', () => {
    for (const input of ['-', '+', '0x', '0X']) {
      const result = convert(input, 16, 10)

      expect(result.ok, input).toBe(false)
      expect(!result.ok && result.kind, input).toBe('invalid')
      expect(!result.ok && result.message, input).toBe('Enter digits, not just a sign or a prefix.')
    }
  })

  it('never echoes the offending character back in a message', () => {
    const result = convert('zz9secret', 16, 10)

    expect(result.ok).toBe(false)
    expect(!result.ok && result.message.includes('secret')).toBe(false)
    expect(!result.ok && result.message.includes('z')).toBe(false)
  })

  it('round trips any value back to decimal', () => {
    const values = ['0', '1', '255', '4096', '-1024', '18446744073709551615']

    for (const value of values) {
      for (const base of [2, 8, 16] as const) {
        const encoded = convert(value, 10, base)
        expect(encoded.ok, `${value} -> base ${base}`).toBe(true)
        if (!encoded.ok) continue

        const back = convert(encoded.text, base, 10)
        expect(back.ok && back.text, `${value} via base ${base}`).toBe(value)
      }
    }
  })
})
