import React from "react";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ESPACIO ERP — Enterprise Interior Management",
  description: "Production-Grade Internal ERP System for ESPACIO Interior Operations",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream text-charcoal font-sans antialiased">{children}</body>
    </html>
  );
}
