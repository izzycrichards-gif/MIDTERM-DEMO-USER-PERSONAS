import { Link } from "wouter";
import { ArrowRight, Check } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

const STEPS = [
  ["01", "Add the people", "Name, company, links, notes, and a status from New Lead to Client. Tag them your own way."],
  ["02", "Set the next touch", "Pick a date, an optional time, and a repeat interval if it should come back on its own."],
  ["03", "Open the dashboard", "Overdue first, then today, then what's coming. One list that answers who to contact next."],
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] overflow-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Wordmark />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link href="/sign-in" data-testid="link-sign-in">Sign in</Link></Button>
          <Button asChild><Link href="/sign-up" data-testid="link-sign-up">Get started</Link></Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-24">
        <div>
          <p className="rise mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">A CRM for freelancers, artists, and small shops</p>
          <h1 className="rise rise-1 font-display text-5xl font-medium leading-[1.02] md:text-7xl">Know who to <em className="text-[hsl(14_75%_48%)]">contact</em> next.</h1>
          <p className="rise rise-2 mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">Relationships are your income. Keep every conversation, every promise, and every follow-up in one calm place.</p>
          <div className="rise rise-3 mt-9 flex flex-wrap gap-3">
            <Button size="lg" asChild><Link href="/sign-up" data-testid="link-hero-start" className="gap-2">Start for free <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/sign-in">I have an account</Link></Button>
          </div>
        </div>

        <div className="rise rise-3 relative">
          <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-[hsl(14_75%_52%)]/20" />
          <div className="relative rounded-2xl border bg-card p-6 shadow-[0_24px_60px_-30px_hsl(172_44%_20%/0.4)]">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Overdue</p>
            {[["Marisol Vega", "Gallery director", "3 days overdue"], ["Tobias Reinholt", "Brand studio", "1 day overdue"]].map(([n, r, d]) => (
              <div key={n} className="flex items-center gap-3 border-b py-3.5 last:border-0">
                <span className="h-5 w-5 rounded-full border-2 border-foreground/30" />
                <div className="flex-1"><p className="text-sm font-semibold">{n}</p><p className="text-xs text-muted-foreground">{r}</p></div>
                <span className="text-xs font-semibold text-[hsl(14_70%_38%)]">{d}</span>
              </div>
            ))}
            <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Due today</p>
            <div className="flex items-center gap-3 py-2">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="h-3 w-3" /></span>
              <div className="flex-1"><p className="text-sm font-semibold">Ines Okafor</p><p className="text-xs text-muted-foreground">Repeats every 14 days</p></div>
              <span className="text-xs font-semibold text-primary">Due today</span>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-secondary/60">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display mb-12 max-w-lg text-4xl font-medium md:text-5xl">Three steps. No pipeline theatre.</h2>
          <div className="grid gap-10 md:grid-cols-3">
            {STEPS.map(([n, t, d]) => (
              <div key={n} className="border-t-2 border-primary pt-5">
                <p className="font-display text-sm text-muted-foreground">{n}</p>
                <h3 className="font-display mt-2 text-2xl font-medium">{t}</h3>
                <p className="mt-3 leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2">
        <h2 className="font-display text-4xl font-medium md:text-5xl">Everything you need to remember, nothing you don't.</h2>
        <ul className="space-y-4 text-lg">
          {["Eight relationship statuses you can change in one click", "A timeline of every email, call, meeting, and message", "Recurring follow-ups that reschedule themselves", "Your own tags, searchable and sortable lists", "Private to you, with reminders when someone comes due"].map((t) => (
            <li key={t} className="flex gap-3 border-b pb-4"><Check className="mt-1.5 h-4 w-4 shrink-0 text-[hsl(14_75%_48%)]" />{t}</li>
          ))}
        </ul>
      </section>

      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-20">
          <h2 className="font-display max-w-xl text-4xl font-medium md:text-5xl">Reach out before they forget you.</h2>
          <Button size="lg" variant="secondary" asChild><Link href="/sign-up" data-testid="link-footer-start">Create your account</Link></Button>
        </div>
      </section>
      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">Full Circle. Made for people who work with people.</footer>
    </div>
  );
}
