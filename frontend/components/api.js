/* global window */
const dq = (d) => `direction=${encodeURIComponent(d || 'outbound')}`;
window.api = {
  async route()  { return (await fetch('/api/route')).json(); },
  async live(limit = 8, direction = 'outbound')  {
    return (await fetch(`/api/live?limit=${limit}&${dq(direction)}`)).json();
  },
  async summary(days = 90, direction = 'outbound') {
    return (await fetch(`/api/summary?days=${days}&${dq(direction)}`)).json();
  },
  async daily(days = 90, direction = 'outbound')   {
    return (await fetch(`/api/daily?days=${days}&${dq(direction)}`)).json();
  },
  async heatmap(direction = 'outbound') {
    return (await fetch(`/api/heatmap?${dq(direction)}`)).json();
  },
  async worst(direction = 'outbound')   {
    return (await fetch(`/api/worst-offenders?${dq(direction)}`)).json();
  },
  async forcePoll() { return (await fetch('/api/poll', {method:'POST'})).json(); },
};
