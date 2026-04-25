/* global React, api */
const { useEffect: useEffH, useState: useStH, useMemo: useMemoH } = React;

function StatCard({ label, value, unit, delta, deltaPos, spark }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{value}{unit && <span className="stat-card__unit">{unit}</span>}</div>
      {delta && <div className={"stat-card__delta " + (deltaPos ? 'is-pos' : 'is-neg')}>{delta}</div>}
      {spark}
    </div>
  );
}

function Sparkline({ data, color = 'currentColor' }) {
  const w = 200, h = 28;
  if (!data || data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <svg className="stat-card__spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function BarChart({ daily }) {
  const groups = useMemoH(() => {
    const out = [];
    for (let i = 0; i < daily.length; i += 5) {
      const chunk = daily.slice(i, i + 5);
      const g = { ontime:0, minor:0, late:0, cancel:0, total: chunk.length, label: '', sub: '' };
      chunk.forEach(d => { g[d.status] = (g[d.status] || 0) + 1; });
      if (chunk[0]) {
        g.label = `KW ${getWeek(new Date(chunk[0].date))}`;
        g.sub = chunk[0].date;
      }
      out.push(g);
    }
    return out;
  }, [daily]);
  if (daily.length === 0) return <Empty />;
  return (
    <div>
      <div className="bar-chart">
        {groups.map((g, i) => {
          const total = Math.max(g.total, 1);
          return (
            <div key={i} className="bar-chart__col" style={{height: '100%'}}>
              {g.cancel > 0 && <div className="bar-chart__seg-cancel" style={{height: `${(g.cancel/total)*100}%`}} />}
              {g.late > 0 &&   <div className="bar-chart__seg-late"   style={{height: `${(g.late/total)*100}%`}} />}
              {g.minor > 0 &&  <div className="bar-chart__seg-minor"  style={{height: `${(g.minor/total)*100}%`}} />}
              {g.ontime > 0 && <div className="bar-chart__seg-ontime" style={{height: `${(g.ontime/total)*100}%`}} />}
              <div className="bar-chart__tip">
                {g.label} · {g.total} Fahrten<br/>
                Pünktlich {g.ontime} · Leicht {g.minor} · Spät {g.late} · Entfällt {g.cancel}
              </div>
            </div>
          );
        })}
      </div>
      <div className="bar-chart__axis">
        {groups.map((g, i) => <span key={i}>{g.label}</span>)}
      </div>
      <div className="bar-chart-legend">
        <span><span className="bar-chart-legend__swatch" style={{background: '#2E7D32'}}/>Pünktlich (≤2 min)</span>
        <span><span className="bar-chart-legend__swatch" style={{background: 'var(--brand-yellow)'}}/>Leicht (+3–5)</span>
        <span><span className="bar-chart-legend__swatch" style={{background: 'var(--brand-red)'}}/>Spät (&gt;5)</span>
        <span><span className="bar-chart-legend__swatch" style={{background: 'var(--brand-black)'}}/>Entfällt</span>
      </div>
    </div>
  );
}

function getWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function Heatmap({ matrix }) {
  const rows = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const color = (v) => {
    if (v < 0.5) return 'var(--gray-05)';
    if (v < 2)   return '#FFF1C7';
    if (v < 4)   return '#FFD56A';
    if (v < 7)   return '#F48A3E';
    if (v < 12)  return '#D94A2C';
    return 'var(--brand-red-dark)';
  };
  if (!matrix) return <Empty />;
  return (
    <div>
      <div className="heatmap">
        {rows.flatMap((r, ri) => [
          <div key={`l${ri}`} className="heatmap__label">{r}</div>,
          ...matrix[ri].map((v, h) => (
            <div key={`${ri}-${h}`}
                 className="heatmap__cell"
                 style={{background: color(v)}}
                 title={`${r} ${String(h).padStart(2,'0')}:00 · Ø +${v} min`} />
          ))
        ])}
      </div>
      <div className="heatmap__hour-axis">
        <span />
        {Array.from({length: 24}, (_, h) => <span key={h}>{h % 3 === 0 ? String(h).padStart(2,'0') : ''}</span>)}
      </div>
      <div className="heatmap-scale">
        <span>Ø Verspätung</span>
        <div className="heatmap-scale__ramp">
          <span style={{background:'var(--gray-05)'}}/>
          <span style={{background:'#FFF1C7'}}/>
          <span style={{background:'#FFD56A'}}/>
          <span style={{background:'#F48A3E'}}/>
          <span style={{background:'#D94A2C'}}/>
          <span style={{background:'var(--brand-red-dark)'}}/>
        </div>
        <span>0 min</span>
        <span style={{marginLeft: 'auto'}}>12+ min</span>
      </div>
    </div>
  );
}

function StreakCalendar({ daily, summary }) {
  const color = (d) => {
    if (d.status === 'ontime') return '#2E7D32';
    if (d.status === 'minor')  return '#FFD56A';
    if (d.status === 'late')   return 'var(--brand-red)';
    if (d.status === 'cancel') return 'var(--brand-black)';
    return 'var(--gray-10)';
  };
  let cur = 0, best = 0, onTimeStreak = 0;
  daily.forEach(d => {
    if (d.status === 'ontime') { cur++; if (cur > best) best = cur; }
    else cur = 0;
  });
  for (let i = daily.length - 1; i >= 0; i--) {
    if (daily[i].status === 'ontime') onTimeStreak++; else break;
  }

  return (
    <div>
      <div className="streak-header">
        <div className="streak-header__stat">
          <div className="streak-header__label">Aktueller Lauf</div>
          <div className="streak-header__value">{onTimeStreak}<span className="unit">Tage pünktlich</span></div>
        </div>
        <div className="streak-header__stat">
          <div className="streak-header__label">Bester Lauf</div>
          <div className="streak-header__value">{best}<span className="unit">Tage</span></div>
        </div>
        <div className="streak-header__stat">
          <div className="streak-header__label">Erfasste Tage</div>
          <div className="streak-header__value">{daily.length}<span className="unit">/ 90</span></div>
        </div>
        <div className="streak-header__stat">
          <div className="streak-header__label">Pünktliche</div>
          <div className="streak-header__value">{summary.ontime}<span className="unit">Tage</span></div>
        </div>
        <div className="streak-header__stat">
          <div className="streak-header__label">Zeit verloren</div>
          <div className="streak-header__value">{Math.round(summary.total_delay_min/60*10)/10}<span className="unit">h</span></div>
        </div>
      </div>
      <div style={{padding: 24}}>
        {daily.length === 0 ? <Empty /> : (
          <div className="streak-grid">
            {daily.map((d, i) => (
              <div key={i}
                   className="streak-cell"
                   style={{background: color(d)}}
                   title={`${d.date} · ${d.status === 'cancel' ? 'Zug entfiel' : `+${d.delay} min`}`} />
            ))}
          </div>
        )}
        <div className="bar-chart-legend" style={{marginTop: 20}}>
          <span><span className="bar-chart-legend__swatch" style={{background: '#2E7D32'}}/>Pünktlich</span>
          <span><span className="bar-chart-legend__swatch" style={{background: '#FFD56A'}}/>Leicht</span>
          <span><span className="bar-chart-legend__swatch" style={{background: 'var(--brand-red)'}}/>Spät</span>
          <span><span className="bar-chart-legend__swatch" style={{background: 'var(--brand-black)'}}/>Entfall</span>
        </div>
      </div>
    </div>
  );
}

function WorstOffenders({ rows }) {
  if (!rows || rows.length === 0) return (
    <div className="chart-panel">
      <header className="chart-panel__head">
        <div>
          <div className="rx-eye">Problemzüge</div>
          <h2 className="rx-h2" style={{fontSize: 22}}>Ihre häufigsten Verspätungsursachen</h2>
        </div>
      </header>
      <Empty padding />
    </div>
  );
  return (
    <div className="chart-panel">
      <header className="chart-panel__head">
        <div>
          <div className="rx-eye">Problemzüge</div>
          <h2 className="rx-h2" style={{fontSize: 22}}>Ihre häufigsten Verspätungsursachen</h2>
        </div>
        <span className="rx-muted rx-small">Aus HAFAS-Beobachtungen</span>
      </header>
      <table className="worst-table">
        <thead>
          <tr>
            <th>Zug</th>
            <th>Abfahrt</th>
            <th style={{textAlign: 'right'}}>Fahrten</th>
            <th style={{textAlign: 'right'}}>Ø Verspätung</th>
            <th style={{width: '30%'}}>Anteil verspätet</th>
            <th style={{textAlign: 'right'}}>Pünktlich</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w, i) => (
            <tr key={i}>
              <td><LineTag variant={lineVariant(w.line)}>{w.line}</LineTag></td>
              <td className="rx-tnum">{w.time}</td>
              <td className="rx-tnum" style={{textAlign: 'right'}}>{w.trips}</td>
              <td className="rx-tnum rx-strong" style={{textAlign: 'right'}}>
                {w.avg_delay > 0 ? '+' : ''}{w.avg_delay.toFixed(1)} min
              </td>
              <td>
                <div className="worst-table__bar">
                  <div className="worst-table__bar-fill" style={{width: `${w.pct_late}%`}} />
                </div>
                <div className="rx-small rx-muted" style={{marginTop: 4}}>{w.pct_late}% &gt; 3 min</div>
              </td>
              <td className="rx-tnum" style={{textAlign: 'right'}}>
                <StatusBadge kind={w.pct_ontime >= 80 ? 'ok' : w.pct_ontime >= 60 ? 'late-minor' : 'alert'}>{w.pct_ontime}%</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ padding }) {
  return (
    <div style={{padding: padding ? 40 : 20, textAlign: 'center', color: 'var(--fg-2)'}}>
      Noch nicht genug Daten. Sobald der Scheduler ein paar Tage gesammelt hat, wird diese Ansicht lebendig.
    </div>
  );
}

function HistoriePage({ chartStyle, direction, onDirectionChange }) {
  const [daily, setDaily] = useStH([]);
  const [summary, setSummary] = useStH({total: 0, on_time_pct: 0, avg_delay_min: 0, total_delay_min: 0, ontime: 0});
  const [heatmapM, setHeatmap] = useStH(null);
  const [worst, setWorst] = useStH([]);
  const [range, setRange] = useStH(90);

  useEffH(() => {
    Promise.all([api.daily(range, direction), api.summary(range, direction),
                 api.heatmap(direction), api.worst(direction)])
      .then(([d, s, h, w]) => {
        setDaily(d.days || []);
        setSummary(s);
        setHeatmap(h.matrix);
        setWorst(w.rows || []);
      });
  }, [range, direction]);

  const sparkData = useMemoH(() => {
    const byWeek = [];
    for (let i = 0; i < daily.length; i += 5) {
      const chunk = daily.slice(i, i + 5);
      const ot = chunk.filter(d => d.status === 'ontime').length;
      byWeek.push(chunk.length ? (ot / chunk.length) * 100 : 0);
    }
    return byWeek;
  }, [daily]);

  const worstDay = daily.reduce((m, d) => (d.delay || 0) > (m?.delay || 0) ? d : m, null);

  return (
    <>
      <div className="pg-head">
        <div>
          <div className="pg-head__eye">Ihre Pendel-Historie</div>
          <h1 className="pg-head__title">Historie</h1>
          <div className="pg-head__sub">Letzte {range} Tage · {summary.total} Fahrten beobachtet</div>
        </div>
        <div className="pg-head__controls">
          <DirectionToggle value={direction} onChange={onDirectionChange} />
          <div className="chart-switcher">
            <button className={range === 7 ? 'is-active' : ''} onClick={() => setRange(7)}>7 T</button>
            <button className={range === 30 ? 'is-active' : ''} onClick={() => setRange(30)}>30 T</button>
            <button className={range === 90 ? 'is-active' : ''} onClick={() => setRange(90)}>90 T</button>
          </div>
        </div>
      </div>

      <div className="stat-grid">
        <StatCard label="Pünktlichkeit" value={summary.on_time_pct} unit="%" spark={<Sparkline data={sparkData} color="#2E7D32" />} />
        <StatCard label="Ø Verspätung" value={`+${summary.avg_delay_min}`} unit="min"
          spark={<Sparkline data={sparkData.map(v => 100-v)} color="var(--brand-red)" />} />
        <StatCard label="Zeit verloren" value={Math.round(summary.total_delay_min / 60 * 10)/10} unit="h gesamt" />
        <StatCard label="Schlimmster Tag"
          value={worstDay ? `+${worstDay.delay}` : '—'} unit="min"
          delta={worstDay ? worstDay.date : ''} deltaPos={false} />
      </div>

      <div className="chart-panel">
        <header className="chart-panel__head">
          <div>
            <div className="rx-eye">Verlauf</div>
            <h2 className="rx-h2" style={{fontSize: 22}}>
              {chartStyle === 'bar' && 'Pünktlichkeit im Zeitverlauf'}
              {chartStyle === 'heatmap' && 'Verspätung nach Tag & Stunde'}
              {chartStyle === 'streak' && 'Pendel-Kalender'}
            </h2>
          </div>
          <span className="rx-muted rx-small">
            {chartStyle === 'bar' && 'Jeder Balken = 1 Woche'}
            {chartStyle === 'heatmap' && 'Dunkler = längere Verspätung'}
            {chartStyle === 'streak' && 'Jeder Punkt = 1 Tag'}
          </span>
        </header>
        <div className="chart-panel__body">
          {chartStyle === 'bar' && <BarChart daily={daily} />}
          {chartStyle === 'heatmap' && <Heatmap matrix={heatmapM} />}
          {chartStyle === 'streak' && <StreakCalendar daily={daily} summary={summary} />}
        </div>
      </div>

      <WorstOffenders rows={worst} />
    </>
  );
}

Object.assign(window, { HistoriePage });
