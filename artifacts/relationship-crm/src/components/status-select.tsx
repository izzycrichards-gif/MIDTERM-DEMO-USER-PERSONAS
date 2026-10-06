import { useUpdateContact } from "@workspace/api-client-react";
import type { RelationshipStatus } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/hooks/use-refresh";
import { STATUSES, errMsg, statusTone } from "@/lib/crm";
import { cn } from "@/lib/utils";

export function StatusSelect({ contactId, value }: { contactId: number; value: RelationshipStatus }) {
  const { toast } = useToast();
  const refresh = useRefresh();
  const update = useUpdateContact({
    mutation: {
      onSuccess: () => refresh(),
      onError: (e) => toast({ title: "Couldn't change status", description: errMsg(e), variant: "destructive" }),
    },
  });
  return (
    <Select value={value} onValueChange={(v) => update.mutate({ id: contactId, data: { status: v as RelationshipStatus } })} disabled={update.isPending}>
      <SelectTrigger
        data-testid={`select-status-${contactId}`}
        className={cn("h-7 w-auto gap-1.5 rounded-full border-0 px-3 text-xs font-semibold shadow-none transition-transform active:scale-95", statusTone(value), update.isPending && "opacity-60")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
