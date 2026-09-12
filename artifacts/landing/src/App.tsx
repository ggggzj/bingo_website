import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Account from "@/pages/Account";
import Coach from "@/pages/Coach";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/account" component={Account} />
      {/* Public and read-only: no session is read and nothing is written, so there is
          nothing here to guard. */}
      <Route path="/jobs" component={Jobs} />
      {/* Not guarded here: the page itself renders NotFound when the server refuses
          its data, so the route existing gives nothing away. */}
      <Route path="/dashboard" component={Dashboard} />
      {/* Same stance as /dashboard: the page hides itself from anyone the
          coach API refuses. */}
      <Route path="/coach" component={Coach} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
