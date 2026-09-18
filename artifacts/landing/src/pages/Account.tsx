import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Loader2, LogOut } from "lucide-react";
import { useLogOut } from "@workspace/api-client-react";

import { useAuth, useForgetAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

/**
 * Who you are, one way in, and a way out.
 *
 * It deliberately does not list the dashboard's views. The rail does that, and
 * two places enumerating them is how they come to disagree — the registry in
 * `pages/dashboard/views.tsx` is meant to be the only list.
 *
 * It also asks for nothing but "who am I". This is the page an ordinary user
 * lands on, and it has to be useful before anything is known about what they
 * are entitled to.
 */
export default function Account() {
  const { account, isLoading, isSignedIn } = useAuth();
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
          <Link
            href="/dashboard"
            data-testid="link-dashboard"
            className="block rounded-lg border border-border bg-card p-4 text-left hover:border-foreground/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">Dashboard</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Everything this account can open, in one place.
            </p>
          </Link>

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
