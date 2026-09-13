import { getGetCoachPlanQueryKey, useGetCoachPlan } from "@workspace/api-client-react";

import { useAuth } from "@/hooks/use-auth";

/**
 * Today's practice plan for this browser.
 *
 * This used to answer "may this browser use the coach" by probing the plan
 * endpoint and reading success as yes. Every signed-in user may now, so the
 * question is answered by `isSignedIn` and the probe is just the query the
 * practice view needed anyway. What went with `hasAccess` was the last reason
 * for a component to learn its entitlement by trying.
 *
 * A 404 is still the ordinary reply to a caller the server cannot resolve, so
 * it is not retried and not surfaced as an error worth reporting.
 */
export function useCoachPlan() {
  const { isSignedIn } = useAuth();
  return useGetCoachPlan({
    query: {
      queryKey: getGetCoachPlanQueryKey(),
      retry: false,
      enabled: isSignedIn,
      staleTime: 30_000,
    },
  });
}
