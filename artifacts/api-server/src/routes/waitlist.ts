import { Router } from "express";
import { db, waitlistTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const emailSchema = z.object({
  email: z.string().email(),
});

router.post("/", async (req, res) => {
  const parsed = emailSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: "Invalid email address" });
    return;
  }

  const { email } = parsed.data;

  try {
    const existing = await db
      .select()
      .from(waitlistTable)
      .where(eq(waitlistTable.email, email))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email is already on the waitlist" });
      return;
    }

    const [entry] = await db
      .insert(waitlistTable)
      .values({ email })
      .returning();

    res.status(201).json({
      id: entry.id,
      email: entry.email,
      createdAt: entry.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to add to waitlist");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
