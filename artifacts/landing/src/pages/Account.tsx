import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BarChart3, Loader2, LogOut } from "lucide-react";
import { useLogOut } from "@workspace/api-client-react";

import { useAuth, useForgetAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

/**
 * Where an ordinary signed-in person lands.
 *
 * There is nothing behind the login for them yet — the product is the extension —
 * so this says who they are and lets them leave, rather than inventing a feature to
 * fill the page. The dashboard link appears only for the owner, and only as a
 * convenience: the server decides, not this check.
 */
export default function Account() {
  const { account, isLoading, isSignedIn, isOwner } = useAuth();
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
      <div className="w-full max-w-sm text-center">
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
          {isOwner && (
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard" data-testid="link-dashboard">
                <BarChart3 className="w-4 h-4" />
                Growth dashboard
              </Link>
            </Button>
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
