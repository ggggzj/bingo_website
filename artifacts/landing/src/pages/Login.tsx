import { SignInPanel } from "@/components/auth/SignInPanel";
import { CHROME_STORE_URL } from "@/lib/links";

/**
 * The address the way in has always had.
 *
 * Everything that makes a sign-in work now lives in `components/auth/SignInPanel.tsx`,
 * because the front page renders the same control. This page is the left half — the case
 * for the product — plus that component, and it keeps the destinations `/login` has
 * always had by taking the panel's default.
 */
export default function Login() {
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
        <SignInPanel />
      </section>
    </div>
  );
}
