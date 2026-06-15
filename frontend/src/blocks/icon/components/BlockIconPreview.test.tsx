import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import BlockIconPreview from './BlockIconPreview'

const SAMPLE_SVG_INNER = '<path d="M12 2L2 22h20L12 2z"/>'

function baseAttrs(overrides = {}) {
  return {
    svgContent: SAMPLE_SVG_INNER,
    iconId: 1,
    iconName: 'triangle',
    iconFilename: 'triangle.svg',
    librarySlug: 'test',
    libraryDir: 'test',
    width: '48px',
    height: '',
    strokeWidth: 1.5,
    iconColor: '',
    customIconColor: '',
    iconBackgroundColor: '',
    customIconBackgroundColor: '',
    gradient: '',
    customGradient: '',
    iconWidth: 24,
    iconHeight: 24,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    linkUrl: '',
    linkTarget: '',
    linkRel: '',
    label: '',
    title: '',
    itemsJustification: '',
    hoverEffect: 'none',
    ...overrides,
  } as any
}

describe('BlockIconPreview', () => {
  it('renders an SVG with the correct viewBox', () => {
    render(<BlockIconPreview attributes={baseAttrs({ iconWidth: 24, iconHeight: 24 })} />)
    const svg = screen.getByRole('img', { hidden: true })
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24')
  })

  it('sets aria-hidden when no label is provided', () => {
    render(<BlockIconPreview attributes={baseAttrs()} />)
    expect(screen.getByRole('img', { hidden: true })).toHaveAttribute('aria-hidden', 'true')
  })

  it('sets aria-label when label is provided', () => {
    render(<BlockIconPreview attributes={baseAttrs({ label: 'Warning icon' })} />)
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Warning icon')
  })

  it('applies custom width to SVG', () => {
    render(<BlockIconPreview attributes={baseAttrs({ width: '64px' })} />)
    const svg = screen.getByRole('img', { hidden: true })
    expect(svg).toHaveAttribute('width', '64px')
  })
})
