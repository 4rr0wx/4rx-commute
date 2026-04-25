/* global React, api, lineVariant */
const { useEffect: useEffL, useState: useStL, useMemo: useMemoL } = React;

function fmtTime(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString('de-AT', {hour:'2-digit', minute:'2-digit'});
}

function minsUntil(iso, now) {
  if (!iso) return 0;
  return Math.max(0, Math.round((new Date(iso) - now) / 60000));
}

function statusBadge(dep) {
  if (dep.status === 'cancel')     return <StatusBadge kind="neutral">Entfällt</StatusBadge>;
  if (dep.status === 'late')       return <StatusBadge kind="alert">+{dep.delay_min} min</StatusBadge>;
  if (dep.status === 'minor')      return <StatusBadge kind="late-minor">+{dep.delay_min} min</StatusBadge>;
  return <StatusBadge kind="ok">Pünktlich</StatusBadge>;
}

function NextHero({ dep, now, leg, direction }) {
  if (!dep) return (
    <section className="next-hero">
      <div className="next-hero__inner">
        <div>
          <div className="next-hero__eye"><span className="pulse" />Ihr nächster Zug</div>
          <div className="next-hero__from">Keine Abfahrten in den nächsten Stunden.</div>
        </div>
      </div>
    </section>
  );

  const isLate = dep.delay_min > 0;
  const isCancel = dep.status === 'cancel';
  const countdown = minsUntil(dep.actual_iso || dep.planned_iso, now);

  // Direction-aware journey: outbound = Origin → Transfer → Dest, with rail leg
  // first then U6. Return = Origin (Westbahnhof) → Transfer (Meidling) → Dest
  // (Pottschach), with U6 first then rail.
  const isReturn = direction === 'return';
  const railLine = dep.line;
  const railVariant = lineVariant(railLine);

  return (
    <section className="next-hero">
      <div className="next-hero__wave" />
      <div className="next-hero__inner">
        <div>
          <div className="next-hero__eye">
            <span className="pulse" />
            Ihr nächster Zug
          </div>
          <div className="next-hero__from">ab {dep.origin}</div>
          <h1 className="next-hero__title" style={{color: isCancel ? 'var(--brand-red)' : undefined}}>
            {isCancel ? 'Zug fällt aus' : dep.line}
          </h1>

          {!isCancel && (
            <div className="next-hero__when">
              <span className={"big-time" + (isLate ? ' is-late' : '')}>{fmtTime(dep.actual_iso)}</span>
              {isLate && <span className="plan">{fmtTime(dep.planned_iso)}</span>}
              {isLate && <span className="delta">+{dep.delay_min} min</span>}
              {!isLate && <span className="delta is-ok">Pünktlich</span>}
            </div>
          )}

          {!isCancel && (
            <div className="next-hero__countdown">
              In <span className="num">{countdown}</span> min
            </div>
          )}
        </div>

        <div className="journey">
          <div className="journey__leg">
            <div className="journey__time">
              <span className={"actual" + (isLate ? ' is-late' : '')}>{fmtTime(dep.actual_iso)}</span>
              {isLate && <span className="plan">{fmtTime(dep.planned_iso)}</span>}
            </div>
            <div className="journey__rail"><div className="journey__dot" /></div>
            <div className="journey__main">
              <div className="journey__stop">{leg.origin}</div>
              <div className="journey__meta">{isReturn ? 'Einstieg U6' : 'Einstieg Bahnsteig'}</div>
            </div>
            <div />
          </div>

          {isReturn ? (
            <>
              <div className="journey__leg journey__leg--mode" style={{'--line-color': 'var(--u6)'}}>
                <div className="journey__time">·</div>
                <div className="journey__rail" />
                <div className="journey__main">
                  <div className="journey__meta">
                    <LineTag variant="u6">U6</LineTag>
                    <span>10 min · Richtung Siebenhirten</span>
                  </div>
                </div>
                <div />
              </div>
              <div className="journey__leg">
                <div className="journey__time"><span className="actual">≈</span></div>
                <div className="journey__rail"><div className="journey__dot is-transfer" /></div>
                <div className="journey__main">
                  <div className="journey__stop">{leg.transfer}</div>
                  <div className="journey__meta">Umstieg auf {railLine}</div>
                </div>
                <div />
              </div>
              <div className="journey__leg journey__leg--mode" style={{'--line-color': railVariant === 'cjx' ? 'var(--cjx, #e86917)' : 'var(--brand-red)'}}>
                <div className="journey__time">·</div>
                <div className="journey__rail" />
                <div className="journey__main">
                  <div className="journey__meta">
                    <LineTag variant={railVariant}>{railLine}</LineTag>
                    <span>58 min · über Wr. Neustadt</span>
                  </div>
                </div>
                <div />
              </div>
            </>
          ) : (
            <>
              <div className="journey__leg journey__leg--mode" style={{'--line-color': railVariant === 'cjx' ? 'var(--cjx, #e86917)' : 'var(--brand-red)'}}>
                <div className="journey__time">·</div>
                <div className="journey__rail" />
                <div className="journey__main">
                  <div className="journey__meta">
                    <LineTag variant={railVariant}>{railLine}</LineTag>
                    <span>58 min · über Wr. Neustadt</span>
                  </div>
                </div>
                <div />
              </div>
              <div className="journey__leg">
                <div className="journey__time"><span className="actual">≈</span></div>
                <div className="journey__rail"><div className="journey__dot is-transfer" /></div>
                <div className="journey__main">
                  <div className="journey__stop">{leg.transfer}</div>
                  <div className="journey__meta">Umstieg auf U6 · 6 min</div>
                </div>
                <div />
              </div>
              <div className="journey__leg journey__leg--mode" style={{'--line-color': 'var(--u6)'}}>
                <div className="journey__time">·</div>
                <div className="journey__rail" />
                <div className="journey__main">
                  <div className="journey__meta">
                    <LineTag variant="u6">U6</LineTag>
                    <span>10 min · Richtung Floridsdorf</span>
                  </div>
                </div>
                <div />
              </div>
            </>
          )}

          <div className="journey__leg">
            <div className="journey__time"><span className="actual" style={{fontWeight: 700}}>≈</span></div>
            <div className="journey__rail"><div className="journey__dot" /></div>
            <div className="journey__main">
              <div className="journey__stop">{leg.destination}</div>
              <div className="journey__meta">Ankunft</div>
            </div>
            <div />
          </div>
        </div>
      </div>
    </section>
  );
}

function UpcomingList({ deps, now, onRefresh }) {
  return (
    <section className="upcoming">
      <header className="upcoming__head">
        <div>
          <div className="rx-eye">Folgende Abfahrten</div>
          <h2 className="rx-h2" style={{fontSize: 22}}>Live aus HAFAS</h2>
        </div>
        <div className="rx-tabs">
          <button className="rx-tab is-active">Alle</button>
          <button className="rx-tab" onClick={onRefresh}>↻ Neu laden</button>
        </div>
      </header>
      {deps.map(d => {
        const cd = minsUntil(d.actual_iso || d.planned_iso, now);
        return (
          <div key={d.trip_id}
               className={"upcoming__row" + (d.status === 'cancel' ? ' is-cancelled' : '')}>
            <div className="upcoming__line">
              <LineTag variant={lineVariant(d.line)}>{d.line}</LineTag>
            </div>
            <div>
              <div className="upcoming__dest">{d.destination}</div>
              <div className="upcoming__via">ab {d.origin}</div>
            </div>
            <div className={"upcoming__time" + (d.delay_min > 0 ? ' is-late' : '')}>
              {d.status === 'cancel' ? '—' : fmtTime(d.actual_iso || d.planned_iso)}
              {d.delay_min > 0 && <span className="plan">{fmtTime(d.planned_iso)}</span>}
            </div>
            <div style={{textAlign: 'right'}}>
              {statusBadge(d)}
            </div>
            <div className="upcoming__countdown">
              <strong>{cd}</strong> min
            </div>
          </div>
        );
      })}
      {deps.length === 0 && (
        <div style={{padding: 40, textAlign: 'center', color: 'var(--fg-2)'}}>
          Keine Abfahrten geladen. Warten auf nächsten HAFAS-Poll…
        </div>
      )}
    </section>
  );
}

function LivePage({ route, now, direction, onDirectionChange }) {
  const [deps, setDeps] = useStL([]);
  const [loading, setLoading] = useStL(true);

  const leg = (route && route[direction]) || { origin: '', transfer: '', destination: '' };

  const load = async () => {
    setLoading(true);
    try {
      const j = await api.live(8, direction);
      setDeps(j.departures || []);
    } finally { setLoading(false); }
  };

  useEffL(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [direction]);

  const nextIdx = deps.findIndex(d => d.status !== 'cancel' && new Date(d.actual_iso || d.planned_iso) >= now);
  const next = deps[nextIdx] || deps[0];
  const after = deps.filter((d, i) => i !== nextIdx).slice(0, 6);

  // Build a flat route view for the strip from the active leg.
  const stripRoute = { origin: leg.origin, transfer: leg.transfer, destination: leg.destination };

  return (
    <>
      <div className="pg-head">
        <div>
          <div className="pg-head__eye">{now.toLocaleDateString('de-AT', {weekday:'long', day:'2-digit', month:'long'})}</div>
          <h1 className="pg-head__title">Ihre Pendelstrecke</h1>
          <div className="pg-head__sub">{leg.origin} → {leg.destination} · Live aus HAFAS</div>
        </div>
        <div className="pg-head__controls">
          <DirectionToggle value={direction} onChange={onDirectionChange} />
          <Button variant="secondary" size="sm" icon="icon-search.svg" onClick={load}>
            {loading ? 'Lädt…' : 'Neu laden'}
          </Button>
          <Button variant="primary" size="sm" icon="icon-info.svg" onClick={() => api.forcePoll().then(load)}>
            HAFAS-Poll
          </Button>
        </div>
      </div>
      <RouteStrip route={stripRoute} />
      <NextHero dep={next} now={now} leg={leg} direction={direction} />
      <UpcomingList deps={after} now={now} onRefresh={load} />
    </>
  );
}

Object.assign(window, { LivePage });
