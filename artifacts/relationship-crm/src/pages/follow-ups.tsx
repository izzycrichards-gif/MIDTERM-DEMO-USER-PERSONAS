import { useState } from "react";
import { getListFollowUpsQueryKey, useListFollowUps } from "@workspace/api-client-react";
import type { FollowUpWithContact, ListFollowUpsParams } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompleteFollowUpDialog } from "@/components/complete-followup-dialog";
import { FollowUpRow } from "@/components/followup-row";
import { EmptyState, ErrorState, PageHeader, RowSkeletons } from "@/components/states";

const TABS = [
  { v: "overdue", l: "Overdue", e: "Nothing overdue. Nicely done." },
  { v: "today", l: "Due today", e: "Nobody is due today." },
  { v: "upcoming", l: "Upcoming", e: "No upcoming follow-ups. Schedule one from a contact." },
  { v: "completed", l: "Completed", e: "Completed follow-ups will collect here." },
] as const;

export default function FollowUps() {
  const [tab, setTab] = useState<string>("overdue");
  const [target, setTarget] = useState<FollowUpWithContact | null>(null);
  const params: ListFollowUpsParams = { filter: tab as ListFollowUpsParams["filter"] };
  const { data, isLoading, isError, refetch } = useListFollowUps(params, { query: { queryKey: getListFollowUpsQueryKey(params), refetchInterval: 60000 } });
  return (
    <div>
      <PageHeader eyebrow="Follow-ups" title="Keep your word" />
      <Tabs value={tab} onValueChange={setTab} className="rise rise-1">
        <TabsList className="mb-6 h-auto flex-wrap">
          {TABS.map((t) => <TabsTrigger key={t.v} value={t.v} data-testid={`tab-${t.v}`}>{t.l}</TabsTrigger>)}
        </TabsList>
      </Tabs>
      {isLoading && <RowSkeletons />}
      {isError && <ErrorState what="follow-ups" onRetry={() => refetch()} />}
      {data && data.length === 0 && <EmptyState title="Clear" body={TABS.find((t) => t.v === tab)!.e} />}
      {data && data.length > 0 && (
        <ul key={tab} className="rise divide-y border-y">
          {data.map((f) => <FollowUpRow key={f.id} f={f} onComplete={setTarget} />)}
        </ul>
      )}
      <CompleteFollowUpDialog onClose={() => setTarget(null)} target={target && { id: target.id, name: target.contactName, recurrenceDays: target.recurrenceDays }} />
    </div>
  );
}
