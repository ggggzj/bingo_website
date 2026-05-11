import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useJoinWaitlist } from "@workspace/api-client-react";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

const waitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export function WaitlistForm() {
  const [success, setSuccess] = useState(false);
  const joinWaitlist = useJoinWaitlist();

  const form = useForm<z.infer<typeof waitlistSchema>>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: z.infer<typeof waitlistSchema>) {
    joinWaitlist.mutate(
      { data: values },
      {
        onSuccess: () => {
          setSuccess(true);
          form.reset();
        },
      }
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-primary/5 rounded-2xl border border-primary/10" data-testid="status-waitlist-success">
        <CheckCircle2 className="w-10 h-10 text-primary mb-3" />
        <h3 className="text-lg font-semibold text-foreground">You're on the list</h3>
        <p className="text-sm text-muted-foreground mt-1 text-center">We'll let you know when the next features are ready.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 w-full" data-testid="form-waitlist">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <div className="flex gap-2">
                <FormControl>
                  <Input 
                    placeholder="Enter your email" 
                    className="h-12 bg-white" 
                    data-testid="input-waitlist-email"
                    disabled={joinWaitlist.isPending}
                    {...field} 
                  />
                </FormControl>
                <Button 
                  type="submit" 
                  className="h-12 px-6 shadow-sm"
                  disabled={joinWaitlist.isPending}
                  data-testid="button-waitlist-submit"
                >
                  {joinWaitlist.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Join Waitlist"
                  )}
                </Button>
              </div>
              <FormMessage />
              {joinWaitlist.isError && (
                <p className="text-[0.8rem] font-medium text-destructive mt-2" data-testid="error-waitlist-submit">
                  {joinWaitlist.error?.error || "Failed to join waitlist. Please try again."}
                </p>
              )}
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
