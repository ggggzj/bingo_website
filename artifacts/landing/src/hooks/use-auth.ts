import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";

/**
 * Who this browser is signed in as, according to the server.
 *
 * The session lives in an httpOnly cookie, so the page cannot read it and cannot be
 * tricked into believing it has one. Asking the server is the only way to know, and
 * it is also the only answer worth acting on — `isOwner` here decides what to render,
 * never what the server will hand over.
 */
export function useAuth() {
  const query = useGetMe({
    query: {
      // The generated options type demands a key; this is the same one the hook
      // would have picked, taken from the generator so the two cannot drift.
      queryKey: getGetMeQueryKey(),
      // 401 is the ordinary answer for a visitor, not a failure worth retrying.
      retry: false,
      staleTime: 30_000,
    },
  });

  const account = query.data ?? null;

  return {
    account,
    /** True only while the first answer is still outstanding — not on every refetch. */
    isLoading: query.isLoading,
    isSignedIn: account !== null,
    isOwner: account?.isOwner === true,
  };
}

/**
 * Forget who we thought was signed in. Call after signing in, out, or up: the cookie
 * changed, so the cached answer to "who am I" is about the previous browser state.
 */
export function useForgetAuth(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
  };
}
