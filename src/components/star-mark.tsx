import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarMark({ className }: { className?: string }) {
  return <Star className={cn("fill-current", className)} aria-hidden />;
}

export function StarCount({
  value,
  className,
  size = "md",
}: {
  value: number;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const icon = size === "lg" ? "size-5" : size === "sm" ? "size-3.5" : "size-4";
  const text = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-primary tabular-nums",
        text,
        className,
      )}
    >
      <StarMark className={icon} />
      {value}
    </span>
  );
}
