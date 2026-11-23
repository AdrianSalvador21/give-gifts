"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";

export function CopyButton({ text, label = t("common.copy"), className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className={`h-10 shrink-0 rounded-[10px] bg-tinta px-3.5 text-sm font-medium text-white ${className}`}
      aria-live="polite"
    >
      {copied ? t("common.copied") : label}
    </button>
  );
}
