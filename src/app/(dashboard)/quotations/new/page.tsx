"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuotationGeneratorStudio from "@/components/quotations/quotation-generator-studio";

export default function NewQuotationPage() {
  const router = useRouter();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/quotations">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Quotations Registry
          </Button>
        </Link>
      </div>

      {/* AI Document & Quotation Studio */}
      <QuotationGeneratorStudio
        onSaveComplete={() => {
          router.push("/quotations");
        }}
      />
    </div>
  );
}
