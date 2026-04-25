/* global React */

function BrandBar({ route }) {
  const sub = route ? `${route.origin} → ${route.destination}` : '';
  return (
    <header className="rx-bar">
      <div className="rx-bar__logo">
        <img src="assets/4rx-logo.svg" alt="4rx" />
      </div>
      <div className="rx-bar__divider" />
      <div className="rx-bar__product">
        <div className="rx-bar__product-eyebrow">Pendler-App</div>
        <div className="rx-bar__product-name">4rx-Commute</div>
      </div>
      <div className="rx-bar__spacer" />
      <div className="rx-bar__user">
        <img src="assets/icon-user.svg" width="20" height="20" alt="" />
        <span>M. Wagner · {sub}</span>
      </div>
    </header>
  );
}

function StatusStrip({ now }) {
  const time = now.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('de-AT', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  return (
    <div className="rx-strip">
      <div className="rx-strip__pulse"><span /></div>
      <span>Live</span>
      <span className="rx-strip__sep">·</span>
      <span>HAFAS-Poll alle 5 min</span>
      <div className="rx-strip__spacer" />
      <span className="rx-strip__time">{date} · {time}</span>
    </div>
  );
}

function Sidebar({ current, onNav }) {
  const items = [
    { id: 'live',          label: 'Live-Pendel',   icon: 'icon-clock.svg' },
    { id: 'historie',      label: 'Historie',      icon: 'icon-train.svg' },
    { id: 'stoerungen',    label: 'Störungen',     icon: 'icon-warning.svg' },
    { id: 'einstellungen', label: 'Einstellungen', icon: 'icon-settings.svg' },
  ];
  return (
    <nav className="rx-side">
      {items.map(i => (
        <button key={i.id}
          className={"rx-side__item " + (current === i.id ? 'is-active' : '')}
          onClick={() => onNav(i.id)}>
          <img src={`assets/${i.icon}`} alt="" width="22" height="22" />
          <span className="rx-side__label">{i.label}</span>
        </button>
      ))}
    </nav>
  );
}

function LineTag({ variant = 'default', children }) {
  return <span className={`rx-tag rx-tag--${variant}`}>{children}</span>;
}

function StatusBadge({ kind, children }) {
  return <span className={`rx-badge rx-badge--${kind}`}>{children}</span>;
}

function Button({ variant = 'primary', children, onClick, icon, size = 'md' }) {
  return (
    <button className={`rx-btn rx-btn--${variant} rx-btn--${size}`} onClick={onClick}>
      {icon && <img src={`assets/${icon}`} alt="" width="16" height="16" />}
      {children}
    </button>
  );
}

function RouteStrip({ route }) {
  return (
    <div className="route-strip">
      <span className="route-strip__stop">
        <span className="route-strip__dot" />
        {route.origin}
      </span>
      <span className="route-strip__arrow">→</span>
      <span className="route-strip__stop" style={{color: 'var(--fg-2)'}}>
        {route.transfer}
      </span>
      <span className="route-strip__arrow">→</span>
      <span className="route-strip__stop">
        <span className="route-strip__dot route-strip__dot--end" />
        {route.destination}
      </span>
      <div className="route-strip__legs">
        <LineTag variant="cjx">CJX 9</LineTag>
        <span>·</span>
        <LineTag variant="u6">U6</LineTag>
        <span>· Fahrzeit ca. 78 min</span>
      </div>
    </div>
  );
}

function DirectionToggle({ value, onChange }) {
  return (
    <div className="rx-dirtoggle" role="tablist" aria-label="Fahrtrichtung">
      <button
        role="tab"
        aria-selected={value === 'outbound'}
        className={"rx-dirtoggle__btn " + (value === 'outbound' ? 'is-active' : '')}
        onClick={() => onChange('outbound')}>
        Hinfahrt
      </button>
      <button
        role="tab"
        aria-selected={value === 'return'}
        className={"rx-dirtoggle__btn " + (value === 'return' ? 'is-active' : '')}
        onClick={() => onChange('return')}>
        Rückfahrt
      </button>
    </div>
  );
}

function lineVariant(line) {
  if (!line) return 'default';
  if (line.startsWith('CJX')) return 'cjx';
  if (line.startsWith('REX') || line.startsWith('RJ')) return 'railjet';
  if (line === 'U6') return 'u6';
  if (line === 'U3') return 'u3';
  if (line === 'U4') return 'u4';
  if (line.startsWith('S')) return 'sbahn';
  return 'default';
}

Object.assign(window, { BrandBar, StatusStrip, Sidebar, LineTag, StatusBadge, Button, RouteStrip, DirectionToggle, lineVariant });
