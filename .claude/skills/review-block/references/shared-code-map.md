# Shared Code Map — icon-base

Inventory of all reusable code. Review must check new code against this list for duplication.

---

## Hooks (`common/hooks/`)

| Hook | File | Purpose | Key Params |
|------|------|---------|------------|
| `useLibraries()` | `useLibraries.ts` | Fetch icon libraries via React Query | — |
| `useIconTypes()` | `useIconTypes.ts` | Fetch icon type categories via React Query | — |
| `useDebounce<T>(value, delayMs?)` | `useDebounce.ts` | Debounce state updates | `delayMs` default 300 |
| `useIcons(params?)` | `useIcons.ts` | Paginated icon search via React Query | `page, perPage, search, libraryIds, typeIds` |

## Helpers (`common/helpers/`)

| Function | File | Purpose |
|----------|------|---------|
| `restRequest<T>(endpoint, options?)` | `restRequest.ts` | REST API calls with WP nonces (X-WP-Nonce, X-Icon-Base-Nonce) |
| `RestRequestError` | `restRequest.ts` | Custom error class with status/data |
| `fetchSvgContent(rootUrl, libraryDir, filename, signal?)` | `fetchSvgContent.ts` | Fetch + cache SVG content |
| `sanitizePathSegment(segment)` | `fetchSvgContent.ts` | Sanitize path segments |
| `sanitizeSvg(raw)` | `fetchSvgContent.ts` | DOMPurify SVG sanitization |
| `getSvgCache(path)` | `fetchSvgContent.ts` | Retrieve cached SVG |
| `tryCatch<T>(promise)` | `tryCatch.ts` | Wrap promise in Result discriminated union |
| `request<T>(...)` | `request.ts` | AJAX request with WP nonces and action routing |
| `queryRequest<T>(...)` | `request.ts` | Raw AJAX request, throws on error |
| `proxyRequest<T>(data)` | `request.ts` | Proxy/route action dispatcher |
| `syncWpBackground()` | `syncWpBackground.ts` | Sync WP admin menu background color |
| `__()`, `sprintf()` | `i18nWrap.ts` | i18n wrappers around `@wordpress/i18n` |

## Shared Components (`components/`)

| Component | File | Props | Purpose |
|-----------|------|-------|---------|
| `Logo` | `Logo.tsx` | `size?: number` (default 28) | Plugin logo SVG |
| `IconRender` | `IconRender.tsx` | `fileName, libraryDir, size?, iconWidth?, iconHeight?, strokeWidth?, color?` | Render SVG icon with caching |
| `DevtoolsPortal` | `DevtoolsPortal.tsx` | — | TanStack devtools (dev-only) |

## Block Utils (`blocks/icon/utils/`)

| Function | File | Purpose |
|----------|------|---------|
| `stripSvgColors(svgContent)` | `svgUtils.ts` | Convert fill/stroke to currentColor |
| `svgHasStrokes(svgContent)` | `svgUtils.ts` | Detect stroke attributes in SVG |
| `isSafeUrl(url)` | `svgUtils.ts` | Validate URL against safe protocols |
| `getWrapperClasses(attributes)` | `blockStyles.ts` | CSS classes for block wrapper |
| `getContainerClasses(attributes)` | `blockStyles.ts` | CSS classes for icon container |
| `getContainerStyles(attributes)` | `blockStyles.ts` | Inline styles from attributes |
| `sanitizeSlug(slug)` | `blockStyles.ts` | Sanitize color/gradient slugs |
| `openMediaLibrary(onSuccess, onError)` | `openMediaLibrary.ts` | Open WP media frame for SVG selection |

## Block Components (`blocks/icon/components/`)

| Component | File | Purpose |
|-----------|------|---------|
| `BlockIconPreview` | `BlockIconPreview.tsx` | Icon preview in editor |
| `InspectorSettings` | `InspectorSettings.tsx` | Inspector panel (size, color, gradient, link) |
| `CustomSvgModal` | `CustomSvgModal.tsx` | Modal for custom SVG paste |
| `IconGrid` | `IconGrid.tsx` | Grid layout of icon buttons |
| `IconPickerPanel` | `IconPickerPanel.tsx` | Reusable icon picker with search/filters |
| `IconPickerPopover` | `IconPickerPopover.tsx` | Compact popover icon picker |
| `IconPickerModal` | `IconPickerModal.tsx` | Full-screen icon selection modal |
| `IconPlaceholder` | `IconPlaceholder.tsx` | Placeholder when no icon selected |
| `ToolbarControls` | `ToolbarControls.tsx` | Toolbar (link, justify, rotate, flip) |

## Block Types & Constants

| Export | File | Purpose |
|--------|------|---------|
| `IconBlockAttributes` | `blocks/icon/types.ts` | Block attributes interface (24 attrs) |
| `SelectedIconData` | `blocks/icon/types.ts` | Icon selection data interface |
| `queryClient` | `blocks/icon/constants.tsx` | TanStack Query client (5min stale) |
| `replaceIcon` | `blocks/icon/constants.tsx` | Re-export of `@wordpress/icons` update |

## Shared Types (`types/`)

| Type | File | Purpose |
|------|------|---------|
| `Icon` | `types/icon.ts` | Icon record (id, name, type_id, tags, filename) |
| `PaginatedIcons` | `types/icon.ts` | Paginated response |
| `Library` | `types/icon.ts` | Library record |
| `IconType` | `types/icon.ts` | Icon type record |

## WordPress Packages Already Used

| Package | Imports |
|---------|---------|
| `@wordpress/components` | Button, Modal, Popover, Spinner, SearchControl, PanelBody, SelectControl, TextControl, RangeControl, ColorPicker, ToolbarButton, ToolbarGroup, DropdownMenu, `__experimentalUnitControl`, `__experimentalLinkControl` |
| `@wordpress/block-editor` | useBlockProps, BlockControls, InspectorControls, `__experimentalPanelColorGradientSettings`, useSetting |
| `@wordpress/icons` | close, search, flipHorizontal, flipVertical, justifyLeft, justifyCenter, justifyRight, link, rotateRight, update |
| `@wordpress/i18n` | __, sprintf |
| `@wordpress/blocks` | registerBlockType |

## Config (`config/`)

| Export | File | Key Values |
|--------|------|------------|
| `config` | `config.ts` | AJAX_URL, API_URL, NONCE, REST_NONCE, PLUGIN_SLUG, ROOT_URL, etc. |
