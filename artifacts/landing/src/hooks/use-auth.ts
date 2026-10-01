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
 *
 * **Everything is invalidated, not just "who am I".** This used to invalidate that one
 * key, which was right while signing in always navigated away — the next page mounted
 * and asked its own questions. The front page broke that assumption on 2026-09-29 by
 * keeping a signed-in visitor exactly where they are: `me` refetched, the sign-in panel
 * vanished, and the internship list went on serving the cached preview with "N more,
 * sign in to see the rest" underneath it, to somebody who had just signed in.
 *
 * The rule the narrow version actually wanted is this one: a response fetched as one
 * identity says nothing about the next, so when the cookie changes, all of it is stale.
 * That is cheap — these are small reads — and it is correct for every caller rather than
 * for the one that happened to notice.
 */
export function useForgetAuth(): () => Promise<void> {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries();
  };
}
