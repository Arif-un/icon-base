import { describe, expect, it } from "vitest";

import type { IconBlockAttributes } from "../types";
import {
  getContainerClasses,
  getContainerStyles,
  getSpacingStyles,
  getWrapperClasses,
  getWrapperStyles,
} from "./blockStyles";

function attrs(overrides: Partial<IconBlockAttributes> = {}): IconBlockAttributes {
  return {
    svgContent: "",
    iconId: 0,
    iconName: "",
    iconFilename: "",
    librarySlug: "",
    libraryDir: "",
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

describe("getWrapperClasses", () => {
  it("returns empty string when no justification is set", () => {
    expect(getWrapperClasses(attrs())).toBe("");
  });

  it("includes justification class when set", () => {
    expect(getWrapperClasses(attrs({ itemsJustification: "center" }))).toContain(
      "items-justified-center",
    );
  });
});

describe("getContainerClasses", () => {
  it("always includes icon-container base class", () => {
    expect(getContainerClasses(attrs())).toContain("icon-container");
  });

  it("adds has-icon-color for preset iconColor", () => {
    const classes = getContainerClasses(attrs({ iconColor: "primary" }));
    expect(classes).toContain("has-icon-color");
    expect(classes).toContain("has-primary-color");
  });

  it("adds has-icon-color for customIconColor without preset class", () => {
    const classes = getContainerClasses(attrs({ customIconColor: "#ff0000" }));
    expect(classes).toContain("has-icon-color");
    expect(classes).not.toContain("has--color");
  });

  it("adds background classes for preset gradient", () => {
    const classes = getContainerClasses(attrs({ gradient: "vivid-cyan-blue-to-vivid-purple" }));
    expect(classes).toContain("has-icon-background-color");
    expect(classes).toContain("has-background-gradient");
    expect(classes).toContain("has-vivid-cyan-blue-to-vivid-purple-gradient-background");
  });

  it("adds has-hover-scale for scale hover effect", () => {
    expect(getContainerClasses(attrs({ hoverEffect: "scale" }))).toContain("has-hover-scale");
  });

  it("adds has-hover-opacity for opacity hover effect", () => {
    expect(getContainerClasses(attrs({ hoverEffect: "opacity" }))).toContain("has-hover-opacity");
  });
});

describe("getContainerStyles", () => {
  it("returns color CSS var for preset iconColor", () => {
    const styles = getContainerStyles(attrs({ iconColor: "primary" }));
    expect(styles.color).toBe("var(--wp--preset--color--primary)");
  });

  it("returns raw value for customIconColor", () => {
    const styles = getContainerStyles(attrs({ customIconColor: "#ff0000" }));
    expect(styles.color).toBe("#ff0000");
  });

  it("returns rotate CSS var when rotate is non-zero", () => {
    const styles = getContainerStyles(attrs({ rotate: 90 }));
    expect(styles["--ib-rotate"]).toBe("90deg");
  });

  it("returns flip-x CSS var when flipHorizontal is true", () => {
    const styles = getContainerStyles(attrs({ flipHorizontal: true }));
    expect(styles["--ib-flip-x"]).toBe("-1");
  });

  it("returns flip-y CSS var when flipVertical is true", () => {
    const styles = getContainerStyles(attrs({ flipVertical: true }));
    expect(styles["--ib-flip-y"]).toBe("-1");
  });

  it("returns stroke-width CSS var when strokeWidth differs from default", () => {
    const styles = getContainerStyles(attrs({ strokeWidth: 2 }));
    expect(styles["--icon-stroke-width"]).toBe("2");
  });

  it("omits stroke-width CSS var when strokeWidth is the default 1.5", () => {
    const styles = getContainerStyles(attrs({ strokeWidth: 1.5 }));
    expect(styles["--icon-stroke-width"]).toBeUndefined();
  });

  it("returns a preset gradient background var", () => {
    const styles = getContainerStyles(attrs({ gradient: "cool" }));
    expect(styles.background).toBe("var(--wp--preset--gradient--cool)");
  });

  it("returns a custom gradient background verbatim", () => {
    const styles = getContainerStyles(attrs({ customGradient: "linear-gradient(#000,#fff)" }));
    expect(styles.background).toBe("linear-gradient(#000,#fff)");
  });

  it("returns a preset background color var", () => {
    const styles = getContainerStyles(attrs({ iconBackgroundColor: "accent" }));
    expect(styles.backgroundColor).toBe("var(--wp--preset--color--accent)");
  });

  it("returns a custom background color verbatim", () => {
    const styles = getContainerStyles(attrs({ customIconBackgroundColor: "#abcdef" }));
    expect(styles.backgroundColor).toBe("#abcdef");
  });
});

describe("getWrapperStyles", () => {
  it("centers by default", () => {
    const styles = getWrapperStyles(attrs());
    expect(styles.justifyContent).toBe("center");
    expect(styles.display).toBe("flex");
  });

  it("maps justification keywords to flex values", () => {
    expect(getWrapperStyles(attrs({ itemsJustification: "left" })).justifyContent).toBe("flex-start");
    expect(getWrapperStyles(attrs({ itemsJustification: "right" })).justifyContent).toBe("flex-end");
  });
});

describe("getContainerClasses (color and background)", () => {
  it("adds background color classes for a preset background color", () => {
    const classes = getContainerClasses(attrs({ iconBackgroundColor: "accent" }));
    expect(classes).toContain("has-icon-background-color");
    expect(classes).toContain("has-accent-background-color");
  });

  it("adds has-icon-background-color for a custom background color", () => {
    const classes = getContainerClasses(attrs({ customIconBackgroundColor: "#123456" }));
    expect(classes).toContain("has-icon-background-color");
  });

  it("adds has-hover-color for the color hover effect", () => {
    expect(getContainerClasses(attrs({ hoverEffect: "color" }))).toContain("has-hover-color");
  });
});

describe("getSpacingStyles", () => {
  it("returns an empty object when there is no spacing style", () => {
    expect(getSpacingStyles(attrs())).toEqual({});
  });

  it("converts padding preset vars and passes raw values through", () => {
    const styles = getSpacingStyles(
      attrs({
        style: { spacing: { padding: { top: "var:preset|spacing|80", left: "10px" } } },
      }),
    );
    expect(styles.paddingTop).toBe("var(--wp--preset--spacing--80)");
    expect(styles.paddingLeft).toBe("10px");
  });

  it("converts margin values on all sides", () => {
    const styles = getSpacingStyles(
      attrs({
        style: { spacing: { margin: { top: "1px", right: "2px", bottom: "3px", left: "4px" } } },
      }),
    );
    expect(styles).toMatchObject({
      marginTop: "1px",
      marginRight: "2px",
      marginBottom: "3px",
      marginLeft: "4px",
    });
  });
});
