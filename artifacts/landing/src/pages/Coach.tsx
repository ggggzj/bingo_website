import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  getGetCoachConfigQueryKey,
  getGetCoachForecastQueryKey,
  getGetCoachLogQueryKey,
  getGetCoachPlanQueryKey,
  useCreateCoachToken,
  useGetCoachConfig,
  useGetCoachForecast,
  useGetCoachLog,
  useRevokeCoachToken,
  useSetCoachSolved,
  useUpdateCoachConfig,
} from "@workspace/api-client-react";
import type {
  CoachConfig,
  CoachLogDay,
  CoachPlan,
  CoachPlanNewItem,
  CoachPlanReviewItem,
} from "@workspace/api-client-react";

import { useAuth } from "@/hooks/use-auth";
import { useCoachAccess } from "@/hooks/use-coach-access";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Grading is deliberately absent from this page: grades come from the
// grilling session, never from a browser control — self-grading is exactly
// what this system exists to prevent.

const leetcodeUrl = (slug: string) => `https://leetcode.com/problems/${slug}/`;

/** Day-status palette. Ungraded gets violet on purpose — code written but
 * reasoning untested is the state to chase, and it must never read as green. */
const STATUS_COLOR: Record<string, string> = {
  complete: "hsl(160 55% 38%)",
  extra: "hsl(160 45% 55%)",
  partial: "hsl(38 90% 55%)",
  ungraded: "hsl(270 55% 60%)",
  missed: "hsl(0 60% 62%)",
  pending: "hsl(215 20% 75%)",
  rest: "hsl(215 15% 92%)",
};

const FORECAST_SERIES: ChartConfig = {
  minutes: { label: "Review minutes", color: "hsl(var(--chart-1))" },
};

function DifficultyBadge({ value }: { value: string }) {
  const tone =
    value === "easy"
      ? "bg-emerald-100 text-emerald-800"
      : value === "hard"
        ? "bg-red-100 text-red-800"
        : "bg-amber-100 text-amber-800";
  return <span className={`text-xs px-1.5 py-0.5 rounded ${tone}`}>{value}</span>;
}

function ProblemRow({
  item,
  kind,
  onTick,
  ticking,
}: {
  item: CoachPlanReviewItem | CoachPlanNewItem;
  kind: "review" | "new";
  onTick: (id: string, solved: boolean) => void;
  ticking: boolean;
}) {
  const p = item.problem;
  const review = kind === "review" ? (item as CoachPlanReviewItem) : null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
      <Checkbox
        className="mt-1"
        checked={item.solved}
        disabled={item.done || ticking}
        onCheckedChange={(v) => onTick(p.id, v === true)}
        data-testid={`tick-${p.id}`}
        aria-label={`solved ${p.title}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={leetcodeUrl(p.slug)}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
          >
            LC {p.num} · {p.title}
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </a>
          <DifficultyBadge value={p.difficulty} />
          {review && (
            <Badge variant="secondary" className="text-xs">
              {review.mode === "grill" ? "🗣 grill" : "⌨️ re-solve"}
            </Badge>
          )}
          {item.done && (
            <Badge className="text-xs" data-testid={`grade-${p.id}`}>
              {item.grade}
            </Badge>
          )}
          {!item.done && item.solved && (
            <Badge variant="outline" className="text-xs text-purple-700 border-purple-300">
              solved, not grilled
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {p.patterns.join(", ")} · ~{item.minutes} min
          {review && review.daysOverdue > 0 && (
            <span className="text-red-600"> · {review.daysOverdue}d overdue</span>
          )}
        </div>
        {review && review.weakPoints.length > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            Last time you stumbled on:{" "}
            <span className="text-foreground">{review.weakPoints.join("; ")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanPanel({ plan }: { plan: CoachPlan }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const tick = useSetCoachSolved({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getGetCoachPlanQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetCoachLogQueryKey() }),
        ]);
      },
      onError: (err) =>
        toast({
          title: "Could not update",
          description: err.data?.error ?? "Try again.",
          variant: "destructive",
        }),
    },
  });

  const onTick = (problemId: string, solved: boolean) =>
    tick.mutate({ data: { problemId, solved } });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Today — {plan.date}</CardTitle>
        <div className="text-sm text-muted-foreground tabular-nums">
          {plan.plannedMinutes} / {plan.budget} min · graded {plan.doneToday}/
          {plan.assignedToday}
        </div>
      </CardHeader>
      <CardContent>
        {plan.sprint && (
          <div className="mb-3 text-sm rounded-md bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2">
            Sprint mode — interview in {plan.sprintDays} days. Reviews first,
            company-frequency ordering.
          </div>
        )}
        {plan.reviews.length > 0 && (
          <>
            <div className="text-sm font-medium text-muted-foreground mb-1">
              Reviews
            </div>
            {plan.reviews.map((item) => (
              <ProblemRow
                key={item.problem.id}
                item={item}
                kind="review"
                onTick={onTick}
                ticking={tick.isPending}
              />
            ))}
          </>
        )}
        {plan.deferredReviews > 0 && (
          <p className="text-xs text-muted-foreground my-2">
            {plan.deferredReviews} more review(s) deferred to keep today inside
            budget.
          </p>
        )}
        {plan.new.length > 0 && (
          <>
            <div className="text-sm font-medium text-muted-foreground mb-1 mt-3">
              New problems
            </div>
            {plan.new.map((item) => (
              <ProblemRow
                key={item.problem.id}
                item={item}
                kind="new"
                onTick={onTick}
                ticking={tick.isPending}
              />
            ))}
          </>
        )}
        {plan.reviews.length === 0 && plan.new.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nothing due and nothing left to unlock. Take the day.
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Ticking a box only records that the code got written. Grades come
          from the grilling — say{" "}
          <code className="bg-muted px-1 rounded">grill me on LC N</code> in
          Claude Code.
        </p>
      </CardContent>
    </Card>
  );
}

function ConsistencyPanel({ enabled }: { enabled: boolean }) {
  const params = { days: 91 };
  const log = useGetCoachLog(params, {
    query: {
      queryKey: getGetCoachLogQueryKey(params),
      retry: false,
      enabled,
    },
  });
  const days: CoachLogDay[] = log.data?.days ?? [];
  // 13 weeks × 7 rows, column-per-week like every contribution graph.
  const weeks: CoachLogDay[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Consistency</CardTitle>
        <div className="text-sm text-muted-foreground">
          streak{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {log.data?.streak ?? 0}
          </span>{" "}
          · finished {log.data?.adherence.finishedDays ?? 0}/
          {log.data?.adherence.assignedDays ?? 0} assigned days (30d)
        </div>
      </CardHeader>
      <CardContent>
        {log.isPending ? (
          <div className="h-24 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="flex gap-[3px] overflow-x-auto pb-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((d) => (
                    <div
                      key={d.day}
                      className="w-3 h-3 rounded-[2px]"
                      style={{ background: STATUS_COLOR[d.status] ?? STATUS_COLOR.rest }}
                      title={`${d.day} — ${d.status}`}
                      data-testid={`day-${d.day}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
              {Object.entries(STATUS_COLOR).map(([status, color]) => (
                <span key={status} className="inline-flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-[2px] inline-block"
                    style={{ background: color }}
                  />
                  {status}
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ForecastPanel({ enabled }: { enabled: boolean }) {
  const forecast = useGetCoachForecast(undefined, {
    query: {
      queryKey: getGetCoachForecastQueryKey(),
      retry: false,
      enabled,
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Review load, next two weeks</CardTitle>
      </CardHeader>
      <CardContent>
        {forecast.isPending ? (
          <div className="h-[180px] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ChartContainer config={FORECAST_SERIES} className="h-[180px] w-full">
            <BarChart data={forecast.data?.days ?? []}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="minutes"
                fill="var(--color-minutes)"
                radius={2}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SettingsPanel({ enabled }: { enabled: boolean }) {
  const queryClient = useQueryClient();
  const config = useGetCoachConfig({
    query: {
      queryKey: getGetCoachConfigQueryKey(),
      retry: false,
      enabled,
    },
  });
  const [draft, setDraft] = useState<CoachConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (config.data && draft === null) setDraft(config.data);
  }, [config.data, draft]);

  const save = useUpdateCoachConfig({
    mutation: {
      onSuccess: async (data) => {
        setError(null);
        setDraft(data);
        await queryClient.invalidateQueries({
          queryKey: getGetCoachConfigQueryKey(),
        });
        await queryClient.invalidateQueries({ queryKey: getGetCoachPlanQueryKey() });
      },
      onError: (err) => setError(err.data?.error ?? "Invalid settings"),
    },
  });

  if (!draft) return null;

  const num = (v: string, fallback: number) => {
    const n = Number(v);
    return Number.isInteger(n) ? n : fallback;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <Label htmlFor="coach-minutes" className="text-xs">
              Minutes / day
            </Label>
            <Input
              id="coach-minutes"
              type="number"
              value={draft.dailyMinutes}
              onChange={(e) =>
                setDraft({ ...draft, dailyMinutes: num(e.target.value, draft.dailyMinutes) })
              }
            />
          </div>
          <div>
            <Label htmlFor="coach-new" className="text-xs">
              New problems / day
            </Label>
            <Input
              id="coach-new"
              type="number"
              value={draft.newPerDay}
              onChange={(e) =>
                setDraft({ ...draft, newPerDay: num(e.target.value, draft.newPerDay) })
              }
            />
          </div>
          <div>
            <Label htmlFor="coach-interview" className="text-xs">
              Interview date
            </Label>
            <Input
              id="coach-interview"
              type="date"
              value={draft.interviewDate ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, interviewDate: e.target.value || null })
              }
            />
          </div>
          <div>
            <Label htmlFor="coach-window" className="text-xs">
              Sprint window (days)
            </Label>
            <Input
              id="coach-window"
              type="number"
              value={draft.sprintWindowDays}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sprintWindowDays: num(e.target.value, draft.sprintWindowDays),
                })
              }
            />
          </div>
        </div>
        <div>
          <Label className="text-xs">Track</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            AI Engineer pulls ML-adjacent patterns forward. Applies from the
            next plan — today's assignment stays as dealt.
          </p>
          <div className="flex gap-1.5">
            {(
              [
                ["sde", "SDE"],
                ["ai-engineer", "AI Engineer"],
              ] as const
            ).map(([value, label]) => {
              const active = draft.activeTrack === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-testid={`track-${value}`}
                  aria-pressed={active}
                  onClick={() => setDraft({ ...draft, activeTrack: value })}
                  className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label className="text-xs">Target companies</Label>
          <p className="text-xs text-muted-foreground mb-1.5">
            New problems are weighted toward what these companies actually ask.
            None selected means every company counts equally.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(draft.knownCompanies ?? []).map((company) => {
              const active = draft.targetCompanies.includes(company);
              return (
                <button
                  key={company}
                  type="button"
                  data-testid={`company-${company}`}
                  aria-pressed={active}
                  onClick={() =>
                    setDraft({
                      ...draft,
                      targetCompanies: active
                        ? draft.targetCompanies.filter((c) => c !== company)
                        : [...draft.targetCompanies, company],
                    })
                  }
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {company}
                </button>
              );
            })}
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          size="sm"
          disabled={save.isPending}
          data-testid="button-save-config"
          onClick={() =>
            save.mutate({
              data: {
                dailyMinutes: draft.dailyMinutes,
                newPerDay: draft.newPerDay,
                sprintWindowDays: draft.sprintWindowDays,
                interviewDate: draft.interviewDate,
                targetCompanies: draft.targetCompanies,
                activeTrack: draft.activeTrack,
              },
            })
          }
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}

function TokenPanel() {
  const { toast } = useToast();
  // Lives only in state: shown once, gone on unmount, never persisted.
  const [freshToken, setFreshToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const issue = useCreateCoachToken({
    mutation: {
      onSuccess: (data) => {
        setFreshToken(data.token);
        setCopied(false);
      },
    },
  });
  const revoke = useRevokeCoachToken({
    mutation: {
      onSuccess: () => {
        setFreshToken(null);
        toast({ title: "Token revoked" });
      },
    },
  });

  const exportLine = freshToken ? `export COACH_TOKEN=${freshToken}` : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Grill bridge token</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Local grilling sessions use this token to save grades here. Issuing a
          new one revokes the old; the value is shown exactly once.
        </p>
        {freshToken && (
          <div className="rounded-md bg-muted p-3 space-y-2">
            <code className="text-xs break-all block" data-testid="token-value">
              {exportLine}
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(exportLine);
                setCopied(true);
              }}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
            <p className="text-xs text-amber-700">
              Save it now — it will not be shown again.
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={issue.isPending}
            onClick={() => issue.mutate()}
            data-testid="button-issue-token"
          >
            {freshToken ? "Issue a new token" : "Issue token"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={revoke.isPending}
            onClick={() => revoke.mutate()}
            data-testid="button-revoke-token"
          >
            Revoke
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * The coach tracker. Follows the growth dashboard's stance exactly: the
 * route is unguarded, and anyone the server refuses sees the ordinary
 * not-found page — the coach's existence is not advertised by its URL.
 */
export default function Coach() {
  const { isLoading: authLoading, isSignedIn } = useAuth();
  const [, navigate] = useLocation();
  const { plan, refused } = useCoachAccess();

  useEffect(() => {
    if (!authLoading && !isSignedIn) navigate("/login");
  }, [authLoading, isSignedIn, navigate]);

  if (authLoading || (isSignedIn && plan.isLoading)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) return null;
  if (refused) return <NotFound />;
  if (plan.error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          The coach could not be reached. Try again in a minute.
        </p>
      </div>
    );
  }
  if (!plan.data) return null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border bg-white">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground">Coach</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {plan.data.totalSeen} / {plan.data.totalProblems} problems in rotation
          </span>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <PlanPanel plan={plan.data} />
        <div className="grid gap-6 lg:grid-cols-2">
          <ConsistencyPanel enabled />
          <ForecastPanel enabled />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <SettingsPanel enabled />
          <TokenPanel />
        </div>
      </main>
    </div>
  );
}
