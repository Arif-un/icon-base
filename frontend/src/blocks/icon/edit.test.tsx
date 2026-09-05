import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Edit } from "./edit";
import type { IconBlockAttributes } from "./types";
import { openMediaLibrary } from "./utils/openMediaLibrary";
import { stripSvgColors } from "./utils/svgUtils";

// Isolate edit.tsx: stub the heavy picker/inspector children and the media helper so the
// only real logic under test is EditInner's state wiring and the setAttributes handlers.
vi.mock("./components/InspectorSettings", () => ({
  default: () => <div data-testid="inspector-settings" />,
}));

vi.mock("./components/ToolbarControls", () => ({
  default: (props: { isSelected: boolean }) => (
    <div data-testid="toolbar-controls" data-selected={String(props.isSelected)} />
  ),
}));

vi.mock("./components/BlockIconPreview", () => ({
  default: () => <div data-testid="block-icon-preview" />,
}));

const POPOVER_ICON = {
  svgContent: '<path d="M1 1"/>',
  iconId: 7,
  iconName: "star",
  iconFilename: "star.svg",
  librarySlug: "lib",
  libraryDir: "003-lib",
  iconWidth: 20,
  iconHeight: 20,
};

const MODAL_ICON = {
  svgContent: '<path d="M2 2"/>',
  iconId: 9,
  iconName: "heart",
  iconFilename: "heart.svg",
  librarySlug: "lib2",
  libraryDir: "004-lib2",
  iconWidth: 32,
  iconHeight: 32,
};

vi.mock("./components/IconPickerPopover", () => ({
  default: (props: {
    onSelectIcon: (d: typeof POPOVER_ICON) => void;
    onExpand: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="icon-picker-popover">
      <button onClick={() => props.onSelectIcon(POPOVER_ICON)}>popover-select</button>
      <button onClick={props.onExpand}>popover-expand</button>
      <button onClick={props.onClose}>popover-close</button>
    </div>
  ),
}));

vi.mock("./components/IconPickerModal", () => ({
  default: (props: { onSelectIcon: (d: typeof MODAL_ICON) => void; onClose: () => void }) => (
    <div data-testid="icon-picker-modal">
      <button onClick={() => props.onSelectIcon(MODAL_ICON)}>modal-select</button>
      <button onClick={props.onClose}>modal-close</button>
    </div>
  ),
}));

vi.mock("./components/CustomSvgModal", () => ({
  default: (props: {
    onInsert: (svg: string, w: number, h: number) => void;
    onClose: () => void;
  }) => (
    <div data-testid="custom-svg-modal">
      <button onClick={() => props.onInsert("<rect/>", 40, 50)}>custom-insert</button>
      <button onClick={props.onClose}>custom-close</button>
    </div>
  ),
}));

vi.mock("./utils/openMediaLibrary", () => ({ openMediaLibrary: vi.fn() }));

const openMediaLibraryMock = vi.mocked(openMediaLibrary);

function attrs(overrides: Partial<IconBlockAttributes> = {}): IconBlockAttributes {
  return {
    svgContent: '<path d="M12 2L2 22h20L12 2z"/>',
    iconId: 1,
    iconName: "triangle",
    iconFilename: "triangle.svg",
    librarySlug: "test",
    libraryDir: "test",
    width: "48px",
    height: "",
    strokeWidth: 1.5,
    iconColor: "",
    customIconColor: "",
    iconBackgroundColor: "",
    customIconBackgroundColor: "",
    gradient: "",
    customGradient: "",
    iconWidth: 24,
    iconHeight: 24,
    rotate: 0,
    flipHorizontal: false,
    flipVertical: false,
    linkUrl: "",
    linkTarget: "",
    linkRel: "",
    label: "",
    title: "",
    itemsJustification: "",
    hoverEffect: "none",
    ...overrides,
  };
}

function renderEdit(overrides: Partial<IconBlockAttributes> = {}, isSelected = true) {
  const setAttributes = vi.fn();
  const utils = render(
    <Edit attributes={attrs(overrides)} setAttributes={setAttributes} isSelected={isSelected} />,
  );

  return { setAttributes, ...utils };
}

// An empty svgContent means "no icon chosen yet" -> the placeholder branch.
const NO_ICON: Partial<IconBlockAttributes> = { svgContent: "" };

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe("Edit — no icon (placeholder branch)", () => {
  it("renders the placeholder and hides the icon UI when svgContent is empty", () => {
    renderEdit(NO_ICON);

    expect(screen.getByText("Browse Icon")).toBeInTheDocument();
    expect(screen.getByText("Media Library")).toBeInTheDocument();
    expect(screen.getByText("Insert Custom SVG")).toBeInTheDocument();
    expect(screen.queryByTestId("block-icon-preview")).toBeNull();
    expect(screen.queryByTestId("inspector-settings")).toBeNull();
    expect(screen.queryByTestId("icon-picker-popover")).toBeNull();
  });

  it("opens the picker popover from the placeholder Browse Icon button", () => {
    renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Browse Icon"));

    expect(screen.getByTestId("icon-picker-popover")).toBeInTheDocument();
  });

  it("selecting an icon in the popover strips colors and forwards icon data to setAttributes", () => {
    const { setAttributes } = renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Browse Icon"));
    fireEvent.click(screen.getByText("popover-select"));

    expect(setAttributes).toHaveBeenCalledWith({
      svgContent: stripSvgColors(POPOVER_ICON.svgContent),
      iconId: 7,
      iconName: "star",
      iconFilename: "star.svg",
      librarySlug: "lib",
      libraryDir: "003-lib",
      iconWidth: 20,
      iconHeight: 20,
    });
  });

  it("closes the popover via its onClose callback", () => {
    renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Browse Icon"));
    expect(screen.getByTestId("icon-picker-popover")).toBeInTheDocument();

    fireEvent.click(screen.getByText("popover-close"));
    expect(screen.queryByTestId("icon-picker-popover")).toBeNull();
  });

  it("expands the popover into the full modal", () => {
    renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Browse Icon"));
    fireEvent.click(screen.getByText("popover-expand"));

    expect(screen.queryByTestId("icon-picker-popover")).toBeNull();
    expect(screen.getByTestId("icon-picker-modal")).toBeInTheDocument();
  });

  it("selecting an icon in the modal forwards data to setAttributes", () => {
    const { setAttributes } = renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Browse Icon"));
    fireEvent.click(screen.getByText("popover-expand"));
    fireEvent.click(screen.getByText("modal-select"));

    expect(setAttributes).toHaveBeenCalledWith({
      svgContent: stripSvgColors(MODAL_ICON.svgContent),
      iconId: 9,
      iconName: "heart",
      iconFilename: "heart.svg",
      librarySlug: "lib2",
      libraryDir: "004-lib2",
      iconWidth: 32,
      iconHeight: 32,
    });
  });

  it("closes the modal via its onClose callback", () => {
    renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Browse Icon"));
    fireEvent.click(screen.getByText("popover-expand"));
    expect(screen.getByTestId("icon-picker-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("modal-close"));
    expect(screen.queryByTestId("icon-picker-modal")).toBeNull();
  });

  it("opens the media library and applies the fetched SVG on success", () => {
    const { setAttributes } = renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Media Library"));
    expect(openMediaLibraryMock).toHaveBeenCalledOnce();

    const onSuccess = openMediaLibraryMock.mock.calls[0][0];
    act(() => onSuccess("<circle/>", 30, 40));

    expect(setAttributes).toHaveBeenCalledWith({
      svgContent: stripSvgColors("<circle/>"),
      iconId: 0,
      iconName: "",
      iconFilename: "",
      librarySlug: "",
      libraryDir: "",
      iconWidth: 30,
      iconHeight: 40,
    });
  });

  it("dispatches an error snackbar notice when the media library reports an error", () => {
    const createNotice = vi.fn();
    const dispatchSpy = vi.spyOn(window.wp.data, "dispatch").mockReturnValue({ createNotice });

    renderEdit(NO_ICON);
    fireEvent.click(screen.getByText("Media Library"));

    const onError = openMediaLibraryMock.mock.calls[0][1];
    act(() => onError("Selected file is not an SVG."));

    expect(dispatchSpy).toHaveBeenCalledWith("core/notices");
    expect(createNotice).toHaveBeenCalledWith("error", "Selected file is not an SVG.", {
      type: "snackbar",
      isDismissible: true,
    });
  });

  it("opens the custom SVG modal and inserts the sanitized SVG", () => {
    const { setAttributes } = renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Insert Custom SVG"));
    expect(screen.getByTestId("custom-svg-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByText("custom-insert"));

    expect(setAttributes).toHaveBeenCalledWith({
      svgContent: stripSvgColors("<rect/>"),
      iconId: 0,
      iconName: "",
      iconFilename: "",
      librarySlug: "",
      libraryDir: "",
      iconWidth: 40,
      iconHeight: 50,
    });
    // insert closes the modal
    expect(screen.queryByTestId("custom-svg-modal")).toBeNull();
  });

  it("closes the custom SVG modal without inserting", () => {
    const { setAttributes } = renderEdit(NO_ICON);

    fireEvent.click(screen.getByText("Insert Custom SVG"));
    fireEvent.click(screen.getByText("custom-close"));

    expect(screen.queryByTestId("custom-svg-modal")).toBeNull();
    expect(setAttributes).not.toHaveBeenCalled();
  });
});

describe("Edit — has icon (preview + toolbar branch)", () => {
  it("renders inspector, toolbar and preview, not the placeholder", () => {
    renderEdit();

    expect(screen.getByTestId("inspector-settings")).toBeInTheDocument();
    expect(screen.getByTestId("toolbar-controls")).toBeInTheDocument();
    expect(screen.getByTestId("block-icon-preview")).toBeInTheDocument();
    // placeholder-only copy is absent
    expect(
      screen.queryByText("Choose icon from library or pick from media or insert custom SVG"),
    ).toBeNull();
  });

  it("passes isSelected through to ToolbarControls", () => {
    const { rerender, setAttributes } = renderEdit({}, false);
    expect(screen.getByTestId("toolbar-controls")).toHaveAttribute("data-selected", "false");

    rerender(<Edit attributes={attrs()} setAttributes={setAttributes} isSelected={true} />);
    expect(screen.getByTestId("toolbar-controls")).toHaveAttribute("data-selected", "true");
  });

  it("opens the popover from the Replace > Browse Icon toolbar control", () => {
    renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Browse Icon" }));

    expect(screen.getByTestId("icon-picker-popover")).toBeInTheDocument();
  });

  it("opens the media library from the Replace > Media Library toolbar control", () => {
    renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Media Library" }));

    expect(openMediaLibraryMock).toHaveBeenCalledOnce();
  });

  it("opens the custom SVG modal from the Replace > Insert Custom SVG toolbar control", () => {
    renderEdit();

    fireEvent.click(screen.getByRole("button", { name: "Insert Custom SVG" }));

    expect(screen.getByTestId("custom-svg-modal")).toBeInTheDocument();
  });
});

describe("Edit — block wrapper style", () => {
  it("strips padding/margin from the block props style but keeps other styles", () => {
    vi.spyOn(window.wp.blockEditor, "useBlockProps").mockImplementation((p: unknown) => ({
      ...(p as Record<string, unknown>),
      className: "cursor-pointer",
      style: {
        paddingTop: "5px",
        marginLeft: "3px",
        color: "rgb(255, 0, 0)",
      },
    }));

    const { container } = renderEdit();
    const wrapper = container.firstChild as HTMLElement;

    expect(wrapper).toHaveStyle({ color: "rgb(255, 0, 0)" });
    expect(wrapper).not.toHaveStyle({ paddingTop: "5px" });
    expect(wrapper).not.toHaveStyle({ marginLeft: "3px" });
  });
});
