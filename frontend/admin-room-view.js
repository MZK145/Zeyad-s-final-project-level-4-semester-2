(() => {
  let observerStationId = null;
  let observerPanel = null;

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function currentStation(id) {
    return state.stations.find(item => String(item._id) === String(id)) || null;
  }

  function ensurePanel() {
    const container = document.getElementById('adminRooms');
    if (!container) return null;
    if (observerPanel && observerPanel.isConnected) return observerPanel;

    observerPanel = document.createElement('div');
    observerPanel.className = 'panel admin-room-observer';
    observerPanel.hidden = true;
    container.parentElement?.insertBefore(observerPanel, container);
    return observerPanel;
  }

  function renderObserver(station, count = 0) {
    const panel = ensurePanel();
    if (!panel || !station) return;

    panel.hidden = false;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="mini">LIVE OBSERVER</p>
          <h4>👁️ ${esc(station.name)} Waiting Room</h4>
          <span>${esc(station.line)} · ${esc(station.city)}</span>
        </div>
        <button id="closeAdminRoomObserver" class="btn quiet" type="button">Back to rooms</button>
      </div>
      <div class="room-stats">
        <article><small>Waiting passengers</small><strong id="adminObservedRoomCount">${Math.max(0, Number(count) || 0)}</strong></article>
        <article><small>Arrival</small><strong>${esc(station.arrivalTime || '—')}</strong></article>
        <article><small>Departure</small><strong>${esc(station.departureTime || '—')}</strong></article>
      </div>
      <div class="room-message">
        <strong>Live room observer</strong>
        <span>Admin access is read-only here. You can observe the room, but you are not counted as a passenger.</span>
      </div>
    `;

    panel.querySelector('#closeAdminRoomObserver')?.addEventListener('click', closeObserver);
  }

  function openObserver(stationId) {
    if (state.role !== 'admin' || !state.socket) return;

    const station = currentStation(stationId);
    if (!station) return;

    if (observerStationId && observerStationId !== String(stationId)) {
      state.socket.emit('leaveStation');
    }

    observerStationId = String(stationId);
    state.socket.emit('joinStation', observerStationId);
    renderObserver(station, 0);
  }

  function closeObserver() {
    if (state.socket && observerStationId) state.socket.emit('leaveStation');
    observerStationId = null;
    if (observerPanel) observerPanel.hidden = true;
  }

  function attachButtons() {
    document.querySelectorAll('#adminRooms [data-observe-room]').forEach(button => {
      if (button.dataset.observerBound === '1') return;
      button.dataset.observerBound = '1';
      button.addEventListener('click', () => openObserver(button.dataset.observeRoom));
    });
  }

  function patchRoomList() {
    document.querySelectorAll('#adminRooms .admin-row').forEach(row => {
      if (row.querySelector('[data-observe-room]')) return;
      const station = state.stations.find(item => item.name === row.querySelector('strong')?.textContent?.trim());
      if (!station) return;

      const actions = document.createElement('div');
      actions.className = 'row-actions';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn quiet';
      button.dataset.observeRoom = String(station._id);
      button.textContent = 'Open room';
      actions.appendChild(button);
      row.appendChild(actions);
    });

    attachButtons();
  }

  function bindSocket() {
    if (!state.socket || state.socket.__adminRoomObserverBound) return;
    state.socket.__adminRoomObserverBound = true;

    state.socket.on('presenceUpdate', ({ stationId, count }) => {
      if (observerStationId && String(stationId) === observerStationId) {
        const element = document.getElementById('adminObservedRoomCount');
        if (element) element.textContent = String(Math.max(0, Number(count) || 0));
      }
    });

    state.socket.on('connect', () => {
      if (observerStationId) state.socket.emit('joinStation', observerStationId);
    });

    state.socket.on('stationsUpdated', () => {
      const station = observerStationId ? currentStation(observerStationId) : null;
      if (station) renderObserver(station, Number(document.getElementById('adminObservedRoomCount')?.textContent || 0));
    });
  }

  function start() {
    if (typeof state === 'undefined') return;
    bindSocket();
    patchRoomList();
  }

  window.addEventListener('load', start);
  window.setInterval(start, 600);
})();
