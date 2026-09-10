import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, Dumbbell, Loader2, LogOut } from "lucide-react";
import { useLogOut } from "@workspace/api-client-react";

import { useAuth, useForgetAuth } from "@/hooks/use-auth";
import { useCoachAccess } from "@/hooks/use-coach-access";
import { Button } from "@/components/ui/button";

/**
 * Where a signed-in person lands: a console over whatever they may actually
 * use. Two dashboards live behind this login and they answer different
 * questions — the growth one is about the product's users, the practice one
 * is about the owner's own interview prep — so they are separate entries
 * rather than tabs of one thing.
 *
 * Each entry is drawn only for whoever may use it, and in both cases the
 * server decides: `isOwner` comes from OWNER_EMAIL, and the coach entry
 * appears only because the coach API answered. A viewer entitled to neither
 * sees no hint that either exists.
 */
export default function Account() {
  const { account, isLoading, isSignedIn, isOwner } = useAuth();
  const { plan, hasAccess: hasCoach } = useCoachAccess();
  const [, navigate] = useLocation();
  const forgetAuth = useForgetAuth();
  const logOut = useLogOut();

  useEffect(() => {
    if (!isLoading && !isSignedIn) navigate("/login");
  }, [isLoading, isSignedIn, navigate]);

  if (isLoading || !account) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const today = plan.data;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          You're signed in
        </h1>
        <p
          className="text-sm text-muted-foreground mb-8"
          data-testid="text-account-email"
        >
          {account.email}
        </p>

        <div className="space-y-3">
          {hasCoach && (
            <Link
              href="/coach"
              data-testid="link-coach-console"
              className="block rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">
                  Interview practice
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {today
                  ? today.assignedToday === 0
                    ? "Nothing due today — the schedule is clear."
                    : `Today: ${today.doneToday} of ${today.assignedToday} graded` +
                      (today.solvedToday > today.doneToday
                        ? ` · ${today.solvedToday - today.doneToday} solved but not grilled`
                        : "")
                  : "Today's plan, review schedule and gaps."}
              </p>
            </Link>
          )}

          {isOwner && (
            <Link
              href="/dashboard"
              data-testid="link-dashboard"
              className="block rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-foreground">
                  Growth dashboard
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Installs, active users and registrations for the extension.
              </p>
            </Link>
          )}

          <Button
            variant="ghost"
            className="w-full"
            disabled={logOut.isPending}
            data-testid="button-signout"
            onClick={() =>
              logOut.mutate(undefined, {
                onSettled: async () => {
                  // Settled, not success: the cookie may well be gone either way,
                  // and leaving a stale "signed in" on screen is the worse outcome.
                  await forgetAuth();
                  navigate("/login");
                },
              })
            }
          >
            {logOut.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                Sign out
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
