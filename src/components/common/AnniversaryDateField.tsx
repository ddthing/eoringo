import { isAnniversaryDateInputAllowed } from "../../domain/dday/anniversaryManagement";
import type { FormEventHandler } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  className?: string;
  id?: string;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onInvalid?: FormEventHandler<HTMLInputElement>;
};

export const AnniversaryDateField = ({
  value,
  onChange,
  name,
  ariaLabel,
  className = "field",
  id,
  required,
  invalid,
  describedBy,
  onInvalid,
}: Props) => (
  <input
    className={className}
    id={id}
    type="date"
    name={name}
    aria-label={ariaLabel}
    aria-invalid={invalid || undefined}
    aria-describedby={describedBy}
    required={required}
    onInvalid={onInvalid}
    min="1000-01-01"
    max="9999-12-31"
    value={value}
    onInput={(event) => {
      if (!isAnniversaryDateInputAllowed(event.currentTarget.value)) {
        event.currentTarget.value = value;
      }
    }}
    onChange={(event) => {
      if (isAnniversaryDateInputAllowed(event.target.value)) {
        onChange(event.target.value);
      } else {
        event.currentTarget.value = value;
      }
    }}
  />
);
