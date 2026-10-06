import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn("h-8 w-8", className)} aria-hidden>
      <rect width="64" height="64" rx="16" fill="hsl(172 44% 20%)" />
      <circle cx="22" cy="32" r="9" fill="none" stroke="#f7f3ec" strokeWidth="4" />
      <circle cx="42" cy="32" r="9" fill="#e2562f" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-[1.15rem] font-medium leading-none">Full Circle</span>
    </span>
  );
}
