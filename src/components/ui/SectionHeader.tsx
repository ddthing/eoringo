import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "./utils";

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: "h1" | "h2" | "h3";
}

export const SectionHeader = ({
  className,
  eyebrow,
  title,
  description,
  action,
  headingLevel = "h2",
  ...props
}: SectionHeaderProps) => (
  <div className={cn("ui-section-header", className)} {...props}>
    <div className="ui-section-header-copy">
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
    {action ? <div className="ui-section-action">{action}</div> : null}
  </div>
);
