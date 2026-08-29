import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useLogIn, useRegister } from "@workspace/api-client-react";

import { useForgetAuth } from "@/hooks/use-auth";
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

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [failure, setFailure] = useState<string | null>(null);
  const forgetAuth = useForgetAuth();

  const logIn = useLogIn();
  const register = useRegister();
  const pending = logIn.isPending || register.isPending;

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
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-foreground text-center mb-1">
          BingoCareer
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          Sign in to your account.
        </p>

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
      </div>
    </div>
  );
}
