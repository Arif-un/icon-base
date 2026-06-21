import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";

import CustomSvgModal from "./CustomSvgModal";

const VALID_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>';

const meta: Meta<typeof CustomSvgModal> = {
  title: "Block/CustomSvgModal",
  component: CustomSvgModal,
  args: {
    onInsert: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CustomSvgModal>;

export const Empty: Story = {
  name: "Empty state",
};

export const InsertDisabledWhenEmpty: Story = {
  name: "Interaction: Insert button disabled until SVG is entered",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const insertBtn = canvas.getByText("Insert");
    await expect(insertBtn).toBeDisabled();
  },
};

export const PreviewUpdatesOnInput: Story = {
  name: "Interaction: Preview updates when SVG is typed",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole("textbox");

    await userEvent.type(textarea, VALID_SVG);

    // Insert button should now be enabled
    await expect(canvas.getByText("Insert")).toBeEnabled();
  },
};

export const InsertCallbackFired: Story = {
  name: "Interaction: onInsert called with SVG content on Insert click",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const textarea = canvas.getByRole("textbox");

    await userEvent.type(textarea, VALID_SVG);
    await userEvent.click(canvas.getByText("Insert"));

    await expect(args.onInsert).toHaveBeenCalledOnce();
    // First arg is the sanitized inner SVG content, not the full <svg> wrapper
    const [svgContent] = (args.onInsert as ReturnType<typeof fn>).mock.calls[0];
    await expect(svgContent).toContain("circle");
  },
};

export const CloseCallbackFired: Story = {
  name: "Interaction: onClose called when Cancel is clicked",
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Cancel"));
    await expect(args.onClose).toHaveBeenCalledOnce();
  },
};
