import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import {
  useLogIn,
  useRegister,
  useSignInWithGoogle,
  type Account,
} from "@workspace/api-client-react";

import { useForgetAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

/**
 * The way in, as one component.
 *
 * It was the right half of `Login.tsx` and is a component because two pages now render
 * it. Everything that half knew is here and nowhere else — the Google control, the
 * failure line, the password-cleared notice, the `?password=1` form and the
 * missing-client-id fallback. That last pair is the reason this must never be copied
 * rather than imported: a second copy is a second place for the back door and the dead
 * end to disagree.
 *
 * What it does *not* own is where you end up. That is `destination`, because the two
 * pages disagree: `/login` sends you somewhere else, and the front page's answer is to
 * stay where you are and let the block expand.
 */

// Matches the server. Kept in step by hand rather than shared, because the server's
// copy is the one that counts and this one exists only to save a round trip.
const MIN_PASSWORD_LENGTH = 10;

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `At least ${MIN_PASSWORD_LENGTH} characters`),
});

type Credentials = z.infer<typeof schema>;

type Mode = "signin" | "signup";

/**
 * Where to go once somebody is signed in, or `null` to stay on this page.
 *
 * It is given the account and which control was used, because the two paths have never
 * agreed and this component must not be the thing that quietly makes them: Google has
 * always landed on `/jobs` and the form has always landed on `/dashboard` or `/account`.
 * `.harness/backlogs/023` is about that disagreement and is not settled here.
 */
export type Destination = (
  account: Account,
  via: "google" | "password",
) => string | null;

/** Exactly what `/login` did before this component existed. */
export const LOGIN_DESTINATION: Destination = (account, via) =>
  via === "google" ? "/jobs" : account.isOwner ? "/dashboard" : "/account";

/**
 * Public by design and read from the page's own bundle. `aud` is checked on the
 * server against `GOOGLE_CLIENT_ID`; this copy only tells Google's library which
 * application is asking.
 *
 * Read at render, not at import, for the reason the server's `configuredClientId`
 * is: a module-level constant is fixed the moment the module loads, which means
 * no test can ever exercise both branches of the fallback below.
 */
function googleClientId(): string {
  return (import.meta.env["VITE_GOOGLE_CLIENT_ID"] ?? "").trim();
}

/**
 * The email form is not on this page. The owner's decision (2026-09-17) is one
 * way in and it is Google; the routes behind the form stay served, and nine
 * identities still hold passwords, so the form stays reachable here and is
 * linked from nowhere.
 *
 * This is **not** a security boundary and must not be built as one. The routes
 * are rate-limited and answer 401 the same either way; the parameter hides a
 * form from people who are not looking for it.
 */
function wantsPasswordForm(search: string): boolean {
  return new URLSearchParams(search).get("password") === "1";
}

export function SignInPanel({
  destination = LOGIN_DESTINATION,
  heading = "BingoCareer",
}: {
  destination?: Destination;
  heading?: string | null;
}) {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [failure, setFailure] = useState<string | null>(null);
  const forgetAuth = useForgetAuth();
  const { toast } = useToast();

  const logIn = useLogIn();
  const register = useRegister();
  const google = useSignInWithGoogle();
  const pending = logIn.isPending || register.isPending || google.isPending;

  const search = useSearch();
  const clientId = googleClientId();
  /* With no client id there is no working button to draw, and a page with
     neither a button nor a form is a dead end — so the form stands in. */
  const showForm = wantsPasswordForm(search) || clientId === "";

  /** One place decides, so a page cannot navigate on one path and not the other. */
  function arrive(account: Account, via: "google" | "password") {
    const to = destination(account, via);
    if (to !== null) navigate(to);
  }

  function onGoogleCredential(credential: string) {
    setFailure(null);
    google.mutate(
      { data: { credential } },
      {
        onSuccess: async (account) => {
          await forgetAuth();
          if (account.passwordCleared) {
            /* Told, not done in silence. Somebody whose password just stopped
               working deserves to know why before they try it and conclude the
               site is broken. The toaster lives in `App.tsx`, so this survives
               the navigation below. */
            toast({
              title: "This account now signs in with Google",
              description:
                "The password it used to have has been removed. Signing in with Google is the way in from now on.",
            });
          }
          arrive(account, "google");
        },
        onError: (error) => {
          setFailure(
            error.data?.error ??
              "That Google sign-in could not be verified. Please try again.",
          );
        },
      },
    );
  }

  const form = useForm<Credentials>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: Credentials) {
    setFailure(null);
    const action = mode === "signin" ? logIn : register;

    action.mutate(
      { data: values },
      {
        onSuccess: async (account) => {
          // The cookie just changed, so anything cached about "who am I" is stale.
          await forgetAuth();
          arrive(account, "password");
        },
        onError: (error) => {
          setFailure(
            error.data?.error ??
              "Something went wrong. Please try again in a moment.",
          );
        },
      },
    );
  }

  function switchTo(next: Mode) {
    setMode(next);
    // An error about the other form is worse than no error at all.
    setFailure(null);
    form.clearErrors();
  }

  return (
    <div className="w-full max-w-sm" data-testid="signin-panel">
      {heading !== null && (
        <h1 className="text-2xl font-bold text-foreground text-center mb-1">
          {heading}
        </h1>
      )}
      <p className="text-sm text-muted-foreground text-center mb-8">
        {showForm ? "Sign in to your account." : "Sign in to continue."}
      </p>

      {!showForm && (
        <div className="flex flex-col items-center gap-4">
          <GoogleSignInButton
            clientId={clientId}
            onCredential={onGoogleCredential}
            disabled={pending}
          />
          {failure && (
            <p
              className="text-[0.8rem] font-medium text-destructive text-center"
              data-testid="error-auth"
            >
              {failure}
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center">
            We only ever see your email address and name.
          </p>
        </div>
      )}

      {showForm && (
        <Tabs value={mode} onValueChange={(value) => switchTo(value as Mode)}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin" data-testid="tab-signin">
              Sign in
            </TabsTrigger>
            <TabsTrigger value="signup" data-testid="tab-signup">
              Create account
            </TabsTrigger>
          </TabsList>

          {/* One form for both tabs: the fields and the rules are identical, and two
              copies would drift. The tab only decides which endpoint it posts to. */}
          {(["signin", "signup"] as const).map((value) => (
            <TabsContent key={value} value={value}>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                  data-testid={`form-${value}`}
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            autoComplete="email"
                            placeholder="you@example.com"
                            disabled={pending}
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            autoComplete={
                              value === "signin"
                                ? "current-password"
                                : "new-password"
                            }
                            disabled={pending}
                            data-testid="input-password"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={pending}
                    data-testid="button-submit"
                  >
                    {pending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : value === "signin" ? (
                      "Sign in"
                    ) : (
                      "Create account"
                    )}
                  </Button>

                  {failure && (
                    <p
                      className="text-[0.8rem] font-medium text-destructive"
                      data-testid="error-auth"
                    >
                      {failure}
                    </p>
                  )}
                </form>
              </Form>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Cookies are per-origin. This site and the extension share one `users`
          table (2026-09-21), and "one address on both surfaces" is easily heard
          as "sign in once". It is not: the extension asks on its own, and this
          line is here so nobody has to ask why. It is kept to what is true for
          every account — a Google-born one has no password for the popup yet
          (the change's proposal, non-goals), so it promises nothing about which
          credential works there. Shown on both branches, because both are places
          where somebody has just signed in. */}
      <p
        className="text-xs text-muted-foreground text-center mt-8"
        data-testid="text-extension-signin"
      >
        Signing in here signs you in on this site only. The Chrome extension
        has its own sign-in.
      </p>
    </div>
  );
}
