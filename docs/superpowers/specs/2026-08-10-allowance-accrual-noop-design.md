# Allowance accrual no-op design

## Decision

`ensureCurrentAccruals` calculates the current allowance snapshot before calling the
Zustand setter. When both the allowance value and accrual boundary are unchanged, it
returns without calling `set`.

## Why

The application checks resets and allowance accruals every minute. Calling the persisted
store setter with an equivalent snapshot still publishes a new state object and activates
the persistence middleware. In a signed-in session, that also wakes the allowance sync
subscription even though no allowance document changed.

## Compatibility

- Allowances still catch up by three at each missed 09:00 or 21:00 KST boundary and cap
  at 100.
- Damaged or future persisted values are still normalized by the existing domain helper.
- No storage key, payload format, migration, or remote-sync policy changes.

## Verification

The store test proves an unchanged boundary preserves the exact state reference and
does not notify subscribers. A second test proves a passed boundary updates the value,
key, and subscribers once. Standard tests use the normal unavailable-storage fallback;
the no-op test proves persistence cannot run by proving the persisted setter is never
called.
