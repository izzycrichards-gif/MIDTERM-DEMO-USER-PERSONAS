import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Plus, Search } from "lucide-react";
import { getListContactsQueryKey, useListContacts, useListTags } from "@workspace/api-client-react";
import type { ContactSort, FollowUpFilter, ListContactsParams, RelationshipStatus } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusSelect } from "@/components/status-select";
import { useAddContact } from "@/components/app-shell";
import { EmptyState, ErrorState, PageHeader, RowSkeletons } from "@/components/states";
import { dueInfo, fmtDate, fullName, initials, STATUSES } from "@/lib/crm";

const ANY = "any";
function Filter({ value, onChange, label, children, id }: { value: string; onChange: (v: string) => void; label: string; children: React.ReactNode; id: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-36" aria-label={label} data-testid={`filter-${id}`}><SelectValue /></SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

export default function Contacts() {
  const add = useAddContact();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ANY);
  const [tag, setTag] = useState(ANY);
  const [fu, setFu] = useState(ANY);
  const [sort, setSort] = useState<string>("alphabetical");
  useEffect(() => { const t = setTimeout(() => setSearch(q.trim()), 250); return () => clearTimeout(t); }, [q]);

  const params = useMemo<ListContactsParams>(() => ({
    ...(search ? { search } : {}),
    ...(status !== ANY ? { status: status as RelationshipStatus } : {}),
    ...(tag !== ANY ? { tagId: Number(tag) } : {}),
    ...(fu !== ANY ? { followUp: fu as FollowUpFilter } : {}),
    sort: sort as ContactSort,
  }), [search, status, tag, fu, sort]);
  const { data, isLoading, isError, refetch, isFetching } = useListContacts(params, { query: { queryKey: getListContactsQueryKey(params) } });
  const { data: tags } = useListTags();
  const filtered = search || status !== ANY || tag !== ANY || fu !== ANY;

  return (
    <div>
      <PageHeader eyebrow="Contacts" title="Everyone you know">
        <Button onClick={add} className="gap-2"><Plus className="h-4 w-4" />Add contact</Button>
      </PageHeader>

      <div className="rise rise-1 mb-6 flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="input-search" className="h-10 pl-9" placeholder="Search name, company, email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Filter id="status" label="Status" value={status} onChange={setStatus}>
            <SelectItem value={ANY}>All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </Filter>
          <Filter id="tag" label="Tag" value={tag} onChange={setTag}>
            <SelectItem value={ANY}>All tags</SelectItem>
            {(tags ?? []).map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
          </Filter>
          <Filter id="followup" label="Follow-up" value={fu} onChange={setFu}>
            <SelectItem value={ANY}>Any follow-up</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due today</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </Filter>
          <Filter id="sort" label="Sort" value={sort} onChange={setSort}>
            <SelectItem value="alphabetical">A to Z</SelectItem>
            <SelectItem value="recently-contacted">Recently contacted</SelectItem>
            <SelectItem value="next-follow-up">Next follow-up</SelectItem>
          </Filter>
        </div>
      </div>

      {isLoading && <RowSkeletons n={6} />}
      {isError && <ErrorState what="contacts" onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        filtered ? (
          <EmptyState title="No matches" body="Nothing fits those filters. Loosen a filter or clear the search."
            action={<Button variant="outline" onClick={() => { setQ(""); setStatus(ANY); setTag(ANY); setFu(ANY); }}>Clear filters</Button>} />
        ) : (
          <EmptyState title="No contacts yet" body="Start with the person you most want to stay in touch with." action={<Button onClick={add}>Add a contact</Button>} />
        )
      )}
      {data && data.length > 0 && (
        <ul className={`rise rise-2 divide-y border-y transition-opacity ${isFetching ? "opacity-60" : ""}`}>
          {data.map((c) => {
            const pending = c.followUp && c.followUp.status === "pending" ? c.followUp : null;
            const info = pending ? dueInfo(pending.dueDate, pending.dueTime) : null;
            return (
              <li key={c.id} data-testid={`row-contact-${c.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 py-4 transition-colors hover:bg-card/70 md:grid-cols-[auto_1.4fr_auto_1fr_8rem] md:px-2">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-semibold">{initials(c)}</span>
                <Link href={`/contacts/${c.id}`} className="min-w-0">
                  <span className="block truncate font-semibold hover:underline underline-offset-2">{fullName(c)}</span>
                  <span className="block truncate text-sm text-muted-foreground">{[c.jobTitle, c.company].filter(Boolean).join(" at ") || c.email || "No details yet"}</span>
                </Link>
                <StatusSelect contactId={c.id} value={c.status} />
                <div className="col-span-3 flex flex-wrap gap-1.5 md:col-span-1">
                  {c.tags.map((t) => <span key={t.id} className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">{t.name}</span>)}
                </div>
                <div className="col-span-3 text-sm md:col-span-1 md:text-right">
                  {info ? <span className={`font-semibold ${info.tone}`}>{info.label}</span> : <span className="text-muted-foreground">No follow-up</span>}
                  {info && <span className="block text-xs text-muted-foreground">{info.when}</span>}
                  <span className="block text-xs text-muted-foreground">Last: {fmtDate(c.lastContactedAt)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
