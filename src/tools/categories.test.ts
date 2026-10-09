import { describe, expect, it } from 'vitest'

import { findCategory, TOOL_CATEGORIES } from './categories'

describe('TOOL_CATEGORIES', () => {
  it('covers every category id exactly once', () => {
    const ids = TOOL_CATEGORIES.map((category) => category.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.length).toBeGreaterThan(0)
  })

  it('declares the approved V2 taxonomy', () => {
    expect(TOOL_CATEGORIES.map((category) => category.id)).toEqual([
      'encoding',
      'data',
      'text',
      'generators',
      'converters',
      'developer',
    ])
  })

  it('gives every category a label, description, and icon', () => {
    for (const category of TOOL_CATEGORIES) {
      expect(category.label.length, `${category.id} label`).toBeGreaterThan(0)
      expect(category.description.length, `${category.id} description`).toBeGreaterThan(0)
      expect(category.icon, `${category.id} icon`).toBeTruthy()
    }
  })

  it('uses unique labels so categories are distinguishable in the UI', () => {
    const labels = TOOL_CATEGORIES.map((category) => category.label.toLowerCase())

    expect(new Set(labels).size).toBe(labels.length)
  })

  it('has no duplicate descriptions', () => {
    const descriptions = TOOL_CATEGORIES.map((category) => category.description.toLowerCase())

    expect(new Set(descriptions).size).toBe(descriptions.length)
  })
})

describe('findCategory', () => {
  it('resolves a known category id', () => {
    const category = findCategory('data')

    expect(category?.label).toBe('Data & JSON')
  })

  it('returns undefined for an unknown id', () => {
    expect(findCategory('nope')).toBeUndefined()
  })

  it('returns undefined for an undefined id', () => {
    expect(findCategory(undefined)).toBeUndefined()
  })

  it('is case sensitive, so a bad route cannot silently match', () => {
    expect(findCategory('Data')).toBeUndefined()
  })

  it('does not match a prefix of a real id', () => {
    expect(findCategory('dat')).toBeUndefined()
  })
})