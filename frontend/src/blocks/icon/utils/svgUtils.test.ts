import { describe, expect, it } from 'vitest'

import { isSafeUrl, stripSvgColors, svgHasStrokes } from './svgUtils'

describe('stripSvgColors', () => {
  it('replaces hardcoded fill color with currentColor', () => {
    const result = stripSvgColors('<path fill="#FF0000" d="M0 0h24v24H0z"/>')
    expect(result).toContain('fill="currentColor"')
    expect(result).not.toContain('#FF0000')
  })

  it('preserves fill="none"', () => {
    const result = stripSvgColors('<path fill="none" d="M0 0h24v24H0z"/>')
    expect(result).toContain('fill="none"')
  })

  it('preserves fill="currentColor"', () => {
    const result = stripSvgColors('<path fill="currentColor" d="M0 0h24v24H0z"/>')
    expect(result).toContain('fill="currentColor"')
  })

  it('replaces hardcoded stroke color with currentColor', () => {
    const result = stripSvgColors('<path stroke="#0000FF" d="M0 0"/>')
    expect(result).toContain('stroke="currentColor"')
    expect(result).not.toContain('#0000FF')
  })

  it('strips inline fill from style attribute', () => {
    const result = stripSvgColors('<path style="fill: red; opacity: 0.5" d="M0 0"/>')
    expect(result).not.toContain('fill: red')
    expect(result).toContain('opacity')
  })

  it('removes XSS vectors via sanitization', () => {
    const result = stripSvgColors('<script>alert(1)</script><path d="M0 0"/>')
    expect(result).not.toContain('<script>')
    expect(result).not.toContain('alert')
  })
})

describe('svgHasStrokes', () => {
  it('returns true when a non-none stroke attribute is present', () => {
    expect(svgHasStrokes('<path stroke="currentColor" d="M0 0"/>')).toBe(true)
  })

  it('returns false when no stroke attribute exists', () => {
    expect(svgHasStrokes('<path fill="currentColor" d="M0 0"/>')).toBe(false)
  })

  it('returns false when stroke is "none"', () => {
    expect(svgHasStrokes('<path stroke="none" d="M0 0"/>')).toBe(false)
  })
})

describe('isSafeUrl', () => {
  it('allows https URLs', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
  })

  it('allows http URLs', () => {
    expect(isSafeUrl('http://example.com')).toBe(true)
  })

  it('allows relative paths', () => {
    expect(isSafeUrl('/about')).toBe(true)
  })

  it('allows anchor links', () => {
    expect(isSafeUrl('#section')).toBe(true)
  })

  it('allows mailto links', () => {
    expect(isSafeUrl('mailto:hello@example.com')).toBe(true)
  })

  it('rejects javascript: protocol', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isSafeUrl('')).toBe(false)
  })
})
