# 4rx-Commute — Pottschach ↔ Wien Westbahnhof

A dockerized service that polls ÖBB HAFAS every few minutes, stores every
observed departure in SQLite, and serves a live dashboard plus delay
statistics for the daily commute. Both legs are tracked **separately** —
morning `Pottschach → Wien Meidling (U6) → Wien Westbahnhof` (CJX 9 + U6) and
evening `Wien Westbahnhof → Wien Meidling → Pottschach` get independent
streaks, heatmaps, and worst-offender boards. Toggle via Hin/Rück on every
page.

The UI is built against the 4rx design system (Austrian-rail corporate design)
and ships with three history views: weekly bars, hour×weekday heatmap, and a
streak calendar.

## Quick start

```bash
docker compose up --build
# → http://localhost:8000
```

`./data/delays.sqlite` persists across restarts. The scheduler polls every
5 minutes; trigger a manual poll with `curl -X POST http://localhost:8000/api/poll`.

## Local dev (no Docker)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
DB_PATH=./data/delays.sqlite SIMULATE_HAFAS=1 \
  uvicorn backend.main:app --reload
```

`SIMULATE_HAFAS=1` bypasses the live endpoint and generates deterministic
fake departures — useful when HAFAS is blocking, or for UI work on a plane.

## HAFAS profile note

`pyhafas ≥ 0.5` dropped its bundled `OEBBProfile`, so [`backend/hafas.py`](backend/hafas.py)
falls back to `DBProfile` (DB's HAFAS, which covers a lot of ÖBB data) and, if
the real call fails, to the simulator. For pure ÖBB coverage, register a
custom profile pointed at `fahrplan.oebb.at/bin/mgate.exe` and import it from
`_client()`.

## Configuration

All via environment variables (see [`docker-compose.yml`](docker-compose.yml)):

| Var | Default | Meaning |
| --- | --- | --- |
| `ORIGIN_NAME` / `ORIGIN_ID` | `Pottschach` / `8100173` | Start station (HAFAS ID) |
| `TRANSFER_NAME` / `TRANSFER_ID` | `Wien Meidling` / `1290401` | Transfer station |
| `DEST_NAME` / `DEST_ID` | `Wien Westbahnhof` / `1190100` | Destination |
| `POLL_INTERVAL_MIN` | `5` | How often to poll HAFAS |
| `LOOKAHEAD_MIN` | `90` | Departure window fetched per poll |
| `SIMULATE_HAFAS` | `0` | `1` = use deterministic fake data |
| `RETURN_DIRECTION_KEYWORDS` | `Pottschach,Wr. Neustadt,Mürzzuschlag,Payerbach` | Substrings that mark a departure at the transfer station as "return" |
| `DB_PATH` | `/data/delays.sqlite` | SQLite location |

Swap the station IDs via env to track any other ÖBB route. Look them up with
`python -c "from pyhafas import HafasClient; from pyhafas.profile import OEBBProfile; print(HafasClient(OEBBProfile()).locations('Pottschach'))"`.

## Endpoints

All read endpoints accept `?direction=outbound|return` (defaults to
`outbound`). Outbound = Pottschach → Westbahnhof, return = the way home.

| Path | What |
| --- | --- |
| `GET /`                    | Dashboard (served static) |
| `GET /api/route`           | Both legs (outbound + return labels) |
| `GET /api/live?limit=8`    | Next observed departures |
| `GET /api/summary?days=90` | Aggregate punctuality stats |
| `GET /api/daily?days=90`   | One row per day (status + worst delay) |
| `GET /api/heatmap`         | 7×24 avg-delay matrix |
| `GET /api/worst-offenders` | Worst line/time pairs |
| `POST /api/poll`           | Force an immediate HAFAS poll (both legs) |

## How delays are classified

| Status | Rule |
| --- | --- |
| `ontime` | delay ≤ 2 min, not cancelled |
| `minor`  | 3–5 min |
| `late`   | > 5 min |
| `cancel` | HAFAS `cancelled` flag |

Observations are upserted per `(trip_id, planned_iso)`; if a train gets
more delayed between polls, the higher delay wins — a train is never
retroactively "less late".

## Project layout

```
backend/           FastAPI app, HAFAS poller, SQLite stats
  config.py        env-driven config
  db.py            schema + upsert
  hafas.py         pyhafas wrapper + simulator
  stats.py         aggregate queries
  main.py          ASGI app + scheduler
frontend/          Static dashboard (React UMD + Babel standalone, no build)
  index.html
  components/      Shell, LivePage, HistoriePage, OtherPages, api.js
  styles/          commute.css
  design-system/   colors_and_type.css, kit.css
  assets/          SVG icons & logos
data/              Bind-mounted SQLite volume
Dockerfile
docker-compose.yml
```

The frontend is kept as a zero-build static bundle on purpose — one image,
one process, one port.

## Deploy

`docker-compose.yml` is the dev profile (bind-mounts `./data`, env hardcoded
inline). For pushing to a dev server use `docker-compose.prod.yml` —
`env_file: .env`, named volume `commute_data`, healthcheck, log rotation,
and the port bound only to `127.0.0.1` so a reverse proxy in front does TLS
and exposure.

```bash
cp .env.example .env && $EDITOR .env
docker compose -f docker-compose.prod.yml up -d --build
```

`.env` is gitignored. Healthcheck flips to `healthy` ~30s after the first
successful `GET /api/route`.
