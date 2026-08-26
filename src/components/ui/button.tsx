"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variants = {
      // Primary: Warm Gold Background with Deep Charcoal text
      primary: "bg-gold text-charcoal hover:bg-gold-hover active:bg-gold-active shadow-gold font-bold",
      // Secondary: Cool Off-White surface with Walnut border
      secondary: "bg-offwhite text-charcoal border border-walnut/20 hover:bg-cream hover:border-walnut/40 active:bg-cream/80 shadow-2xs",
      // Outline: Transparent/Cream with Walnut border
      outline: "border border-walnut/30 bg-transparent text-charcoal hover:bg-offwhite hover:border-walnut/60",
      // Ghost: Walnut text with subtle Gold soft hover
      ghost: "text-walnut hover:bg-gold-soft hover:text-charcoal",
      // Danger: Restrained semantic red
      danger: "bg-semantic-danger text-white hover:bg-red-700 active:bg-red-800 shadow-subtle",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs rounded-md gap-1.5",
      md: "h-9 px-4 text-sm rounded-md gap-2",
      lg: "h-11 px-6 text-base rounded-lg gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : leftIcon}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
