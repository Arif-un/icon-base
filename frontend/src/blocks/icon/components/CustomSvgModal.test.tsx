import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CustomSvgModal from "./CustomSvgModal";

const el = React.createElement;

// sanitizeSvg + getUnsupportedSvgReason run for real (DOMPurify works under happy-dom, as the
// sibling svgUtils / fetchSvgContent suites already rely on).

function renderModal(overrides: Partial<React.ComponentProps<typeof CustomSvgModal>> = {}) {
  const props: React.ComponentProps<typeof CustomSvgModal> = {
    onInsert: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  return { ...render(<CustomSvgModal {...props} />), props };
}

function type(value: string) {
  fireEvent.change(screen.getByLabelText("SVG Markup"), { target: { value } });
}

afterEach(() => vi.clearAllMocks());

describe("CustomSvgModal", () => {
  it("shows the empty prompt and a disabled Insert with no input", () => {
    renderModal();

    expect(screen.getByText("Paste SVG markup to preview")).toBeInTheDocument();
    expect(screen.getByText("Insert").closest("button")).toBeDisabled();
  });

  it("parses viewBox dimensions and inserts the sanitized inner svg", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg viewBox="0 0 32 48"><path d="M0 0h1"/></svg>');

    const preview = document.querySelector("svg")!;
    expect(preview).toHaveAttribute("viewBox", "0 0 32 48");

    const insert = screen.getByText("Insert").closest("button")!;
    expect(insert).not.toBeDisabled();
    fireEvent.click(insert);

    expect(onInsert).toHaveBeenCalledOnce();
    const [svg, w, h] = onInsert.mock.calls[0];
    expect(svg).toContain("path");
    expect(w).toBe(32);
    expect(h).toBe(48);
  });

  it("falls back to width/height attrs when the viewBox is degenerate", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg viewBox="0 0 0 0" width="10" height="20"><path d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 10, 20, true);
  });

  it("uses width/height attrs when there is no viewBox at all", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg width="15" height="25"><path d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 15, 25, true);
  });

  it("parses width/height with unit suffixes when there is no viewBox", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg width="500pt" height="600pt"><path d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 500, 600, true);
  });

  it("ignores a child stroke-width when there is no root viewBox or width/height", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg><path stroke-width="2" d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 24, 24, true);
  });

  it("ignores a child element's width/height when the root svg has neither viewBox nor width/height", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg><rect width="8" height="8"/><path d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 24, 24, true);
  });

  it("defaults to 24x24 when neither viewBox nor width/height are present", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg><path d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 24, 24, true);
  });

  it("accepts markup without an <svg> wrapper via the inner-extraction fallback", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<path d="M0 0h1"/>');
    const insert = screen.getByText("Insert").closest("button")!;
    expect(insert).not.toBeDisabled();
    fireEvent.click(insert);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 24, 24, true);
  });

  it("rejects an SVG that embeds a raster image", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg viewBox="0 0 24 24"><image href="data:image/png;base64,AAAA"/></svg>');

    expect(screen.getByText("Unsupported SVG")).toBeInTheDocument();
    expect(screen.getByText(/embedded image/i)).toBeInTheDocument();

    const insert = screen.getByText("Insert").closest("button")!;
    expect(insert).toBeDisabled();
    // handleInsert is a no-op while invalid even if invoked directly.
    fireEvent.click(insert);
    expect(onInsert).not.toHaveBeenCalled();
  });

  it("rejects an SVG with no usable vector content", () => {
    renderModal();

    type('<svg viewBox="0 0 24 24"></svg>');

    expect(screen.getByText("Unsupported SVG")).toBeInTheDocument();
    expect(screen.getByText(/no usable vector content/i)).toBeInTheDocument();
    expect(screen.getByText("Insert").closest("button")).toBeDisabled();
  });

  it("calls onClose from the Cancel button", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByText("Cancel"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose from the modal close control", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    fireEvent.click(screen.getByLabelText("Close"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("defaults to insert mode: 'Insert Custom SVG' title, 'Insert' button, normalize checked", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "Insert Custom SVG" })).toBeInTheDocument();
    expect(screen.getByText("Insert")).toBeInTheDocument();
    expect(screen.queryByText("Save")).toBeNull();
    expect(screen.getByLabelText("Normalize colors to theme color")).toBeChecked();
  });

  it("enters edit mode when initialSvg is provided: seeds textarea, 'Edit'/'Save' labels", () => {
    const initialSvg = '<svg viewBox="0 0 10 10"><path d="M0 0h1"/></svg>';
    renderModal({ initialSvg });

    expect(screen.getByLabelText("SVG Markup")).toHaveValue(initialSvg);
    expect(screen.getByRole("dialog", { name: "Edit Custom SVG" })).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.queryByText("Insert")).toBeNull();
  });

  it("preview normalizes colors to currentColor while the box is checked (WYSIWYG)", () => {
    renderModal();

    type('<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M0 0h1"/></svg>');

    const preview = document.querySelector("svg")!;
    expect(preview.innerHTML).toContain("currentColor");
    expect(preview.innerHTML).not.toContain("#FF0000");
  });

  it("preview keeps original colors after unchecking normalize", () => {
    renderModal();

    type('<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByLabelText("Normalize colors to theme color"));

    const preview = document.querySelector("svg")!;
    expect(preview.innerHTML).toContain("#FF0000");
    expect(preview.innerHTML).not.toContain("currentColor");
  });

  it("inserts with normalize=false after unchecking the normalize box", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert });

    type('<svg viewBox="0 0 24 24"><path d="M0 0h1"/></svg>');
    fireEvent.click(screen.getByLabelText("Normalize colors to theme color"));
    fireEvent.click(screen.getByText("Insert").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 24, 24, false);
  });

  it("honors initialNormalize=false: checkbox unchecked and Save forwards normalize=false", () => {
    const onInsert = vi.fn();
    renderModal({
      onInsert,
      initialSvg: '<svg viewBox="0 0 24 24"><path d="M0 0h1"/></svg>',
      initialNormalize: false,
    });

    expect(screen.getByLabelText("Normalize colors to theme color")).not.toBeChecked();
    fireEvent.click(screen.getByText("Save").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("path"), 24, 24, false);
  });

  it("locks the normalize checkbox when editing an already-normalized SVG (colors are gone)", () => {
    renderModal({
      initialSvg: '<svg viewBox="0 0 24 24"><path d="M0 0h1"/></svg>',
      initialNormalize: true,
    });

    const checkbox = screen.getByLabelText("Normalize colors to theme color");
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest("label")).toHaveAttribute(
      "data-help",
      expect.stringContaining("can't be reverted"),
    );
  });

  it("keeps the normalize checkbox editable when editing a non-normalized SVG", () => {
    renderModal({
      initialSvg: '<svg viewBox="0 0 24 24"><path d="M0 0h1"/></svg>',
      initialNormalize: false,
    });

    expect(screen.getByLabelText("Normalize colors to theme color")).not.toBeDisabled();
  });

  it("keeps the normalize checkbox editable in insert mode", () => {
    renderModal();

    expect(screen.getByLabelText("Normalize colors to theme color")).not.toBeDisabled();
  });

  it("forwards edited markup from the seeded textarea on Save", () => {
    const onInsert = vi.fn();
    renderModal({ onInsert, initialSvg: '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>' });

    type('<svg viewBox="0 0 48 60"><rect x="1" y="1"/></svg>');
    fireEvent.click(screen.getByText("Save").closest("button")!);

    expect(onInsert).toHaveBeenCalledWith(expect.stringContaining("rect"), 48, 60, true);
  });

  // The Insert button is disabled while invalid, so its onClick normally can't fire. Override the
  // Button mock to ignore `disabled` and re-import a fresh module to prove handleInsert's own
  // `!isValid` guard also refuses to insert.
  it("guards handleInsert against invalid input independently of the disabled button", async () => {
    const wp = (window as unknown as { wp: { components: Record<string, unknown> } }).wp;
    const origButton = wp.components.Button;
    wp.components.Button = ({ children, onClick }: { children: unknown; onClick?: () => void }) =>
      el("button", { onClick }, children as React.ReactNode);
    vi.resetModules();
    try {
      const Fresh = (await import("./CustomSvgModal")).default;
      const onInsert = vi.fn();
      render(<Fresh onInsert={onInsert} onClose={vi.fn()} />);

      fireEvent.change(screen.getByLabelText("SVG Markup"), {
        target: { value: '<svg viewBox="0 0 24 24"></svg>' },
      });
      fireEvent.click(screen.getByText("Insert"));

      expect(onInsert).not.toHaveBeenCalled();
    } finally {
      wp.components.Button = origButton;
    }
  });
});
