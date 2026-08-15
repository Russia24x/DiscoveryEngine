"use client";

import { Toaster as Sonner } from "sonner";
import { useI18n } from "@/i18n/provider";

export function ClientToaster() {
  const { resolvedTheme } = useI18n();
  return (
    <Sonner
      theme={resolvedTheme}
      position="top-center"
      richColors
      closeButton
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
    />
  );
}
