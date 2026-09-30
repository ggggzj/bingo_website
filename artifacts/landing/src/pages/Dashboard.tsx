import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  getGetStatsDailyQueryKey,
  getGetStatsRegistrationsQueryKey,
  getGetStatsTotalsQueryKey,
  useGetStatsDaily,
  useGetStatsRegistrations,
  useGetStatsTotals,
} from "@workspace/api-client-react";

import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WINDOWS = [7, 30, 90] as const;

/**
 * Three series in one chart need three colours that can be told apart. The theme's
 * --chart-1..5 are all shades of the brand orange (hues 15-40), which is right for a
 * single-series accent and unreadable for this, so only the lead series uses the
 * brand and the other two are picked to differ in hue and in lightness — distinct
 * even in greyscale, and for a reader who cannot separate red from green.
 */
const SERIES: ChartConfig = {
  new_installs: { label: "New installs", color: "hsl(var(--chart-1))" },
  active_installs: { label: "Active installs", color: "hsl(215 28% 45%)" },
  new_registrations: { label: "New emails", color: "hsl(160 55% 34%)" },
};

/**
 * The sync is daily by design (h1_checker D-043 wakes hourly and syncs when a day has
 * passed), so a healthy value sits under about 24. Thirty is one full cycle plus headroom.
 *
 * One threshold, not a graded scale: a warning level left standing becomes the new normal,
 * and that is exactly what happened — the feed froze on 2026-08-20 for twenty days and again
 * on 2026-09-18 for twelve, and this page said nothing either time. The number lives here and
 * nowhere else; Dashboard.test.tsx crosses it with its own literals rather than importing it.
 */
const FEED_STALE_AFTER_HOURS = 30;

/** Whole hours into the largest unit that still reads honestly. 288 -> "12 days". */
function staleness(hours: number) {
  if (hours < 1) return "less than an hour ago";
  if (hours < 48) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/**
 * The one number on this page that is an alarm rather than a measurement, and the only one
 * whose polarity is "less is better" — which is why it is a line above the tiles and not a
 * sixth tile that would look identical to five counts.
 */
function FeedFreshness({
  hours,
  at,
}: {
  hours: number | null | undefined;
  at: string | null | undefined;
}) {
  // Four states, and the difference between the middle two is the point. `null` is upstream
  // saying no sync has ever run — an alarm. `undefined` is upstream not saying anything,
  // which an older deploy does by omitting both fields; calling that a dead feed is a false
  // alarm, and a line that is permanently red is how this page goes back to saying nothing.
  // Neither may be coerced to 0, which would render as "just now" — the inverse of the truth.
  // Narrowing rather than a lookup table: a table's four values are all evaluated, so the
  // never/unknown branches would each run staleness() on a null and quietly produce
  // "NaN days ago" before discarding it — invisible to the tests and to the typechecker,
  // which is precisely the kind of thing a cast buys you.
  let state: "unknown" | "never" | "stale" | "fresh";
  let text: string;
  if (hours === undefined) {
    state = "unknown";
    text = "Job feed freshness unavailable";
  } else if (hours === null) {
    state = "never";
    text = "Job feed has never synced";
  } else {
    state = hours > FEED_STALE_AFTER_HOURS ? "stale" : "fresh";
    text = `Job feed last synced ${staleness(hours)}`;
  }

  return (
    <div
      data-testid="feed-freshness"
      data-state={state}
      // The line carries a duration because that is what you read at a glance; the exact
      // moment hangs off it rather than crowding it.
      title={at ? new Date(at).toLocaleString() : undefined}
      className={`text-sm ${
        state === "stale" || state === "never"
          ? "font-medium text-destructive"
          : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

function Tile({ value, label }: { value: number; label: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-3xl font-bold tabular-nums text-foreground">
          {value.toLocaleString()}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

function day(value: string | null | undefined): string {
  // The API sends timestamps; only the date is ever read here.
  return value ? value.slice(0, 10) : "—";
}

/**
 * The growth view, for the owner alone. Rendered inside the dashboard shell,
 * which owns identity, sign-out and the switcher — this file draws numbers.
 *
 * Every number here comes from the extension's API by way of this site's server,
 * which is where the shared secret lives — nothing on this page holds a credential.
 * A visitor who is not the owner gets 404 from those endpoints, so this renders the
 * ordinary not-found page: no hint that there was a dashboard to be refused. The
 * shell's rail hides this view from non-owners, but that is a convenience; this
 * refusal is the one that decides.
 */
export default function Dashboard() {
  const [days, setDays] = useState<number>(30);
  const { isLoading: authLoading, isSignedIn } = useAuth();

  // 404 is the ordinary answer for anyone who is not the owner, so retrying it three
  // times only delays the not-found page. Nothing is asked for until the server has
  // said this browser is signed in at all.
  const shared = { retry: false, enabled: isSignedIn } as const;
  const dailyParams = { days };
  const registrationParams = { limit: 200 };

  const totals = useGetStatsTotals({
    query: { ...shared, queryKey: getGetStatsTotalsQueryKey() },
  });
  const daily = useGetStatsDaily(dailyParams, {
    query: { ...shared, queryKey: getGetStatsDailyQueryKey(dailyParams) },
  });
  const registrations = useGetStatsRegistrations(registrationParams, {
    query: {
      ...shared,
      queryKey: getGetStatsRegistrationsQueryKey(registrationParams),
    },
  });

  // Sending a signed-out visitor to the login page is the shell's job; this
  // view is only ever rendered inside it.
  if (authLoading || (isSignedIn && totals.isLoading)) {
    return (
      <div className="min-h-64 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) return null;

  if (totals.error) {
    // 404 means "not the owner", and it should look exactly like a page that is not
    // there. Anything else — the other service down, a missing token — is a real
    // fault, and only the owner can be seeing it, so it can say so.
    if (totals.error.status === 404) return <NotFound />;
    return (
      <div className="min-h-64 flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground text-center max-w-sm">
          {totals.error.data?.error ??
            "The stats service could not be reached."}
        </p>
      </div>
    );
  }

  const referrals = Object.entries(totals.data?.referral_sources ?? {}).sort(
    (a, b) => b[1] - a[1],
  );

  return (
    <div className="space-y-8">
      <FeedFreshness
        hours={totals.data?.feed_hours_stale}
        at={totals.data?.feed_last_sync}
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
          <Tile value={totals.data?.total_clients ?? 0} label="Installs, all time" />
          <Tile value={totals.data?.weekly_active ?? 0} label="Active this week" />
          <Tile
            value={totals.data?.total_registrations ?? 0}
            label="Registered emails"
          />
          <Tile
            value={totals.data?.total_followers ?? 0}
            label="Emails following a company"
          />
          <Tile value={totals.data?.checks_7d ?? 0} label="Checks, last 7 days" />
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Daily growth</CardTitle>
            <div className="flex gap-1">
              {WINDOWS.map((window) => (
                <Button
                  key={window}
                  size="sm"
                  variant={days === window ? "default" : "ghost"}
                  onClick={() => setDays(window)}
                  data-testid={`button-window-${window}`}
                >
                  {window}d
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {daily.isPending ? (
              <div className="h-[280px] flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ChartContainer config={SERIES} className="h-[280px] w-full">
                <BarChart data={daily.data?.series ?? []}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={24}
                    tickFormatter={(value: string) => value.slice(5)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  {Object.keys(SERIES).map((key) => (
                    <Bar
                      key={key}
                      dataKey={key}
                      fill={`var(--color-${key})`}
                      radius={2}
                      // Recharts grows bars from zero on mount, and when the chart
                      // is laid out before its container has a size the animation
                      // never starts — leaving the bars rendered but empty. Nothing
                      // here needs to move, so don't give it the chance.
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Where installs came from</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {referrals.map(([source, count]) => (
              <div key={source} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-muted-foreground">
                  {source}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${
                        // Share of the answers, not of all installs: almost nobody
                        // answers, so a share of everyone would read as ~0 for all.
                        totals.data?.referrals_answered
                          ? (count / totals.data.referrals_answered) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums">{count}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              {totals.data?.referrals_answered ?? 0} of{" "}
              {totals.data?.total_clients ?? 0} installs answered.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Registered emails ({registrations.data?.total ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Confirmed</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Came from</TableHead>
                  <TableHead className="text-right">Follows</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(registrations.data?.rows ?? []).map((row) => (
                  <TableRow key={row.email}>
                    <TableCell className="font-medium">{row.email}</TableCell>
                    <TableCell>{row.verified_at ? "✓" : "—"}</TableCell>
                    <TableCell>{day(row.installed_at)}</TableCell>
                    <TableCell>{day(row.created_at)}</TableCell>
                    <TableCell>{row.referral_source ?? "unknown"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.subscriptions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
