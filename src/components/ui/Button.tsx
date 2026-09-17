import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "./utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      loadingLabel = "처리 중",
      disabled,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        {...props}
        ref={ref}
        type={type ?? "button"}
        className={cn("ui-button", `ui-button-${size}`, className)}
        data-variant={variant}
        data-loading={loading || undefined}
        aria-busy={loading || undefined}
        aria-label={loading ? loadingLabel : props["aria-label"]}
        disabled={disabled || loading}
      >
        {loading ? (
          <>
            <span className="ui-button-loading-placeholder" aria-hidden>
              {children}
            </span>
            <span className="ui-button-loading-indicator" aria-hidden>
              <LoaderCircle className="ui-button-spinner" size={16} />
            </span>
          </>
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export interface IconButtonProps extends Omit<ButtonProps, "size" | "children"> {
  label: string;
  size?: Exclude<ButtonSize, "icon">;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, size = "md", "aria-label": ariaLabel, ...props }, ref) => (
    <Button
      {...props}
      ref={ref}
      size="icon"
      aria-label={ariaLabel ?? label}
      className={cn(`ui-icon-button-${size}`, props.className)}
    >
      {children}
    </Button>
  ),
);

IconButton.displayName = "IconButton";
