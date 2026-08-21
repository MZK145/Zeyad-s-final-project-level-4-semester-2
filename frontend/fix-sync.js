(function () {
  let timer = null;
  let busy = false;
  async function sync() { if (busy) return; busy = true; try { if (typeof window.refreshStations === 'function') await window.refreshStations(true); if (typeof window.refreshRoom === 'function') await window.refreshRoom(); if (typeof window.refreshAdmin === 'function') await window.refreshAdmin(); } finally { busy = false; } }
  window.syncMetroStations = sync;
  window.scheduleMetroSync = () => { clearTimeout(timer); timer = setTimeout(sync, 120); };
})();
