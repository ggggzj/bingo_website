import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
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
 * `views` exists so the shell's own behaviour can be tested through real
 * routing without pulling two dashboards' worth of endpoints in with it.
 * Nothing in the app passes it; the shell's default registry is the answer.
 */
export function AppRoutes({ views }: { views?: DashboardView[] }) {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
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
