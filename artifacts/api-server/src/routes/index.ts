import { Router, type IRouter } from "express";

import { DrizzleApplicationStore } from "../lib/applications/store";
import { DrizzleAuthStore } from "../lib/auth/drizzle-store";
import { DrizzleCoachStore } from "../lib/coach/drizzle-store";
import { createUpstreamJobs } from "../lib/jobs/upstream";
import { DrizzleMarkerStore } from "../lib/new-grad/marker-store";
import { DrizzleTokenStore } from "../lib/tokens/drizzle-store";
import { createUpstreamStats } from "../lib/stats/upstream";
import healthRouter from "./health";
import { createApplicationsRouter } from "./applications";
import { createAuthRouter } from "./auth";
import { createGoogleVerifier } from "../lib/auth/google";
import { createCoachRouter } from "./coach";
import { createJobsRouter } from "./jobs";
import { createNewGradRouter } from "./new-grad";
import { createStatsRouter } from "./stats";

// One store for the process. The routes take it as an argument rather than reaching
// for `db` themselves, which is what lets the tests run them without a Postgres.
const authStore = new DrizzleAuthStore();
const coachStore = new DrizzleCoachStore();
const markerStore = new DrizzleMarkerStore();
const applicationStore = new DrizzleApplicationStore();
// One token mechanism, two scopes. See lib/tokens/store.ts.
const tokenStore = new DrizzleTokenStore();

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", createAuthRouter(authStore, createGoogleVerifier()));
router.use("/stats", createStatsRouter(authStore, createUpstreamStats()));
// Public and identity-free — no auth store, because it reads nothing about a user.
router.use("/jobs", createJobsRouter(createUpstreamJobs()));
router.use("/coach", createCoachRouter(authStore, coachStore, tokenStore));
// Owner-only, and the same upstream the public page uses — asked several coarse
// questions instead of one, because the filter it needs is not one substring.
router.use(
  "/new-grad-list",
  createNewGradRouter(authStore, createUpstreamJobs(), markerStore),
);
// Owner-only, and the only route here whose rows came from outside this system: the
// owner's own folder, pushed in by `run import-applications`.
router.use("/applications", createApplicationsRouter(authStore, applicationStore));

export default router;
