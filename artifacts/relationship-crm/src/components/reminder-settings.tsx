import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/react";
import { getGetReminderPreferencesQueryKey, useGetReminderPreferences, useUpdateReminderPreferences } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/states";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/crm";

export function ReminderSettings() {
  const { user } = useUser();
  const { toast } = useToast();
  const client = useQueryClient();
  const query = useGetReminderPreferences({ query: { queryKey: getGetReminderPreferencesQueryKey(), staleTime: 0, refetchInterval: 60_000 } });
  const [timezone, setTimezone] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (query.data && !dirty) {
      setTimezone(query.data.timezone);
      setEnabled(query.data.emailEnabled);
    }
  }, [query.data, dirty]);
  const save = useUpdateReminderPreferences({
    mutation: {
      onSuccess: data => {
        client.setQueryData(getGetReminderPreferencesQueryKey(), data);
        setDirty(false);
        toast({ title: "Reminder settings saved" });
      },
      onError: e => toast({ title: "Couldn't save reminders", description: errMsg(e), variant: "destructive" }),
    },
  });
  return (
    <section className="mb-12 rounded-xl border bg-card p-6">
      <h2 className="font-display mb-2 text-2xl">Follow-up reminders</h2>
      <p className="mb-5 text-sm text-muted-foreground">Email reminders can reach you while the app is closed. Each scheduled follow-up gets one email at its optional reminder time, or at midnight when no time is set. Overdue reminders are sent when delivery resumes.</p>
      {query.isLoading && <Skeleton className="h-32 w-full" />}
      {query.isError && <ErrorState what="reminder settings" onRetry={() => query.refetch()} />}
      {query.data && (
        <>
          {!query.data.deliveryAvailable && <p role="status" className="mb-4 rounded-lg bg-muted p-3 text-sm">Email delivery is not configured. In-app reminders still work; email opt-in will become available after a real sender and background worker are enabled.</p>}
          <form onSubmit={e => { e.preventDefault(); save.mutate({ data: { emailEnabled: enabled, timezone: timezone.trim() } }); }} className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" data-testid="checkbox-email-reminders"
                checked={enabled} disabled={save.isPending || (!query.data.deliveryAvailable && !enabled)}
                onChange={e => { setEnabled(e.target.checked); setDirty(true); }} />
              <span><span className="font-semibold">Email me follow-up reminders</span><span className="mt-1 block text-muted-foreground">Sent only to your verified primary account email: {query.data.email || user?.primaryEmailAddress?.emailAddress || "verify your account email"}. You can turn this off at any time.</span></span>
            </label>
            <div>
              <label htmlFor="reminder-timezone" className="mb-1.5 block text-sm font-medium">Reminder timezone</label>
              <Input id="reminder-timezone" data-testid="input-reminder-timezone" value={timezone} maxLength={100}
                placeholder="America/New_York" disabled={save.isPending}
                onChange={e => { setTimezone(e.target.value); setDirty(true); }} />
              <button type="button" className="mt-2 text-xs text-primary underline" disabled={save.isPending}
                onClick={() => { setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone); setDirty(true); }}>Use my device timezone</button>
              <p className="mt-2 text-xs text-muted-foreground">Use an IANA timezone, such as America/New_York or Europe/London. This stays saved when you travel; daylight saving changes are handled automatically.</p>
            </div>
            <Button type="submit" data-testid="button-save-reminders" disabled={save.isPending || !dirty || !timezone.trim()}>{save.isPending ? "Saving…" : "Save reminder settings"}</Button>
          </form>
          {query.data.recentDeliveries.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-semibold">Recent email attempts</h3>
              <p className="mt-1 text-xs text-muted-foreground">“Sent” means accepted by the email provider, not confirmed inbox delivery. An uncertain attempt is paused to avoid a duplicate.</p>
              <ul className="mt-3 divide-y">
                {query.data.recentDeliveries.map(d => (
                  <li key={d.id} className="py-2 text-sm">
                    <div className="flex justify-between gap-3"><span>Follow-up #{d.followUpId}</span><span className="capitalize">{d.state} · {d.attempts} {d.attempts === 1 ? "attempt" : "attempts"}</span></div>
                    {d.lastError && <p className="mt-1 text-xs text-muted-foreground">{d.lastError}</p>}
                    {d.sentAt && <p className="mt-1 text-xs text-muted-foreground">{new Date(d.sentAt).toLocaleString()}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
