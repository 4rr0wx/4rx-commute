"""Thin wrapper around pyhafas for the ÖBB profile + a simulator fallback."""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Literal

from .config import (
    DEST_ID, DEST_NAME, LOOKAHEAD_MIN, ORIGIN_ID, ORIGIN_NAME,
    RETURN_DIRECTION_KEYWORDS, SIMULATE, TRANSFER_ID, TRANSFER_NAME,
)

log = logging.getLogger(__name__)

Direction = Literal["outbound", "return"]


@dataclass
class Observation:
    trip_id: str
    line: str
    product: str
    origin: str
    destination: str
    direction: Direction
    planned: datetime
    actual: datetime | None
    delay_min: int
    cancelled: bool

    def as_row(self, observed_at: datetime) -> dict:
        return {
            "trip_id":     self.trip_id,
            "line":        self.line,
            "product":     self.product,
            "origin":      self.origin,
            "destination": self.destination,
            "direction":   self.direction,
            "planned_iso": self.planned.isoformat(),
            "actual_iso":  self.actual.isoformat() if self.actual else None,
            "delay_min":   int(self.delay_min),
            "cancelled":   1 if self.cancelled else 0,
            "observed_at": observed_at.isoformat(),
        }


def _client():
    """ÖBB HAFAS client. pyhafas dropped OEBBProfile in 0.5+; we fall back to
    DBProfile (Deutsche Bahn's HAFAS, which covers a fair amount of ÖBB data).
    For full ÖBB-only coverage, drop a custom profile in here."""
    from pyhafas import HafasClient
    from pyhafas import profile as p
    Profile = (
        getattr(p, "OEBBProfile", None)
        or getattr(p, "DBProfile", None)
    )
    if Profile is None:
        raise RuntimeError("no compatible HAFAS profile available in pyhafas")
    return HafasClient(Profile())


def poll_departures() -> list[Observation]:
    """Poll both directions and return them in one list. Each Observation
    carries its own `direction`. The simulator and live HAFAS share this
    interface."""
    if SIMULATE:
        return _simulate()
    try:
        return _poll_real()
    except Exception as e:
        log.warning("real HAFAS poll failed (%s) — falling back to simulator", e)
        return _simulate()


def _poll_real() -> list[Observation]:
    client = _client()
    now = datetime.now(timezone.utc).astimezone()
    out: list[Observation] = []

    # ---- outbound: departures from the origin station -------------------
    for d in client.departures(
        station=ORIGIN_ID,
        date=now,
        max_trips=20,
        duration=LOOKAHEAD_MIN,
        products={
            "long_distance_express": True,
            "regional_express": True,
            "regional": True,
            "suburban": True,
        },
    ):
        out.append(_to_obs(d, ORIGIN_NAME, d.direction or DEST_NAME, "outbound"))

    # ---- return: departures from the transfer station, filtered by hdsign
    for d in client.departures(
        station=TRANSFER_ID,
        date=now,
        max_trips=40,
        duration=LOOKAHEAD_MIN,
        products={
            "long_distance_express": True,
            "regional_express": True,
            "regional": True,
            "suburban": True,
        },
    ):
        head = (d.direction or "").lower()
        if not any(kw.lower() in head for kw in RETURN_DIRECTION_KEYWORDS):
            continue
        out.append(_to_obs(d, TRANSFER_NAME, d.direction or ORIGIN_NAME, "return"))

    return out


def _to_obs(d, origin: str, destination: str, direction: Direction) -> Observation:
    planned = d.dateTime
    delay_td = d.delay or timedelta(0)
    actual = planned + delay_td
    return Observation(
        trip_id=d.id or f"{d.name}-{planned.isoformat()}-{direction}",
        line=d.name or "?",
        product=(d.category or "").lower(),
        origin=origin,
        destination=destination,
        direction=direction,
        planned=planned,
        actual=actual,
        delay_min=int(delay_td.total_seconds() // 60),
        cancelled=bool(d.cancelled),
    )


# ---------------------------------------------------------------------------
# Simulator — deterministic fake HAFAS that mirrors a Pottschach commute.
# Outbound: CJX 9 (Mürzzuschlag → Wien Hbf via Wr. Neustadt + Meidling) at :17,
# REX 63 alt at :47. Return:  CJX 9 (Wien Hbf → Mürzzuschlag) at :09 from
# Meidling, REX 63 at :39.
# ---------------------------------------------------------------------------
_OUTBOUND_PATTERN = [
    ("CJX 9",  "cjx", 17, "Wien Hbf"),
    ("REX 63", "rex", 47, "Wien Meidling"),
]
_RETURN_PATTERN = [
    ("CJX 9",  "cjx",  9, "Mürzzuschlag"),
    ("REX 63", "rex", 39, "Payerbach-Reichenau"),
]


def _simulate() -> list[Observation]:
    now = datetime.now().astimezone()
    out: list[Observation] = []

    for h_off in range(-1, 4):
        target = now.replace(second=0, microsecond=0) + timedelta(hours=h_off)
        for line, product, minute, head in _OUTBOUND_PATTERN:
            out.append(_sim_one(target, line, product, minute,
                                origin=ORIGIN_NAME, destination=head,
                                direction="outbound"))
        for line, product, minute, head in _RETURN_PATTERN:
            out.append(_sim_one(target, line, product, minute,
                                origin=TRANSFER_NAME, destination=head,
                                direction="return"))
    return out


def _sim_one(target, line, product, minute, *, origin, destination, direction):
    planned = target.replace(minute=minute)
    seed = int(hashlib.sha1(
        f"{planned.isoformat()}{line}{direction}".encode()
    ).hexdigest(), 16) % 11
    delay = 0
    cancelled = False
    if   seed == 0: delay = 14
    elif seed == 1: delay = 6
    elif seed == 3: delay = 4
    elif seed == 7: cancelled = True
    elif seed == 9: delay = 2
    actual = planned + timedelta(minutes=delay)
    return Observation(
        trip_id=f"sim-{direction}-{line}-{planned.date().isoformat()}-{minute}",
        line=line,
        product=product,
        origin=origin,
        destination=destination,
        direction=direction,
        planned=planned,
        actual=None if cancelled else actual,
        delay_min=delay,
        cancelled=cancelled,
    )
