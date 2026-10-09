import { describe, expect, it } from 'vitest'

import { TOOL_CATEGORIES } from './categories'
import { categoriesWithTools, countToolsByCategory, findTool, tools, toolsInCategory } from './registry'

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe('registry invariants', () => {
  it('gives every tool a unique id', () => {
    const ids = tools.map((tool) => tool.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses kebab-case ids so URLs stay predictable', () => {
    for (const tool of tools) {
      expect(tool.id, `${tool.id} should be kebab-case`).toMatch(KEBAB_CASE)
    }
  })

  it('gives every tool a name and a description', () => {
    for (const tool of tools) {
      expect(tool.name.trim().length, `${tool.id} name`).toBeGreaterThan(0)
      expect(tool.description.trim().length, `${tool.id} description`).toBeGreaterThan(0)
    }
  })

  it('gives every tool an icon and a lazy component', () => {
    for (const tool of tools) {
      expect(tool.icon, `${tool.id} icon`).toBeTruthy()
      expect(tool.component, `${tool.id} component`).toBeTruthy()
    }
  })

  it('assigns every tool a category that has a descriptor', () => {
    const known = new Set(TOOL_CATEGORIES.map((category) => category.id))

    for (const tool of tools) {
      expect(known.has(tool.category), `${tool.id} -> ${tool.category}`).toBe(true)
    }
  })

  it('leaves no category without a descriptor', () => {
    const used = new Set(tools.map((tool) => tool.category))

    for (const id of used) {
      expect(TOOL_CATEGORIES.some((category) => category.id === id), id).toBe(true)
    }
  })
})

describe('tool keywords', () => {
  it('gives every tool at least one keyword so search has a field to match', () => {
    for (const tool of tools) {
      expect(tool.keywords.length, `${tool.id} keywords`).toBeGreaterThan(0)
    }
  })

  it('keeps keywords lowercase, trimmed, and free of duplicates', () => {
    for (const tool of tools) {
      for (const keyword of tool.keywords) {
        expect(keyword, `${tool.id}: "${keyword}" should be lowercase`).toBe(keyword.toLowerCase())
        expect(keyword, `${tool.id}: "${keyword}" should be trimmed`).toBe(keyword.trim())
        expect(keyword.length, `${tool.id}: "${keyword}" should not be empty`).toBeGreaterThan(0)
      }

      const unique = new Set(tool.keywords)
      expect(unique.size, `${tool.id} has duplicate keywords`).toBe(tool.keywords.length)
    }
  })

  it('does not repeat the tool name as a keyword', () => {
    for (const tool of tools) {
      const name = tool.name.toLowerCase()

      expect(tool.keywords).not.toContain(name)
    }
  })
})

describe('findTool', () => {
  it('resolves a registered tool', () => {
    expect(findTool('json-formatter')?.name).toBe('JSON Formatter')
  })

  it('returns undefined for an unknown id', () => {
    expect(findTool('not-a-tool')).toBeUndefined()
  })

  it('returns undefined for an undefined id', () => {
    expect(findTool(undefined)).toBeUndefined()
  })

  it('returns undefined for an empty id', () => {
    expect(findTool('')).toBeUndefined()
  })

  it('is not case insensitive, so a bad URL cannot resolve a real tool', () => {
    expect(findTool('JSON-Formatter')).toBeUndefined()
  })
})

describe('toolsInCategory', () => {
  it('returns only tools from the requested category', () => {
    const result = toolsInCategory('data')

    expect(result.length).toBeGreaterThan(0)
    for (const tool of result) {
      expect(tool.category).toBe('data')
    }
  })

  it('preserves catalog order', () => {
    const result = toolsInCategory('converters')
    const expected = tools.filter((tool) => tool.category === 'converters')

    expect(result.map((tool) => tool.id)).toEqual(expected.map((tool) => tool.id))
  })

  it('returns only developer tools for the developer category', () => {
    const result = toolsInCategory('developer')

    expect(result.length).toBe(3)
    for (const tool of result) {
      expect(tool.category).toBe('developer')
    }
  })
})

describe('countToolsByCategory', () => {
  it('counts every category, including empty ones', () => {
    const counts = countToolsByCategory()

    expect(counts.size).toBe(TOOL_CATEGORIES.length)
    expect(counts.get('developer')).toBe(3)
    expect(counts.get('encoding')).toBe(4)
    expect(counts.get('data')).toBe(1)
    expect(counts.get('generators')).toBe(3)
    expect(counts.get('converters')).toBe(3)
  })

  it('totals the whole catalog', () => {
    const total = [...countToolsByCategory().values()].reduce((sum, count) => sum + count, 0)

    expect(total).toBe(tools.length)
  })

  it('keeps counts consistent with toolsInCategory', () => {
    const counts = countToolsByCategory()

    for (const category of TOOL_CATEGORIES) {
      expect(counts.get(category.id)).toBe(toolsInCategory(category.id).length)
    }
  })
})

describe('categoriesWithTools', () => {
  it('includes every populated category, so no dead heading is rendered', () => {
    const ids = categoriesWithTools().map((category) => category.id)

    expect(ids).toContain('developer')
    expect(ids).toContain('encoding')
    expect(ids).toContain('text')
  })

  it('keeps declared order', () => {
    const ids = categoriesWithTools().map((category) => category.id)
    const declared = TOOL_CATEGORIES.map((category) => category.id).filter((id) => ids.includes(id))

    expect(ids).toEqual(declared)
  })

  it('never advertises more tools than it holds', () => {
    const counts = countToolsByCategory()

    for (const category of categoriesWithTools()) {
      expect(counts.get(category.id) ?? 0).toBeGreaterThan(0)
    }
  })
})