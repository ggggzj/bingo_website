import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Shown for an address that is not a page — and, deliberately, for the dashboard
 * when the visitor is not its owner. So the wording has to be the ordinary thing a
 * visitor would see anywhere on the site: anything that reads as "you were refused"
 * would tell a stranger there was something here to be refused.
 */
export default function NotFound() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2 items-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">
              Page not found
            </h1>
          </div>

          <p className="text-sm text-muted-foreground">
            There's nothing at this address.
          </p>

          <Button asChild variant="outline" className="mt-6">
            <Link href="/" data-testid="link-home">
              Back to the home page
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
