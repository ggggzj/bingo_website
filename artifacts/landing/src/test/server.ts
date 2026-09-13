import { setupServer } from "msw/node";

/**
 * The server these tests talk to.
 *
 * Deliberately empty of handlers: every test declares the answers it depends
 * on with `server.use(...)`, and `setup.ts` runs with `onUnhandledRequest:
 * "error"`, so a request nobody planned for fails the test instead of hanging
 * or silently returning undefined.
 *
 * The point of answering HTTP rather than replacing the generated hooks: a
 * test that stubs `useGetMe` proves the component renders what the stub said,
 * which is the one thing never in doubt. Here the generated hook, the custom
 * fetch mutator and react-query all run for real — the same reason the
 * api-server suite runs real routes against a memory store.
 *
 * Handler paths are written without an origin (`/api/auth/me`), which matches
 * whatever origin jsdom is serving the document from.
 */
export const server = setupServer();

export { http, HttpResponse } from "msw";
