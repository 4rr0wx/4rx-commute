import os

ORIGIN_NAME = os.getenv("ORIGIN_NAME", "Pottschach")
TRANSFER_NAME = os.getenv("TRANSFER_NAME", "Wien Meidling")
DEST_NAME = os.getenv("DEST_NAME", "Wien Westbahnhof")

# HAFAS station IDs (ÖBB HAFAS). Looked up via pyhafas locations().
# Overridable by env for other routes.
ORIGIN_ID = os.getenv("ORIGIN_ID", "8100173")        # Pottschach
TRANSFER_ID = os.getenv("TRANSFER_ID", "1290401")    # Wien Meidling Bahnhof
DEST_ID = os.getenv("DEST_ID", "1190100")            # Wien Westbahnhof

DB_PATH = os.getenv("DB_PATH", "./data/delays.sqlite")

# Minutes between scheduled HAFAS polls.
POLL_INTERVAL_MIN = int(os.getenv("POLL_INTERVAL_MIN", "5"))

# Departures window fetched per poll.
LOOKAHEAD_MIN = int(os.getenv("LOOKAHEAD_MIN", "90"))

# If true, use simulated HAFAS data instead of hitting the real API. Handy
# for local dev and when the ÖBB endpoint is flaky or blocks the container.
SIMULATE = os.getenv("SIMULATE_HAFAS", "0") == "1"

# Substrings used to recognise return-direction trains when polling departures
# at the transfer station (Wien Meidling). A train is counted as "return" if
# its `direction` (HAFAS headsign) contains any of these (case-insensitive).
RETURN_DIRECTION_KEYWORDS = [
    s.strip()
    for s in os.getenv(
        "RETURN_DIRECTION_KEYWORDS",
        "Pottschach,Wr. Neustadt,Mürzzuschlag,Payerbach",
    ).split(",")
    if s.strip()
]
