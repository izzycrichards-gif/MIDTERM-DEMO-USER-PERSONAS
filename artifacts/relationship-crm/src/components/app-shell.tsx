import { createContext, useContext, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk, useUser } from "@clerk/react";
import { Bell, CalendarCheck, LayoutGrid, LogOut, Plus, Settings, Users } from "lucide-react";
import {
  getListNotificationsQueryKey, useListNotifications, useMarkNotificationRead,
} from "@workspace/api-client-react";
import { Wordmark } from "@/components/logo";
import { ContactFormDialog } from "@/components/contact-form-dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useRefresh } from "@/hooks/use-refresh";
import { cn } from "@/lib/utils";

const AddCtx = createContext<() => void>(() => {});
export const useAddContact = () => useContext(AddCtx);

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Bell_() {
  const [, nav] = useLocation();
  const refresh = useRefresh();
  const { data, isError } = useListNotifications({ query: { queryKey: getListNotificationsQueryKey(), refetchInterval: 60000 } });
  const mark = useMarkNotificationRead({ mutation: { onSuccess: () => refresh() } });
  const unread = (data ?? []).filter((n) => !n.readAt);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" data-testid="button-notifications">
          <Bell className="h-[18px] w-[18px]" />
          {unread.length > 0 && (
            <span data-testid="badge-unread" className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[hsl(14_75%_52%)] px-1 text-[10px] font-bold text-white">{unread.length}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3 text-sm font-semibold">Reminders</div>
        <div className="max-h-80 overflow-y-auto">
          {isError && <p className="p-4 text-sm text-destructive">Couldn't load reminders.</p>}
          {!isError && (data ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">All quiet. Reminders appear here when follow-ups come due.</p>}
          {(data ?? []).map((n) => (
            <button key={n.id} data-testid={`notification-${n.id}`}
              onClick={() => { if (!n.readAt) mark.mutate({ id: n.id }); nav(`/contacts/${n.contactId}`); }}
              className="flex w-full gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-[hsl(14_75%_52%)]")} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{n.title}</span>
                <span className="block text-xs text-muted-foreground">{n.message}</span>
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [loc] = useLocation();
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const { signOut } = useClerk();
  const active = (h: string) => loc === h || loc.startsWith(h + "/");
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <AddCtx.Provider value={() => setOpen(true)}>
      <div className="min-h-[100dvh] md:pl-64">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar px-4 py-6 md:flex">
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" aria-label="Dashboard"><Wordmark /></Link>
            <Bell_ />
          </div>
          <Button className="mt-8 justify-start gap-2" onClick={() => setOpen(true)} data-testid="button-add-contact">
            <Plus className="h-4 w-4" /> Add contact
          </Button>
          <nav className="mt-6 flex flex-col gap-0.5">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} data-testid={`link-nav-${n.label.toLowerCase()}`}
                className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", active(n.href) ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground")}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{name.slice(0, 2).toUpperCase()}</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium" data-testid="text-user-name">{name}</span>
            <Button variant="ghost" size="icon" aria-label="Sign out" data-testid="button-sign-out" onClick={() => signOut({ redirectUrl: base || "/" })}><LogOut className="h-4 w-4" /></Button>
          </div>
        </aside>

        <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-background/90 px-4 py-2.5 backdrop-blur md:hidden">
          <Link href="/dashboard"><Wordmark /></Link>
          <div className="flex items-center gap-1">
            <Bell_ />
            <Button size="sm" onClick={() => setOpen(true)} data-testid="button-add-contact-mobile"><Plus className="mr-1 h-4 w-4" />Add</Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl px-5 pb-28 pt-8 md:px-10 md:pb-16 md:pt-12">{children}</main>

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-background/95 backdrop-blur md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active(n.href) ? "text-primary" : "text-muted-foreground")}>
              <n.icon className="h-5 w-5" />{n.label}
            </Link>
          ))}
        </nav>
      </div>
      <ContactFormDialog open={open} onOpenChange={setOpen} />
    </AddCtx.Provider>
  );
}
