import { Router, type IRouter } from "express";

import { DrizzleAuthStore } from "../lib/auth/drizzle-store";
import { createUpstreamStats } from "../lib/stats/upstream";
import healthRouter from "./health";
import { createAuthRouter } from "./auth";
import { createStatsRouter } from "./stats";
import waitlistRouter from "./waitlist";

// One store for the process. The routes take it as an argument rather than reaching
// for `db` themselves, which is what lets the tests run them without a Postgres.
const authStore = new DrizzleAuthStore();

const router: IRouter = Router();

router.use(healthRouter);
router.use("/waitlist", waitlistRouter);
router.use("/auth", createAuthRouter(authStore));
router.use("/stats", createStatsRouter(authStore, createUpstreamStats()));

export default router;
