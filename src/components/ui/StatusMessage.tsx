import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { type HTMLAttributes } from "react";
import { cn } from "./utils";

export type StatusMessageVariant = "info" | "success" | "warning" | "danger";

export interface StatusMessageProps extends HTMLAttributes<HTMLDivElement> {
  variant?: StatusMessageVariant;
  title?: string;
}

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: AlertCircle,
};

export const StatusMessage = ({
  className,
  variant = "info",
  title,
  children,
  ...props
}: StatusMessageProps) => {
  const Icon = icons[variant];

  return (
    <div className={cn("ui-status-message", className)} data-variant={variant} role="status" {...props}>
      <Icon className="ui-status-icon" aria-hidden size={17} />
      <div className="ui-status-copy">
        {title ? <p className="ui-status-title">{title}</p> : null}
        <div className="ui-status-description">{children}</div>
      </div>
    </div>
  );
};
