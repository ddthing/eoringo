import { AccountPanel } from "../auth/AccountPanel";
import { DataSettingsPanel } from "./BackupRestorePanel";
import { Card } from "../ui";

/**
 * Groups account connection and local-data controls without moving their state
 * or side effects into a shared component. Keeping the two panels independent
 * makes auth/storage behavior easier to test and safer to change.
 */
export const AccountDataPanel = () => (
  <Card className="overflow-hidden p-0">
    <div className="p-5">
      <AccountPanel embedded />
    </div>
    <div className="border-t border-[rgb(var(--color-line-muted))]" aria-hidden="true" />
    <div className="p-5">
      <DataSettingsPanel embedded />
    </div>
  </Card>
);
