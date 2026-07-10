import { Check } from "lucide-react";

type TaskCheckControlProps = {
  checked: boolean;
  className?: string;
};

export const TaskCheckControl = ({ checked, className = "" }: TaskCheckControlProps) => (
  <span
    className={[
      "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[6px] border transition",
      checked
        ? "border-primary bg-primary text-white shadow-[0_1px_4px_rgb(30_35_40/0.08)]"
        : "border-[rgb(var(--color-line-soft))] bg-card text-ink-muted",
      className,
    ].join(" ")}
  >
    {checked ? <Check aria-hidden size={12} strokeWidth={3} /> : null}
  </span>
);
