"use client";

import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-walnut uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-md border border-walnut/20 bg-offwhite px-3 py-1 text-sm text-charcoal shadow-subtle placeholder:text-walnut/50 focus:outline-none focus:ring-2 focus:ring-gold focus:border-gold/60 disabled:cursor-not-allowed disabled:opacity-50 transition-all",
            error && "border-semantic-danger focus:ring-semantic-danger text-semantic-danger",
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-semantic-danger font-medium">{error}</span>}
        {!error && helperText && <span className="text-xs text-walnut">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
