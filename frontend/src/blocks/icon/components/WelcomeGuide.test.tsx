import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import WelcomeGuide from "./WelcomeGuide";

describe("WelcomeGuide", () => {
  it("labels the dialog for assistive technology", () => {
    render(<WelcomeGuide onFinish={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveAttribute(
      "aria-label",
      "Welcome to the Icon Indexa block",
    );
  });

  it("covers choosing, styling and linking an icon", () => {
    render(<WelcomeGuide onFinish={vi.fn()} />);

    expect(screen.getByText("Icons, without the hunt")).toBeInTheDocument();
    expect(screen.getByText("Three ways to choose")).toBeInTheDocument();
    expect(screen.getByText("Style it in the sidebar")).toBeInTheDocument();
    expect(screen.getByText("Finish up in the toolbar")).toBeInTheDocument();
  });

  it("calls onFinish when the guide is completed", () => {
    const onFinish = vi.fn();
    render(<WelcomeGuide onFinish={onFinish} />);

    fireEvent.click(screen.getByText("Get started"));

    expect(onFinish).toHaveBeenCalledOnce();
  });
});
