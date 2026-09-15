import { useCoachPlan } from "@/hooks/use-coach-plan";

/**
 * The line under the practice entry in the rail: where today stands, in the
 * words the old account-page card used, so a viewer on another view knows
 * whether practice needs them without switching to it.
 *
 * Loading and refusal both render nothing. The rail is not the place to
 * report that the coach API said no — the practice view says that itself, in
 * full, when the viewer gets there — and a spinner under a nav entry would be
 * chrome flickering for a number nobody is waiting on.
 */
export function PracticeStatus() {
  const plan = useCoachPlan();
  const today = plan.data;
  if (!today) return null;

  const text =
    today.assignedToday === 0
      ? "Nothing due today"
      : `Today: ${today.doneToday} of ${today.assignedToday} graded` +
        (today.solvedToday > today.doneToday
          ? ` · ${today.solvedToday - today.doneToday} solved but not grilled`
          : "");

  return (
    <span className="block text-xs text-muted-foreground font-normal" data-testid="text-practice-status">
      {text}
    </span>
  );
}
