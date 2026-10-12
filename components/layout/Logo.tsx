import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("size-9", className)}>
      <rect x="4" y="21" width="24" height="6" rx="2" className="fill-indigo-500/40" />
      <rect x="4" y="13" width="24" height="6" rx="2" className="fill-indigo-500/70" />
      <rect x="4" y="5" width="24" height="6" rx="2" className="fill-indigo-400" />
      <path d="M9 8h9M9 16h13M9 24h7" className="stroke-white/90" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, collapseText = false }: { className?: string; collapseText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-2xl font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className={collapseText ? "hidden sm:inline" : undefined}>
        Prose<span className="text-indigo-600 dark:text-indigo-400">Stack</span>
      </span>
    </span>
  );
}
