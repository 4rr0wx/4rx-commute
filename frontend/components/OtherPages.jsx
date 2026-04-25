/* global React */

function DisruptionsPage() {
  // Placeholder — ÖBB disruption feed integration is not implemented yet.
  return (
    <>
      <div className="pg-head">
        <div>
          <div className="pg-head__eye">Meldungen im VOR-Gebiet</div>
          <h1 className="pg-head__title">Störungen</h1>
          <div className="pg-head__sub">Noch keine Anbindung an den VOR-Feed.</div>
        </div>
      </div>
      <div className="disruption is-minor">
        <div><LineTag variant="default">INFO</LineTag></div>
        <div>
          <div className="disruption__title">Störungsfeed folgt</div>
          <div className="disruption__desc">
            Aktuell tracken wir nur Abfahrten und Verspätungen an {' '}
            <strong>Pottschach</strong>. Der VOR-Störungsfeed lässt sich
            später an den gleichen Scheduler anhängen.
          </div>
        </div>
        <div className="disruption__meta">
          <strong>—</strong>
          <div>geplant</div>
        </div>
      </div>
    </>
  );
}

function SettingsPage({ accent, setAccent, chartStyle, setChartStyle, route }) {
  const [days, setDays] = React.useState(['Mo','Di','Mi','Do','Fr']);
  const DAYS = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const toggle = (d) => setDays(days.includes(d) ? days.filter(x => x !== d) : [...days, d]);

  return (
    <>
      <div className="pg-head">
        <div>
          <div className="pg-head__eye">Meine Pendelstrecke</div>
          <h1 className="pg-head__title">Einstellungen</h1>
          <div className="pg-head__sub">Route wird über Umgebungsvariablen gesteuert — hier nur UI-Einstellungen.</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="rx-eye" style={{marginBottom: 8}}>Route (read-only)</div>
        <h3 style={{margin: '0 0 4px'}}>Tägliche Strecke</h3>
        <div className="settings-row">
          <div className="settings-row__label">Start</div>
          <div className="settings-row__control">
            <input type="text" value={route.origin} readOnly />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row__label">Umstieg</div>
          <div className="settings-row__control">
            <input type="text" value={route.transfer} readOnly />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row__label">Ziel</div>
          <div className="settings-row__control">
            <input type="text" value={route.destination} readOnly />
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row__label">
            Pendeltage
            <small>Nur UI-Hinweis — Poll läuft täglich.</small>
          </div>
          <div className="settings-row__control">
            <div className="chip-row">
              {DAYS.map(d => (
                <button key={d} className={"chip " + (days.includes(d) ? 'is-active' : '')} onClick={() => toggle(d)}>{d}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="rx-eye" style={{marginBottom: 8}}>Darstellung</div>
        <h3 style={{margin: '0 0 4px'}}>Design anpassen</h3>
        <div className="settings-row">
          <div className="settings-row__label">
            Farbakzent
            <small>Steuert Hervorhebungen</small>
          </div>
          <div className="settings-row__control">
            <div className="chip-row">
              <button className={"chip " + (accent === 'red' ? 'is-active' : '')} onClick={() => setAccent('red')}>Signalrot</button>
              <button className={"chip " + (accent === 'sbahn' ? 'is-active' : '')} onClick={() => setAccent('sbahn')}>S-Bahn-Blau</button>
              <button className={"chip " + (accent === 'mixed' ? 'is-active' : '')} onClick={() => setAccent('mixed')}>Gemischt</button>
            </div>
          </div>
        </div>
        <div className="settings-row">
          <div className="settings-row__label">
            Historie-Diagramm
            <small>Bevorzugte Darstellung der Verlaufsdaten</small>
          </div>
          <div className="settings-row__control">
            <div className="chip-row">
              <button className={"chip " + (chartStyle === 'bar' ? 'is-active' : '')} onClick={() => setChartStyle('bar')}>Balken</button>
              <button className={"chip " + (chartStyle === 'heatmap' ? 'is-active' : '')} onClick={() => setChartStyle('heatmap')}>Heatmap</button>
              <button className={"chip " + (chartStyle === 'streak' ? 'is-active' : '')} onClick={() => setChartStyle('streak')}>Kalender</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { DisruptionsPage, SettingsPage });
