import React from "react";
import Image from "next/image";

export interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  subtitle?: string;
  className?: string;
  collapsed?: boolean;
  light?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = "md",
  showText = true,
  subtitle = "INTERIORS AND MODULAR",
  className = "",
  collapsed = false,
  light = false,
}) => {
  const sizeMap = {
    xs: { img: 24, box: "w-6 h-6", title: "text-xs", sub: "text-[8px]" },
    sm: { img: 32, box: "w-8 h-8", title: "text-sm", sub: "text-[9px]" },
    md: { img: 40, box: "w-10 h-10", title: "text-base", sub: "text-[10px]" },
    lg: { img: 56, box: "w-14 h-14", title: "text-lg", sub: "text-xs" },
    xl: { img: 72, box: "w-20 h-20", title: "text-xl", sub: "text-xs" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Official Architectural Emblem Logo */}
      <div
        className={`${currentSize.box} rounded-lg overflow-hidden shrink-0 border ${
          light ? "border-walnut/40 bg-[#FAF6EF]" : "border-walnut/20 bg-white"
        } shadow-xs flex items-center justify-center p-0.5`}
      >
        <Image
          src="/logo.png"
          alt="ESPACIO Interiors and Modular Logo"
          width={currentSize.img}
          height={currentSize.img}
          className="w-full h-full object-contain rounded-md"
          priority
        />
      </div>

      {showText && !collapsed && (
        <div className="flex flex-col justify-center min-w-0">
          <h1
            className={`font-bold uppercase tracking-wider leading-none ${
              light ? "text-[#FAF6EF]" : "text-charcoal"
            } ${currentSize.title}`}
          >
            ESPACIO
          </h1>
          {subtitle && (
            <p
              className={`font-bold tracking-widest uppercase mt-1 leading-none ${
                light ? "text-gold" : "text-walnut"
              } ${currentSize.sub}`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
