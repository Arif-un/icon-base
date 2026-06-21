---
name: review-block
description: >-
  Review Gutenberg block code for WordPress standards compliance, component reuse,
  and best practices. Use when user says "review block", "review-block", "check block code",
  "audit block", or wants to verify block code follows WordPress patterns. Checks:
  (1) @wordpress/components usage over custom UI, (2) useBlockProps/BlockControls/InspectorControls
  proper usage, (3) @wordpress/i18n for all user-facing strings, (4) @wordpress/data/useSetting
  over raw API calls, (5) block.json API v3 schema compliance, (6) accessibility (aria, keyboard,
  screen reader), (7) security (nonce, sanitization, escaping), (8) reuse of existing shared
  components/hooks/utils instead of duplication.
---

# Review Block

Review Gutenberg block code in `frontend/src/blocks/icon/` against WordPress standards and project conventions.

## Target Selection

1. Run `git diff --name-only` and `git diff --cached --name-only`
2. Filter for files under `frontend/src/blocks/`
3. If block files found in diff → review only those files
4. If no uncommitted block changes → review entire `frontend/src/blocks/icon/` directory

## Before Reviewing

Read [references/shared-code-map.md](references/shared-code-map.md) to load the inventory of all existing shared code (hooks, helpers, components, utils, types). This is required for duplication detection.

## Review Dimensions

Check every file against all 8 dimensions. Report findings as a list with severity.

### 1. WordPress Components (critical)

- Must use `@wordpress/components` (Button, Modal, Popover, Spinner, SearchControl, PanelBody, SelectControl, TextControl, RangeControl, ColorPicker, ToolbarButton, ToolbarGroup) instead of custom implementations
- No custom modal/popover/button when WP equivalent exists
- Flag: custom `<dialog>`, custom dropdown, custom tooltip, hand-rolled spinner

### 2. Block Editor APIs (critical)

- `useBlockProps()` must wrap edit and save root elements
- `BlockControls` for toolbar items
- `InspectorControls` for sidebar settings
- `useSetting()` for theme settings (colors, gradients, spacing)
- `useBlockProps.save()` in save component
- Flag: inline styles on root element without useBlockProps, toolbar items outside BlockControls

### 3. Internationalization (warning)

- All user-facing strings must use `__()` or `_n()` from `@wordpress/i18n`
- Text domain must be consistent
- `sprintf()` for interpolated strings, never template literals for user text
- Flag: bare string literals in JSX, `aria-label` without `__()`, placeholder text without `__()`

### 4. Data Layer (warning)

- Use `useSetting()` for theme data (colors, gradients, font sizes)
- Use `restRequest()` from `common/helpers/restRequest.ts` for API calls
- Use existing React Query hooks (`useIcons`, `useLibraries`, `useIconTypes`) for data fetching
- Flag: raw `fetch()` or `XMLHttpRequest`, direct `wp.apiFetch` without the project wrapper, duplicated query logic

### 5. block.json Schema (critical)

- Must follow Gutenberg Block API v3 format
- Required fields: apiVersion, name, title, category, attributes, supports
- Attributes must have proper type definitions
- `editorScript`, `editorStyle`, `style` fields properly set
- Flag: missing apiVersion 3, attributes without types, missing supports field

### 6. Accessibility (warning)

- Interactive elements need `aria-label` (translated with `__()`)
- Decorative SVGs need `aria-hidden="true"`
- Icon buttons need accessible names
- Keyboard navigation: focusable elements, keyboard event handlers for custom interactions
- Color contrast consideration for custom UI
- Flag: clickable div without role/tabIndex, SVG without aria-hidden, button without accessible name

### 7. Security (critical)

- SVG content must be sanitized (DOMPurify via `sanitizeSvg()`)
- URLs validated with `isSafeUrl()` before rendering
- Nonces included in API requests (handled by `restRequest`)
- No `dangerouslySetInnerHTML` without prior sanitization
- Path segments sanitized with `sanitizePathSegment()`
- Flag: unsanitized innerHTML, raw URL rendering, missing nonce, unescaped user input

### 8. Code Reuse (info → warning)

- Check against shared-code-map.md for existing utilities
- Flag if code duplicates existing hooks, helpers, components, or utils
- Suggest extraction when same pattern appears 2+ times across components
- Severity escalates to **warning** when duplicating security-related code (sanitization, nonce handling)

Common duplication patterns to watch:
- Custom debounce → use `useDebounce` hook
- Manual fetch with nonces → use `restRequest`
- SVG sanitization logic → use `sanitizeSvg()` / `stripSvgColors()`
- Icon rendering logic → use `IconRender` component
- Style/class generation → use `blockStyles.ts` utilities
- Media library integration → use `openMediaLibrary()`
- i18n wrapper → use `i18nWrap.ts`

## Output Format

```
## Block Review: [target description]

### Critical
- **[Dimension]** `file:line` — [issue]. Fix: [suggestion]

### Warning
- **[Dimension]** `file:line` — [issue]. Fix: [suggestion]

### Info
- **[Dimension]** `file:line` — [issue]. Suggestion: [improvement]

### Summary
- X critical, Y warnings, Z info findings
- [one-line overall assessment]
```

Group findings by severity, then by dimension within each group. Include file path and line number for every finding. Always provide actionable fix suggestion.

## Extraction Suggestions

When flagging duplication or repeated patterns, provide concrete extraction guidance:

```
**Extract opportunity**: `ComponentA.tsx:45` and `ComponentB.tsx:23` both implement [pattern].
→ Extract to `common/hooks/useX.ts` or `blocks/icon/utils/x.ts`
→ Signature: `function useX(param: Type): ReturnType`
```
