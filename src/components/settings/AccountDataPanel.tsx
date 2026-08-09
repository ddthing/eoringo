import { AccountPanel } from "../auth/AccountPanel";
import { DataSettingsPanel } from "./BackupRestorePanel";

/**
 * Groups account connection and local-data controls without moving their state
 * or side effects into a shared component. Keeping the two panels independent
 * makes auth/storage behavior easier to test and safer to change.
 */
export const AccountDataPanel = () => (
  <section className="card overflow-hidden p-0">
    <div className="p-3">
      <AccountPanel embedded />
    </div>
    <div className="border-t border-[rgb(var(--color-line-muted))]" aria-hidden="true" />
    <div className="p-3">
      <DataSettingsPanel embedded />
    </div>
  </section>
);
