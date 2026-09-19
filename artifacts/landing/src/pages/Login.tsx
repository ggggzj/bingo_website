import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useLogIn, useRegister, useSignInWithGoogle } from "@workspace/api-client-react";

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
import { CHROME_STORE_URL } from "@/lib/links";

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
 * Public by design and read from the page's own bundle. `aud` is checked on the
 * server against `GOOGLE_CLIENT_ID`; this copy only tells Google's library which
 * application is asking. The two are one value in two places, and a mismatch
 * fails every sign-in immediately on `aud` rather than quietly — see the change's
 * design §8.
 *
 * Read at render, not at import, for the reason the server's `configuredClientId`
 * is: a module-level constant is fixed the moment the module loads, which means
 * no test can ever exercise both branches of the fallback below. The first draft
 * of this file did exactly that and the test caught it.
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
 * form from people who are not looking for it. Anyone who reads this bundle
 * finds it, which is fine — whoever wanted the password endpoint never needed
 * the form.
 */
function wantsPasswordForm(search: string): boolean {
  return new URLSearchParams(search).get("password") === "1";
}

export default function Login() {
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
          navigate("/jobs");
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
          navigate(account.isOwner ? "/dashboard" : "/account");
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
    <div className="min-h-[100dvh] bg-background grid lg:grid-cols-2">
      {/* The case for the product. Claims only what the extension actually ships
          — the same rule the home page is held to (`replit.md`), because this is
          the first page most people will ever see of it. */}
      <section className="hidden lg:flex flex-col justify-center gap-6 px-16 py-16 bg-muted/40 border-r border-border">
        <h2 className="text-3xl font-bold text-foreground leading-tight">
          See which companies actually sponsor, before you apply.
        </h2>
        <p className="text-base text-muted-foreground max-w-md">
          BingoCareer reads certified H-1B filings from the U.S. Department of
          Labor and puts an employer&apos;s record on the job itself — the number
          of filings and the years, not a checkmark.
        </p>
        <ul className="space-y-3 text-sm text-muted-foreground max-w-md">
          <li>• 72,135 employers with certified filing history</li>
          <li>• Badges on LinkedIn, Indeed, Dice and Glassdoor</li>
          <li>• A job feed drawn only from employers that have filed</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Filing history is evidence of past sponsorship, not a promise of future
          sponsorship.{" "}
          <a
            href={CHROME_STORE_URL}
            className="underline underline-offset-4 hover:text-foreground"
            target="_blank"
            rel="noreferrer"
          >
            Add the extension to Chrome
          </a>
        </p>
      </section>

      {/* The way in. One control, by decision. */}
      <section className="flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-foreground text-center mb-1">
            BingoCareer
          </h1>
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
        </div>
      </section>
    </div>
  );
}
