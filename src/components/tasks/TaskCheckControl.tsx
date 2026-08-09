import { Check } from "lucide-react";

type TaskCheckControlProps = {
  checked: boolean;
  className?: string;
};

export const TaskCheckControl = ({ checked, className = "" }: TaskCheckControlProps) => (
  <span
    className={[
      "grid h-5 w-5 shrink-0 place-items-center rounded-ui-xs border transition-all duration-200",
      checked
        ? "border-primary bg-primary text-primary-foreground shadow-sm"
        : "border-[rgb(var(--color-line-soft))] bg-card text-ink-muted",
      className,
    ].join(" ")}
  >
    {checked ? <Check aria-hidden className="task-check-icon" size={13} strokeWidth={3} /> : null}
  </span>
);
