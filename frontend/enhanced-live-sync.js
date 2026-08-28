(() => {
  let attachedSocket = null;
  let refreshTimer = null;
  let onlineChip = null;
  let lastRoomId = null;

  function hasState() { return typeof state !== 'undefined' && state && state.token; }

  function ensureOnlineChip() {
    if (onlineChip || !document.querySelector('.top-actions')) return;
    onlineChip = document.createElement('span');
    onlineChip.className = 'status-chip';
    onlineChip.id = 'onlinePassengerChip';
    onlineChip.textContent = 'Online passengers: 0';
    document.querySelector('.top-actions').prepend(onlineChip);
  }

  function updateOnlineCount(count) {
    ensureOnlineChip();
    if (onlineChip) onlineChip.textContent = `Online passengers: ${Math.max(0, Number(count) || 0)}`;
  }

  async function syncWaitingRoomPresence() {
    if (!hasState() || state.role !== 'user') return;
    const current = state.roomId ? String(state.roomId) : null;
    if (current === lastRoomId) return;
    try {
      if (lastRoomId && !current) {
        await fetch(`${window.BACKEND_URL}/api/v1/users/waiting-rooms/leave`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${state.token}` },
          cache: 'no-store'
        });
      }
      if (current) {
        const response = await fetch(`${window.BACKEND_URL}/api/v1/users/waiting-rooms/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${state.token}`
          },
          body: JSON.stringify({ stationId: current }),
          cache: 'no-store'
        });
        if (!response.ok) throw new Error(`Waiting-room registration failed (${response.status})`);
      }
      lastRoomId = current;
    } catch (error) {
      console.warn('MetroFlow waiting-room presence:', error.message);
    }
  }

  function updateRoomFromState() {
    if (!hasState() || !state.roomId) return;
    const station = state.stations?.find(item => String(item._id) === String(state.roomId));
    if (!station) return;
    const roomName = document.getElementById('roomName');
    const roomLine = document.getElementById('roomLine');
    const roomArrival = document.getElementById('roomArrival');
    const roomDestination = document.getElementById('roomDestination');
    const roomStatus = document.getElementById('roomStatus');
    const roomStatusDetail = document.getElementById('roomStatusDetail');
    if (roomName) roomName.textContent = station.name;
    if (roomLine) roomLine.textContent = `${station.line} · ${station.city}`;
    if (roomArrival) roomArrival.textContent = station.arrivalTime || '—';
    if (roomDestination) roomDestination.textContent = state.destination?.name || '—';
    if (roomStatus) roomStatus.textContent = 'Live room synchronized';
    if (roomStatusDetail) roomStatusDetail.textContent = `Arrival ${station.arrivalTime || '—'} · Departure ${station.departureTime || '—'}`;
  }

  async function refreshRoomState() {
    if (!hasState()) return;
    try {
      await syncWaitingRoomPresence();
      if (typeof syncStations === 'function') await syncStations();
      updateRoomFromState();
    } catch (error) {
      const feed = document.getElementById('roomFeed');
      if (feed && state.roomId) {
        const item = document.createElement('div');
        item.textContent = `Live sync retry: ${error.message}`;
        feed.prepend(item);
      }
    }
  }

  function attachSocket() {
    if (!hasState() || !state.socket || attachedSocket === state.socket) return;
    attachedSocket = state.socket;
    state.socket.on('onlineCount', updateOnlineCount);
    state.socket.on('connect', async () => {
      if (state.roomId) state.socket.emit('joinStation', String(state.roomId));
      await refreshRoomState();
    });
    state.socket.on('stationsUpdated', refreshRoomState);
    state.socket.on('presenceUpdate', ({ stationId, count }) => {
      if (state.roomId && String(stationId) === String(state.roomId)) {
        const roomCount = document.getElementById('roomCount');
        if (roomCount) roomCount.textContent = String(Math.max(0, Number(count) || 0));
      }
    });
  }

  function start() {
    ensureOnlineChip();
    attachSocket();
    syncWaitingRoomPresence();
    if (!refreshTimer) refreshTimer = window.setInterval(() => {
      attachSocket();
      syncWaitingRoomPresence();
    }, 1000);
  }

  window.addEventListener('load', start);
  start();
})();
