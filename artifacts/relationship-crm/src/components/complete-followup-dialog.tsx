import { useState } from "react";
import { useCompleteFollowUp } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/hooks/use-refresh";
import { errMsg, plusDays } from "@/lib/crm";
import { cn } from "@/lib/utils";

interface Target { id: number; name: string; recurrenceDays: number | null }
type Mode = "none" | "date" | "auto";

function Body({ target, onDone }: { target: Target; onDone: () => void }) {
  const { toast } = useToast();
  const refresh = useRefresh();
  const [mode, setMode] = useState<Mode>(target.recurrenceDays ? "auto" : "date");
  const [date, setDate] = useState(plusDays(7));
  const [time, setTime] = useState("");
  const [days, setDays] = useState(String(target.recurrenceDays ?? 14));
  const [err, setErr] = useState("");
  const complete = useCompleteFollowUp({
    mutation: {
      onSuccess: (r) => {
        refresh();
        toast({ title: "Follow-up completed", description: r.nextFollowUp ? "Next one is scheduled." : "Nothing else scheduled." });
        onDone();
      },
      onError: (e) => setErr(errMsg(e)),
    },
  });

  const submit = () => {
    setErr("");
    const n = Number(days);
    if (mode === "auto" && (!Number.isInteger(n) || n < 1)) return setErr("Enter a whole number of days.");
    if (mode === "date" && !date) return setErr("Choose the next date.");
    const data =
      mode === "none" ? { nextFollowUpDate: null, recurrenceDays: null }
      : mode === "date" ? { nextFollowUpDate: date, nextFollowUpTime: time || null, recurrenceDays: null }
      : { nextFollowUpDate: plusDays(n), recurrenceDays: n };
    complete.mutate({ id: target.id, data });
  };

  const opts: { v: Mode; t: string; d: string }[] = [
    { v: "date", t: "Pick the next date", d: "Choose exactly when to reach out again." },
    { v: "auto", t: "Repeat automatically", d: "Reschedule every set number of days." },
    { v: "none", t: "Just mark it done", d: "Nothing further scheduled." },
  ];
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {opts.map((o) => (
          <button key={o.v} type="button" data-testid={`option-complete-${o.v}`} onClick={() => setMode(o.v)}
            className={cn("w-full rounded-lg border p-3 text-left transition-colors", mode === o.v ? "border-primary bg-primary/5" : "hover:bg-muted")}>
            <span className="block text-sm font-semibold">{o.t}</span>
            <span className="block text-xs text-muted-foreground">{o.d}</span>
          </button>
        ))}
      </div>
      {mode === "date" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Date</Label><Input data-testid="input-next-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Time (optional)</Label><Input data-testid="input-next-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        </div>
      )}
      {mode === "auto" && (
        <div className="space-y-1.5"><Label>Every how many days</Label><Input data-testid="input-recur-days" type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></div>
      )}
      {err && <p role="alert" className="text-sm font-medium text-destructive">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Cancel</Button>
        <Button onClick={submit} disabled={complete.isPending} data-testid="button-confirm-complete">{complete.isPending ? "Saving" : "Complete"}</Button>
      </div>
    </div>
  );
}

export function CompleteFollowUpDialog({ target, onClose }: { target: Target | null; onClose: () => void }) {
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">Follow-up done</DialogTitle>
          <DialogDescription>{target ? `What happens next with ${target.name}?` : ""}</DialogDescription>
        </DialogHeader>
        {target && <Body key={target.id} target={target} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}
