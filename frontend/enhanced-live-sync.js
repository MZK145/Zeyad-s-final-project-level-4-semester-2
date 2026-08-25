(() => {
  let attachedSocket = null;
  let refreshTimer = null;
  let onlineChip = null;

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

  function updateRoomFromState() {
    if (!window.state || !state.roomId) return;
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
    if (roomStatusDetail) {
      const arrival = station.arrivalTime || '—';
      const departure = station.departureTime || '—';
      roomStatusDetail.textContent = `Arrival ${arrival} · Departure ${departure}`;
    }
  }

  async function refreshRoomState() {
    if (!window.state || !state.token) return;
    try {
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
    if (!window.state?.socket || attachedSocket === state.socket) return;
    attachedSocket = state.socket;

    state.socket.on('onlineCount', updateOnlineCount);

    state.socket.on('connect', async () => {
      if (state.roomId) {
        state.socket.emit('joinStation', String(state.roomId));
      }
      await refreshRoomState();
    });

    state.socket.on('stationsUpdated', async () => {
      await refreshRoomState();
    });

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
    if (!refreshTimer) refreshTimer = window.setInterval(attachSocket, 500);
  }

  window.addEventListener('load', start);
  start();
})();
