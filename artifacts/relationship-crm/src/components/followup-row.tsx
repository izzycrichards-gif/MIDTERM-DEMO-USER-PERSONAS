import { Link } from "wouter";
import { Check, Repeat } from "lucide-react";
import type { FollowUpWithContact } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { dueInfo } from "@/lib/crm";

export function FollowUpRow({ f, onComplete }: { f: FollowUpWithContact; onComplete?: (f: FollowUpWithContact) => void }) {
  const info = dueInfo(f.dueDate, f.dueTime);
  const done = f.status === "completed";
  return (
    <li className="group flex items-center gap-4 py-4" data-testid={`row-followup-${f.id}`}>
      {onComplete && !done ? (
        <button aria-label={`Complete follow-up with ${f.contactName}`} data-testid={`button-complete-${f.id}`} onClick={() => onComplete(f)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-foreground/30 text-transparent transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground active:scale-90">
          <Check className="h-3.5 w-3.5" />
        </button>
      ) : (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Check className="h-3.5 w-3.5" /></span>
      )}
      <Link href={`/contacts/${f.contactId}`} className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold group-hover:underline underline-offset-2">{f.contactName}</span>
        <span className="block truncate text-sm text-muted-foreground">{f.company || "No company"}</span>
      </Link>
      <div className="flex shrink-0 flex-col items-end text-right">
        <span className={`text-sm font-semibold ${done ? "text-muted-foreground" : info.tone}`}>{done ? "Completed" : info.label}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          {f.recurrenceDays ? <Repeat className="h-3 w-3" /> : null}{info.when}
        </span>
      </div>
      {onComplete && !done && (
        <Button size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => onComplete(f)}>Done</Button>
      )}
    </li>
  );
}
