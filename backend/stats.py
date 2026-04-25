"""Aggregate stats queries over the observations table."""
from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any

from .db import connect


def _classify(delay: int, cancelled: bool) -> str:
    if cancelled:
        return "cancel"
    if delay <= 2:
        return "ontime"
    if delay <= 5:
        return "minor"
    return "late"


def live_departures(limit: int = 8, direction: str = "outbound") -> list[dict]:
    """Most recent observation per trip_id, sorted by planned time, future first."""
    now = datetime.now().astimezone().isoformat()
    with connect() as c:
        rows = c.execute(
            """
            SELECT trip_id, line, product, origin, destination, direction,
                   planned_iso, actual_iso, delay_min, cancelled, observed_at
            FROM observations
            WHERE planned_iso >= ? AND direction = ?
            ORDER BY planned_iso ASC
            LIMIT ?
            """,
            (now[:10] + "T00:00:00+00:00", direction, limit * 4),
        ).fetchall()

    # De-dup per trip_id, keep the max-delay observation.
    by_trip: dict[str, dict] = {}
    for r in rows:
        d = dict(r)
        if d["trip_id"] in by_trip:
            if d["delay_min"] <= by_trip[d["trip_id"]]["delay_min"]:
                continue
        by_trip[d["trip_id"]] = d

    out = sorted(by_trip.values(), key=lambda d: d["planned_iso"])[:limit]
    for d in out:
        d["status"] = _classify(d["delay_min"], bool(d["cancelled"]))
    return out


def summary(days: int = 90, direction: str = "outbound") -> dict[str, Any]:
    since = (date.today() - timedelta(days=days)).isoformat()
    with connect() as c:
        rows = c.execute(
            """
            SELECT planned_iso, delay_min, cancelled
            FROM observations
            WHERE planned_iso >= ? AND direction = ?
            """,
            (since, direction),
        ).fetchall()

    total = len(rows)
    if total == 0:
        return {
            "days": days, "total": 0, "ontime": 0, "minor": 0,
            "late": 0, "cancel": 0, "on_time_pct": 0.0,
            "avg_delay_min": 0.0, "total_delay_min": 0,
        }

    buckets = defaultdict(int)
    total_delay = 0
    for r in rows:
        buckets[_classify(r["delay_min"], bool(r["cancelled"]))] += 1
        total_delay += r["delay_min"]

    return {
        "days": days,
        "total": total,
        "ontime": buckets["ontime"],
        "minor": buckets["minor"],
        "late": buckets["late"],
        "cancel": buckets["cancel"],
        "on_time_pct": round(buckets["ontime"] / total * 100, 1),
        "avg_delay_min": round(total_delay / total, 1),
        "total_delay_min": total_delay,
    }


def daily(days: int = 90, direction: str = "outbound") -> list[dict]:
    """One row per day — worst delay that day for easy streak/calendar UI."""
    since = (date.today() - timedelta(days=days)).isoformat()
    with connect() as c:
        rows = c.execute(
            """
            SELECT substr(planned_iso, 1, 10) AS day,
                   MAX(delay_min) AS delay,
                   MAX(cancelled) AS cancelled,
                   COUNT(*)       AS trips
            FROM observations
            WHERE planned_iso >= ? AND direction = ?
            GROUP BY day
            ORDER BY day ASC
            """,
            (since, direction),
        ).fetchall()

    out = []
    for r in rows:
        out.append({
            "date": r["day"],
            "delay": r["delay"],
            "cancelled": bool(r["cancelled"]),
            "trips": r["trips"],
            "status": _classify(r["delay"], bool(r["cancelled"])),
        })
    return out


def heatmap(direction: str = "outbound") -> list[list[float]]:
    """7 rows (Mo-So) × 24 cols = avg delay in minutes."""
    with connect() as c:
        rows = c.execute(
            """
            SELECT planned_iso, delay_min FROM observations
            WHERE direction = ?
            """,
            (direction,),
        ).fetchall()

    totals = [[0.0]*24 for _ in range(7)]
    counts = [[0]*24 for _ in range(7)]
    for r in rows:
        dt = datetime.fromisoformat(r["planned_iso"])
        # Monday = 0
        totals[dt.weekday()][dt.hour] += r["delay_min"]
        counts[dt.weekday()][dt.hour] += 1
    return [
        [round(totals[d][h] / counts[d][h], 1) if counts[d][h] else 0.0 for h in range(24)]
        for d in range(7)
    ]


def worst_offenders(limit: int = 6, direction: str = "outbound") -> list[dict]:
    with connect() as c:
        rows = c.execute(
            """
            SELECT line,
                   strftime('%H:%M', planned_iso) AS t,
                   COUNT(*) AS trips,
                   AVG(delay_min) AS avg_delay,
                   SUM(CASE WHEN delay_min > 3 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS pct_late,
                   SUM(CASE WHEN delay_min <= 2 AND cancelled = 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) AS pct_ontime
            FROM observations
            WHERE direction = ?
            GROUP BY line, t
            HAVING trips >= 3
            ORDER BY avg_delay DESC
            LIMIT ?
            """,
            (direction, limit),
        ).fetchall()
    return [
        {
            "line":     r["line"],
            "time":     r["t"],
            "trips":    r["trips"],
            "avg_delay": round(r["avg_delay"], 1),
            "pct_late":  round(r["pct_late"] * 100),
            "pct_ontime": round(r["pct_ontime"] * 100),
        }
        for r in rows
    ]
