import { useState } from "react";
import { useClerk, useUser } from "@clerk/react";
import { Plus, X } from "lucide-react";
import { getListTagsQueryKey, useCreateTag, useDeleteTag, useListTags } from "@workspace/api-client-react";
import type { Tag } from "@workspace/api-client-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, PageHeader } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { useRefresh } from "@/hooks/use-refresh";
import { errMsg } from "@/lib/crm";
import { ReminderSettings } from "@/components/reminder-settings";

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const refresh = useRefresh();
  const [name, setName] = useState("");
  const [doomed, setDoomed] = useState<Tag | null>(null);
  const { data, isLoading, isError, refetch } = useListTags({ query: { queryKey: getListTagsQueryKey() } });
  const create = useCreateTag({
    mutation: {
      onSuccess: () => { refresh(); setName(""); toast({ title: "Tag created" }); },
      onError: (e) => toast({ title: "Couldn't create tag", description: errMsg(e), variant: "destructive" }),
    },
  });
  const del = useDeleteTag({
    mutation: {
      onSuccess: () => { refresh(); setDoomed(null); toast({ title: "Tag deleted" }); },
      onError: (e) => toast({ title: "Couldn't delete tag", description: errMsg(e), variant: "destructive" }),
    },
  });
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Settings" title="Your account" />
      <section className="rise rise-1 mb-12 rounded-xl border bg-card p-6">
        <h2 className="font-display mb-4 text-2xl">Profile</h2>
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary font-display text-xl text-primary-foreground">{(user?.firstName?.[0] ?? user?.primaryEmailAddress?.emailAddress?.[0] ?? "?").toUpperCase()}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold" data-testid="text-account-name">{user?.fullName || "Your account"}</p>
            <p className="truncate text-sm text-muted-foreground" data-testid="text-account-email">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
          <Button variant="outline" data-testid="button-settings-sign-out" onClick={() => signOut({ redirectUrl: base || "/" })}>Sign out</Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Password resets are handled on the sign-in screen with "Forgot password".</p>
      </section>

      <ReminderSettings />

      <section className="rise rise-2">
        <h2 className="font-display text-2xl">Tags</h2>
        <p className="mb-5 mt-1 text-sm text-muted-foreground">Custom labels for grouping contacts, like Referral, Podcast guest, or Gallery.</p>
        <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (name.trim()) create.mutate({ data: { name: name.trim() } }); }}>
          <Input data-testid="input-tag-name" maxLength={40} placeholder="New tag name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button type="submit" disabled={create.isPending || !name.trim()} data-testid="button-create-tag" className="gap-1.5"><Plus className="h-4 w-4" />Add</Button>
        </form>
        {isLoading && <Skeleton className="h-24 w-full" />}
        {isError && <ErrorState what="tags" onRetry={() => refetch()} />}
        {data && data.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No tags yet. Add your first above.</p>}
        {data && data.length > 0 && (
          <ul className="divide-y border-y">
            {data.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3" data-testid={`row-tag-${t.id}`}>
                <span className="font-medium">{t.name}</span>
                <span className="flex items-center gap-3 text-sm text-muted-foreground">
                  {t.contactCount} {t.contactCount === 1 ? "contact" : "contacts"}
                  <Button variant="ghost" size="icon" aria-label={`Delete ${t.name}`} data-testid={`button-delete-tag-${t.id}`} onClick={() => setDoomed(t)}><X className="h-4 w-4" /></Button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={!!doomed} onOpenChange={(o) => !o && setDoomed(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the tag "{doomed?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>It will be removed from {doomed?.contactCount ?? 0} contact(s). The contacts themselves stay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-tag" onClick={(e) => { e.preventDefault(); if (doomed) del.mutate({ id: doomed.id }); }}>Delete tag</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
