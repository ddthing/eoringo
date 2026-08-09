import { type LucideIcon } from "lucide-react";
import { cn } from "./utils";

export interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

export interface SegmentedControlProps<Value extends string> {
  value: Value;
  options: Array<SegmentOption<Value>>;
  onChange: (value: Value) => void;
  "aria-label": string;
  className?: string;
}

export const SegmentedControl = <Value extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  className,
}: SegmentedControlProps<Value>) => (
  <div className={cn("ui-segmented-control", className)} role="group" aria-label={ariaLabel}>
    {options.map((option) => {
      const selected = option.value === value;
      const Icon = option.icon;

      return (
        <button
          key={option.value}
          type="button"
          className="ui-segmented-option"
          data-selected={selected || undefined}
          aria-pressed={selected}
          onClick={() => onChange(option.value)}
        >
          {Icon ? (
            <span className="ui-segmented-icon" aria-hidden>
              <Icon size={16} strokeWidth={2.2} />
            </span>
          ) : null}
          <span className="ui-segmented-copy">
            <span className="ui-segmented-label">{option.label}</span>
            {option.description ? <span className="ui-segmented-description">{option.description}</span> : null}
          </span>
        </button>
      );
    })}
  </div>
);
