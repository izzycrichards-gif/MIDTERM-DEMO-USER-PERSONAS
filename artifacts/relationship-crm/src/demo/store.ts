export const DEMO_KEY = "full-circle:public-demo:v2";

export const DEMO_STATUSES = [
  "New Lead", "Warm Lead", "Active Contact", "Client",
  "Past Client", "Networking Contact", "Follow-Up Needed", "Not a Fit",
] as const;
export const DEMO_INTERACTION_TYPES = ["Email", "Phone call", "Text", "Meeting", "Social media", "Other"] as const;
export type DemoStatus = typeof DEMO_STATUSES[number];
export type DemoInteractionType = typeof DEMO_INTERACTION_TYPES[number];

export type DemoTag = { id: number; name: string };
export type DemoInteraction = { id: number; type: DemoInteractionType; occurredAt: string; notes: string };
export type DemoFollowUp = { id: number; dueDate: string; dueTime: string | null; recurrenceDays: number | null; status: "pending" | "completed"; completedAt?: string | null };
export type DemoContact = {
  id: number; firstName: string; lastName: string; company: string | null; jobTitle: string | null;
  email: string | null; phone: string | null; website: string | null; socialLinks: string[];
  notes: string; status: DemoStatus; tagIds: number[]; dateAdded: string; lastContactedAt: string | null;
  followUps: DemoFollowUp[]; interactions: DemoInteraction[];
};
export type DemoStore = { contacts: DemoContact[]; tags: DemoTag[]; nextContactId: number; nextId: number; seededDay: string };

const localYmd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const demoDate = (offset: number) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return localYmd(d);
};
const dateAt = (offset: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};
const due = (id: number, offset: number, hour = 10, recurrenceDays: number | null = null): DemoFollowUp => ({
  id, dueDate: demoDate(offset), dueTime: `${String(hour).padStart(2, "0")}:00`, recurrenceDays, status: "pending",
});

export function makeSampleStore(): DemoStore {
  const tags = [
    { id: 1, name: "Branding" }, { id: 2, name: "Referral" }, { id: 3, name: "Local" },
    { id: 4, name: "Creative" }, { id: 5, name: "Quarterly" }, { id: 6, name: "Studio" },
  ];
  const contacts: DemoContact[] = [
    { id: 1, firstName: "Maya", lastName: "Chen", company: "Fieldnotes Studio", jobTitle: "Founder & Art Director", email: "maya@fieldnotes.studio", phone: "(415) 555-0138", website: "fieldnotes.studio", socialLinks: ["instagram.com/fieldnotes"], notes: "Met at the Oakland makers market. Interested in a refreshed identity before the fall collection. Prefers email in the morning.", status: "Warm Lead", tagIds: [1, 3, 4], dateAdded: demoDate(-46), lastContactedAt: dateAt(-4), followUps: [due(101, -2, 9)], interactions: [{ id: 201, type: "Meeting", occurredAt: dateAt(-12), notes: "Talked through the new collection and her launch timeline." }, { id: 202, type: "Email", occurredAt: dateAt(-4), notes: "Sent a short project outline and two relevant case studies." }] },
    { id: 2, firstName: "Theo", lastName: "Martinez", company: "Goodweather Coffee", jobTitle: "Owner", email: "theo@goodweather.coffee", phone: "(510) 555-0172", website: "goodweather.coffee", socialLinks: [], notes: "A thoughtful neighborhood roaster looking to improve wholesale packaging.", status: "Client", tagIds: [1, 3, 5], dateAdded: demoDate(-220), lastContactedAt: dateAt(-1), followUps: [due(102, 0, 11, 14)], interactions: [{ id: 203, type: "Phone call", occurredAt: dateAt(-1), notes: "Quick check-in on the second packaging proof." }, { id: 204, type: "Email", occurredAt: dateAt(-14), notes: "Approved the revised label direction." }] },
    { id: 3, firstName: "Imani", lastName: "Brooks", company: "Independent", jobTitle: "Photographer", email: "imani@imanibrooks.com", phone: "(415) 555-0186", website: "imanibrooks.com", socialLinks: ["instagram.com/imanibrooks"], notes: "Met through Jo at the spring studio crawl. Great portrait photographer; possible reciprocal referrals.", status: "Networking Contact", tagIds: [2, 4, 6], dateAdded: demoDate(-31), lastContactedAt: dateAt(-9), followUps: [due(103, 3, 14)], interactions: [{ id: 205, type: "Social media", occurredAt: dateAt(-9), notes: "Replied to her post about the new portrait series." }] },
    { id: 4, firstName: "Oliver", lastName: "Grant", company: "Grant & Alder", jobTitle: "Principal", email: "oliver@grantandalder.com", phone: "(503) 555-0161", website: "grantandalder.com", socialLinks: [], notes: "Past client. Their team may be ready for a seasonal campaign refresh.", status: "Past Client", tagIds: [1, 5], dateAdded: demoDate(-380), lastContactedAt: dateAt(-55), followUps: [{ ...due(107, -21), status: "completed", completedAt: dateAt(-20) }, due(104, 7, 10)], interactions: [{ id: 206, type: "Email", occurredAt: dateAt(-55), notes: "Shared a note after seeing their new storefront." }] },
    { id: 5, firstName: "Ava", lastName: "Patel", company: "Juniper House", jobTitle: "Operations Lead", email: "ava@juniperhouse.co", phone: "(206) 555-0195", website: "juniperhouse.co", socialLinks: [], notes: "Referred by Maya. Wants a small website tidy-up and an estimate.", status: "New Lead", tagIds: [2, 4], dateAdded: demoDate(-8), lastContactedAt: null, followUps: [due(105, -1, 15)], interactions: [{ id: 207, type: "Email", occurredAt: dateAt(-8), notes: "Received an introduction from Maya and sent a warm reply." }] },
    { id: 6, firstName: "Noah", lastName: "Williams", company: "Common Ground Arts", jobTitle: "Program Director", email: "noah@commongroundarts.org", phone: "(503) 555-0129", website: "commongroundarts.org", socialLinks: [], notes: "Community arts group. Budget is still being confirmed for this season.", status: "Active Contact", tagIds: [3, 6], dateAdded: demoDate(-97), lastContactedAt: dateAt(-2), followUps: [due(106, 0, 16)], interactions: [{ id: 208, type: "Text", occurredAt: dateAt(-2), notes: "Confirmed the board review is still on for next week." }] },
    { id: 7, firstName: "Lena", lastName: "Fischer", company: "Lena Fischer Ceramics", jobTitle: "Ceramic Artist", email: "hello@lenafischer.ceramics", phone: "(415) 555-0107", website: "lenafischer.ceramics", socialLinks: ["instagram.com/lenafischer"], notes: "Lovely work, but the timing and scope were not a fit this season. Keep the door open.", status: "Not a Fit", tagIds: [4, 6], dateAdded: demoDate(-68), lastContactedAt: dateAt(-28), followUps: [], interactions: [{ id: 209, type: "Other", occurredAt: dateAt(-28), notes: "Discussed a possible catalog. Decided to reconnect another year." }] },
    { id: 8, firstName: "Rafael", lastName: "Ortiz", company: "Brightside Books", jobTitle: "Publisher", email: "rafael@brightsidebooks.com", phone: "(415) 555-0114", website: "brightsidebooks.com", socialLinks: [], notes: "Interested in a repeat project. Check how the launch has landed before proposing next steps.", status: "Follow-Up Needed", tagIds: [1, 2, 5], dateAdded: demoDate(-140), lastContactedAt: dateAt(-18), followUps: [due(108, 1, 9)], interactions: [{ id: 210, type: "Phone call", occurredAt: dateAt(-18), notes: "Launch went smoothly; he asked to circle back after the first month." }] },
  ];
  return { contacts, tags, nextContactId: 9, nextId: 220, seededDay: demoDate(0) };
}

function dayOffset(from: string, to: string) {
  const parse = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((parse(to) - parse(from)) / 86_400_000);
}

function shiftTimestamp(value: string | null | undefined, offset: number) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + offset);
  return date.toISOString();
}

function shiftCalendarDate(value: string, offset: number) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + offset);
  return localYmd(date);
}

export function readDemoStore(): DemoStore {
  try {
    const saved = localStorage.getItem(DEMO_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as DemoStore;
      if (Array.isArray(parsed.contacts) && Array.isArray(parsed.tags)) {
        const today = demoDate(0);
        const offset = dayOffset(typeof parsed.seededDay === "string" ? parsed.seededDay : today, today);
        if (!offset) return { ...parsed, seededDay: today };
        const shifted: DemoStore = {
          ...parsed,
          seededDay: today,
          contacts: parsed.contacts.map((contact) => ({
            ...contact,
            dateAdded: shiftCalendarDate(contact.dateAdded, offset),
            lastContactedAt: shiftTimestamp(contact.lastContactedAt, offset) ?? null,
            followUps: contact.followUps.map((followUp) => ({
              ...followUp,
              dueDate: shiftCalendarDate(followUp.dueDate, offset),
              completedAt: shiftTimestamp(followUp.completedAt, offset),
            })),
            interactions: contact.interactions.map((interaction) => ({
              ...interaction, occurredAt: shiftTimestamp(interaction.occurredAt, offset) ?? interaction.occurredAt,
            })),
          })),
        };
        writeDemoStore(shifted);
        return shifted;
      }
    }
  } catch { /* a blocked or malformed storage value falls back to fresh sample data */ }
  const fresh = makeSampleStore();
  writeDemoStore(fresh);
  return fresh;
}
export function writeDemoStore(store: DemoStore) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(store)); } catch { /* demo remains usable for this session */ }
}
export const contactName = (contact: Pick<DemoContact, "firstName" | "lastName">) => `${contact.firstName} ${contact.lastName}`.trim();
export const contactInitials = (contact: Pick<DemoContact, "firstName" | "lastName">) => `${contact.firstName[0] ?? ""}${contact.lastName[0] ?? ""}`.toUpperCase();
export function dateLabel(date: string | null | undefined) {
  if (!date) return "Never";
  const d = new Date(date.length === 10 ? `${date}T12:00:00` : date);
  return Number.isNaN(d.getTime()) ? "Never" : new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(d);
}
