/**
 * The MarkerStore backed by Postgres. Thin on purpose, the same way `DrizzleAuthStore`
 * is: two queries and a shape change, so everything worth testing stays in the route,
 * where it runs against memory and no database.
 */

import { db, newGradSeenTable } from "@workspace/db";
import { eq } from "drizzle-orm";

import type { ListMarker, ListedPosting, MarkerStore } from "../../routes/new-grad";

export class DrizzleMarkerStore implements MarkerStore {
  async read(userId: number): Promise<ListMarker> {
    const [row] = await db
      .select()
      .from(newGradSeenTable)
      .where(eq(newGradSeenTable.userId, userId))
      .limit(1);

    // No row means they have never acknowledged, which is not the same as having
    // acknowledged an empty list: the first makes nothing new, the second would make
    // everything new. The route reads `acknowledged` for exactly this distinction.
    if (!row) return { acknowledged: false, listed: [] };
    return { acknowledged: true, listed: row.listed };
  }

  async write(userId: number, listed: ListedPosting[]): Promise<void> {
    await db
      .insert(newGradSeenTable)
      .values({ userId, listed, acknowledgedAt: new Date() })
      .onConflictDoUpdate({
        target: newGradSeenTable.userId,
        set: { listed, acknowledgedAt: new Date() },
      });
  }
}
