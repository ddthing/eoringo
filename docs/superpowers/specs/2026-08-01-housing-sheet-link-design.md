# Housing Source Sheet Link Update

## Goal

Update the “하우징 원본 시트 보기” button in the schedule tab so it opens the requested Google Sheets tab.

## Design

- Replace only the `housingListingsSheetUrl` constant in `HousingListingsMemo.tsx`.
- Use the complete requested URL, including `gid=935403919`, so the link opens the intended sheet tab.
- Preserve the button label, layout, styling, new-tab behavior, and security attributes.

## Verification

- Confirm the old sheet ID no longer appears in source files.
- Confirm the new URL appears in the housing memo component.
- Run the project build to catch TypeScript or bundling regressions.

## Scope

No other schedule data, UI copy, or external links will change.
