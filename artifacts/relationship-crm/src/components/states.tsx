import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="rise mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-medium md:text-5xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function ErrorState({ onRetry, what = "this" }: { onRetry: () => void; what?: string }) {
  return (
    <div className="rounded-xl border border-dashed p-10 text-center" data-testid="state-error">
      <p className="font-display text-xl">Couldn't load {what}</p>
      <p className="mt-1 text-sm text-muted-foreground">Check your connection and try again.</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 px-6 py-14 text-center" data-testid="state-empty">
      <div className="mx-auto mb-5 flex items-center justify-center">
        <span className="h-8 w-8 rounded-full border-4 border-primary" /><span className="-ml-3 h-8 w-8 rounded-full bg-[hsl(14_75%_52%)]" />
      </div>
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function RowSkeletons({ n = 4 }: { n?: number }) {
  return (
    <div className="divide-y" data-testid="state-loading">
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}
