const { Tooltip } = window.wp.components;

export const STROKE_HELP =
  "Not all icons have a stroke. The stroke control only affects icons that have a stroke specified.";

// Label for a stroke-width control: the text plus an info icon whose tooltip explains that the
// control only affects icons that actually have a stroke. Returns the element (not a component) so
// it can be passed straight as a control's `label` and flattened to plain text by label matchers.
export function strokeLabel(text = "Stroke") {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      {text}
      <Tooltip text={STROKE_HELP}>
        <span
          className="dashicons dashicons-info-outline"
          style={{ fontSize: 16, width: 16, height: 16, cursor: "help" }}
          aria-label={STROKE_HELP}
        />
      </Tooltip>
    </span>
  );
}
