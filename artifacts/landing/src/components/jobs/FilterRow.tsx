import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * The filter row.
 *
 * Every control here is backed by a column the feed actually stores. That is the
 * whole rule, and it is worth stating because the reference design this was read off
 * breaks it: it renders an Experience control that tags "Sr. Solutions Architect",
 * "Python Engineer - Assistant Vice President" and "Full Stack Developer - Assistant
 * Vice President" all as **Entry-Level** — three of five visible rows wrong, two of
 * them containing the word that contradicts the tag.
 *
 * Nothing upstream stores a seniority or a category. So the two controls that look
 * like classifiers are **title searches**: picking "New grad" sends `title=new grad`
 * and the page labels nothing. A posting the words miss is simply absent from that
 * search rather than mislabelled, and no row anywhere carries a seniority badge.
 *
 * The cost is stated rather than hidden: a new-grad role titled "Software Engineer"
 * will not be found this way. A missing row costs one posting; a wrong badge costs
 * the page's credibility, which is the only thing it has that the competitors do not.
 */

export type JobFilters = {
  employer?: string;
  title?: string;
  location?: string;
  remote_only?: boolean;
  posted_within_days?: number;
  include_refusals?: boolean;
  only_with_filings?: boolean;
};

/** Title searches dressed as a picker. The value IS the search text. */
const ROLE_PRESETS: { label: string; title: string }[] = [
  { label: "Internship", title: "intern" },
  { label: "New grad", title: "new grad" },
  { label: "Junior", title: "junior" },
  { label: "Senior", title: "senior" },
  { label: "Staff and above", title: "staff" },
];

const CATEGORY_PRESETS: { label: string; title: string }[] = [
  { label: "Software", title: "engineer" },
  { label: "Data and AI", title: "data" },
  { label: "Product", title: "product manager" },
  { label: "Design", title: "designer" },
];

const POSTED_OPTIONS: { label: string; days?: number }[] = [
  { label: "Any time" },
  { label: "Past 24 hours", days: 1 },
  { label: "Past 7 days", days: 7 },
  { label: "Past 30 days", days: 30 },
];

/**
 * Three options, not a checkbox, because the underlying data has three states.
 *
 * The first two narrow on a claim about the POSTING; the third narrows on a claim
 * about the EMPLOYER. The labels keep them apart on purpose.
 */
const SPONSORSHIP_OPTIONS = [
  { value: "hide-refusals", label: "Hide roles that say no sponsorship" },
  { value: "any", label: "Everything" },
  { value: "with-filings", label: "Only employers with filing history" },
] as const;

type SponsorshipChoice = (typeof SPONSORSHIP_OPTIONS)[number]["value"];

const ANY = "__any__";

export function FilterRow({
  filters,
  onChange,
  onReset,
}: {
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  onReset: () => void;
}) {
  const sponsorship: SponsorshipChoice = filters.include_refusals
    ? "any"
    : filters.only_with_filings
      ? "with-filings"
      : "hide-refusals";

  const set = (patch: Partial<JobFilters>) => onChange({ ...filters, ...patch });

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="job-filter-row"
      role="search"
      aria-label="Filter postings"
    >
      <Input
        className="w-44"
        placeholder="Company"
        aria-label="Company"
        value={filters.employer ?? ""}
        onChange={(e) => set({ employer: e.target.value || undefined })}
      />
      <Input
        className="w-44"
        placeholder="Location"
        aria-label="Location"
        value={filters.location ?? ""}
        onChange={(e) => set({ location: e.target.value || undefined })}
      />

      <Select
        value={
          POSTED_OPTIONS.find((o) => o.days === filters.posted_within_days)?.label ??
          "Any time"
        }
        onValueChange={(label) =>
          set({ posted_within_days: POSTED_OPTIONS.find((o) => o.label === label)?.days })
        }
      >
        <SelectTrigger className="w-40" aria-label="Posted">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {POSTED_OPTIONS.map((o) => (
            <SelectItem key={o.label} value={o.label}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* A title search wearing a picker's clothes. Sends `title`, never a seniority. */}
      <Select
        value={filters.title ?? ANY}
        onValueChange={(value) => set({ title: value === ANY ? undefined : value })}
      >
        <SelectTrigger className="w-44" aria-label="Role">
          <SelectValue placeholder="Any role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any role</SelectItem>
          {[...ROLE_PRESETS, ...CATEGORY_PRESETS].map((p) => (
            <SelectItem key={p.label} value={p.title}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={sponsorship}
        onValueChange={(value) =>
          set({
            include_refusals: value === "any",
            only_with_filings: value === "with-filings",
          })
        }
      >
        <SelectTrigger className="w-64" aria-label="Sponsorship">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SPONSORSHIP_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        type="button"
        variant={filters.remote_only ? "default" : "outline"}
        aria-pressed={filters.remote_only ?? false}
        onClick={() => set({ remote_only: !filters.remote_only || undefined })}
      >
        Remote
      </Button>

      <Button type="button" variant="ghost" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}

export default FilterRow;
