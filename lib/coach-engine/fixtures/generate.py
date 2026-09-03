#!/usr/bin/env python3
"""Golden-fixture generator for the coach-engine parity suite.

Runs the *reference* Python engine (the AceLeetcode repo) through a scripted
scenario matrix and dumps its exact outputs as JSON. The vitest suite replays
the same scenarios through the TypeScript port and asserts deep equality —
any mismatch is a defect in the port.

Run by hand, once, whenever the reference changes:

    python3 generate.py [path-to-AceLeetcode-repo]   # default ~/Desktop/AceLeetcode

The scenario matrix is enumerated from the reference's branch points:
every grade x state transition (including banker's-rounding ties on .5
interval products), the hard-lock boundary, budget edges (65% ceiling,
<15-minute floor), sprint window edges, and frozen-day rebuilds.
"""

from __future__ import annotations

import json
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path

ACE = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else Path.home() / "Desktop/AceLeetcode"
sys.path.insert(0, str(ACE / "scripts"))

import daylog  # noqa: E402
import store  # noqa: E402
from daily import build_plan  # noqa: E402
from scheduler import ReviewState, apply_grade  # noqa: E402
from selector import rank_new_problems  # noqa: E402

OUT = Path(__file__).resolve().parent
D0 = date(2026, 1, 5)
REF = date(2026, 9, 1)
COMPANIES = ["amazon", "google", "meta", "microsoft", "apple", "bloomberg", "tiktok", "openai"]


def meta() -> dict:
    return {
        "generated": date.today().isoformat(),
        "source": str(ACE),
        "note": "Output of the reference Python engine. Regenerate with generate.py; never edit.",
    }


def dump(name: str, payload: dict) -> None:
    payload = {"_meta": meta(), **payload}
    path = OUT / f"{name}.json"
    path.write_text(json.dumps(payload, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {path.name}")


def state_dict(st: ReviewState) -> dict:
    d = st.to_dict()
    d.pop("history")
    return d


# --- grading ---------------------------------------------------------------

def grading_fixture() -> dict:
    scenarios = []

    def run(name: str, steps: list, start: dict | None = None) -> None:
        st = ReviewState.from_dict("lc-x", start) if start else ReviewState(problem_id="lc-x")
        cur = D0
        out_steps = []
        for grade, weak in steps:
            apply_grade(st, grade, weak_points=weak, on=cur)
            event = dict(st.history[-1])
            out_steps.append({"on": cur.isoformat(), "grade": grade,
                              "weak_points": weak or [],
                              "state": state_dict(st), "event": event})
            cur = store.parse_date(st.due)
        scenarios.append({"name": name, "start": start, "steps": out_steps})

    p, q, f = ("pass", None), ("partial", None), ("fail", None)
    run("all-pass-to-mastered", [p] * 12)
    run("ladder-then-partials", [p] * 3 + [q] * 6)
    run("fail-recovery", [p] * 6 + [("fail", ["cannot justify invariant"])] + [p] * 5)
    run("all-fail-ease-floor", [f] * 8)
    run("weak-point-merge",
        [("partial", ["a"]), ("partial", ["b", "c"]), ("partial", ["a", "d"]),
         ("partial", ["e", "f", "g", "h"]), ("pass", None)])
    run("mixed-walk", [p, q, p, f, p, p, q, q, p, f, q, p, p])
    # Banker's-rounding ties on interval products, from synthetic starts.
    review = {"state": "review", "reps": 3, "due": D0.isoformat()}
    run("tie-partial-2x1.25", [q], start={**review, "interval_days": 2, "ease": 2.5})
    run("tie-partial-6x1.25", [q], start={**review, "interval_days": 6, "ease": 2.5})
    run("tie-pass-2x2.25", [p], start={**review, "interval_days": 2, "ease": 2.15})
    run("tie-pass-10x2.45", [p], start={**review, "interval_days": 10, "ease": 2.35})
    return {"scenarios": scenarios}


# --- shared synthetic review bank ------------------------------------------

def synth_reviews(problems: dict) -> dict:
    """Grade the first 15 bank problems on a scripted cycle, dated so a
    handful are due (some overdue) relative to REF."""
    cycle = ["pass", "partial", "fail"]
    reviews = {}
    for i, pid in enumerate(list(problems)[:15]):
        st = ReviewState(problem_id=pid)
        start = REF - timedelta(days=40 + i * 3)
        cur = start
        for step in range(1 + i % 4):
            grade = cycle[(i + step) % 3]
            weak = [f"weak point {i}"] if grade != "pass" else None
            apply_grade(st, grade, weak_points=weak, on=cur)
            cur = store.parse_date(st.due)
        reviews[pid] = st.to_dict()
        reviews[pid].pop("history")
    return reviews


# --- ranking ---------------------------------------------------------------

def ranking_fixture(problems: dict) -> dict:
    reviews = synth_reviews(problems)
    out = {"reviews": reviews, "cases": []}
    for name, companies, sprint in [
        ("normal-all-companies", COMPANIES, False),
        ("normal-two-companies", ["google", "openai"], False),
        ("normal-no-companies", [], False),
        ("sprint", COMPANIES, True),
        ("fresh-account", COMPANIES, False),
    ]:
        rev = {} if name == "fresh-account" else reviews
        ranked = rank_new_problems(problems, rev, companies, sprint=sprint)
        out["cases"].append({
            "name": name, "companies": companies, "sprint": sprint,
            "fresh": name == "fresh-account",
            "ranked": [{"id": pr["id"], "score": score} for pr, score in ranked],
        })
    return out


# --- plans -----------------------------------------------------------------

def comparable(plan: dict) -> dict:
    return {
        **{k: plan[k] for k in ("date", "budget", "planned_minutes", "deferred_reviews",
                                 "sprint", "sprint_days", "total_seen", "total_problems",
                                 "done_today", "solved_today", "assigned_today")},
        "reviews": [{"id": i["problem"]["id"], "mode": i["mode"], "minutes": i["minutes"],
                     "risk": i["risk"], "days_overdue": i["days_overdue"],
                     "done": i["done"], "solved": i["solved"], "grade": i["grade"]}
                    for i in plan["reviews"]],
        "new": [{"id": i["problem"]["id"], "minutes": i["minutes"], "score": i["score"],
                 "done": i["done"], "solved": i["solved"], "grade": i["grade"]}
                for i in plan["new"]],
    }


def plans_fixture(problems: dict, bank_raw: dict) -> dict:
    cases = []
    base_cfg = {"daily_minutes": 60, "new_per_day": 2, "sprint_window_days": 14,
                "interview_date": None, "target_companies": COMPANIES}

    def run_case(name: str, cfg: dict, reviews: dict, minutes=None, frozen_script=None):
        with tempfile.TemporaryDirectory() as tmp:
            tmpd = Path(tmp)
            store.PROBLEMS_PATH = tmpd / "problems.json"
            store.REVIEWS_PATH = tmpd / "reviews.json"
            store.CONFIG_PATH = tmpd / "config.json"
            store.DAYLOG_PATH = tmpd / "daily_log.json"
            store.save_json(store.PROBLEMS_PATH, bank_raw)
            store.save_json(store.REVIEWS_PATH, reviews)
            store.save_json(store.CONFIG_PATH, cfg)
            store.save_json(store.DAYLOG_PATH, {})

            plans = [comparable(build_plan(minutes=minutes, ref=REF))]
            entries = [daylog.entry_for(daylog.load_daylog(), REF.isoformat())]
            if frozen_script:
                for action, pid, *rest in frozen_script:
                    if action == "solve":
                        daylog.mark_solved(pid, on=REF)
                    else:
                        daylog.mark_done(pid, rest[0], "grill", on=REF)
                plans.append(comparable(build_plan(minutes=minutes, ref=REF)))
                entries.append(daylog.entry_for(daylog.load_daylog(), REF.isoformat()))
            cases.append({"name": name, "config": cfg, "reviews": reviews,
                          "minutes": minutes, "ref": REF.isoformat(),
                          "frozen_script": [list(s) for s in (frozen_script or [])],
                          "entries": entries, "plans": plans})

    reviews = synth_reviews(problems)
    run_case("fresh-60", base_cfg, {})
    run_case("fresh-104", base_cfg, {}, minutes=104)
    run_case("fresh-30", base_cfg, {}, minutes=30)
    run_case("backlog-60", base_cfg, reviews)
    run_case("sprint-backlog", {**base_cfg, "interview_date": (REF + timedelta(days=7)).isoformat()}, reviews)
    run_case("sprint-edge-day14", {**base_cfg, "interview_date": (REF + timedelta(days=14)).isoformat()}, reviews)
    run_case("sprint-past-interview", {**base_cfg, "interview_date": (REF - timedelta(days=1)).isoformat()}, reviews)
    run_case("frozen-rebuild", base_cfg, reviews, frozen_script=None)
    # freeze, then tick one solved and grade another, then rebuild
    first = [c for c in cases if c["name"] == "backlog-60"][0]
    assigned = [i["id"] for i in first["plans"][0]["new"]] or [i["id"] for i in first["plans"][0]["reviews"]]
    graded = first["plans"][0]["reviews"][0]["id"] if first["plans"][0]["reviews"] else assigned[0]
    run_case("frozen-progress", base_cfg, reviews,
             frozen_script=[("solve", assigned[0]), ("done", graded, "partial")])
    return {"cases": cases}


# --- daylog ----------------------------------------------------------------

def daylog_fixture() -> dict:
    def entry(assigned=(), done=(), reviews=(), solved=()):
        return {"assigned_new": list(assigned), "assigned_reviews": list(reviews),
                "planned_minutes": 48, "solved": list(solved),
                "done": [{"id": pid, "grade": "pass", "mode": "grill"} for pid in done]}

    ref = date(2026, 8, 23)
    day = lambda off: (ref + timedelta(days=off)).isoformat()  # noqa: E731
    logs = {
        "mixed-week": {
            day(0): entry(assigned=["g"]),
            day(-1): entry(assigned=["e", "f"], done=["e", "f"]),
            day(-2): entry(assigned=["c", "d"], solved=["c", "d"]),
            day(-3): entry(assigned=["a", "b"], done=["a"]),
            day(-4): entry(done=["x"]),
            day(-5): entry(),
            day(-6): entry(assigned=["z"]),
        },
        "long-streak": {day(-i): entry(assigned=[f"p{i}"], done=[f"p{i}"]) for i in range(10)},
        "ungraded-today": {day(0): entry(assigned=["a"], solved=["a"])},
    }
    out = {"ref": ref.isoformat(), "logs": {}}
    for name, log in logs.items():
        out["logs"][name] = {
            "log": log,
            "statuses": {d: daylog.day_status(daylog.entry_for(log, d), d, ref) for d in sorted(log)},
            "streak": daylog.streak(log, ref),
            "adherence": daylog.adherence(log, 30, ref),
        }
    return out


def main() -> None:
    bank_raw = store.load_json(ACE / "data" / "problems.json")
    problems = {p["id"]: p for p in bank_raw["problems"]}

    dump("bank", {"problems": problems})
    dump("grading", grading_fixture())
    dump("ranking", ranking_fixture(problems))
    dump("plans", plans_fixture(problems, bank_raw))
    dump("daylog", daylog_fixture())


if __name__ == "__main__":
    main()
