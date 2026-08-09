import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils";

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
  variant?: "section" | "page";
}

export const SectionHeader = ({
  className,
  eyebrow,
  title,
  description,
  icon,
  action,
  headingLevel = "h2",
  variant = "section",
  ...props
}: SectionHeaderProps) => {
  const isPageVariant = variant === "page";

  return (
    <div className={cn("ui-section-header", className)} {...props}>
      <div className={isPageVariant ? "ui-page-heading" : "ui-section-heading"}>
        {icon ? (
          <span
            className={isPageVariant ? "ui-page-icon" : "ui-section-icon"}
            aria-hidden
          >
            {icon}
          </span>
        ) : null}
        <div
          className={isPageVariant ? "ui-page-heading-copy" : "ui-section-header-copy"}
        >
          {eyebrow ? <p className="ui-section-eyebrow">{eyebrow}</p> : null}
          {headingLevel === "h1" ? (
            <h1 className="ui-section-title">{title}</h1>
          ) : headingLevel === "h3" ? (
            <h3 className="ui-section-title">{title}</h3>
          ) : (
            <h2 className="ui-section-title">{title}</h2>
          )}
          {description ? <p className="ui-section-description">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="ui-section-action">{action}</div> : null}
    </div>
  );
};
