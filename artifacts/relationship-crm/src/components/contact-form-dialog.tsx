import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useCreateContact, useListTags, useUpdateContact } from "@workspace/api-client-react";
import type { Contact, RelationshipStatus } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/hooks/use-refresh";
import { STATUSES, errMsg } from "@/lib/crm";
import { cn } from "@/lib/utils";
import { Form } from "@/components/ui/form";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contact?: Contact;
  onSaved?: (c: Contact) => void;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ContactForm({ contact, onDone, onSaved }: { contact?: Contact; onDone: () => void; onSaved?: (c: Contact) => void }) {
  const { toast } = useToast();
  const refresh = useRefresh();
  const { data: tags } = useListTags();
  const fu = contact?.followUp && contact.followUp.status === "pending" ? contact.followUp : null;
  const form = useForm({ defaultValues: {
    firstName: contact?.firstName ?? "",
    lastName: contact?.lastName ?? "",
    company: contact?.company ?? "",
    jobTitle: contact?.jobTitle ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    website: contact?.website ?? "",
    socials: (contact?.socialLinks ?? []).join("\n"),
    notes: contact?.notes ?? "",
    status: (contact?.status ?? "New Lead") as RelationshipStatus,
    tagIds: contact?.tags.map((t) => t.id) ?? ([] as number[]),
    date: fu?.dueDate?.slice(0, 10) ?? "",
    time: fu?.dueTime?.slice(0, 5) ?? "",
    repeat: fu?.recurrenceDays ? String(fu.recurrenceDays) : "",
    lastContacted: contact?.lastContactedAt ? format(new Date(contact.lastContactedAt), "yyyy-MM-dd") : "",
  } });
  const f = form.watch();
  const [error, setError] = useState("");
  const set = form.setValue;
  const opts = {
    onSuccess: (c: Contact) => {
      refresh();
      toast({ title: contact ? "Contact updated" : "Contact added", description: `${c.firstName} ${c.lastName}` });
      onSaved?.(c);
      onDone();
    },
    onError: (e: unknown) => setError(errMsg(e)),
  };
  const create = useCreateContact({ mutation: opts });
  const update = useUpdateContact({ mutation: opts });
  const pending = create.isPending || update.isPending;

  const submit = () => {
    setError("");
    if (!f.firstName.trim() || !f.lastName.trim()) return setError("First and last name are required.");
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) return setError("That email address doesn't look right.");
    const repeat = f.repeat ? Number(f.repeat) : null;
    if (repeat !== null && (!Number.isInteger(repeat) || repeat < 1)) return setError("Repeat interval must be a whole number of days.");
    if (repeat && !f.date) return setError("Pick a first follow-up date to repeat from.");
    const data = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      company: f.company.trim() || null,
      jobTitle: f.jobTitle.trim() || null,
      email: f.email.trim() || null,
      phone: f.phone.trim() || null,
      website: f.website.trim() || null,
      socialLinks: f.socials.split("\n").map((s) => s.trim()).filter(Boolean),
      notes: f.notes,
      status: f.status,
      tagIds: f.tagIds,
      lastContactedAt: f.lastContacted ? new Date(`${f.lastContacted}T12:00:00`).toISOString() : null,
      nextFollowUpDate: f.date || null,
      nextFollowUpTime: f.date && f.time ? f.time : null,
      recurrenceDays: f.date ? repeat : null,
    };
    if (contact) update.mutate({ id: contact.id, data });
    else create.mutate({ data });
  };

  return (
    <Form {...form}><form onSubmit={form.handleSubmit(submit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><Input data-testid="input-first-name" autoFocus value={f.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
        <Field label="Last name"><Input data-testid="input-last-name" value={f.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
        <Field label="Company"><Input data-testid="input-company" value={f.company} onChange={(e) => set("company", e.target.value)} /></Field>
        <Field label="Title"><Input data-testid="input-title" value={f.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} /></Field>
        <Field label="Email"><Input data-testid="input-email" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><Input data-testid="input-phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Website" className="sm:col-span-2"><Input data-testid="input-website" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" /></Field>
        <Field label="Social links (one per line)" className="sm:col-span-2"><Textarea data-testid="input-socials" rows={2} value={f.socials} onChange={(e) => set("socials", e.target.value)} /></Field>
        <Field label="Status">
          <Select value={f.status} onValueChange={(v) => set("status", v as RelationshipStatus)}>
            <SelectTrigger data-testid="select-form-status"><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Last contacted (optional)"><Input data-testid="input-last-contacted" type="date" value={f.lastContacted} onChange={(e) => set("lastContacted", e.target.value)} /></Field>
      </div>

      <Field label="Tags">
        {tags && tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = f.tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  data-testid={`toggle-tag-${t.id}`}
                  onClick={() => set("tagIds", on ? f.tagIds.filter((i) => i !== t.id) : [...f.tagIds, t.id])}
                  className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-all active:scale-95", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-foreground/40")}
                >
                  {on && <Check className="h-3 w-3" />}
                  {t.name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No tags yet. Create some in Settings.</p>
        )}
      </Field>

      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="mb-3 text-sm font-semibold">Next follow-up</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date"><Input data-testid="input-followup-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Time (optional)"><Input data-testid="input-followup-time" type="time" value={f.time} onChange={(e) => set("time", e.target.value)} disabled={!f.date} /></Field>
          <Field label="Repeat every (days)"><Input data-testid="input-followup-repeat" type="number" min={1} placeholder="Never" value={f.repeat} onChange={(e) => set("repeat", e.target.value)} disabled={!f.date} /></Field>
        </div>
        {contact && f.date && (
          <button type="button" data-testid="button-remove-followup" className="mt-3 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" onClick={() => { set("date", ""); set("time", ""); set("repeat", ""); }}>
            Remove follow-up
          </button>
        )}
      </div>

      <Field label="Notes"><Textarea data-testid="input-notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Context worth remembering" /></Field>

      {error && <p role="alert" data-testid="text-form-error" className="text-sm font-medium text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={pending} data-testid="button-save-contact">{pending ? "Saving" : contact ? "Save changes" : "Add contact"}</Button>
      </div>
    </form></Form>
  );
}

export function ContactFormDialog({ open, onOpenChange, contact, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-medium">{contact ? "Edit contact" : "Add a contact"}</DialogTitle>
          <DialogDescription>{contact ? "Update details, tags, or the next follow-up." : "Add someone, then decide when to reach out next."}</DialogDescription>
        </DialogHeader>
        {open && <ContactForm key={contact?.id ?? "new"} contact={contact} onSaved={onSaved} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}
