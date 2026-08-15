"use client";

import { useEffect } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlist } from "@/lib/watchlist-store";
import { toast } from "sonner";

interface StarButtonProps {
  symbol: string;
  name: string;
  sector?: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StarButton({ symbol, name, sector, logoUrl, size = "md", className }: StarButtonProps) {
  const { add, remove, has, load } = useWatchlist();

  useEffect(() => {
    load();
  }, [load]);

  const inList = has(symbol);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (inList) {
      remove(symbol);
      toast.success(`Removed ${symbol} from watchlist`);
    } else {
      add({ symbol, name, sector, logoUrl });
      toast.success(`Added ${symbol} to watchlist`);
    }
  }

  const dim = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-7 w-7" : "h-8 w-8";
  const iconDim = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <button
      onClick={toggle}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border transition-all shrink-0",
        inList
          ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
          : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground",
        dim,
        className
      )}
      title={inList ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star className={cn(iconDim, inList && "fill-current")} />
    </button>
  );
}
