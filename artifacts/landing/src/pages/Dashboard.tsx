import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, LogOut } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  getGetStatsDailyQueryKey,
  getGetStatsRegistrationsQueryKey,
  getGetStatsTotalsQueryKey,
  useGetStatsDaily,
  useGetStatsRegistrations,
  useGetStatsTotals,
  useLogOut,
} from "@workspace/api-client-react";

import { useAuth, useForgetAuth } from "@/hooks/use-auth";
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
 * The growth dashboard, for the owner alone.
 *
 * Every number here comes from the extension's API by way of this site's server,
 * which is where the shared secret lives — nothing on this page holds a credential.
 * A visitor who is not the owner gets 404 from those endpoints, so this renders the
 * ordinary not-found page: no hint that there was a dashboard to be refused.
 */
export default function Dashboard() {
  const [days, setDays] = useState<number>(30);
  const { isLoading: authLoading, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const forgetAuth = useForgetAuth();
  const logOut = useLogOut();

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

  useEffect(() => {
    if (!authLoading && !isSignedIn) navigate("/login");
  }, [authLoading, isSignedIn, navigate]);

  if (authLoading || (isSignedIn && totals.isLoading)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
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
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
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
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground">Growth Dashboard</span>
          <Button
            variant="ghost"
            size="sm"
            data-testid="button-signout"
            onClick={() =>
              logOut.mutate(undefined, {
                onSettled: async () => {
                  await forgetAuth();
                  navigate("/login");
                },
              })
            }
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
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
      </main>
    </div>
  );
}
