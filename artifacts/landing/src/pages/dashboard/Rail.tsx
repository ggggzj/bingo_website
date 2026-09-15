import { Link } from "wouter";

import type { DashboardView } from "@/pages/dashboard/views";
import { cn } from "@/lib/utils";

/**
 * The switcher. Renders nothing when there is nothing to switch between: a
 * one-item picker is a control that cannot do anything, and for every
 * signed-in non-owner that is the common case rather than an edge.
 *
 * A row of chips above the content below `md`, a column beside it above. No
 * drawer or hamburger — with two entries a sheet would be more chrome than
 * content; revisit when this list holds four.
 */
export function Rail({
  views,
  activeId,
}: {
  views: DashboardView[];
  activeId: string;
}) {
  if (views.length < 2) return null;

  return (
    <nav
      aria-label="Dashboard views"
      data-testid="nav-dashboard-rail"
      className="flex md:flex-col gap-1 md:w-52 shrink-0 overflow-x-auto md:overflow-visible"
    >
      {views.map((view) => {
        const Icon = view.icon;
        const Status = view.Status;
        const active = view.id === activeId;
        return (
          <Link
            key={view.id}
            href={`/dashboard/${view.id}`}
            aria-current={active ? "page" : undefined}
            data-testid={`link-view-${view.id}`}
            className={cn(
              "flex items-start gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
              active
                ? "bg-card text-foreground font-medium border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent",
            )}
          >
            {Icon && <Icon className="w-4 h-4 shrink-0 mt-0.5" />}
            <span className="min-w-0">
              {view.label}
              {Status && <Status />}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
