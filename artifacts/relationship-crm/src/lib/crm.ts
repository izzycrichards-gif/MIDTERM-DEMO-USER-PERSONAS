import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { RelationshipStatus, InteractionType } from "@workspace/api-client-react";
import type { Contact } from "@workspace/api-client-react";

export const STATUSES = Object.values(RelationshipStatus);
export const INTERACTION_TYPES = Object.values(InteractionType);

const TONES: Record<string, string> = {
  "New Lead": "bg-[hsl(205_60%_92%)] text-[hsl(205_60%_26%)]",
  "Warm Lead": "bg-[hsl(30_85%_90%)] text-[hsl(24_70%_30%)]",
  "Active Contact": "bg-[hsl(160_40%_88%)] text-[hsl(166_50%_20%)]",
  Client: "bg-primary text-primary-foreground",
  "Past Client": "bg-[hsl(36_20%_88%)] text-[hsl(30_10%_30%)]",
  "Networking Contact": "bg-[hsl(265_35%_92%)] text-[hsl(265_30%_32%)]",
  "Follow-Up Needed": "bg-accent text-accent-foreground",
  "Not a Fit": "bg-[hsl(0_0%_90%)] text-[hsl(0_0%_38%)]",
};
export const statusTone = (s: string) => TONES[s] ?? "bg-muted text-foreground";

export const fullName = (c: Pick<Contact, "firstName" | "lastName">) => `${c.firstName} ${c.lastName}`.trim();
export const initials = (c: Pick<Contact, "firstName" | "lastName">) =>
  `${c.firstName[0] ?? ""}${c.lastName[0] ?? ""}`.toUpperCase();

export const toDate = (s: string) => parseISO(s.length > 10 ? s : `${s}T00:00:00`);
export const ymd = (d: Date) => format(d, "yyyy-MM-dd");
export const today = () => ymd(new Date());
export const plusDays = (n: number) => ymd(addDays(new Date(), n));

export function dueInfo(dueDate: string, dueTime?: string | null) {
  const diff = differenceInCalendarDays(toDate(dueDate), new Date());
  const when = format(toDate(dueDate), "EEE, MMM d") + (dueTime ? ` at ${dueTime.slice(0, 5)}` : "");
  if (diff < 0) return { label: diff === -1 ? "1 day overdue" : `${-diff} days overdue`, when, tone: "text-[hsl(14_70%_38%)]", state: "overdue" as const };
  if (diff === 0) return { label: "Due today", when, tone: "text-primary", state: "today" as const };
  if (diff === 1) return { label: "Tomorrow", when, tone: "text-muted-foreground", state: "upcoming" as const };
  return { label: `In ${diff} days`, when, tone: "text-muted-foreground", state: "upcoming" as const };
}

export const fmtDate = (s?: string | null) => (s ? format(toDate(s), "MMM d, yyyy") : "Never");
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong. Please try again.");
