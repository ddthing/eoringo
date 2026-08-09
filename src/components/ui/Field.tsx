import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

interface FieldMessageProps {
  id?: string;
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
}

export interface FieldProps extends FieldMessageProps {
  children: ReactNode;
  className?: string;
}

export const Field = ({ children, className, id, label, hint, error, required }: FieldProps) => (
  <div className={cn("ui-field", className)}>
    {label ? (
      <label className="ui-field-label" htmlFor={id}>
        {label}
        {required ? <span className="ui-field-required" aria-hidden> *</span> : null}
      </label>
    ) : null}
    {children}
    {error ? (
      <p className="ui-field-message ui-field-error" role="alert">
        {error}
      </p>
    ) : hint ? (
      <p className="ui-field-message">{hint}</p>
    ) : null}
  </div>
);

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("ui-input field", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);

Input.displayName = "Input";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, ...props }, ref) => (
    <select
      ref={ref}
      className={cn("ui-select field", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);

Select.displayName = "Select";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn("ui-textarea field", className)}
      aria-invalid={invalid || undefined}
      {...props}
    />
  ),
);

Textarea.displayName = "Textarea";
