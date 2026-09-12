import { Router, type IRouter } from "express";

import { DrizzleAuthStore } from "../lib/auth/drizzle-store";
import { DrizzleCoachStore } from "../lib/coach/drizzle-store";
import { createUpstreamJobs } from "../lib/jobs/upstream";
import { createUpstreamStats } from "../lib/stats/upstream";
import healthRouter from "./health";
import { createAuthRouter } from "./auth";
import { createCoachRouter } from "./coach";
import { createJobsRouter } from "./jobs";
import { createStatsRouter } from "./stats";
import waitlistRouter from "./waitlist";

// One store for the process. The routes take it as an argument rather than reaching
// for `db` themselves, which is what lets the tests run them without a Postgres.
const authStore = new DrizzleAuthStore();
const coachStore = new DrizzleCoachStore();

const router: IRouter = Router();

router.use(healthRouter);
router.use("/waitlist", waitlistRouter);
router.use("/auth", createAuthRouter(authStore));
router.use("/stats", createStatsRouter(authStore, createUpstreamStats()));
// Public and identity-free — no auth store, because it reads nothing about a user.
router.use("/jobs", createJobsRouter(createUpstreamJobs()));
router.use("/coach", createCoachRouter(authStore, coachStore));

export default router;
