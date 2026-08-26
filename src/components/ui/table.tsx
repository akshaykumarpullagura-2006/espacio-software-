import React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  isNumeric?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyText?: string;
  emptySubtext?: string;
  isLoading?: boolean;
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyText = "No records found.",
  emptySubtext = "There are no items to display at this time.",
  isLoading = false,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full border border-walnut/15 rounded-lg overflow-hidden bg-offwhite shadow-subtle", className)}>
      <div className="overflow-x-auto max-h-[600px]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className={cn(stickyHeader && "sticky top-0 z-10")}>
            <tr className="bg-cream/80 border-b border-walnut/15">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-3.5 py-2.5 text-[11px] font-bold text-walnut uppercase tracking-wider",
                    (col.align === "right" || col.isNumeric) && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-walnut/10">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-walnut">
                  Loading data...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-walnut">
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <p className="font-bold text-charcoal text-xs">{emptyText}</p>
                    <p className="text-[11px] text-walnut">{emptySubtext}</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors hover:bg-gold-soft/40",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, cIdx) => {
                    const value = col.cell ? col.cell(row) : col.accessorKey ? (row[col.accessorKey] as React.ReactNode) : null;
                    return (
                      <td
                        key={cIdx}
                        className={cn(
                          "px-3.5 py-2.5 text-charcoal font-medium leading-tight",
                          (col.align === "right" || col.isNumeric) && "text-right tabular-nums font-mono",
                          col.align === "center" && "text-center",
                          col.className
                        )}
                      >
                        {value}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
