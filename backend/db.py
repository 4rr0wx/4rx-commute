import sqlite3
from contextlib import contextmanager
from pathlib import Path

from .config import DB_PATH

# Base schema for fresh DBs. The `direction` column + its index are added
# after the migration check below so existing DBs created before this
# column existed don't trip on `CREATE INDEX … direction`.
SCHEMA = """
CREATE TABLE IF NOT EXISTS observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id     TEXT NOT NULL,
    line        TEXT NOT NULL,
    product     TEXT,
    origin      TEXT NOT NULL,
    destination TEXT NOT NULL,
    direction   TEXT NOT NULL DEFAULT 'outbound',
    planned_iso TEXT NOT NULL,
    actual_iso  TEXT,
    delay_min   INTEGER NOT NULL DEFAULT 0,
    cancelled   INTEGER NOT NULL DEFAULT 0,
    observed_at TEXT NOT NULL,
    UNIQUE(trip_id, planned_iso)
);

CREATE INDEX IF NOT EXISTS idx_obs_planned ON observations(planned_iso);
CREATE INDEX IF NOT EXISTS idx_obs_line    ON observations(line);
"""


def init():
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with connect() as c:
        # Step 1: ensure base table + non-direction indexes exist.
        c.executescript(SCHEMA)
        # Step 2: in-place migration for DBs created before the direction
        # column existed. Idempotent.
        cols = {r["name"] for r in c.execute("PRAGMA table_info(observations)")}
        if "direction" not in cols:
            c.execute(
                "ALTER TABLE observations "
                "ADD COLUMN direction TEXT NOT NULL DEFAULT 'outbound'"
            )
        # Step 3: now the column is guaranteed to exist — create its index.
        c.execute(
            "CREATE INDEX IF NOT EXISTS idx_obs_direction "
            "ON observations(direction)"
        )


@contextmanager
def connect():
    conn = sqlite3.connect(DB_PATH, isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    try:
        yield conn
    finally:
        conn.close()


def upsert_observation(row: dict):
    """Insert or update an observation. On conflict, keep the highest delay
    seen for that trip — a train is never 'less late' than it was before."""
    with connect() as c:
        c.execute(
            """
            INSERT INTO observations
              (trip_id, line, product, origin, destination, direction,
               planned_iso, actual_iso, delay_min, cancelled, observed_at)
            VALUES (:trip_id, :line, :product, :origin, :destination, :direction,
                    :planned_iso, :actual_iso, :delay_min, :cancelled, :observed_at)
            ON CONFLICT(trip_id, planned_iso) DO UPDATE SET
              actual_iso  = excluded.actual_iso,
              delay_min   = MAX(observations.delay_min, excluded.delay_min),
              cancelled   = MAX(observations.cancelled, excluded.cancelled),
              observed_at = excluded.observed_at
            """,
            row,
        )
