import { getGetCoachPlanQueryKey, useGetCoachPlan } from "@workspace/api-client-react";

import { useAuth } from "@/hooks/use-auth";

/**
 * Whether this browser may use the coach, learned the only honest way: by
 * asking. The plan query doubles as the probe — the page needs it anyway,
 * and the header sharing the same query key means the nav link costs no
 * request beyond the one cached answer. A 404 is the ordinary reply for
 * anyone off the allowlist, so it is not retried and not treated as an
 * error worth surfacing.
 */
export function useCoachAccess() {
  const { isSignedIn } = useAuth();
  const plan = useGetCoachPlan({
    query: {
      queryKey: getGetCoachPlanQueryKey(),
      retry: false,
      enabled: isSignedIn,
      staleTime: 30_000,
    },
  });
  return {
    plan,
    hasAccess: plan.isSuccess,
    refused: plan.error?.status === 404,
  };
}
