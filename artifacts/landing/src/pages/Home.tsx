import { SiGooglechrome } from "react-icons/si";
import {
  ArrowRight,
  Bell,
  Database,
  Info,
  Mail,
  MousePointerClick,
  Puzzle,
  ShieldCheck,
} from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { WaitlistForm } from "@/components/WaitlistForm";
import { CHROME_STORE_URL } from "@/lib/links";

/**
 * Every claim on this page is checked against what the extension actually ships.
 * The badge strings below are the extension's own strings, the counts come from
 * the employer tables it is built on, and nothing here describes a feature that
 * does not exist yet. If you are adding copy, hold it to the same bar.
 */

/**
 * Verbatim from the extension. The emoji is split off the label only so the chip can
 * put real space between them — `emoji + " " + label` is the extension's own string,
 * and it should stay that way.
 */
const BADGES = [
  {
    emoji: "🟢",
    label: "Strong H1B sponsor",
    meaning:
      "Recent, sizable H-1B filings in the Department of Labor data. This employer sponsors, and did so lately.",
    ring: "bg-green-500/10 border-green-500/25",
  },
  {
    emoji: "🟡",
    label: "Has sponsored before",
    meaning:
      "Filings exist, but they are older or there are only a few of them. A real signal, just a weaker one.",
    ring: "bg-amber-500/10 border-amber-500/25",
  },
  {
    emoji: "⚪",
    label: "No H1B record",
    meaning:
      "Nothing matched in the data. That is not proof they never sponsor — small or newly renamed employers land here too.",
    ring: "bg-muted border-border",
  },
  {
    emoji: "🔴",
    label: "This posting: no sponsorship",
    meaning:
      "The job description itself rules sponsorship out. Read off the posting you are looking at, not the company's history.",
    ring: "bg-red-500/10 border-red-500/25",
  },
];

const BOARDS = [
  {
    name: "LinkedIn",
    mark: "in",
    status: "Works the moment you install it.",
    ready: true,
  },
  { name: "Indeed", mark: "id", status: "Switch on from the popup.", ready: false },
  { name: "Dice", mark: "dc", status: "Switch on from the popup.", ready: false },
  { name: "Glassdoor", mark: "gd", status: "Switch on from the popup.", ready: false },
];

const STEPS = [
  {
    icon: Puzzle,
    title: "Install it and pin it",
    body: "One click from the Chrome Web Store. Pin the icon so the popup is one click away — that is where you turn the other job boards on.",
  },
  {
    icon: MousePointerClick,
    title: "Browse like you already do",
    body: "Badges appear on the job cards as you scroll. Nothing to search, nothing to paste, no second tab to keep open.",
  },
  {
    icon: Mail,
    title: "Two free minutes, then an email",
    body: "Badges run free for two minutes of active browsing — a background tab does not burn the clock. After that, scanning pauses until you enter an email, from the popup or the card on the page. No password, no account, no charge.",
  },
];

/** The counts are exact: `output/employers.csv` and `output/employer_aliases.csv`. */
const DATA_FACTS = [
  { value: "72,135", label: "employers in the database" },
  { value: "12,586", label: "trade names and aliases mapped" },
  { value: "5", label: "filing quarters loaded, FY2025–26" },
];

const LIMITS = [
  "A white badge means no recent filings were found. That is not proof a company will never sponsor.",
  "The company name on a job board does not always match the legal entity that files with the DOL. We map thousands of trade names, but not all of them.",
  "The data is refreshed quarterly, by hand, when the DOL publishes. It is not live.",
  "This is an information tool built on public data. It is not legal or immigration advice.",
];

function BadgeChip({
  emoji,
  label,
  ring,
  size = "sm",
}: {
  emoji: string;
  label: string;
  ring: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border font-semibold text-foreground ${ring} ${
        size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs"
      }`}
    >
      <span aria-hidden>{emoji}</span>
      {label}
    </span>
  );
}

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background selection:bg-primary/20 selection:text-primary overflow-x-hidden flex flex-col">
      <SiteHeader />

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-6 max-w-7xl mx-auto w-full">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-medium text-sm mb-8">
            <ShieldCheck className="w-4 h-4" />
            <span>Built for international students</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Know who sponsors{" "}
            <span className="text-primary">before you apply</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
            BingoCareer is a Chrome extension that puts an H1B sponsorship badge on
            every job card you scroll past — on LinkedIn, Indeed, Dice and
            Glassdoor — from{" "}
            <strong className="text-foreground font-semibold">
              U.S. Department of Labor
            </strong>{" "}
            LCA filings covering 72,135 employers.
          </p>

          <div className="flex flex-col items-center gap-4">
            <a
              href={CHROME_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-3 h-14 px-8 rounded-xl bg-primary text-primary-foreground border border-primary-border hover:opacity-95 font-semibold text-lg transition-opacity shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              data-testid="link-download-extension"
            >
              <SiGooglechrome className="w-6 h-6 shrink-0" aria-hidden />
              Add to Chrome — Free
            </a>
            <p className="text-sm text-muted-foreground max-w-md">
              LinkedIn works right away. Indeed, Dice and Glassdoor switch on from
              the extension popup whenever you want them.
            </p>
          </div>
        </div>

        {/* Honest mockup: the badges below are the strings the extension renders. */}
        <div className="relative z-10 mt-16 max-w-2xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
            <div className="h-10 border-b border-border bg-muted/50 flex items-center px-4 gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-muted-foreground font-mono">
                linkedin.com/jobs
              </span>
            </div>

            <ul className="divide-y divide-border">
              {[
                { role: "Software Engineer, Platform", badge: BADGES[0], w: "w-56" },
                { role: "Data Analyst", badge: BADGES[1], w: "w-40" },
                {
                  role: "Backend Engineer",
                  badge: BADGES[3],
                  w: "w-48",
                  history: { emoji: "🟢", label: "History: strong sponsor" },
                },
              ].map((row) => (
                <li key={row.role} className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      {row.role}
                    </p>
                    <div className={`h-3 ${row.w} max-w-full bg-muted rounded mt-2`} aria-hidden />
                    <div className="mt-3 flex flex-col items-start gap-1">
                      <BadgeChip
                        emoji={row.badge.emoji}
                        label={row.badge.label}
                        ring={row.badge.ring}
                      />
                      {row.history && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground pl-0.5">
                          <span aria-hidden>{row.history.emoji}</span>
                          {row.history.label}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Badges ──────────────────────────────────────────────────────── */}
      <section
        id="badges"
        className="scroll-mt-16 py-24 px-6 bg-card border-y border-border"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Four badges, and what each one means
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            The badge is the whole product. It is on the card before you click, so
            you spend your applications where sponsorship is possible.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            {BADGES.map((badge) => (
              <div
                key={badge.label}
                className="p-6 rounded-2xl border border-border bg-background"
                data-testid={`card-badge-${badge.label.split(" ")[0].toLowerCase()}`}
              >
                <BadgeChip
                  emoji={badge.emoji}
                  label={badge.label}
                  ring={badge.ring}
                  size="md"
                />
                <p className="text-sm text-muted-foreground leading-relaxed mt-4">
                  {badge.meaning}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl border border-primary/20 bg-primary/5">
            <h3 className="font-semibold text-foreground mb-2">
              Why the red badge matters most
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              A company can have a strong sponsorship record and still post roles
              that are closed to visa candidates. When the posting itself says no
              sponsorship, the red badge overrides the company's tier — and shows
              the history underneath it, so you see both facts at once instead of
              being misled by either one.
            </p>
          </div>
        </div>
      </section>

      {/* ── Where it works ──────────────────────────────────────────────── */}
      <section id="where" className="scroll-mt-16 py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Four job boards
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mb-12">
            Not "any job board" — these four. LinkedIn is on from the start. The
            other three stay off until you ask for them, so the extension never
            touches a site you did not opt into.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {BOARDS.map((board) => (
              <div
                key={board.name}
                className="p-6 rounded-2xl border border-border bg-card"
                data-testid={`card-board-${board.name.toLowerCase()}`}
              >
                <span
                  className="inline-grid place-items-center w-10 h-10 rounded-lg bg-muted text-sm font-bold text-muted-foreground mb-4"
                  aria-hidden
                >
                  {board.mark}
                </span>
                <h3 className="font-semibold text-foreground">{board.name}</h3>
                <p
                  className={`text-sm mt-1 ${board.ready ? "text-primary font-medium" : "text-muted-foreground"}`}
                >
                  {board.status}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 p-6 rounded-2xl bg-muted/40 border border-border/60">
            <h3 className="font-semibold text-foreground mb-2">
              Turning on Indeed, Dice or Glassdoor
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Open the extension popup, flip the switch for the board you want, and
              approve the Chrome permission prompt for that site. Reload the tab and
              the badges are there. Three steps, once per board.
            </p>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section
        id="how"
        className="scroll-mt-16 py-24 px-6 bg-card border-y border-border"
      >
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12">
            How it works
          </h2>

          <ol className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="p-6 rounded-2xl border border-border bg-background"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                    <step.icon className="w-5 h-5" />
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground tabular-nums">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-6 p-6 rounded-2xl border border-border bg-background flex flex-col sm:flex-row sm:items-center gap-5">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Follow an employer
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                One click follows a company. When its sponsorship data changes in
                the next DOL release, you get an email — no need to keep checking
                the same page.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The data ────────────────────────────────────────────────────── */}
      <section id="data" className="scroll-mt-16 py-24 px-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12">
          <div>
            <div className="inline-flex items-center gap-2 text-primary font-medium text-sm mb-4">
              <Database className="w-4 h-4" />
              <span>Where the badges come from</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Public DOL filings, nothing invented
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Every badge is computed from U.S. Department of Labor H-1B{" "}
              <strong className="text-foreground font-semibold">
                LCA disclosure data
              </strong>{" "}
              — the filings employers must make to hire on an H-1B. We load
              fiscal-year 2025 in full plus the latest 2026 quarter, and refresh by
              hand each time the DOL publishes a new one.
            </p>

            <dl className="grid sm:grid-cols-3 gap-4">
              {DATA_FACTS.map((fact) => (
                <div
                  key={fact.label}
                  className="p-4 rounded-xl border border-border bg-card"
                >
                  <dt className="text-2xl font-extrabold text-foreground tabular-nums">
                    {fact.value}
                  </dt>
                  <dd className="text-xs text-muted-foreground leading-snug mt-1">
                    {fact.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="text-xl font-bold text-foreground mb-4">
              What it does not tell you
            </h3>
            <ul className="space-y-4">
              {LIMITS.map((limit) => (
                <li key={limit} className="flex gap-3">
                  <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    {limit}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed mt-8 pt-6 border-t border-border">
              Work in progress: sharpening the red detector, so a posting that rules
              out sponsorship is caught every time and never fires on one that does
              not.
            </p>
          </div>
        </div>
      </section>

      {/* ── Waitlist ────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-primary/5 border-t border-primary/10 mt-auto">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Hear about what comes next
          </h2>
          <p className="text-muted-foreground mb-2">
            The extension is the product today. Leave your email and we will write
            when there is something worth telling you about — more boards, a sharper
            red detector, whatever comes after.
          </p>
          <p className="text-sm text-muted-foreground/80 mb-8">
            This is just a mailing list. It is separate from the extension's own
            sign-up, and joining it does not unlock the badges.
          </p>
          <div className="max-w-md mx-auto text-left">
            <WaitlistForm />
          </div>

          <a
            href={CHROME_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-10 text-sm font-semibold text-primary hover:underline"
            data-testid="link-footer-cta-chrome"
          >
            Or add it to Chrome now — it is free
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
