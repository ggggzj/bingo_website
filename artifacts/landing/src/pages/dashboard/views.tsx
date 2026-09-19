import type { ComponentType } from "react";
import { BarChart3, Dumbbell, GraduationCap } from "lucide-react";

import Coach from "@/pages/Coach";
import NewGradList from "@/pages/dashboard/NewGradList";
import Dashboard from "@/pages/Dashboard";
import { PracticeStatus } from "@/pages/dashboard/PracticeStatus";

/** What the shell knows about the person looking at it. */
export type Viewer = {
  isSignedIn: boolean;
  isOwner: boolean;
};

export type DashboardView = {
  /** The path segment: `/dashboard/<id>`. */
  id: string;
  label: string;
  blurb: string;
  icon?: ComponentType<{ className?: string }>;
  /**
   * Whether this viewer may use it. A convenience for drawing the rail, never
   * a boundary — each view keeps its own server-side refusal, so reaching a
   * view's address without entitlement gives the same answer it always did.
   */
  entitled: (viewer: Viewer) => boolean;
  /**
   * A line the rail draws beneath the label, for a view whose state a person
   * on another view wants to know. The view owns whatever query that takes;
   * the rail owns only the slot.
   */
  Status?: ComponentType;
  Component: ComponentType;
};

/**
 * Every view the logged-in area has, in rail order. This array is the whole
 * extension point: the router resolves a path segment against it and the rail
 * lists it, so adding the next dashboard is one entry rather than a route plus
 * a rail item plus a redirect that can disagree with each other.
 *
 * If something else ever needs to enumerate views, this has failed and the fix
 * is to delete that other place, not to add a second list.
 */
export const VIEWS: DashboardView[] = [
  {
    id: "growth",
    label: "Growth",
    blurb: "Installs, active users and registrations for the extension.",
    icon: BarChart3,
    entitled: (viewer) => viewer.isOwner,
    Component: Dashboard,
  },
  {
    id: "new-grad",
    label: "New grad",
    blurb: "US 2027 early-career software roles, and what changed since you looked.",
    icon: GraduationCap,
    entitled: (viewer) => viewer.isOwner,
    Component: NewGradList,
  },
  {
    id: "practice",
    label: "Practice",
    blurb: "Today's plan, review schedule and gaps.",
    icon: Dumbbell,
    entitled: (viewer) => viewer.isSignedIn,
    Status: PracticeStatus,
    Component: Coach,
  },
];

export function viewsFor(
  viewer: Viewer,
  views: DashboardView[] = VIEWS,
): DashboardView[] {
  return views.filter((view) => view.entitled(viewer));
}
