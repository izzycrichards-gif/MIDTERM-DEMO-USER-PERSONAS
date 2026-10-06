import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Building2, CalendarCheck, Globe, Mail, Pencil, Phone, Repeat, Trash2 } from "lucide-react";
import {
  getGetContactQueryKey, getListInteractionsQueryKey, useCreateInteraction, useDeleteContact, useGetContact, useListInteractions,
} from "@workspace/api-client-react";
import type { InteractionType } from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { CompleteFollowUpDialog } from "@/components/complete-followup-dialog";
import { StatusSelect } from "@/components/status-select";
import { ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/hooks/use-refresh";
import { dueInfo, errMsg, fmtDate, fullName, initials, INTERACTION_TYPES, toDate } from "@/lib/crm";

function LogInteraction({ id }: { id: number }) {
  const { toast } = useToast();
  const refresh = useRefresh();
  const nowLocal = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");
  const [type, setType] = useState<string>("Email");
  const [when, setWhen] = useState(nowLocal());
  const [notes, setNotes] = useState("");
  const create = useCreateInteraction({
    mutation: {
      onSuccess: () => { refresh(); setNotes(""); setWhen(nowLocal()); toast({ title: "Interaction logged" }); },
      onError: (e) => toast({ title: "Couldn't log interaction", description: errMsg(e), variant: "destructive" }),
    },
  });
  return (
    <form className="space-y-3 rounded-xl border bg-card p-5" onSubmit={(e) => {
      e.preventDefault();
      if (!when) return;
      create.mutate({ id, data: { type: type as InteractionType, occurredAt: new Date(when).toISOString(), notes } });
    }}>
      <p className="font-display text-xl">Log an interaction</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger data-testid="select-interaction-type"><SelectValue /></SelectTrigger>
          <SelectContent>{INTERACTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Input type="datetime-local" data-testid="input-interaction-date" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <Textarea data-testid="input-interaction-notes" rows={2} placeholder="What did you talk about?" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex justify-end"><Button type="submit" disabled={create.isPending} data-testid="button-log-interaction">{create.isPending ? "Saving" : "Log interaction"}</Button></div>
    </form>
  );
}

export default function ContactDetail() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [, nav] = useLocation();
  const { toast } = useToast();
  const refresh = useRefresh();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);
  const { data: c, isLoading, isError, refetch } = useGetContact(id, { query: { enabled: Number.isFinite(id), queryKey: getGetContactQueryKey(id) } });
  const { data: interactions, isLoading: il } = useListInteractions(id, { query: { enabled: Number.isFinite(id), queryKey: getListInteractionsQueryKey(id) } });
  const del = useDeleteContact({
    mutation: {
      onSuccess: () => { refresh(); toast({ title: "Contact deleted" }); nav("/contacts"); },
      onError: (e) => toast({ title: "Couldn't delete", description: errMsg(e), variant: "destructive" }),
    },
  });

  const back = <Link href="/contacts" className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Contacts</Link>;
  if (isLoading) return <div>{back}<Skeleton className="mb-4 h-12 w-72" /><Skeleton className="h-64 w-full" /></div>;
  if (isError || !c) return <div>{back}<ErrorState what="this contact" onRetry={() => refetch()} /></div>;

  const fu = c.followUp && c.followUp.status === "pending" ? c.followUp : null;
  const info = fu ? dueInfo(fu.dueDate, fu.dueTime) : null;
  const events = [...(interactions ?? c.interactions ?? [])].sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt));
  const links = [
    c.email && { icon: Mail, text: c.email, href: `mailto:${c.email}` },
    c.phone && { icon: Phone, text: c.phone, href: `tel:${c.phone}` },
    c.website && { icon: Globe, text: c.website, href: /^https?:/.test(c.website) ? c.website : `https://${c.website}` },
  ].filter(Boolean) as { icon: typeof Mail; text: string; href: string }[];

  return (
    <div>
      {back}
      <header className="rise mb-10 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-5">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary font-display text-2xl text-primary-foreground">{initials(c)}</span>
          <div>
            <h1 className="font-display text-4xl font-medium" data-testid="text-contact-name">{fullName(c)}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground"><Building2 className="h-4 w-4" />{[c.jobTitle, c.company].filter(Boolean).join(", ") || "No role added"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusSelect contactId={c.id} value={c.status} />
          <Button variant="outline" size="sm" onClick={() => setEdit(true)} data-testid="button-edit-contact"><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
          <Button variant="ghost" size="icon" aria-label="Delete contact" data-testid="button-delete-contact" onClick={() => setConfirm(true)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="rise rise-1 space-y-8">
          <LogInteraction id={c.id} />
          <section>
            <h2 className="font-display mb-4 text-2xl">Timeline</h2>
            {il && <Skeleton className="h-24 w-full" />}
            <ol className="relative space-y-6 border-l pl-6">
              {events.map((i) => (
                <li key={i.id} className="relative" data-testid={`row-interaction-${i.id}`}>
                  <span className="absolute -left-[30px] top-1.5 h-2.5 w-2.5 rounded-full bg-[hsl(14_75%_52%)] ring-4 ring-background" />
                  <p className="text-sm font-semibold">{i.type}<span className="ml-2 font-normal text-muted-foreground">{format(new Date(i.occurredAt), "MMM d, yyyy 'at' h:mm a")}</span></p>
                  {i.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{i.notes}</p>}
                </li>
              ))}
              <li className="relative">
                <span className="absolute -left-[30px] top-1.5 h-2.5 w-2.5 rounded-full bg-border ring-4 ring-background" />
                <p className="text-sm text-muted-foreground">Added on {fmtDate(c.dateAdded)}</p>
              </li>
            </ol>
            {!il && events.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No interactions yet. Log your first one above.</p>}
          </section>
        </div>

        <aside className="rise rise-2 space-y-8">
          <section className={`rounded-xl border p-5 ${info?.state === "overdue" ? "border-[hsl(14_75%_52%)]/50 bg-accent" : "bg-card"}`}>
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarCheck className="h-4 w-4" />Next follow-up</p>
            {fu && info ? (
              <>
                <p className={`font-display text-2xl ${info.tone}`} data-testid="text-followup-label">{info.label}</p>
                <p className="text-sm text-muted-foreground">{info.when}</p>
                {fu.recurrenceDays && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Repeat className="h-3 w-3" />Every {fu.recurrenceDays} days</p>}
                <Button className="mt-4 w-full" onClick={() => setCompleting(true)} data-testid="button-complete-followup">Mark complete</Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
                <Button variant="outline" className="mt-3 w-full" onClick={() => setEdit(true)}>Schedule one</Button>
              </>
            )}
          </section>

          <section className="space-y-2.5 text-sm">
            {links.map((l) => (
              <a key={l.text} href={l.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 truncate hover:underline underline-offset-2"><l.icon className="h-4 w-4 shrink-0 text-muted-foreground" />{l.text}</a>
            ))}
            {c.socialLinks.map((s) => (
              <a key={s} href={/^https?:/.test(s) ? s : `https://${s}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 truncate hover:underline underline-offset-2"><Globe className="h-4 w-4 shrink-0 text-muted-foreground" />{s}</a>
            ))}
            {links.length === 0 && c.socialLinks.length === 0 && <p className="text-muted-foreground">No contact details yet.</p>}
          </section>

          {c.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{c.tags.map((t) => <span key={t.id} className="rounded-full border px-2.5 py-0.5 text-xs">{t.name}</span>)}</div>}
          <section>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{c.notes || <span className="text-muted-foreground">No notes.</span>}</p>
          </section>
          <p className="text-xs text-muted-foreground">Last contacted: {c.lastContactedAt ? format(toDate(c.lastContactedAt), "MMM d, yyyy") : "never"}</p>
        </aside>
      </div>

      <ContactFormDialog open={edit} onOpenChange={setEdit} contact={c} />
      <CompleteFollowUpDialog onClose={() => setCompleting(false)} target={completing && fu ? { id: fu.id, name: fullName(c), recurrenceDays: fu.recurrenceDays } : null} />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {fullName(c)}?</AlertDialogTitle>
            <AlertDialogDescription>This removes the contact, their interactions, and any scheduled follow-up. It can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep contact</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete" onClick={() => del.mutate({ id: c.id })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
