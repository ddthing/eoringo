import { forwardRef, type HTMLAttributes, type PropsWithChildren } from "react";
import { cn } from "./utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "outlined" | "soft";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "elevated", ...props }, ref) => (
    <div
      ref={ref}
      className={cn("ui-card", className)}
      data-variant={variant}
      {...props}
    />
  ),
);

Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ui-card-header", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cn("ui-card-title", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("ui-card-description", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ui-card-content", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("ui-card-footer", className)} {...props} />
);

export type CardSectionProps = PropsWithChildren<{ className?: string }>;
