import { type HTMLAttributes } from "react";
import { cn } from "./utils";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = ({ className, variant = "neutral", ...props }: BadgeProps) => (
  <span className={cn("ui-badge", className)} data-variant={variant} {...props} />
);
