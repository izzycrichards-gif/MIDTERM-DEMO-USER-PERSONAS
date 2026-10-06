import { useState } from "react";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { getGetDashboardQueryKey, useGetDashboard } from "@workspace/api-client-react";
import type { FollowUpWithContact } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CompleteFollowUpDialog } from "@/components/complete-followup-dialog";
import { FollowUpRow } from "@/components/followup-row";
import { useAddContact } from "@/components/app-shell";
import { EmptyState, ErrorState, PageHeader, RowSkeletons } from "@/components/states";
import { fmtDate, fullName, statusTone } from "@/lib/crm";

function Section({ title, tone, items, onComplete, delay }: { title: string; tone?: string; items: FollowUpWithContact[]; onComplete: (f: FollowUpWithContact) => void; delay: string }) {
  if (items.length === 0) return null;
  return (
    <section className={`rise ${delay} mb-10`}>
      <div className="mb-1 flex items-baseline gap-3 border-b pb-3">
        <h2 className={`font-display text-2xl font-medium ${tone ?? ""}`}>{title}</h2>
        <span className="text-sm text-muted-foreground">{items.length}</span>
      </div>
      <ul className="divide-y">{items.map((f) => <FollowUpRow key={f.id} f={f} onComplete={onComplete} />)}</ul>
    </section>
  );
}

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey(), refetchInterval: 60000 } });
  const add = useAddContact();
  const [target, setTarget] = useState<FollowUpWithContact | null>(null);
  const nothingDue = data && data.overdue.length + data.dueToday.length + data.upcoming.length === 0;

  return (
    <div>
      <PageHeader eyebrow="Dashboard" title="Who to contact next">
        <Button onClick={add} className="hidden gap-2 md:inline-flex"><Plus className="h-4 w-4" />Add contact</Button>
      </PageHeader>

      {isLoading && (<><Skeleton className="mb-10 h-16 w-full" /><RowSkeletons /></>)}
      {isError && <ErrorState what="your dashboard" onRetry={() => refetch()} />}

      {data && data.totalContacts === 0 && (
        <EmptyState title="Your people will live here" body="Add your first contact and set a follow-up. Whoever is due next shows up at the top of this page."
          action={<Button onClick={add} data-testid="button-empty-add">Add your first contact</Button>} />
      )}

      {data && data.totalContacts > 0 && (
        <>
          <dl className="rise rise-1 mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-4">
            {[["Contacts", data.totalContacts], ["New leads", data.newLeads], ["Warm leads", data.warmLeads], ["Active clients", data.activeClients]].map(([l, v]) => (
              <div key={l} className="bg-card px-5 py-4" data-testid={`stat-${String(l).toLowerCase().replace(" ", "-")}`}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{l}</dt>
                <dd className="font-display mt-1 text-3xl">{v}</dd>
              </div>
            ))}
          </dl>

          {nothingDue && (
            <div className="rise rise-2 mb-12 rounded-xl bg-primary px-6 py-8 text-primary-foreground">
              <p className="font-display text-2xl">You're all caught up.</p>
              <p className="mt-1 text-sm opacity-80">No follow-ups scheduled. Open a contact to set the next one.</p>
            </div>
          )}
          <Section title="Overdue" tone="text-[hsl(14_70%_38%)]" items={data.overdue} onComplete={setTarget} delay="rise-2" />
          <Section title="Due today" items={data.dueToday} onComplete={setTarget} delay="rise-3" />
          <Section title="Coming up" items={data.upcoming} onComplete={setTarget} delay="rise-4" />

          {data.recentlyContacted.length > 0 && (
            <section className="rise rise-4">
              <h2 className="font-display mb-1 border-b pb-3 text-2xl font-medium">Recently contacted</h2>
              <ul className="divide-y">
                {data.recentlyContacted.map((c) => (
                  <li key={c.id}>
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-4 py-3.5 hover:opacity-70">
                      <span className="min-w-0 flex-1 truncate font-medium">{fullName(c)}<span className="ml-2 text-sm font-normal text-muted-foreground">{c.company}</span></span>
                      <span className={`hidden rounded-full px-2.5 py-0.5 text-xs font-semibold sm:inline ${statusTone(c.status)}`}>{c.status}</span>
                      <span className="text-sm text-muted-foreground">{fmtDate(c.lastContactedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
      <CompleteFollowUpDialog onClose={() => setTarget(null)} target={target && { id: target.id, name: target.contactName, recurrenceDays: target.recurrenceDays }} />
    </div>
  );
}
