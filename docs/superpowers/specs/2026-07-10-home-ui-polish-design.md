# Home UI Polish Design

## Goal

Polish the existing Home experience to a quiet, precise, Apple-like level of finish without adding features or changing application behavior, routes, stores, persistence, or data flow.

The approved visual direction is **A. Quiet Precision**: generous but controlled spacing, deliberate typography, restrained depth, clear touch feedback, and calm state presentation.

## Content and Functional Boundaries

- Preserve the current Home information order and every existing action.
- Preserve character switching, task navigation, memo editing, progress calculation, PvP rotation, housing phase, and D-day data behavior.
- Do not add network requests, artificial delays, new settings, new routes, or new persistent state.
- Visual components may be reorganized only to support responsive layout and shared presentation rules.

## Responsive Layout

### 390px

- Use 12px page gutters and consistent 12px vertical rhythm.
- Keep PvP and housing cards in two balanced columns.
- Maintain a minimum 44px touch target for every interactive control.
- Prevent character identity, percentages, dates, and action labels from colliding or producing horizontal overflow.

### 430px

- Increase the visual breathing room slightly while retaining the same reading order as 390px.
- Allow card padding and inter-card gaps to expand by one spacing step.
- Preserve the two-column quick-status row.

### 768px

- Keep Home Hero and the PvP/housing row full width.
- Use a balanced lower canvas: progress on the left and memo/D-day on the right.
- Preserve DOM reading order and keyboard navigation order despite the visual grid.
- Keep the application shell within its existing maximum width.

## Spacing and Card System

- Establish a Home-only spacing rhythm using a small set of reusable values instead of per-card exceptions.
- Normalize Home card radius, border strength, shadow softness, and internal padding.
- Use visual weight rather than strong color fills to distinguish Hero, status cards, progress, memo, and D-day.
- Keep the current theme color tokens and existing light visual language.

## Typography and Hierarchy

- Keep Pretendard and the existing font stack.
- Define clear roles for eyebrow labels, card titles, large status values, body copy, metadata, and numeric values.
- Use stable line heights and tabular numerals for percentages, counts, dates, and countdowns.
- Avoid truncation where information is critical; use truncation only where the existing UI already treats the value as compact metadata.

## Interaction States

- Interactive cards and controls receive distinct default, hover, active, and focus-visible states.
- Hover treatment applies only on hover-capable pointer devices.
- Active feedback uses a short, subtle compression without changing layout.
- Focus-visible treatment remains high contrast and is never removed.
- Bottom navigation and Home controls retain safe-area spacing and minimum touch dimensions.

## Motion

- Add a single restrained Home entrance sequence using CSS-only staggered opacity and vertical translation.
- Use short transitions for hover, active, progress, and Bottom Sheet presentation.
- Avoid continuous decorative motion.
- Disable non-essential motion when `prefers-reduced-motion: reduce` is active.

## Loading, Skeleton, and Empty States

- Do not invent loading states for synchronous local data.
- Show a subtle skeleton only while an existing character image is being read asynchronously from IndexedDB.
- Preserve the current fallback avatar when no profile image exists or image loading fails.
- Refine memo empty presentation without changing its edit action.
- Render a quiet D-day empty card so the Home layout remains balanced when no events exist; it is informational and introduces no new action or data behavior.
- Skeleton and empty-state elements must not shift the surrounding card layout when they resolve.

## Scroll and Bottom Sheet

- Keep document scrolling stable at all target widths with no horizontal overflow.
- Preserve the existing Bottom Sheet actions, focus trap, Escape handling, focus restoration, backdrop dismissal, and body scroll lock.
- Improve Bottom Sheet touch sizing, internal rhythm, safe-area padding, and inertial overflow presentation without changing behavior.

## Component Scope

- `HomeDashboard`: responsive page grid and section entrance order.
- `HomeHero`: hierarchy, spacing, numeric alignment, and character trigger states.
- `HomePvPWidget` / `HomeHousingWidget`: balanced wrappers only.
- `HomeProgress`: responsive internal layout, typography, and progress presentation.
- `WeeklyMemoWidget`: polished editing and empty states.
- `UpcomingAnniversaryWidget`: stable populated and empty states.
- `CharacterAvatar`: real asynchronous image skeleton and unchanged fallback behavior.
- `CharacterBottomSheet`: visual/touch polish with all current behavior preserved.
- `globals.css`: shared Home tokens, state classes, and reduced-motion behavior.

## Verification

- Capture the current implementation as the before reference and the completed implementation as the after reference.
- Verify 390px, 430px, and 768px viewports in the in-app browser.
- Check spacing, typography, touch targets, hover, active, focus-visible, motion, reduced motion, loading skeleton, empty states, scrolling, card balance, and visual hierarchy.
- Exercise Home Hero character switching, Bottom Sheet dismissal paths, memo editing, navigation links, and task progress rendering.
- Confirm no browser console errors.
- Run the full test suite and production build after all visual checks.

## Acceptance Criteria

- No existing feature or persisted data behavior changes.
- No horizontal overflow at 390px, 430px, or 768px.
- All interactive Home controls have at least a 44px effective touch area.
- Empty and asynchronous image states are visually stable.
- Reduced-motion users do not receive decorative entrance or shimmer motion.
- Tests pass and the production build succeeds.
