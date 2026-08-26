import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, header, footer, className, ...props }) => {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col min-w-0 w-full overflow-hidden transition-all duration-150",
        className
      )}
      {...props}
    >
      {header && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 min-w-0 gap-2">
          {header}
        </div>
      )}
      {children}
      {footer && (
        <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500 min-w-0">
          {footer}
        </div>
      )}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3 className={cn("text-base font-semibold leading-none tracking-tight", className)} {...props} />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p className={cn("text-xs text-slate-500", className)} {...props} />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("p-5 pt-0", className)} {...props} />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn("flex items-center p-5 pt-0", className)} {...props} />
);

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendType?: "positive" | "negative" | "neutral";
  icon?: React.ReactNode;
  emptyContext?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  trend,
  trendType = "neutral",
  icon,
  emptyContext,
}) => {
  const trendColors = {
    positive: "text-semantic-success font-semibold",
    negative: "text-semantic-danger font-semibold",
    neutral: "text-walnut",
  };

  const numericValue = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]+/g, ""));
  const isZero = isNaN(numericValue) || numericValue === 0;

  return (
    <Card className="p-0 min-w-0 w-full h-full bg-offwhite border-walnut/15 hover:border-walnut/30 transition-colors">
      <div className="p-3.5 sm:p-4 flex flex-col justify-between h-full min-w-0">
        <div>
          <div className="flex items-center justify-between gap-1.5 min-w-0 mb-1.5">
            <span
              className="text-[11px] font-bold uppercase tracking-wider text-walnut leading-tight"
              title={label}
            >
              {label}
            </span>
            {icon && (
              <div className="p-1 sm:p-1.5 bg-cream/70 rounded text-walnut border border-walnut/15 shrink-0">
                {icon}
              </div>
            )}
          </div>
          <div className="flex items-baseline justify-between gap-1 min-w-0">
            <span
              className="text-lg sm:text-xl font-bold text-charcoal tracking-tight tabular-nums font-mono whitespace-nowrap"
              title={String(value)}
            >
              {value}
            </span>
          </div>
        </div>
        <div className="mt-2 pt-1.5 border-t border-walnut/10 flex items-center justify-between gap-1 min-w-0 text-[11px]">
          {subtitle ? (
            <span className="text-walnut truncate" title={subtitle}>
              {subtitle}
            </span>
          ) : (
            <span />
          )}
          {trend && (
            <span className={cn("shrink-0 text-[10px] sm:text-[11px]", trendColors[trendType])}>
              {trend}
            </span>
          )}
        </div>
        {isZero && emptyContext && (
          <p className="text-[10px] text-walnut/70 mt-1 pt-1 border-t border-walnut/10 truncate">{emptyContext}</p>
        )}
      </div>
    </Card>
  );
};
