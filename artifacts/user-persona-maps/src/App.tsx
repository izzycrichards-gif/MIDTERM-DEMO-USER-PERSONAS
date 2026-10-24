import { useState } from 'react';
import {
  ArrowDownRight, ArrowRight, AudioLines, BriefcaseBusiness, Check,
  ChevronDown, CircleAlert, CircleCheck, CircleHelp, Compass,
  FileText, Fingerprint, Layers3, Lightbulb, ListChecks, Mail, Map,
  Music2, Plus, Search, ShieldCheck, Sparkles, UserRound,
  UsersRound, X,
} from 'lucide-react';

type Stage = {
  title: string;
  cue: string;
  action: string;
  touchpoint: string;
  feeling: string;
  friction: string;
  system: string;
  signal: string;
};

type Persona = {
  id: string;
  name: string;
  role: string;
  initials: string;
  accent: string;
  icon: typeof UserRound;
  summary: string;
  task: string;
  hypothesis: string;
  question: string;
  context: string;
  stages: Stage[];
};

const stageNames = ['Arrive', 'Account setup', 'First session', 'Search first', 'Add contact', 'Save', 'After save'];

const personas: Persona[] = [
  {
    id: 'freelancer',
    name: 'Freelancer',
    role: 'Independent service provider',
    initials: 'FR',
    accent: 'freelancer',
    icon: BriefcaseBusiness,
    summary: 'Balancing client work and referrals, one useful connection at a time.',
    task: 'Set up an account; add a client or referral contact.',
    hypothesis: 'May value fast capture and enough context to remember why a connection matters.',
    question: 'What is the minimum context they need to confidently save a new referral between client tasks?',
    context: 'A referral arrives after a project call. The freelancer wants to keep the person and the reason for the introduction together.',
    stages: [
      { title: 'A reason to keep the connection', cue: '01 / ARRIVE', action: 'Lands signed out and chooses Create account, or Sign in if an account already exists.', touchpoint: 'Public landing page → create-account or existing-account sign-in.', feeling: 'Curious, but protecting a narrow slice of attention.', friction: 'A referral is easy to lose if starting a tool takes longer than jotting a name elsewhere.', system: 'Signed-out landing offers both paths. Existing account sign-in remains available.', signal: 'Can reach the right entry path without mistaking this for a required workflow.' },
      { title: 'Get through the door', cue: '02 / ACCOUNT SETUP', action: 'Completes Clerk sign-up; an existing member signs in instead.', touchpoint: 'Clerk sign-up / sign-in experience.', feeling: 'Ready to move on to the person, not configure a workspace.', friction: 'Validation, sign-up errors, or verification can interrupt momentum.', system: 'Validation/error and pending verification states depend on Clerk configuration. Once signed in, route to dashboard. No separate custom onboarding exists.', signal: 'Successful sign-up or sign-in leads to the dashboard.' },
      { title: 'Start with a blank relationship list', cue: '03 / FIRST SESSION', action: 'Sees zero contacts and chooses Add your first contact.', touchpoint: 'Dashboard empty state → contact creation.', feeling: 'A clear next step helps; a blank list can still feel like setup work.', friction: 'If the empty state does not explain where to begin, the referral may stay in a message thread.', system: 'Zero contacts shows “Add your first contact.” Accounts with records go to Contacts instead.', signal: 'Understands the fastest way to put the referral somewhere retrievable.' },
      { title: 'Check before creating another record', cue: '04 / SEARCH FIRST', action: 'Searches the person’s name, company, or email. Empty search is untouched; a no-match result can be recovered with Clear filters.', touchpoint: 'Contacts search, supporting name, company, and email.', feeling: 'Briefly cautious: could this person already be here?', friction: 'A search can return no matches or an unfamiliar match. There is no automatic duplicate detection; avoiding duplicates is user-led.', system: 'Untouched search shows the contact list. No matches shows a clear-filters recovery. A match can be opened instead of duplicated.', signal: 'Can distinguish “no result” from “not searchable,” and open an existing record when it is the right person.' },
      { title: 'Capture the person and the why', cue: '05 / ADD CONTACT', action: 'Enters first and last name, then available details: company, title, email, phone, website, social links, notes, relationship status, tags, last-contacted date, and optional follow-up.', touchpoint: 'Add contact form; notes can hold context such as “Introduced by Maya after the studio handoff.”', feeling: 'Focused on not losing the referral; more fields can feel like a tax.', friction: 'Missing first or last name blocks save. An invalid email shows an error. Follow-up time and repeat are disabled until a date is set; recurrence needs a date.', system: 'Name fields are required. Email validation applies when supplied. Social links and notes are optional; follow-up is optional context.', signal: 'Has a usable record with enough context to recall the introduction, without treating every field as mandatory.' },
      { title: 'Save without losing the moment', cue: '06 / SAVE', action: 'Selects Add contact, or cancels before saving if the moment is interrupted.', touchpoint: 'Form action area, pending state, recoverable error, then confirmation.', feeling: 'Wants a definite “it’s kept” signal.', friction: 'Network/API failure can make it unclear whether to retry; canceling before save should not create a record.', system: 'Pending state reads “Saving” and disables the button. A recoverable API error stays in the form. Success shows confirmation, closes the dialog, and adds the contact to the list.', signal: 'Can retry an error safely, or cancel with no record created; success is visible.' },
      { title: 'Find the thread again later', cue: '07 / AFTER SAVE', action: 'Opens the new contact in the list/detail and revisits the referral note when following up.', touchpoint: 'Contacts list → contact detail; optional follow-up status later.', feeling: 'More confident that the connection has a home.', friction: 'A follow-up can become overdue or be missed if the relationship context is thin.', system: 'A set follow-up begins pending and may later show overdue, due today, upcoming, or completed. With none set, there is no follow-up.', signal: 'The new contact is visible and its reason for connection is easy to find.' },
    ],
  },
  {
    id: 'artist',
    name: 'Artist',
    role: 'Independent creative',
    initials: 'AR',
    accent: 'artist',
    icon: AudioLines,
    summary: 'Building a living network of collaborators, spaces, and people who champion the work.',
    task: 'Set up an account; add a person or organization.',
    hypothesis: 'Social links and notes may matter when a formal company or email is missing.',
    question: 'Which identifier makes a contact findable when an email address or company name is not part of the relationship?',
    context: 'After a show, an artist meets a gallery coordinator and wants to remember the conversation and their public profile.',
    stages: [
      { title: 'A relationship beyond a business card', cue: '01 / ARRIVE', action: 'Arrives signed out and selects Create account, or chooses Sign in for an existing account.', touchpoint: 'Public landing page → create-account or existing-account sign-in.', feeling: 'Interested, but wary of a tool that assumes every connection is corporate.', friction: 'An informal introduction may not map neatly to a conventional business signup story.', system: 'Landing supports create-account and existing-account sign-in.', signal: 'The entry point feels relevant before any formal company details are involved.' },
      { title: 'Account, then straight to people', cue: '02 / ACCOUNT SETUP', action: 'Uses Clerk sign-up or signs in to an existing account.', touchpoint: 'Clerk sign-up / sign-in.', feeling: 'Wants to reach a useful space, not complete an artist profile.', friction: 'Validation or a pending verification step may break the rhythm.', system: 'Validation/error and pending verification states are configuration-dependent. Signed-in users route to dashboard. There is no separate custom onboarding.', signal: 'Account access leads to the dashboard without implying extra onboarding.' },
      { title: 'An empty shelf, ready for a name', cue: '03 / FIRST SESSION', action: 'From a zero-contact dashboard, chooses Add your first contact; existing records lead to Contacts.', touchpoint: 'Dashboard empty state or Contacts list.', feeling: 'A little exposed by an empty network, but willing to add one person.', friction: 'An empty state that only says “no data” gives no clue whether organizations are welcome.', system: 'Zero-contact dashboard presents “Add your first contact.” Existing records route to Contacts.', signal: 'Can begin with a person or an organization without a separate onboarding step.' },
      { title: 'Look for the person in their own terms', cue: '04 / SEARCH FIRST', action: 'Searches name, company, or email. Leaves search untouched if starting fresh; clears filters after no matches.', touchpoint: 'Contacts search supports name, company, and email.', feeling: 'Hopeful when a public name or space might already be recorded.', friction: 'A social handle is not a stated search field. No automatic duplicate detection exists; duplicate avoidance is user-led.', system: 'Untouched search shows the list. No matches includes Clear filters. A relevant result can be opened instead of duplicated.', signal: 'Finds a prior record where possible, without assuming social handles are searchable.' },
      { title: 'Save the link, not just the label', cue: '05 / ADD CONTACT', action: 'Adds required first and last name, and the details available: company, job title, email, phone, website, social links, notes, relationship status, tags, last-contacted date, optional follow-up.', touchpoint: 'Add contact form; social links and notes can preserve a public profile and show context.', feeling: 'More at ease when the form can hold an informal connection.', friction: 'First and last name remain required even when an organization is the natural entry. Missing names and invalid email show errors.', system: 'Supported fields include social links and notes. Email is optional but validated if entered. Follow-up time/repeat are disabled without a date; recurrence requires one.', signal: 'Can preserve a person’s online presence or conversation note without inventing a missing email/company.' },
      { title: 'A clear finish, with a safe exit', cue: '06 / SAVE', action: 'Saves the contact or cancels before save if they need to return to the conversation.', touchpoint: 'Add contact form and success confirmation.', feeling: 'Relieved when the form accepts a lightweight record.', friction: 'An API error can feel like a lost moment unless the form remains recoverable.', system: 'Saving disables the submit button. Recoverable API error appears in the form. Success confirms, closes the dialog, and shows the new contact; cancel-before-save creates no record.', signal: 'Can tell whether the new connection was kept, and recover from a failed save.' },
      { title: 'Return to the collaboration later', cue: '07 / AFTER SAVE', action: 'Opens the new person or organization from the list/detail; follows up only if useful.', touchpoint: 'Contacts list/detail; optional follow-up tracking.', feeling: 'The encounter feels less ephemeral when its context remains attached.', friction: 'A dated reminder may not suit every creative relationship; follow-up should not feel mandatory.', system: 'If set, follow-up starts pending and can become overdue, due today, upcoming, or completed. If not set, no follow-up is shown.', signal: 'Can retrieve the person, organization, social link, or note; no reminder is required.' },
    ],
  },
  {
    id: 'executive',
    name: 'Music-industry executive',
    role: 'Network-heavy professional',
    initials: 'MI',
    accent: 'executive',
    icon: Music2,
    summary: 'Keeping a wide network legible across overlapping organizations and roles.',
    task: 'Set up an account; add a contact.',
    hypothesis: 'Search and disambiguation may matter when many people share companies or roles; manual entry may feel slow at higher volume.',
    question: 'At what volume does one-at-a-time entry become a meaningful barrier, and what cues distinguish people with similar affiliations?',
    context: 'A new industry introduction comes in after a meeting; several contacts may share the same company or job title.',
    stages: [
      { title: 'Enter the network with intent', cue: '01 / ARRIVE', action: 'Chooses Create account when signed out, or existing-account Sign in.', touchpoint: 'Public landing page with account entry choices.', feeling: 'Task-focused; wants a clear route into an already active network.', friction: 'A sign-up screen can look like the only route even when an account exists.', system: 'Both create-account and existing-account sign-in are offered.', signal: 'Can choose the right account path with minimal ambiguity.' },
      { title: 'Access, not another setup project', cue: '02 / ACCOUNT SETUP', action: 'Completes Clerk sign-up or signs into an existing account.', touchpoint: 'Clerk sign-up / sign-in.', feeling: 'Impatient with steps that do not help manage contacts.', friction: 'Validation errors or a verification hold can pause work.', system: 'Validation/error and pending verification are configuration-dependent. Signed-in users route to dashboard; no separate custom onboarding exists.', signal: 'Successful authentication routes directly to the dashboard.' },
      { title: 'Choose the network view', cue: '03 / FIRST SESSION', action: 'Uses Add your first contact on a zero-contact dashboard; existing records lead to Contacts.', touchpoint: 'Dashboard empty state or Contacts list.', feeling: 'A blank account is simple; an established network should be one click away.', friction: 'No visible contact list can make it unclear whether records exist yet.', system: 'Zero-contact dashboard presents “Add your first contact.” Existing records lead to Contacts.', signal: 'Correctly lands in the empty state or the existing contact list.' },
      { title: 'Disambiguate before adding', cue: '04 / SEARCH FIRST', action: 'Searches name, company, or email, then opens the matching record rather than adding another. Untouched search remains a neutral start; no matches can be cleared.', touchpoint: 'Contacts search and matching records.', feeling: 'Cautious: familiar company names may conceal different people or roles.', friction: 'Search has name, company, and email; automatic duplicate detection is not shown. Duplicate avoidance is user-led. No matches can mean query or filter mismatch.', system: 'Untouched search shows current list; no matches offers Clear filters; a match is opened instead of duplicated.', signal: 'Uses identity details to distinguish a likely match before creating a new record.' },
      { title: 'Record the person, not a batch', cue: '05 / ADD CONTACT', action: 'Enters required first and last name and supported metadata: company, title, email, phone, website, social links, notes, status, tags, last-contacted date, optional next follow-up.', touchpoint: 'Individual Add contact form.', feeling: 'Wants enough identifiers to separate this person from colleagues.', friction: 'One-at-a-time manual entry may feel slow at higher volume (hypothesis). Missing name and invalid email block save; repeat requires a follow-up date.', system: 'Fields support contact details, social links, notes, relationship status, tags and dates. Time/repeat controls are disabled until a follow-up date is selected.', signal: 'Adds enough identifiers for future search and disambiguation.' },
      { title: 'Confirm the record made it through', cue: '06 / SAVE', action: 'Saves, or cancels before save if the record needs more verification.', touchpoint: 'Form save state, error feedback, success confirmation.', feeling: 'Needs certainty before moving to the next introduction.', friction: 'A retry without clear status risks uncertainty; pending state should prevent repeat submits.', system: 'Saving state disables the button. API error is recoverable in the form. Success toast/confirmation closes dialog and adds contact to list. Cancel-before-save creates no record.', signal: 'Can confirm a single contact was created, or leave without creating one.' },
      { title: 'Keep the record findable in a busy network', cue: '07 / AFTER SAVE', action: 'Opens the new contact in Contacts/detail and uses the saved identifiers. Optional follow-up supports a later touchpoint.', touchpoint: 'Contacts list/detail and follow-up status.', feeling: 'More assured when the person can be found among similar affiliations.', friction: 'Searchable fields are limited to name, company, and email; volume and matching needs need validation.', system: 'Follow-up begins pending when set and may become overdue, due today, upcoming, or completed. Without a date, no follow-up is shown.', signal: 'The new record is visible and can be reopened; reminders remain optional.' },
    ],
  },
];

function Header({ view, setView }: { view: string; setView: (v: string) => void }) {
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="Fieldnotes research home">
        <span className="brand-mark"><Layers3 size={19} strokeWidth={2.2} /></span>
        <span>FIELDNOTES <i>/</i> FC</span>
      </a>
      <nav className="top-nav" aria-label="Research views">
        <button data-testid="nav-journey-maps" className={view === 'journey' ? 'nav-active' : ''} onClick={() => setView('journey')}><Map size={15} /> Journey maps</button>
        <button data-testid="nav-compare" className={view === 'compare' ? 'nav-active' : ''} onClick={() => setView('compare')}><UsersRound size={15} /> Compare</button>
        <button data-testid="nav-evidence-notes" className={view === 'evidence' ? 'nav-active' : ''} onClick={() => setView('evidence')}><FileText size={15} /> Evidence notes</button>
      </nav>
      <div className="draft-chip"><span /> Research draft</div>
    </header>
  );
}

function PersonaIntro({ persona }: { persona: Persona }) {
  const Icon = persona.icon;
  return (
    <section className={`persona-intro ${persona.accent}`}>
      <div className="persona-main">
        <div className="persona-avatar"><Icon size={24} strokeWidth={1.8} /></div>
        <div>
          <div className="eyebrow">AUDIENCE HYPOTHESIS <span>·</span> NOT RESEARCHED</div>
          <h2>{persona.name}</h2>
          <p className="persona-role">{persona.role}</p>
        </div>
      </div>
      <p className="persona-summary">{persona.summary}</p>
      <div className="persona-facts">
        <div className="persona-fact"><span className="fact-label"><ListChecks size={14} /> TASK TO COMPLETE</span><p>{persona.task}</p></div>
        <div className="persona-fact"><span className="fact-label"><Lightbulb size={14} /> HYPOTHESIS — VALIDATE</span><p>{persona.hypothesis}</p></div>
      </div>
      <div className="question-line"><CircleHelp size={16} /><span><b>Open question</b> {persona.question}</span></div>
    </section>
  );
}

function StageCard({ stage, index, accent, open, onToggle }: { stage: Stage; index: number; accent: string; open: boolean; onToggle: () => void }) {
  const Icon = [Compass, ShieldCheck, Sparkles, Search, Plus, CircleCheck, ArrowDownRight][index];
  return (
    <article className={`stage-card ${accent} ${open ? 'is-open' : ''}`}>
      <button className="stage-trigger" onClick={onToggle} aria-expanded={open} data-testid={`button-toggle-stage-${index + 1}`}>
        <span className="stage-index"><Icon size={17} /></span>
        <span className="stage-head"><span className="stage-cue">{stage.cue}</span><strong>{stage.title}</strong></span>
        <span className="confidence-chip"><span className="confidence-dot" /> Product path</span>
        <ChevronDown className="stage-chevron" size={18} />
      </button>
      {open && (
        <div className="stage-body">
          <div className="stage-grid">
            <div className="stage-cell action-cell"><span className="cell-label">USER ACTION</span><p>{stage.action}</p></div>
            <div className="stage-cell"><span className="cell-label">TOUCHPOINT</span><p>{stage.touchpoint}</p></div>
        <div className="stage-cell emotion-cell"><span className="cell-label">EMOTION / CONFIDENCE HYPOTHESIS</span><p>{stage.feeling}</p></div>
            <div className="stage-cell friction-cell"><span className="cell-label"><CircleAlert size={12} /> FRICTION HYPOTHESIS</span><p>{stage.friction}</p></div>
            <div className="stage-cell system-cell"><span className="cell-label"><Fingerprint size={12} /> OBSERVED PRODUCT BEHAVIOR</span><p>{stage.system}</p></div>
            <div className="stage-cell signal-cell"><span className="cell-label"><Check size={12} /> SUCCESS SIGNAL</span><p>{stage.signal}</p></div>
          </div>
        </div>
      )}
    </article>
  );
}

function Journey({ persona }: { persona: Persona }) {
  const [open, setOpen] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const toggle = (index: number) => setOpen((items) => items.includes(index) ? items.filter((n) => n !== index) : [...items, index]);
  return (
    <>
      <PersonaIntro persona={persona} />
      <div className="journey-heading">
        <div><span className="section-kicker">END-TO-END JOURNEY</span><h3>From first visit to first connection</h3></div>
        <button className="text-button" data-testid="button-toggle-all-stages" onClick={() => setOpen(open.length ? [] : [0, 1, 2, 3, 4, 5, 6])}>{open.length ? 'Collapse all' : 'Expand all'} <ChevronDown size={14} /></button>
      </div>
      <div className="journey-track" aria-label="Seven journey stages">
        {stageNames.map((name, i) => <button data-testid={`button-jump-stage-${i + 1}`} className={`track-point ${open.includes(i) ? 'track-current' : ''}`} key={name} onClick={() => { document.getElementById(`stage-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setOpen((items) => items.includes(i) ? items : [...items, i]); }}><span>{String(i + 1).padStart(2, '0')}</span>{name}</button>)}
      </div>
      <div className="stage-list">
        {persona.stages.map((stage, index) => <div id={`stage-${index}`} key={stage.cue}><StageCard stage={stage} index={index} accent={persona.accent} open={open.includes(index)} onToggle={() => toggle(index)} /></div>)}
      </div>
      <div className="branch-note">
        <span className="branch-icon"><ArrowDownRight size={18} /></span>
        <div><b>Existing-record branch</b><p>When reviewing an existing contact, deletion requires confirmation. This is not part of the first-contact happy path.</p></div>
      </div>
    </>
  );
}

function Compare({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <section className="compare-view">
      <div className="view-heading"><span className="section-kicker">THREE AUDIENCES · ONE PRODUCT PATH</span><h2>Same milestones. Different stakes.</h2><p>Each map follows the same account-to-contact sequence, with persona-specific intent and friction held as hypotheses.</p></div>
      <div className="compare-table-wrap">
        <div className="compare-grid compare-head"><div className="compare-stage-label">JOURNEY MOMENT</div>{personas.map(p => <div className={`compare-person ${p.accent}`} key={p.id}><span>{p.initials}</span>{p.name}</div>)}</div>
        {[
          ['Intent at first contact', 'Keep the referral and its origin together.', 'Keep a social connection and its context.', 'Record enough detail to distinguish the person.'],
          ['Search concern', 'Is this referral already in the list?', 'Can I find them without a company or email?', 'Which person at this company is the right match?'],
          ['Capture emphasis', 'Fast capture, meaningful notes.', 'Social links and conversation context.', 'Identifiers that support disambiguation.'],
          ['Potential friction', 'Context gets lost in a busy day.', 'Formal fields may not fit an informal connection.', 'Manual entry may feel slow at higher volume.'],
          ['Success signal', 'A referral is retrievable with its “why.”', 'A person / organization is findable later.', 'A single contact is visible and distinguishable.'],
        ].map(([label, ...vals]) => <div className="compare-grid compare-row" key={label}><div className="compare-stage-label">{label}</div>{vals.map((val, i) => <button data-testid={`button-open-${personas[i].id}-journey-${label.toLowerCase().replaceAll(' ', '-')}`} className={`compare-cell ${personas[i].accent}`} key={val} onClick={() => onSelect(personas[i].id)}>{val}<ArrowRight size={14} /></button>)}</div>)}
      </div>
      <div className="compare-foot"><CircleHelp size={17} /><p>These are audience-informed hypotheses, not findings from interviews or analytics. Select a column to read its full journey.</p></div>
    </section>
  );
}

function Evidence() {
  return (
    <section className="evidence-view">
      <div className="view-heading"><span className="section-kicker">RESEARCH INTEGRITY</span><h2>What we know — and what we don’t.</h2><p>This board is intentionally evidence-aware. Product behavior is separated from audience assumptions so a review does not turn a draft persona into a claim.</p></div>
      <div className="evidence-layout">
        <article className="evidence-panel observed"><span className="evidence-icon"><ShieldCheck size={20} /></span><span className="section-kicker">PRODUCT BEHAVIOR PROVIDED</span><h3>Grounded in the current flow</h3><ul>
          <li>Signed-out visitors can create an account or sign in. Clerk handles account setup; signed-in users route to dashboard. No custom onboarding step.</li>
          <li>Zero contacts shows “Add your first contact”; existing records lead to Contacts.</li>
          <li>Search covers name, company, and email. No matches can be cleared; a matching record can be opened.</li>
          <li>First and last name are required. Contact metadata, social links, notes, status, tags, and dates are supported.</li>
          <li>Save has a pending disabled state, recoverable form error, and success confirmation. Cancel before save creates no record.</li>
          <li>Follow-up is optional. Time/repeat require a date; saved follow-ups can be pending, overdue, due today, upcoming, or completed.</li>
        </ul></article>
        <article className="evidence-panel inferred"><span className="evidence-icon"><Lightbulb size={20} /></span><span className="section-kicker">INFERRED NEEDS — HYPOTHESES</span><h3>For validation, not assertion</h3><ul>
          <li>Freelancers may prioritize capture speed and remembering a referral’s origin.</li>
          <li>Artists may need social links and notes when conventional company/email details are absent.</li>
          <li>Music-industry executives may need stronger disambiguation across shared organizations and roles.</li>
          <li>Manual entry may feel slow at higher contact volume.</li>
        </ul></article>
      </div>
      <div className="opportunity-panel"><span className="opportunity-mark"><Sparkles size={19} /></span><div><span className="section-kicker">OPEN OPPORTUNITIES · NOT SHIPPED FEATURES</span><h3>Questions worth researching next</h3><div className="opportunity-list"><p><b>No automatic duplicate detection</b><br />How often do people notice an existing match before they add?</p><p><b>No bulk contact import</b><br />At what point does one-at-a-time entry become a meaningful blocker?</p><p><b>Searchable identity cues</b><br />Do users rely on social profile, role, or organization to tell two contacts apart?</p></div></div></div>
      <div className="method-note"><Mail size={15} /><span>No interviews, analytics, or new data collection are represented here. Validate open questions with the product team’s research process.</span></div>
    </section>
  );
}

function App() {
  const [activeId, setActiveId] = useState('freelancer');
  const [view, setView] = useState('journey');
  const active = personas.find((p) => p.id === activeId) ?? personas[0];
  return (
    <div className="app-shell" id="top">
      <Header view={view} setView={setView} />
      <main className="main-content">
        <section className="project-heading">
          <div className="project-title">
            <span className="project-label"><span className="label-line" /> FULL CIRCLE PRODUCT RESEARCH <span className="label-sep">/</span> CURRENT FLOW</span>
            <h1>How a connection<br /><em>gets a place to land.</em></h1>
            <p>Three draft audiences. One first-contact journey. A working map of where the path moves — and where it might pause.</p>
          </div>
          <div className="project-meta">
            <div className="meta-pip"><span className="meta-dot" /> Working draft</div>
            <div className="meta-stat"><strong>03</strong><span>audience<br />hypotheses</span></div>
            <div className="meta-stat"><strong>07</strong><span>shared journey<br />stages</span></div>
            <div className="meta-stamp">RESEARCH<br />BOARD <ArrowDownRight size={14} /></div>
          </div>
          <div className="project-bottom"><span>ACCOUNT CREATION <ArrowRight size={13} /> FIRST CONTACT</span><span>STATIC RESEARCH ARTIFACT <span className="bottom-dot">·</span> NOT A PRODUCT SCREEN</span></div>
        </section>
        {view === 'journey' && (
          <>
            <div className="persona-tabs" role="tablist" aria-label="Select audience map">
              {personas.map((persona, i) => {
                const Icon = persona.icon;
                return <button data-testid={`tab-persona-${persona.id}`} key={persona.id} role="tab" aria-selected={activeId === persona.id} className={`persona-tab ${persona.accent} ${activeId === persona.id ? 'selected' : ''}`} onClick={() => setActiveId(persona.id)}><span className="tab-number">0{i + 1}</span><span className="tab-icon"><Icon size={17} /></span><span className="tab-copy"><b>{persona.name}</b><small>{persona.role}</small></span>{activeId === persona.id && <span className="tab-indicator" />}</button>;
              })}
            </div>
            <Journey key={active.id} persona={active} />
          </>
        )}
        {view === 'compare' && <Compare onSelect={(id) => { setActiveId(id); setView('journey'); }} />}
        {view === 'evidence' && <Evidence />}
        <footer className="page-footer"><div className="footer-brand"><span className="footer-mark"><Layers3 size={15} /></span> FIELDNOTES <i>/</i> FULL CIRCLE</div><span>Audience assumptions are hypotheses. Product behavior is labeled separately.</span><span className="footer-right">INTERNAL WORKING BOARD <X size={12} /></span></footer>
      </main>
    </div>
  );
}

export default App;
