import { describe, expect, it } from 'vitest'

import { parseColor } from './logic'
import { MAX_COLOR_CHARS } from './types'

function colorOf(input: string) {
  const result = parseColor(input)
  expect(result.ok, `${input} should parse`).toBe(true)
  return result.ok ? result.color : null
}

function withinTolerance(actual: number, expected: number, tolerance = 1) {
  expect(Math.abs(actual - expected), `${actual} ~= ${expected}`).toBeLessThanOrEqual(tolerance)
}

describe('parseColor (hex)', () => {
  it('parses a full hex color into every canonical form', () => {
    const color = colorOf('#ff0000')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.r).toBe(255)
    expect(color.g).toBe(0)
    expect(color.b).toBe(0)
    expect(color.h).toBe(0)
    expect(color.s).toBe(100)
    expect(color.l).toBe(50)
    expect(color.alpha).toBe(1)
    expect(color.hex).toBe('#ff0000')
    expect(color.rgb).toBe('rgb(255, 0, 0)')
    expect(color.hsl).toBe('hsl(0, 100%, 50%)')
    expect(color.source).toBe('hex')
  })

  it('expands a 3-digit hex color', () => {
    const color = colorOf('#0ff')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#00ffff')
    expect(color.rgb).toBe('rgb(0, 255, 255)')
    expect(color.hsl).toBe('hsl(180, 100%, 50%)')
  })

  it('expands a 4-digit hex color with alpha', () => {
    const color = colorOf('#abcd')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#aabbccdd')
    expect(color.rgb).toBe('rgba(170, 187, 204, 0.8667)')
  })

  it('keeps an 8-digit alpha channel', () => {
    const color = colorOf('#0000ffcc')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.alpha).toBe(0.8)
    expect(color.hex).toBe('#0000ffcc')
    expect(color.rgb).toBe('rgba(0, 0, 255, 0.8)')
    expect(color.hsl).toBe('hsla(240, 100%, 50%, 0.8)')
  })

  it('drops the alpha pair when an 8-digit hex is fully opaque', () => {
    const color = colorOf('#ff0000ff')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.alpha).toBe(1)
    expect(color.hex).toBe('#ff0000')
    expect(color.rgb).toBe('rgb(255, 0, 0)')
  })
})

describe('parseColor (rgb)', () => {
  it('parses a comma rgb() color', () => {
    const color = colorOf('rgb(255, 0, 0)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#ff0000')
    expect(color.rgb).toBe('rgb(255, 0, 0)')
    expect(color.source).toBe('rgb')
  })

  it('parses an rgba() color with unitless alpha', () => {
    const color = colorOf('rgba(0, 128, 255, 0.5)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#0080ff80')
    expect(color.rgb).toBe('rgba(0, 128, 255, 0.5)')
    expect(color.hsl).toBe('hsla(210, 100%, 50%, 0.5)')
  })

  it('accepts percentage channels', () => {
    const color = colorOf('rgb(100%, 0%, 0%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#ff0000')
  })

  it('supports space-separated channels with a slash alpha', () => {
    const color = colorOf('rgb(255 0 0 / 50%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#ff000080')
    expect(color.rgb).toBe('rgba(255, 0, 0, 0.5)')
  })

  it('supports a trailing unitless alpha in space form', () => {
    const color = colorOf('rgb(255 0 0 0.25)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#ff000040')
  })

  it('rounds percentage-derived channels to whole integers', () => {
    const color = colorOf('rgb(50%, 25%, 12.5%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#804020')
    expect(color.rgb).toBe('rgb(128, 64, 32)')
  })
})

describe('parseColor (hsl)', () => {
  it('converts hsl to rgb and hex', () => {
    const color = colorOf('hsl(120, 100%, 50%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#00ff00')
    expect(color.rgb).toBe('rgb(0, 255, 0)')
    expect(color.hsl).toBe('hsl(120, 100%, 50%)')
    expect(color.source).toBe('hsl')
  })

  it('parses hsla with a percentage alpha', () => {
    const color = colorOf('hsla(0, 0%, 100%, 0.25)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#ffffff40')
    expect(color.hsl).toBe('hsla(0, 0%, 100%, 0.25)')
  })

  it('wraps a negative hue', () => {
    const color = colorOf('hsl(-120, 100%, 50%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#0000ff')
  })

  it('wraps a hue above 360', () => {
    const color = colorOf('hsl(480, 100%, 50%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#00ff00')
  })

  it('supports space-slash hsl form', () => {
    const color = colorOf('hsl(240 100% 50% / 0.5)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#0000ff80')
  })

  it('derives gray from zero saturation', () => {
    const color = colorOf('hsl(0, 0%, 50%)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.hex).toBe('#808080')
    expect(color.hsl).toBe('hsl(0, 0%, 50%)')
  })
})

describe('parseColor (alpha rounding)', () => {
  it('rounds alpha to four decimals', () => {
    const color = colorOf('rgba(0, 0, 0, 0.123456)')

    expect(color).not.toBeNull()
    if (color === null) return
    expect(color.alpha).toBe(0.1235)
    expect(color.rgb).toBe('rgba(0, 0, 0, 0.1235)')
    expect(color.hex).toBe('#0000001f')
  })
})

describe('parseColor (errors)', () => {
  it('rejects empty and whitespace-only input', () => {
    for (const input of ['', '   ']) {
      const result = parseColor(input)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.kind).toBe('empty')
    }
  })

  it('rejects input over the length limit', () => {
    const result = parseColor('#'.padEnd(MAX_COLOR_CHARS + 2, '0'))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('too-large')
  })

  it.each(['blue', 'rgb', 'red-ish'])('rejects unrecognized input "%s"', (input) => {
    const result = parseColor(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('unrecognized')
      expect(result.message).toBe('Start with #hex, rgb(…), rgba(…), hsl(…), or hsla(…).')
    }
  })

  it('rejects a hex color with the wrong digit count', () => {
    const result = parseColor('#12345')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('malformed')
      expect(result.message).toBe('Hex colors expect exactly 3, 4, 6, or 8 digits.')
    }
  })

  it('rejects non-hex digits', () => {
    const result = parseColor('#gggggg')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('malformed')
      expect(result.message).toBe('Hex colors allow only 0-9 and a-f.')
    }
  })

  it.each(['rgb(1)', 'rgb(1,2)', 'rgb(1,2,3,4,5)'])(
    'rejects the wrong channel count in %s',
    (input) => {
      const result = parseColor(input)

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.kind).toBe('malformed')
    },
  )

  it.each(['rgb(355, 0, 0)', 'rgb(150%, 10%, 0%)'])('rejects out-of-range rgb channels in %s', (input) => {
    const result = parseColor(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('out-of-range')
      expect(result.message).toBe('RGB channels must be integers 0–255 or percentages 0–100%.')
    }
  })

  it.each(['hsl(0, 200%, 50%)', 'hsl(0, 50%, 150%)'])(
    'rejects out-of-range saturation or lightness in %s',
    (input) => {
      const result = parseColor(input)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.kind).toBe('out-of-range')
        expect(result.message).toBe('Saturation and lightness must be percentages 0–100%.')
      }
    },
  )

  it('requires percentages for saturation and lightness', () => {
    const result = parseColor('hsl(0, 50, 50)')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })

  it.each(['rgba(0,0,0,1.5)', 'rgba(0,0,0,150%)'])('rejects out-of-range alpha in %s', (input) => {
    const result = parseColor(input)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.kind).toBe('out-of-range')
      expect(result.message).toBe('Alpha must be between 0 and 1, or 0% and 100%.')
    }
  })

  it('rejects a mix of separators', () => {
    const result = parseColor('rgb(1, 2 3)')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })

  it('rejects an empty slash alpha', () => {
    const result = parseColor('rgb(1 2 3 / )')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })

  it('rejects a malformed alpha', () => {
    const result = parseColor('rgb(1 2 3 / 0.5 1)')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })

  it('rejects a non-numeric hue', () => {
    const result = parseColor('hsl(NaN, 0%, 0%)')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.kind).toBe('malformed')
  })
})

describe('round trips', () => {
  const SAMPLE_HEXES = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#808080', '#123456', '#abcdef', '#f0a1b2', '#336699']

  it('keeps rgb round-trips stable for a spread of colors', () => {
    for (const hex of SAMPLE_HEXES) {
      const original = colorOf(hex)
      expect(original).not.toBeNull()
      if (original === null) return

      const rewritten = colorOf(original.rgb)
      expect(rewritten).not.toBeNull()
      if (rewritten === null) return
      expect(rewritten.hex).toBe(original.hex)
    }
  })

  it('keeps hsl-to-rgb within one channel of the original across a hue sweep', () => {
    for (let hue = 0; hue < 360; hue += 30) {
      const input = `hsl(${hue}, 70%, 45%)`
      const color = colorOf(input)
      expect(color).not.toBeNull()
      if (color === null) return

      const rewritten = colorOf(color.hsl)
      expect(rewritten).not.toBeNull()
      if (rewritten === null) return
      withinTolerance(rewritten.r, color.r)
      withinTolerance(rewritten.g, color.g)
      withinTolerance(rewritten.b, color.b)
      withinTolerance(rewritten.h, color.h, 1)
    }
  })
})