from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import db, hafas, stats
from .config import DEST_NAME, ORIGIN_NAME, POLL_INTERVAL_MIN, TRANSFER_NAME

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("4rx-commute")

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

DirectionParam = Query("outbound", pattern="^(outbound|return)$")


def poll_once() -> int:
    observed_at = datetime.now().astimezone()
    observations = hafas.poll_departures()
    for obs in observations:
        db.upsert_observation(obs.as_row(observed_at))
    log.info("polled HAFAS: %d observations stored", len(observations))
    return len(observations)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init()
    # Prime the DB immediately so the UI has something to show.
    try:
        poll_once()
    except Exception:
        log.exception("initial poll failed — continuing with empty DB")

    scheduler = AsyncIOScheduler()
    scheduler.add_job(poll_once, "interval", minutes=POLL_INTERVAL_MIN, id="hafas-poll")
    scheduler.start()
    log.info("scheduler started: polling every %d min", POLL_INTERVAL_MIN)

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


app = FastAPI(title="4rx-Commute", lifespan=lifespan)


@app.get("/api/route")
def route():
    return {
        "outbound": {"origin": ORIGIN_NAME, "transfer": TRANSFER_NAME, "destination": DEST_NAME},
        "return":   {"origin": DEST_NAME,   "transfer": TRANSFER_NAME, "destination": ORIGIN_NAME},
    }


@app.get("/api/live")
def live(limit: int = 8, direction: str = DirectionParam):
    return {"departures": stats.live_departures(limit=limit, direction=direction)}


@app.get("/api/summary")
def summary(days: int = 90, direction: str = DirectionParam):
    return stats.summary(days=days, direction=direction)


@app.get("/api/daily")
def daily(days: int = 90, direction: str = DirectionParam):
    return {"days": stats.daily(days=days, direction=direction)}


@app.get("/api/heatmap")
def heatmap(direction: str = DirectionParam):
    return {"matrix": stats.heatmap(direction=direction)}


@app.get("/api/worst-offenders")
def worst(direction: str = DirectionParam):
    return {"rows": stats.worst_offenders(direction=direction)}


@app.post("/api/poll")
def force_poll():
    n = poll_once()
    return {"stored": n}


# Serve the static frontend last so /api/* wins.
if FRONTEND_DIR.is_dir():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")
    app.mount("/styles", StaticFiles(directory=FRONTEND_DIR / "styles"), name="styles")
    app.mount("/design-system", StaticFiles(directory=FRONTEND_DIR / "design-system"), name="ds")
    app.mount("/components", StaticFiles(directory=FRONTEND_DIR / "components"), name="components")

    @app.get("/")
    def index():
        return FileResponse(FRONTEND_DIR / "index.html")
