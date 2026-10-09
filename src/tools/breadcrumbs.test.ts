import { describe, expect, it } from 'vitest'

import { buildToolBreadcrumbs } from './breadcrumbs'
import { findCategory } from './categories'
import { findTool, tools } from './registry'

describe('buildToolBreadcrumbs', () => {
  it('returns an empty trail for an id that is not registered', () => {
    expect(buildToolBreadcrumbs('not-a-tool')).toEqual([])
  })

  it('returns an empty trail for an empty id', () => {
    expect(buildToolBreadcrumbs('')).toEqual([])
  })

  it('returns an empty trail for an id with different casing', () => {
    expect(buildToolBreadcrumbs('JSON-Formatter')).toEqual([])
  })

  it('builds Home, category, then the current tool', () => {
    const items = buildToolBreadcrumbs('json-formatter')

    expect(items).toHaveLength(3)
    expect(items[0]).toEqual({ label: 'Home', to: '/' })
    expect(items[2]).toEqual({ label: 'JSON Formatter' })
  })

  it('takes the category step from category metadata rather than a hardcoded name', () => {
    const category = findCategory('data')
    const items = buildToolBreadcrumbs('json-formatter')

    expect(category).toBeDefined()
    expect(items[1]).toEqual({ label: category?.label, to: '/category/data' })
    expect(items[1]?.to).toBe('/category/data')
  })

  it('takes the tool step from the registry', () => {
    const tool = findTool('uuid-generator')
    const items = buildToolBreadcrumbs('uuid-generator')

    expect(items[2]).toEqual({ label: tool?.name })
    expect(items[2]).not.toHaveProperty('to')
  })

  it('leaves the last step without a destination so it is not a self link', () => {
    for (const tool of tools) {
      const items = buildToolBreadcrumbs(tool.id)
      const last = items[items.length - 1]

      expect(last?.to, `${tool.id} current step`).toBeUndefined()
      expect(last?.label, `${tool.id} current step`).toBe(tool.name)
    }
  })

  it('links every earlier step to the right route', () => {
    for (const tool of tools) {
      const items = buildToolBreadcrumbs(tool.id)

      expect(
        items.map((item) => item.to),
        tool.id,
      ).toEqual(['/', `/category/${tool.category}`, undefined])
    }
  })

  it('never returns a step with an empty label', () => {
    for (const tool of tools) {
      for (const item of buildToolBreadcrumbs(tool.id)) {
        expect(item.label.trim().length, `${tool.id} step`).toBeGreaterThan(0)
      }
    }
  })

  it('never throws, whatever id it is handed', () => {
    const ids = ['../../etc/passwd', 'a'.repeat(500), '   ', '?', ' {']

    for (const id of ids) {
      expect(() => buildToolBreadcrumbs(id), id).not.toThrow()
      expect(buildToolBreadcrumbs(id), id).toEqual([])
    }
  })
})
