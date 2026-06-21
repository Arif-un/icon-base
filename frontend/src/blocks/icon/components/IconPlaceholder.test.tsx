import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import IconPlaceholder from "./IconPlaceholder";

describe("IconPlaceholder", () => {
  it("renders Browse Icon, Media Library and Insert Custom SVG buttons", () => {
    render(
      <IconPlaceholder onBrowseIcon={vi.fn()} onMediaLibrary={vi.fn()} onCustomSvg={vi.fn()} />,
    );

    expect(screen.getByText("Browse Icon")).toBeInTheDocument();
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("Insert Custom SVG")).toBeInTheDocument();
  });

  it("calls onBrowseIcon when Browse Icon is clicked", () => {
    const onBrowseIcon = vi.fn();
    render(
      <IconPlaceholder
        onBrowseIcon={onBrowseIcon}
        onMediaLibrary={vi.fn()}
        onCustomSvg={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Browse Icon"));

    expect(onBrowseIcon).toHaveBeenCalledOnce();
  });

  it("calls onMediaLibrary when Media Library is clicked", () => {
    const onMediaLibrary = vi.fn();
    render(
      <IconPlaceholder
        onBrowseIcon={vi.fn()}
        onMediaLibrary={onMediaLibrary}
        onCustomSvg={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("Media Library"));

    expect(onMediaLibrary).toHaveBeenCalledOnce();
  });

  it("calls onCustomSvg when Insert Custom SVG is clicked", () => {
    const onCustomSvg = vi.fn();
    render(
      <IconPlaceholder onBrowseIcon={vi.fn()} onMediaLibrary={vi.fn()} onCustomSvg={onCustomSvg} />,
    );

    fireEvent.click(screen.getByText("Insert Custom SVG"));

    expect(onCustomSvg).toHaveBeenCalledOnce();
  });
});
