# Homepage legal links design

## Goal

Make the public homepage ready for Google OAuth brand review without adding a
custom domain. The homepage must make the app's privacy and service guidance
easy to find before a visitor starts Google sign-in.

## Scope

- Add a small semantic footer to the bottom of the home dashboard.
- Link only to the app's same-origin `/privacy` and `/terms` routes.
- Reuse the existing typography, muted text, spacing, and focus behavior.
- Do not change OAuth scopes, Supabase configuration, session handling, or data
  synchronization.

## Component and behavior

`HomeLegalLinks` renders a `footer` with an accessible label and two visible
links: `개인정보 처리방침` and `서비스 이용약관`. It is placed after the final
home widget, above the persistent bottom navigation. The links use relative
paths so the Google verification crawler and users remain on `eoringo.pages.dev`.

## Verification

- The component test confirms both same-origin paths and rejects a Supabase
  host from the homepage link markup.
- Type checking, unit tests, production build, and bundle security checks must
  pass before this change is committed.
- Google Search Console domain ownership, brand verification, and app
  publishing remain external checkpoints and are not automated by this code
  change.
