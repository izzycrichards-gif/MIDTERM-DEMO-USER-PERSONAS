import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, ArrowUpRight, CalendarClock, Check, CheckCircle2, CircleHelp,
  Handshake, LayoutDashboard, ListTodo, Mail, MessageCircle, Pencil, Phone, Plus,
  RotateCcw, Search, Settings, Sparkles, Tag, Trash2, Users, X,
} from "lucide-react";
import "./demo.css";
import {
  contactInitials, contactName, dateLabel, demoDate, DEMO_INTERACTION_TYPES,
  DEMO_STATUSES, makeSampleStore, readDemoStore, writeDemoStore,
} from "./store";
import type { DemoContact, DemoFollowUp, DemoInteractionType, DemoStatus, DemoStore } from "./store";

type Modal =
  | { type: "contact"; contact?: DemoContact }
  | { type: "interaction"; contact: DemoContact }
  | { type: "reschedule"; contact: DemoContact; followUp: DemoFollowUp }
  | { type: "tag" }
  | null;
type NavKey = "dashboard" | "contacts" | "follow-ups" | "settings";
const pathFor = (key: NavKey) => `/demo/${key}`;
const statusClass = (status: string) => ({
  "New Lead": "lead", "Warm Lead": "warm", "Active Contact": "", Client: "client",
  "Past Client": "past", "Networking Contact": "network", "Follow-Up Needed": "follow", "Not a Fit": "notfit",
}[status] ?? "");
const getDueState = (date: string) => {
  const today = demoDate(0);
  if (date < today) return "overdue";
  if (date === today) return "today";
  return "upcoming";
};
const dateTimeLabel = (date: string, time?: string | null) =>
  `${dateLabel(date)}${time ? ` · ${time.slice(0, 5)}` : ""}`;
const recurrenceLabel = (followUp: DemoFollowUp) =>
  followUp.recurrenceDays ? ` · Repeats every ${followUp.recurrenceDays} days` : "";
const firstPendingFollowUp = (contact: DemoContact) => contact.followUps
  .filter((item) => item.status === "pending")
  .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

function DemoAvatar({ contact, small = false }: { contact: DemoContact; small?: boolean }) {
  return <span className={`demo-avatar${small ? " small" : ""}`}>{contactInitials(contact)}</span>;
}

function DemoModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="demo-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="demo-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className="demo-modal-head"><h2>{title}</h2><button className="demo-icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      {children}
    </section>
  </div>;
}

export default function DemoWorkspace() {
  const [location, setLocation] = useLocation();
  const [store, setStore] = useState<DemoStore>(() => readDemoStore());
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [contactFollowFilter, setContactFollowFilter] = useState("all");
  const [sort, setSort] = useState("next");
  const [followFilter, setFollowFilter] = useState("all");
  const editFollowUp = modal?.type === "contact" && modal.contact
    ? modal.contact.followUps.find((item) => item.status === "pending") : undefined;

  const activeNav: NavKey = location.startsWith("/demo/contacts") ? "contacts"
    : location.startsWith("/demo/follow-ups") ? "follow-ups"
      : location.startsWith("/demo/settings") ? "settings" : "dashboard";
  const currentContact = useMemo(() => {
    const match = location.match(/^\/demo\/contacts\/([^/]+)/);
    return match ? store.contacts.find((c) => String(c.id) === match[1]) : undefined;
  }, [location, store.contacts]);
  const commit = (next: DemoStore) => { setStore(next); writeDemoStore(next); };
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };
  const reset = () => {
    if (!window.confirm("Reset this browser's Full Circle demo back to the original sample data?")) return;
    const fresh = makeSampleStore();
    commit(fresh);
    setModal(null);
    setLocation("/demo/dashboard");
    notify("Sample workspace reset");
  };
  const allFollowUps = useMemo(() => store.contacts.flatMap((contact) => contact.followUps
    .filter((item) => item.status === "pending")
    .map((followUp) => ({ contact, followUp, state: getDueState(followUp.dueDate) }))
  ).sort((a, b) => a.followUp.dueDate.localeCompare(b.followUp.dueDate)), [store.contacts]);
  const dueToday = allFollowUps.filter((item) => item.state === "today");
  const overdue = allFollowUps.filter((item) => item.state === "overdue");
  const upcoming = allFollowUps.filter((item) => item.state === "upcoming");
  const contactsFiltered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    const filtered = store.contacts.filter((contact) => {
      const haystack = [
        contact.firstName, contact.lastName, contact.company ?? "", contact.jobTitle ?? "",
        contact.email ?? "", contact.phone ?? "", contact.website ?? "", ...contact.socialLinks,
        ...contact.tagIds.map((id) => store.tags.find((tag) => tag.id === id)?.name ?? ""),
      ].join(" ").toLowerCase();
      const pending = firstPendingFollowUp(contact);
      const followFilterMatches = contactFollowFilter === "all"
        || (contactFollowFilter === "completed" && contact.followUps.some((item) => item.status === "completed"))
        || (contactFollowFilter === "none" && !pending)
        || (!!pending && getDueState(pending.dueDate) === contactFollowFilter);
      return (!normalized || haystack.includes(normalized))
        && (statusFilter === "all" || contact.status === statusFilter)
        && (tagFilter === "all" || contact.tagIds.includes(Number(tagFilter)))
        && followFilterMatches;
    });
    return filtered.sort((a, b) => {
      if (sort === "name") return contactName(a).localeCompare(contactName(b));
      if (sort === "recent") return (b.lastContactedAt ?? "").localeCompare(a.lastContactedAt ?? "");
      const ad = firstPendingFollowUp(a)?.dueDate ?? "9999-12-31";
      const bd = firstPendingFollowUp(b)?.dueDate ?? "9999-12-31";
      return ad.localeCompare(bd);
    });
  }, [store, query, statusFilter, tagFilter, contactFollowFilter, sort]);

  function saveContact(form: HTMLFormElement, original?: DemoContact) {
    const data = new FormData(form);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const tags = data.getAll("tagIds").map(Number);
    const status = text("status") as DemoStatus;
    const socialLinks = text("socialLinks").split("\n").map((link) => link.trim()).filter(Boolean);
    const followDate = text("nextFollowUpDate");
    const followTime = text("nextFollowUpTime") || null;
    const repeatValue = text("recurrenceDays");
    const recurrenceDays = repeatValue ? Number(repeatValue) : null;
    if (recurrenceDays !== null && (!Number.isInteger(recurrenceDays) || recurrenceDays < 1)) {
      notify("Repeat interval must be a whole number of days");
      return;
    }
    let followUps = [...(original?.followUps ?? [])];
    const pendingFollowUp = followUps.find((item) => item.status === "pending");
    let nextId = store.nextId;
    if (followDate) {
      if (pendingFollowUp) {
        followUps = followUps.map((item) => item.id === pendingFollowUp.id
          ? { ...item, dueDate: followDate, dueTime: followTime, recurrenceDays } : item);
      } else {
        followUps.push({ id: nextId++, dueDate: followDate, dueTime: followTime, recurrenceDays, status: "pending" });
      }
    } else {
      followUps = followUps.filter((item) => item.status !== "pending");
    }
    const contact: DemoContact = {
      id: original?.id ?? store.nextContactId,
      firstName: text("firstName"), lastName: text("lastName"),
      company: text("company") || null, jobTitle: text("jobTitle") || null,
      email: text("email") || null, phone: text("phone") || null,
      website: text("website") || null, socialLinks,
      notes: text("notes"), status, tagIds: tags,
      dateAdded: original?.dateAdded ?? demoDate(0),
      lastContactedAt: original?.lastContactedAt ?? null,
      followUps, interactions: original?.interactions ?? [],
    };
    const next = { ...store, nextContactId: original ? store.nextContactId : store.nextContactId + 1, nextId,
      contacts: original ? store.contacts.map((item) => item.id === original.id ? contact : item) : [contact, ...store.contacts] };
    commit(next);
    setModal(null);
    notify(original ? "Contact updated" : "Contact added to this sample");
    if (!original) setLocation(`/demo/contacts/${contact.id}`);
  }
  function deleteContact(contact: DemoContact) {
    if (!window.confirm(`Remove ${contactName(contact)} from this sample workspace?`)) return;
    commit({ ...store, contacts: store.contacts.filter((item) => item.id !== contact.id) });
    setLocation("/demo/contacts");
    notify("Contact removed from the sample");
  }
  function saveInteraction(form: HTMLFormElement, contact: DemoContact) {
    const data = new FormData(form);
    const type = String(data.get("type")) as DemoInteractionType;
    const notes = String(data.get("notes") ?? "").trim();
    const updated = { ...contact, lastContactedAt: new Date().toISOString(), interactions: [{ id: store.nextId, type, occurredAt: new Date().toISOString(), notes }, ...contact.interactions] };
    commit({ ...store, nextId: store.nextId + 1, contacts: store.contacts.map((item) => item.id === contact.id ? updated : item) });
    setModal(null);
    notify("Interaction added to the timeline");
  }
  function completeFollowUp(contact: DemoContact, followUp: DemoFollowUp) {
    const schedulesNext = !!followUp.recurrenceDays && followUp.recurrenceDays > 0;
    const nextFollowUp: DemoFollowUp | null = schedulesNext ? {
      id: store.nextId, dueDate: demoDate(followUp.recurrenceDays!),
      dueTime: followUp.dueTime, recurrenceDays: followUp.recurrenceDays,
      status: "pending",
    } : null;
    const updated = {
      ...contact,
      followUps: [
        ...contact.followUps.map((item) => item.id === followUp.id
          ? { ...item, status: "completed" as const, completedAt: new Date().toISOString() } : item),
        ...(nextFollowUp ? [nextFollowUp] : []),
      ],
    };
    commit({ ...store, nextId: nextFollowUp ? store.nextId + 1 : store.nextId,
      contacts: store.contacts.map((item) => item.id === contact.id ? updated : item) });
    notify(schedulesNext
      ? `Follow-up completed. The next one is in ${followUp.recurrenceDays} days.`
      : `Follow-up with ${contact.firstName} completed`);
  }
  function rescheduleFollowUp(form: HTMLFormElement, contact: DemoContact, followUp: DemoFollowUp) {
    const data = new FormData(form);
    const date = String(data.get("dueDate"));
    const time = String(data.get("dueTime") || "") || null;
    const recurrence = String(data.get("recurrenceDays") || "");
    const recurrenceDays = recurrence ? Number(recurrence) : null;
    const updated = { ...contact, followUps: contact.followUps.map((item) => item.id === followUp.id
      ? { ...item, dueDate: date, dueTime: time, recurrenceDays } : item) };
    commit({ ...store, contacts: store.contacts.map((item) => item.id === contact.id ? updated : item) });
    setModal(null);
    notify("Follow-up rescheduled");
  }
  function addTag(form: HTMLFormElement) {
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;
    if (store.tags.some((tag) => tag.name.toLowerCase() === name.toLowerCase())) { notify("That tag already exists"); return; }
    const id = Math.max(0, ...store.tags.map((tag) => tag.id)) + 1;
    commit({ ...store, tags: [...store.tags, { id, name }] });
    setModal(null);
    notify("Sample tag added");
  }
  function removeTag(id: number) {
    const tag = store.tags.find((item) => item.id === id);
    if (!tag || !window.confirm(`Remove the “${tag.name}” tag from this sample?`)) return;
    commit({ ...store, tags: store.tags.filter((item) => item.id !== id), contacts: store.contacts.map((c) => ({ ...c, tagIds: c.tagIds.filter((tagId) => tagId !== id) })) });
    notify("Tag removed from the sample");
  }
  function updateStatus(contact: DemoContact, status: DemoStatus) {
    commit({ ...store, contacts: store.contacts.map((item) => item.id === contact.id ? { ...item, status } : item) });
    notify("Relationship status updated");
  }
  const renderBanner = () => <div className="demo-banner">
    <div className="demo-banner-copy"><Sparkles /><div><strong>You're in a sample workspace.</strong> Changes stay in this browser and never touch real customer data.</div></div>
    <button onClick={reset} data-testid="button-reset-demo">Reset sample</button>
  </div>;
  const navItems = [
    { key: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { key: "contacts" as const, label: "Contacts", icon: Users },
    { key: "follow-ups" as const, label: "Follow-ups", icon: ListTodo },
    { key: "settings" as const, label: "Settings", icon: Settings },
  ];
  const navigation = (mobile = false) => <nav className={mobile ? "demo-mobile-nav" : "demo-nav"} aria-label="Demo workspace">
    {navItems.map(({ key, label, icon: Icon }) => <a href={pathFor(key)} key={key} className={`demo-nav-item${activeNav === key ? " active" : ""}`} onClick={(event) => { event.preventDefault(); setLocation(pathFor(key)); }} data-testid={`link-demo-${key}`}>
      <Icon /><span>{label}</span>
    </a>)}
  </nav>;
  const followItem = ({ contact, followUp, state }: { contact: DemoContact; followUp: DemoFollowUp; state: string }, withActions = false) => (
    <div className="demo-follow-card demo-card" key={followUp.id} data-testid={`follow-up-${followUp.id}`}>
      <DemoAvatar contact={contact} small />
      <div className="demo-follow-card-main">
        <div className="demo-follow-name">{contactName(contact)}</div>
        <div className="demo-follow-context">{contact.company || contact.jobTitle || "Independent"} · {dateTimeLabel(followUp.dueDate, followUp.dueTime)}{recurrenceLabel(followUp)}</div>
      </div>
      <span className={`demo-due-tag ${state}`}>{state === "completed" ? "Completed" : state === "overdue" ? "Overdue" : state === "today" ? "Due today" : "Upcoming"}</span>
      {withActions && <div className="demo-follow-card-actions">
        <button className="demo-button small" onClick={() => completeFollowUp(contact, followUp)} data-testid={`button-complete-${followUp.id}`}><Check size={14} /> Done</button>
        <button className="demo-button small" onClick={() => setModal({ type: "reschedule", contact, followUp })} data-testid={`button-reschedule-${followUp.id}`}><CalendarClock size={14} /> Move</button>
      </div>}
    </div>
  );

  function renderDashboard() {
    const recently = [...store.contacts].filter((c) => c.lastContactedAt).sort((a, b) => (b.lastContactedAt ?? "").localeCompare(a.lastContactedAt ?? "")).slice(0, 4);
    const statData = [
      ["People in your circle", store.contacts.length, "Every relationship, in one place"],
      ["New leads", store.contacts.filter((c) => c.status === "New Lead").length, "A good place to start"],
      ["Warm leads", store.contacts.filter((c) => c.status === "Warm Lead").length, "Keep the conversation going"],
      ["Active clients", store.contacts.filter((c) => c.status === "Client" || c.status === "Active Contact").length, "Relationships in motion"],
    ];
    return <>
      <div className="demo-heading"><div><p className="demo-eyebrow">Your relationship rhythm</p><h1>Good morning, Alex.</h1><p>Here’s who could use a little attention today.</p></div><button className="demo-button primary" onClick={() => setModal({ type: "contact" })}><Plus /> Add a contact</button></div>
      <div className="demo-stats">{statData.map(([label, value, note]) => <article className="demo-card demo-stat" key={String(label)}><div className="demo-stat-label">{label}</div><div className="demo-stat-value">{value}</div><div className="demo-stat-note">{note}</div></article>)}</div>
      <div className="demo-dashboard-grid">
        <section className="demo-card demo-section">
          <div className="demo-section-head"><h2>Who to follow up with</h2><a className="demo-text-link" href="/demo/follow-ups" onClick={(e) => { e.preventDefault(); setLocation("/demo/follow-ups"); }}>See the list <ArrowUpRight size={13} /></a></div>
          {[...overdue, ...dueToday, ...upcoming].slice(0, 5).map(({ contact, followUp, state }) => <div className="demo-follow-row" key={followUp.id}>
            <DemoAvatar contact={contact} small />
            <div><div className="demo-follow-name">{contactName(contact)}</div><div className="demo-follow-context">{contact.company || contact.jobTitle} · {dateTimeLabel(followUp.dueDate, followUp.dueTime)}{recurrenceLabel(followUp)}</div></div>
            <span className={`demo-due-tag ${state}`}>{state === "overdue" ? "Overdue" : state === "today" ? "Today" : "Soon"}</span>
          </div>)}
          {allFollowUps.length === 0 && <div className="demo-empty">Your circle is all caught up. Make a little room for the next conversation.</div>}
        </section>
        <section className="demo-card demo-section">
          <div className="demo-section-head"><h2>Recently in touch</h2><a className="demo-text-link" href="/demo/contacts" onClick={(e) => { e.preventDefault(); setLocation("/demo/contacts"); }}>All contacts <ArrowUpRight size={13} /></a></div>
          {recently.length ? <ul className="demo-recent">{recently.map((contact) => <li key={contact.id}><div><strong>{contactName(contact)}</strong><span>{contact.company ?? contact.jobTitle}</span></div><span>{dateLabel(contact.lastContactedAt)}</span></li>)}</ul> : <div className="demo-empty">Your latest conversations will show up here.</div>}
        </section>
      </div>
      <div className="demo-card demo-section" style={{ marginTop: 18 }}>
        <div className="demo-section-head"><h2>A thoughtful way to keep in touch</h2><span className="demo-muted">Just a little reminder</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#66736c", fontSize: 13, lineHeight: 1.55 }}>
          <span style={{ width: 38, height: 38, flex: "none", borderRadius: 12, display: "grid", placeItems: "center", background: "#e7eee8", color: "#3e6754" }}><Handshake size={19} /></span>
          A good CRM doesn’t replace the personal touch. It simply helps you remember when to make it.
        </div>
      </div>
    </>;
  }

  function renderContacts() {
    return <>
      <div className="demo-heading"><div><p className="demo-eyebrow">Relationships, not records</p><h1>Your circle</h1><p>{store.contacts.length} people worth remembering.</p></div><button className="demo-button primary" onClick={() => setModal({ type: "contact" })}><Plus /> Add contact</button></div>
      <div className="demo-card demo-toolbar">
        <div className="demo-search"><Search /><input className="demo-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people, companies, tags" aria-label="Search contacts" data-testid="input-search-contacts" /></div>
        <select className="demo-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status" data-testid="select-contact-status"><option value="all">All statuses</option>{DEMO_STATUSES.map((status) => <option key={status}>{status}</option>)}</select>
        <select className="demo-select" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label="Filter by tag" data-testid="select-contact-tag"><option value="all">All tags</option>{store.tags.map((tag) => <option value={tag.id} key={tag.id}>{tag.name}</option>)}</select>
        <select className="demo-select" value={contactFollowFilter} onChange={(e) => setContactFollowFilter(e.target.value)} aria-label="Filter by follow-up" data-testid="select-contact-follow-up"><option value="all">All follow-ups</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Upcoming</option><option value="completed">Completed</option><option value="none">No reminder</option></select>
        <select className="demo-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort contacts" data-testid="select-contact-sort"><option value="next">Next follow-up</option><option value="recent">Recently contacted</option><option value="name">Alphabetical</option></select>
      </div>
      <section className="demo-card demo-contact-list">
        <div className="demo-contact-head"><span>Contact</span><span>Relationship</span><span>Tags</span><span>Next touch</span></div>
        {contactsFiltered.map((contact) => {
          const nextFollow = firstPendingFollowUp(contact);
          return <a href={`/demo/contacts/${contact.id}`} key={contact.id} className="demo-contact-row" onClick={(e) => { e.preventDefault(); setLocation(`/demo/contacts/${contact.id}`); }} data-testid={`link-contact-${contact.id}`}>
            <div className="demo-person"><DemoAvatar contact={contact} small /><div style={{ minWidth: 0 }}><div className="demo-person-name">{contactName(contact)}</div><div className="demo-person-sub">{contact.company || contact.jobTitle || contact.email}</div></div></div>
            <span className={`demo-status ${statusClass(contact.status)}`}>{contact.status}</span>
            <div className="demo-tags">{contact.tagIds.slice(0, 3).map((id) => store.tags.find((tag) => tag.id === id)).filter(Boolean).map((tag) => <span className="demo-tag" key={tag!.id}>{tag!.name}</span>)}</div>
            <span className="demo-muted">{nextFollow ? `${dateTimeLabel(nextFollow.dueDate, nextFollow.dueTime)}${recurrenceLabel(nextFollow)}` : "No reminder"}</span>
          </a>;
        })}
        {!contactsFiltered.length && <div className="demo-empty">No one matches that search yet. Try a different name or filter.</div>}
      </section>
    </>;
  }

  function renderContactDetail(contact: DemoContact) {
    const timeline = [...contact.interactions].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return <>
      <div className="demo-heading"><div><a href="/demo/contacts" className="demo-text-link" onClick={(e) => { e.preventDefault(); setLocation("/demo/contacts"); }}><ArrowLeft size={13} /> Back to your circle</a><p className="demo-eyebrow" style={{ marginTop: 17 }}>A relationship in your circle</p></div></div>
      <div className="demo-detail-grid">
        <div>
          <section className="demo-card demo-profile">
            <div className="demo-profile-top"><span className="demo-profile-avatar">{contactInitials(contact)}</span><div><h2>{contactName(contact)}</h2><div className="demo-profile-title">{contact.jobTitle}{contact.company ? ` · ${contact.company}` : ""}</div><span className={`demo-status ${statusClass(contact.status)}`} style={{ marginTop: 11 }}>{contact.status}</span></div>
              <div className="demo-profile-actions"><button className="demo-button small" onClick={() => setModal({ type: "interaction", contact })}><Plus size={14} /> Log a touch</button><button className="demo-button small" onClick={() => setModal({ type: "contact", contact })}><Pencil size={14} /> Edit</button><button className="demo-button small danger" onClick={() => deleteContact(contact)} aria-label="Delete contact"><Trash2 size={14} /></button></div>
            </div>
            <div className="demo-profile-meta">
              <div><div className="demo-meta-label">Email</div><div className="demo-meta-value">{contact.email ?? "Not added"}</div></div>
              <div><div className="demo-meta-label">Phone</div><div className="demo-meta-value">{contact.phone ?? "Not added"}</div></div>
              <div><div className="demo-meta-label">Website</div><div className="demo-meta-value">{contact.website ?? "Not added"}</div></div>
              <div><div className="demo-meta-label">Social links</div><div className="demo-meta-value">{contact.socialLinks.length ? contact.socialLinks.join(", ") : "Not added"}</div></div>
              <div><div className="demo-meta-label">Last in touch</div><div className="demo-meta-value">{dateLabel(contact.lastContactedAt)}</div></div>
              <div className="demo-field"><label htmlFor="detail-status">Relationship status</label><select id="detail-status" className="demo-select" value={contact.status} onChange={(e) => updateStatus(contact, e.target.value as DemoStatus)} data-testid="select-detail-status">{DEMO_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
              <div><div className="demo-meta-label">Tags</div><div className="demo-tags">{contact.tagIds.map((id) => store.tags.find((tag) => tag.id === id)).filter(Boolean).map((tag) => <span key={tag!.id} className="demo-tag">{tag!.name}</span>)}{!contact.tagIds.length && <span className="demo-muted">None yet</span>}</div></div>
            </div>
            {contact.notes && <div className="demo-notes">{contact.notes}</div>}
          </section>
          <section className="demo-card demo-section" style={{ marginTop: 16 }}>
            <div className="demo-section-head"><h2>Next conversation</h2><button className="demo-button small" onClick={() => setModal({ type: "reschedule", contact, followUp: firstPendingFollowUp(contact) ?? { id: -1, dueDate: demoDate(2), dueTime: "10:00", recurrenceDays: null, status: "pending" } })}><CalendarClock size={14} /> {firstPendingFollowUp(contact) ? "Move reminder" : "Set reminder"}</button></div>
            {firstPendingFollowUp(contact) ? <div className="demo-follow-row" style={{ borderTop: 0 }}><span className={`demo-due-tag ${getDueState(firstPendingFollowUp(contact)!.dueDate)}`}>{getDueState(firstPendingFollowUp(contact)!.dueDate) === "overdue" ? "Overdue" : getDueState(firstPendingFollowUp(contact)!.dueDate) === "today" ? "Due today" : "Upcoming"}</span><div><div className="demo-follow-name">{dateTimeLabel(firstPendingFollowUp(contact)!.dueDate, firstPendingFollowUp(contact)!.dueTime)}{recurrenceLabel(firstPendingFollowUp(contact)!)}</div><div className="demo-follow-context">A small nudge to stay connected.</div></div><button className="demo-button small" onClick={() => completeFollowUp(contact, firstPendingFollowUp(contact)!)}><Check size={14} /> Done</button></div> : <div className="demo-empty">No reminder set. Choose a day to make reconnecting easy.</div>}
          </section>
        </div>
        <section className="demo-card demo-timeline">
          <div className="demo-section-head"><h2>Conversation history</h2><span className="demo-muted">{timeline.length} moments</span></div>
          {timeline.map((item) => {
            const Icon = item.type === "Email" ? Mail : item.type === "Phone call" ? Phone : item.type === "Meeting" ? Users : item.type === "Text" ? MessageCircle : CircleHelp;
            return <div className="demo-timeline-item" key={item.id}><span className="demo-timeline-icon"><Icon /></span><div><div className="demo-timeline-title">{item.type}</div><div className="demo-timeline-date">{dateLabel(item.occurredAt)}</div><div className="demo-timeline-note">{item.notes}</div></div></div>;
          })}
          {!timeline.length && <div className="demo-empty">When you log a conversation, it will find a home here.</div>}
        </section>
      </div>
    </>;
  }

  function renderFollowUps() {
    const filteredPending = followFilter === "completed" ? store.contacts.flatMap((contact) => contact.followUps.filter((item) => item.status === "completed").map((followUp) => ({ contact, followUp, state: "completed" })))
      : followFilter === "all" ? store.contacts.flatMap((contact) => contact.followUps.map((followUp) => ({ contact, followUp, state: followUp.status === "completed" ? "completed" : getDueState(followUp.dueDate) })))
        : allFollowUps.filter((item) => followFilter === item.state);
    const groups = followFilter === "all" || followFilter === "completed" ? [{ label: followFilter === "completed" ? "Completed" : "All follow-ups", items: filteredPending }] : [
      { label: "Overdue", items: filteredPending.filter((item) => item.state === "overdue") },
      { label: "Due today", items: filteredPending.filter((item) => item.state === "today") },
      { label: "Coming up", items: filteredPending.filter((item) => item.state === "upcoming") },
    ];
    return <>
      <div className="demo-heading"><div><p className="demo-eyebrow">A little nudge, at the right time</p><h1>Follow-ups</h1><p>Keep the next good conversation from slipping by.</p></div><select className="demo-select" style={{ maxWidth: 190 }} value={followFilter} onChange={(e) => setFollowFilter(e.target.value)} aria-label="Filter follow-ups" data-testid="select-follow-up-filter"><option value="all">All follow-ups</option><option value="overdue">Overdue</option><option value="today">Due today</option><option value="upcoming">Coming up</option><option value="completed">Completed</option></select></div>
      <div className="demo-stats" style={{ marginBottom: 24 }}>
        {[["Needs a reply", overdue.length], ["For today", dueToday.length], ["On the horizon", upcoming.length], ["Completed", store.contacts.flatMap((c) => c.followUps).filter((f) => f.status === "completed").length]].map(([label, count]) => <div className="demo-card demo-stat" key={String(label)}><div className="demo-stat-label">{label}</div><div className="demo-stat-value">{count}</div></div>)}
      </div>
      {groups.map(({ label, items }) => <section className="demo-follow-group" key={label}><h2>{label}<span>{items.length}</span></h2>{items.map((item) => followItem(item, item.followUp.status === "pending"))}{!items.length && <div className="demo-card demo-empty">Nothing here right now. Your sample circle is in a good place.</div>}</section>)}
    </>;
  }

  function renderSettings() {
    return <>
      <div className="demo-heading"><div><p className="demo-eyebrow">Make the sample yours</p><h1>Settings</h1><p>Everything here is local to this browser.</p></div></div>
      <div className="demo-settings-grid">
        <section className="demo-card demo-section">
          <div className="demo-section-head"><div><h2>Your sample tags</h2><div className="demo-muted" style={{ marginTop: 4 }}>A few ways to find the thread again.</div></div><button className="demo-button primary small" onClick={() => setModal({ type: "tag" })}><Plus size={14} /> Add tag</button></div>
          {store.tags.map((tag) => <div className="demo-tag-manage" key={tag.id}><span className="demo-tag"><Tag size={11} style={{ display: "inline", marginRight: 4 }} />{tag.name}</span><span className="demo-tag-count">{store.contacts.filter((c) => c.tagIds.includes(tag.id)).length} contacts</span><button className="demo-icon-button" aria-label={`Remove ${tag.name}`} onClick={() => removeTag(tag.id)} data-testid={`button-remove-tag-${tag.id}`}><Trash2 size={15} /></button></div>)}
          {!store.tags.length && <div className="demo-empty">No tags yet. Add one to give your relationships a little shape.</div>}
        </section>
        <div>
          <section className="demo-card demo-section">
            <div className="demo-section-head"><h2>Sample workspace</h2><Sparkles size={17} color="#e2562f" /></div>
            <p style={{ color: "#68756e", fontSize: 13, lineHeight: 1.6, margin: "0 0 16px" }}>Explore freely. Contacts, reminders, and notes in this demo are fictional and stored only in your browser.</p>
            <button className="demo-button danger" onClick={reset}><RotateCcw size={15} /> Reset all sample changes</button>
          </section>
          <section className="demo-card demo-section" style={{ marginTop: 15 }}>
            <div className="demo-section-head"><h2>What stays private</h2><CheckCircle2 size={17} color="#39765b" /></div>
            <div style={{ color: "#68756e", fontSize: 12, lineHeight: 1.65 }}>This public sample does not connect to an account, email provider, or customer database. Your changes stay on this device.</div>
          </section>
        </div>
      </div>
    </>;
  }

  return <div className="demo-root">
    <div className="demo-shell">
      <aside className="demo-sidebar">
        <a href="/demo/dashboard" className="demo-brand" onClick={(e) => { e.preventDefault(); setLocation("/demo/dashboard"); }}><span className="demo-brand-mark" /><span>Full Circle</span></a>
        <p className="demo-nav-label">Workspace</p>
        {navigation()}
        <div className="demo-sidebar-bottom">
          <div className="demo-mini-note"><strong>People first.</strong><p>A calmer way to remember the relationships behind your work.</p></div>
          <div className="demo-user"><span className="demo-avatar">AR</span><span>Alex Rivera<br /><small style={{ color: "#8a938e" }}>Sample workspace</small></span></div>
        </div>
      </aside>
      <main className="demo-main">
        <header className="demo-topbar"><div className="demo-top-left"><div className="demo-mobile-brand"><span className="demo-brand-mark" /> Full Circle</div><span className="demo-muted">Sample workspace</span></div><div className="demo-user"><span className="demo-avatar">AR</span><span>Alex Rivera</span></div></header>
        <div className="demo-content rise">
          {renderBanner()}
          {currentContact ? renderContactDetail(currentContact)
            : location.startsWith("/demo/contacts/") ? <div className="demo-card demo-empty"><h2>That contact isn’t in this sample</h2><p>It may have been removed or reset.</p><button className="demo-button" onClick={() => setLocation("/demo/contacts")}>Back to contacts</button></div>
              : activeNav === "contacts" ? renderContacts()
                : activeNav === "follow-ups" ? renderFollowUps()
                  : activeNav === "settings" ? renderSettings() : renderDashboard()}
        </div>
      </main>
    </div>
    {navigation(true)}
    {modal?.type === "contact" && <DemoModal title={modal.contact ? "Edit contact" : "Add someone to your circle"} onClose={() => setModal(null)}>
      <form onSubmit={(e) => { e.preventDefault(); saveContact(e.currentTarget, modal.contact); }}>
        <div className="demo-form-grid">
          <div className="demo-field"><label>First name *</label><input className="demo-input" name="firstName" required maxLength={100} defaultValue={modal.contact?.firstName ?? ""} autoFocus /></div>
          <div className="demo-field"><label>Last name *</label><input className="demo-input" name="lastName" required maxLength={100} defaultValue={modal.contact?.lastName ?? ""} /></div>
          <div className="demo-field"><label>Company</label><input className="demo-input" name="company" defaultValue={modal.contact?.company ?? ""} /></div>
          <div className="demo-field"><label>Job title</label><input className="demo-input" name="jobTitle" defaultValue={modal.contact?.jobTitle ?? ""} /></div>
          <div className="demo-field"><label>Email</label><input className="demo-input" name="email" type="email" defaultValue={modal.contact?.email ?? ""} /></div>
          <div className="demo-field"><label>Phone</label><input className="demo-input" name="phone" defaultValue={modal.contact?.phone ?? ""} /></div>
          <div className="demo-field"><label>Website</label><input className="demo-input" name="website" defaultValue={modal.contact?.website ?? ""} /></div>
          <div className="demo-field full"><label>Social links (one per line)</label><textarea className="demo-textarea" name="socialLinks" defaultValue={modal.contact?.socialLinks.join("\n") ?? ""} /></div>
          <div className="demo-field"><label>Relationship status</label><select className="demo-select" name="status" defaultValue={modal.contact?.status ?? "New Lead"}>{DEMO_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></div>
          <div className="demo-field full"><label>Tags</label><div className="demo-checks">{store.tags.map((tag) => <label className="demo-check" key={tag.id}><input type="checkbox" name="tagIds" value={tag.id} defaultChecked={modal.contact?.tagIds.includes(tag.id)} />{tag.name}</label>)}</div></div>
          <div className="demo-field full"><label>Notes</label><textarea className="demo-textarea" name="notes" defaultValue={modal.contact?.notes ?? ""} placeholder="What would be helpful to remember?" /></div>
          <div className="demo-field"><label>Next follow-up</label><input className="demo-input" name="nextFollowUpDate" type="date" min={demoDate(-365)} defaultValue={editFollowUp?.dueDate ?? ""} /></div>
          <div className="demo-field"><label>Time (optional)</label><input className="demo-input" name="nextFollowUpTime" type="time" defaultValue={editFollowUp?.dueTime ?? ""} /></div>
          <div className="demo-field"><label>Repeat every (days)</label><input className="demo-input" name="recurrenceDays" type="number" min={1} step={1} placeholder="Never" defaultValue={editFollowUp?.recurrenceDays ?? ""} /></div>
        </div>
        <div className="demo-form-actions"><button type="button" className="demo-button" onClick={() => setModal(null)}>Cancel</button><button className="demo-button primary" type="submit">{modal.contact ? "Save changes" : "Add contact"}</button></div>
      </form>
    </DemoModal>}
    {modal?.type === "interaction" && <DemoModal title={`Log a touch with ${modal.contact.firstName}`} onClose={() => setModal(null)}>
      <form onSubmit={(e) => { e.preventDefault(); saveInteraction(e.currentTarget, modal.contact); }}>
        <div className="demo-form-grid">
          <div className="demo-field full"><label>How did you connect?</label><select className="demo-select" name="type">{DEMO_INTERACTION_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
          <div className="demo-field full"><label>A note for future you</label><textarea className="demo-textarea" name="notes" placeholder="What did you talk about?" /></div>
        </div>
        <div className="demo-form-actions"><button type="button" className="demo-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="demo-button primary">Save interaction</button></div>
      </form>
    </DemoModal>}
    {modal?.type === "reschedule" && <DemoModal title={modal.followUp.id === -1 ? "Set a follow-up" : `Move your reminder with ${modal.contact.firstName}`} onClose={() => setModal(null)}>
      <form onSubmit={(e) => { e.preventDefault(); const form = e.currentTarget; if (modal.followUp.id === -1) {
        const data = new FormData(form);
        const repeat = String(data.get("recurrenceDays") || "");
        const recurrenceDays = repeat ? Number(repeat) : null;
        if (recurrenceDays !== null && (!Number.isInteger(recurrenceDays) || recurrenceDays < 1)) { notify("Repeat interval must be a whole number of days"); return; }
        const item: DemoFollowUp = {
          id: store.nextId, dueDate: String(data.get("dueDate")),
          dueTime: String(data.get("dueTime") || "") || null, recurrenceDays, status: "pending",
        };
        commit({ ...store, nextId: store.nextId + 1, contacts: store.contacts.map((c) => c.id === modal.contact.id ? { ...c, followUps: [...c.followUps, item] } : c) }); setModal(null); notify("Follow-up added");
      } else rescheduleFollowUp(form, modal.contact, modal.followUp); }}>
        <div className="demo-form-grid"><div className="demo-field"><label>Choose a day</label><input className="demo-input" type="date" name="dueDate" min={demoDate(0)} defaultValue={modal.followUp.id === -1 ? demoDate(2) : modal.followUp.dueDate} required /></div><div className="demo-field"><label>Time (optional)</label><input className="demo-input" type="time" name="dueTime" defaultValue={modal.followUp.dueTime ?? ""} /></div><div className="demo-field"><label>Repeat every (days)</label><input className="demo-input" type="number" name="recurrenceDays" min={1} step={1} defaultValue={modal.followUp.recurrenceDays ?? ""} placeholder="Never" /></div></div>
        <div className="demo-form-actions"><button type="button" className="demo-button" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="demo-button primary">{modal.followUp.id === -1 ? "Set reminder" : "Save new date"}</button></div>
      </form>
    </DemoModal>}
    {modal?.type === "tag" && <DemoModal title="Add a sample tag" onClose={() => setModal(null)}>
      <form onSubmit={(e) => { e.preventDefault(); addTag(e.currentTarget); }}><div className="demo-field"><label>Tag name</label><input className="demo-input" name="name" required maxLength={40} placeholder="For example, Great collaborator" autoFocus /></div><div className="demo-form-actions"><button className="demo-button" type="button" onClick={() => setModal(null)}>Cancel</button><button className="demo-button primary" type="submit">Add tag</button></div></form>
    </DemoModal>}
    {toast && <div className="demo-toast" role="status">{toast}</div>}
  </div>;
}

