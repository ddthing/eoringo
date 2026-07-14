# Color Theme and Dark Mode Design

## Goal

Preserve every existing application feature while making all selection controls consistently follow the chosen accent color and adding a complete light/dark appearance system. Users can choose **System**, **Light**, or **Dark** independently from the existing Pink, Lavender, Mint, and other accent themes.

## Current Findings

- App-managed buttons, tabs, task checks, Bottom Sheet rows, dialogs, and Bottom Navigation generally use the current primary color token.
- A native checkbox in the character form can still use the operating system's default accent color.
- Native `select` fields inherit shared field styles, but their popup and selected-option rendering remain browser/OS controlled.
- Every current accent uses white text for strongly selected controls. Several light accents do not provide sufficient text contrast.
- The custom HEX field references a legacy `field-input` class that has no shared definition.
- Calendar category colors and parts of the Home Hero use fixed light-only colors.
- The document currently declares only `color-scheme: light` and has no persisted appearance preference.

## State Model

Extend the theme store with a persisted appearance preference:

```ts
type AppearanceMode = 'system' | 'light' | 'dark'
type ResolvedAppearance = 'light' | 'dark'
```

- `appearanceMode` is user intent and is persisted.
- `resolvedAppearance` is derived at runtime. It equals the manual choice, or the current `prefers-color-scheme` value when the choice is `system`.
- Accent color selection remains independent. Changing appearance must not change `themeColorId` or `customAccentColor`.
- Existing persisted theme data is migrated to the new store version with `appearanceMode: 'system'` as the default.
- Invalid persisted appearance values normalize to `system`.

## Application and Startup

- Apply `data-theme-color` and `data-color-mode` to the root `<html>` element.
- Set the root `color-scheme` property to the resolved mode so native controls use the correct light/dark treatment.
- Add a small pre-React startup script in `index.html` that reads the persisted appearance safely and applies the resolved mode before the first paint.
- The startup script must fail safely when storage is absent, malformed, or inaccessible.
- When `appearanceMode` is `system`, listen to `prefers-color-scheme` changes and update the resolved mode without rewriting the stored user preference.
- Update `<meta name="theme-color">` when the resolved mode changes so browser chrome matches the app background.

## Semantic Color Tokens

Keep accent tokens separate from semantic surface tokens.

Accent responsibilities:

- primary/accent color
- soft accent background
- focus ring
- checked and selected control emphasis
- primary foreground color

Semantic responsibilities:

- page background
- card and elevated surfaces
- muted and pressed surfaces
- primary, secondary, and muted text
- borders and dividers
- overlays and shadows
- danger colors
- input backgrounds and placeholders

Light mode retains the current visual character. Dark mode uses near-black neutral surfaces rather than pure black, preserves subtle card separation, and avoids tinted backgrounds that compete with the selected accent.

## Selection Contrast

- Introduce a `--color-primary-foreground` token instead of assuming white text on every accent.
- Each built-in accent defines a foreground that meets normal-text contrast requirements in both modes.
- Custom accent colors derive a safe foreground from luminance, with a conservative dark or light fallback.
- Selected controls use the shared primary foreground token consistently.
- Focus indication remains separate from selected state and stays visible in both modes.

## Native Controls

- Apply the accent token through `accent-color` to native checkboxes and radio controls.
- Give native `select`, input, and option elements explicit semantic background and text colors.
- Retain native `select` behavior instead of replacing every select with a custom component. Browser and operating-system popup rendering may vary, but contrast and light/dark intent must remain correct.
- Replace the undefined custom HEX input class with the existing shared field style.
- Disabled, hover-capable, active, and focus-visible states must remain distinguishable in light and dark modes.

## Settings UI

Add an appearance selector to the existing Theme section:

- System
- Light
- Dark

The selector uses the same card/button language as the accent picker, exposes the selected state to assistive technology, and has at least a 44px effective touch target. Accent selection stays in the same section and continues to preview immediately.

## Component Coverage

Audit and update shared tokens before component-specific overrides. Coverage includes:

- application shell and page background
- Settings cards and appearance/accent selectors
- Bottom Navigation
- buttons, task checks, filters, badges, toggles, and progress visuals
- inputs, textareas, checkboxes, and selects
- Confirm Dialog and Character Bottom Sheet
- Home Hero and status cards
- Calendar and anniversary category colors
- loading, skeleton, empty, hover, active, and focus-visible states

Semantic category colors may retain their meaning, but require dark-mode variants with sufficient contrast. Component behavior, routing, task state, character state, and persistence outside theme migration remain unchanged.

## Motion and Accessibility

- Theme changes use restrained color transitions only; do not animate layout or create a full-screen transition.
- Disable non-essential theme transitions under `prefers-reduced-motion: reduce`.
- Maintain visible keyboard focus and current focus order.
- Verify text and icon contrast for all built-in accent themes in selected, unselected, disabled, hover, active, and focus-visible states.
- Do not communicate a selected state using color alone when the current component already has text, icon, check, or ARIA state available.

## Verification

Automated verification:

- theme-store migration and invalid-value normalization
- system preference resolution
- custom accent foreground selection
- root attributes and theme-color synchronization
- existing full test suite
- production build

Browser verification:

- light and dark at 390px, 430px, and 768px
- System, Light, and Dark selector behavior
- every built-in accent in representative selected controls
- custom accent with both light and dark colors
- checkbox, select, text input, textarea, dialog, Bottom Sheet, and Bottom Navigation
- hover, active, focus-visible, disabled, loading, empty, and reduced-motion states
- no first-paint light flash when dark mode is already stored
- no horizontal overflow or console errors

## Out of Scope

- replacing all native selects with custom listboxes
- user-authored per-screen color schemes
- separate handcrafted dark palettes for every accent
- changing application features, routes, data semantics, or task behavior

## Acceptance Criteria

- System, Light, and Dark preferences persist and resolve correctly.
- Existing users migrate without losing their accent selection or custom accent.
- All shared selection controls use the chosen accent and a readable foreground.
- Native controls have correct light/dark intent and readable text.
- Every existing screen is readable and visually coherent in both modes.
- Theme startup does not produce a visible light flash in stored dark mode.
- Existing tests pass, added theme tests pass, and the production build succeeds.
