import { expect, fn, userEvent, within } from '@storybook/test'
import type { Meta, StoryObj } from '@storybook/react'

import IconPlaceholder from './IconPlaceholder'

const meta: Meta<typeof IconPlaceholder> = {
  title: 'Block/IconPlaceholder',
  component: IconPlaceholder,
  args: {
    onBrowseIcon: fn(),
    onMediaLibrary: fn(),
    onCustomSvg: fn(),
  },
}

export default meta
type Story = StoryObj<typeof IconPlaceholder>

export const Default: Story = {}

export const BrowseIconClick: Story = {
  name: 'Interaction: Browse Icon click',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Browse Icon'))
    await expect(args.onBrowseIcon).toHaveBeenCalledOnce()
  },
}

export const MediaLibraryClick: Story = {
  name: 'Interaction: Media Library click',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Media Library'))
    await expect(args.onMediaLibrary).toHaveBeenCalledOnce()
  },
}

export const CustomSvgClick: Story = {
  name: 'Interaction: Insert Custom SVG click',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('Insert Custom SVG'))
    await expect(args.onCustomSvg).toHaveBeenCalledOnce()
  },
}
