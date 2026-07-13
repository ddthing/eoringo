import { isAnniversaryDateInputAllowed } from "../../domain/dday/anniversaryManagement";

type Props = {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  ariaLabel?: string;
  className?: string;
};

export const AnniversaryDateField = ({
  value,
  onChange,
  name,
  ariaLabel,
  className = "field",
}: Props) => (
  <input
    className={className}
    type="date"
    name={name}
    aria-label={ariaLabel}
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
