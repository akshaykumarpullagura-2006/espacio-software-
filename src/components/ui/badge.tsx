import React from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "active" | "pending" | "delayed" | "completed" | "neutral" | "danger" | "success" | "warning";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  showDot = true,
  className,
  ...props
}) => {
  const variants: Record<BadgeVariant, string> = {
    active: "bg-semantic-success-bg text-semantic-success border-semantic-success-border",
    success: "bg-semantic-success-bg text-semantic-success border-semantic-success-border",
    completed: "bg-semantic-success-bg text-semantic-success border-semantic-success-border",
    pending: "bg-gold-soft text-charcoal border-gold/40",
    warning: "bg-amber-100 text-amber-800 border-amber-300",
    delayed: "bg-semantic-danger-bg text-semantic-danger border-semantic-danger-border",
    danger: "bg-semantic-danger-bg text-semantic-danger border-semantic-danger-border",
    neutral: "bg-cream text-walnut border-walnut/20",
  };

  const dotColors: Record<BadgeVariant, string> = {
    active: "bg-semantic-success",
    success: "bg-semantic-success",
    completed: "bg-semantic-success",
    pending: "bg-gold",
    warning: "bg-amber-500",
    delayed: "bg-semantic-danger",
    danger: "bg-semantic-danger",
    neutral: "bg-walnut",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold rounded-full border shadow-2xs select-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {showDot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />}
      {children}
    </span>
  );
};
