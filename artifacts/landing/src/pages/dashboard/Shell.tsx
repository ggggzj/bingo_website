import { useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Loader2, LogOut } from "lucide-react";
import { useLogOut } from "@workspace/api-client-react";

import { useAuth, useForgetAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import { Rail } from "@/pages/dashboard/Rail";
import { VIEWS, viewsFor, type DashboardView } from "@/pages/dashboard/views";
import { Button } from "@/components/ui/button";

/**
 * The logged-in area: one frame — identity, sign-out and the switcher — with
 * the selected view beside it.
 *
 * A view is a path segment rather than a mode, so it is linkable, survives a
 * reload, and the back button walks between views instead of out of the
 * dashboard.
 *
 * `views` is a parameter so the frame can be tested without dragging two
 * dashboards' worth of endpoints in with it. Production always gets `VIEWS`.
 */
export default function Shell({
  views = VIEWS,
}: {
  views?: DashboardView[];
}) {
  const { account, isLoading, isSignedIn, isOwner } = useAuth();
  const params = useParams<{ view?: string }>();
  const [, navigate] = useLocation();
  const forgetAuth = useForgetAuth();
  const logOut = useLogOut();

  const available = viewsFor({ isSignedIn, isOwner }, views);
  const requested = params.view;
  const active = available.find((view) => view.id === requested);
  // Unknown to this viewer, but known to the app: that is a refusal, not a
  // stale address, so it must not be redirected into something they can see.
  const exists = views.some((view) => view.id === requested);
  const fallback = available[0];

  useEffect(() => {
    if (isLoading) return;
    if (!isSignedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (!active && !exists && fallback) {
      navigate(`/dashboard/${fallback.id}`, { replace: true });
    }
  }, [isLoading, isSignedIn, active, exists, fallback, navigate]);

  if (isLoading || !account) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Asking for a view this viewer may not use answers exactly as it did before
  // the shell existed: the site's ordinary not-found page, standing alone.
  if (!active) {
    if (exists || !fallback) return <NotFound />;
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const View = active.Component;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              Dashboard
            </p>
            <p
              className="text-xs text-muted-foreground truncate"
              data-testid="text-shell-email"
            >
              {account.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={logOut.isPending}
            data-testid="button-signout"
            onClick={() =>
              logOut.mutate(undefined, {
                onSettled: async () => {
                  // Settled, not success: the cookie may well be gone either
                  // way, and a stale "signed in" on screen is the worse outcome.
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
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row gap-6">
        <Rail views={available} activeId={active.id} />
        <main className="min-w-0 flex-1" data-testid={`view-${active.id}`}>
          <View />
        </main>
      </div>
    </div>
  );
}
