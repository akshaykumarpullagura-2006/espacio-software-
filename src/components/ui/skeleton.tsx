import React from "react";
import { cn } from "@/lib/utils";

export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => {
  return <div className={cn("animate-pulse bg-walnut/12 rounded-md", className)} {...props} />;
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="w-full border border-walnut/15 rounded-lg overflow-hidden bg-offwhite shadow-subtle">
      <div className="bg-cream/70 px-4 py-3 border-b border-walnut/15 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 bg-walnut/15" />
        ))}
      </div>
      <div className="divide-y divide-walnut/10">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-4">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1 bg-walnut/10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
