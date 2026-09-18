import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender } from "@testing-library/react";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Render a component with the providers `App.tsx` gives it, plus a location
 * that lives in memory rather than in the jsdom URL — so a test can start at
 * `/dashboard/practice` and assert where a redirect landed.
 *
 * A fresh QueryClient per render: caches are per-test, and `retry: false`
 * because a 404 is an ordinary answer here (an anonymous visitor, a non-owner
 * asking for stats) rather than a flake worth retrying.
 */
export function renderApp(ui: ReactElement, { path = "/" }: { path?: string } = {}) {
  const { hook, history } = memoryLocation({ path, record: true });
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router hook={hook}>{children}</Router>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper }),
    /** Every location this render has been at, latest last. */
    history,
    /** Where the app ended up — after any redirect it chose to make. */
    currentPath: () => history[history.length - 1],
    queryClient,
  };
}
