# Home Information Architecture Renewal Design

## Goal

Help users understand what they should do today within five seconds while preserving the approved Quiet Precision visual language and all existing task, character, memo, D-day, theme, persistence, and reset behavior.

## Home Order

The Home reading order is fixed:

1. Hero
2. PvP and Housing
3. 오늘 체크
4. 숙제 진행도
5. 이번 주 메모
6. 기념일

At 390px every section is a single vertical flow except the existing two-column PvP/Housing row. Wider layouts preserve the same semantic and keyboard order.

## Today Check: Input

`오늘 체크` is the only Home section that mutates task completion.

- Use three mutually exclusive task categories: `일일`, `주간`, and `기타`.
- Do not create a separate 생활 bucket because lifestyle is a content group that overlaps daily and weekly reset categories.
- Show `생활` and other content groups as compact tags on task rows.
- Sort incomplete tasks before completed tasks, then preserve existing priority order.
- Show at most two incomplete task rows per category.
- Summarize undisplayed tasks as a remaining count and link to the existing `/tasks` page.
- For single-count tasks, use the existing completion toggle behavior.
- For multi-count tasks, preserve `setTaskCount` semantics with compact decrement, current/max, and increment controls.
- Use existing character scope, global scope, reset type, disabled defaults, and custom task visibility logic.
- If a category has no visible tasks, show `표시할 숙제가 없습니다`.
- If every task in a category is complete, show `오늘 항목 완료` without inventing new data.

## Task Progress: Result

`숙제 진행도` is read-only on Home.

- Keep the total doughnut chart.
- Add clear daily, weekly, and other result rows.
- Each row shows completed/total, percentage, and a compact linear progress track.
- Derive all values from the same task state used by Today Check.
- Keep the existing link to `/tasks`.
- Do not add task toggles or count controls to this section.

## Component Boundaries

- `HomeDashboard`: exact section order and responsive flow.
- `HomeTodayCheck`: category cards, remaining counts, and empty/complete states.
- `HomeTodayCheckItem`: compact binary and multi-count input controls.
- `useHomeTodayTasks`: current character state, visible task templates, completion values, and existing store actions.
- `getHomeTodayTaskGroups`: pure selection and sorting logic for regression testing.
- `HomeProgress`: read-only visual result statistics.

Stores, persisted schemas, reset rules, and existing task management components remain unchanged.

## Motion and Visual Scope

- Preserve the current theme, card system, typography, and spacing language.
- Add no decorative animation.
- Keep existing check feedback and progress transitions only.
- Maintain 44px effective touch targets and no horizontal overflow at 390px.

## Mint Theme Regression Fix

- Add the missing `html[data-theme-color="mint"]` CSS token block.
- Use the existing Mint swatch accent `rgb(142 191 130)` and soft Mint token `rgb(232 244 225)`.
- Keep Gray as the default theme.
- Add a regression test that reads the theme CSS and proves Mint has its own selector and tokens distinct from Gray.

## Testing and Verification

- Unit-test exclusive daily/weekly/other grouping.
- Unit-test incomplete-first and priority ordering.
- Unit-test the two-item category limit and remaining count.
- Unit-test empty and all-complete category states.
- Unit-test the Mint CSS selector and distinct token values.
- At 390px, verify direct binary checks, multi-count controls, immediate progress synchronization, focus states, touch targets, scrolling, and horizontal overflow.
- Verify Hero, character Bottom Sheet, PvP/Housing, memo editing, D-day, and navigation still work.
- Run the full test suite and production build.

## Acceptance Criteria

- Users can identify named pending tasks without interpreting anonymous dots.
- Today Check mutates task state; Task Progress only summarizes it.
- No task appears in more than one Today Check category.
- Existing task completion and count behavior remains intact.
- Mint renders differently from Gray after selection and reload.
- The 390px layout has no horizontal overflow.
- The full test suite and production build succeed.
