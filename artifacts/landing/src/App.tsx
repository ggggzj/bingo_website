import {
  Switch,
  Route,
  Redirect,
  Router as WouterRouter,
  useSearch,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Account from "@/pages/Account";
import Shell from "@/pages/dashboard/Shell";
import type { DashboardView } from "@/pages/dashboard/views";
import Jobs from "@/pages/Jobs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

/**
 * The way in is on `/` now, so `/login` is an address rather than a destination.
 *
 * It still renders the form for `?password=1` — the unlinked back door for the nine
 * identities that hold passwords and for the day Google's own configuration is wrong.
 * Everything else goes to `/`.
 *
 * **It reads the query and nothing else.** No session, so there is nothing to wait for
 * and no window in which this can navigate on a half-known identity. That is the whole
 * reason the redirect lives here rather than inside a component that also asks who you
 * are: `Account.tsx` and `Shell.tsx` have to wait for `/auth/me` before they act, and a
 * third place doing it slightly differently is how one of them gets it wrong.
 */
function LoginRoute() {
  const search = useSearch();
  const wantsForm = new URLSearchParams(search).get("password") === "1";

  return wantsForm ? <Login /> : <Redirect to="/" replace />;
}

/**
 * `views` exists so the shell's own behaviour can be tested through real
 * routing without pulling two dashboards' worth of endpoints in with it.
 * Nothing in the app passes it; the shell's default registry is the answer.
 */
export function AppRoutes({ views }: { views?: DashboardView[] }) {
  return (
    <Switch>
      {/* `/` does not redirect anybody. A signed-in visitor stays and the block
          expands in place (owner, 2026-09-29) — sending them elsewhere is how nobody
          ever sees the thing the page was rebuilt for. */}
      <Route path="/" component={Home} />
      <Route path="/login" component={LoginRoute} />
      <Route path="/account" component={Account} />
      {/* Public and read-only: no session is read and nothing is written, so there is
          nothing here to guard. */}
      <Route path="/jobs" component={Jobs} />
      {/* Not guarded here: the shell sends a signed-out visitor to the login page,
          and each view keeps its own server-side refusal, so the route existing
          gives nothing away. */}
      <Route path="/dashboard/:view?">{() => <Shell views={views} />}</Route>
      {/* The coach's old address. Kept rather than deleted: it is what existing
          bookmarks and the archived coach specs point at. */}
      <Route path="/coach">
        <Redirect to="/dashboard/practice" replace />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
