(() => {
  let socket = null;
  let activeRoom = null;
  let refreshTimer = null;

  const API = String(window.BACKEND_URL || location.origin).replace(/\/+$/, '');
  const token = () => localStorage.getItem('metro_token') || '';
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function addStyles() {
    if (document.getElementById('adminActiveRoomStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminActiveRoomStyles';
    style.textContent = `
      #adminRooms .admin-room-entry { display:flex; justify-content:flex-end; margin-top:10px; }
      #adminRooms .admin-room-entry .btn { min-width:170px; }
      #adminRoomDetail { margin-top:18px; }
      #adminRoomDetail .live-room-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:16px; }
      #adminRoomDetail .live-room-card { padding:14px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background:rgba(255,255,255,.025); }
      #adminRoomDetail .live-room-card small { display:block; opacity:.7; margin-bottom:6px; }
      #adminRoomDetail .live-room-card strong { display:block; font-size:18px; }
      #adminRoomDetail .live-room-meta { margin-top:14px; display:flex; flex-wrap:wrap; gap:8px; }
      #adminRoomDetail .live-room-meta span { padding:7px 10px; border-radius:999px; background:rgba(255,255,255,.05); font-size:12px; }
      @media(max-width:800px){ #adminRoomDetail .live-room-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media(max-width:520px){ #adminRoomDetail .live-room-grid { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  async function getStations() {
    const response = await fetch(`${API}/api/v1/stations`, { cache: 'no-store' });
    const data = await response.json().catch(() => []);
    if (!response.ok) throw new Error(data?.error || 'Unable to load stations');
    return Array.isArray(data) ? data : [];
  }

  async function getRooms() {
    const response = await fetch(`${API}/api/v1/users/waiting-rooms`, {
      headers: { Authorization: `Bearer ${token()}` },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Unable to load waiting rooms');
    return data.rooms || [];
  }

  function ensureDetailHost() {
    const host = document.getElementById('adminRoomDetail');
    if (!host) return null;
    host.hidden = false;
    return host;
  }

  function closeRoom() {
    if (socket) {
      try { socket.emit('leaveStation'); } catch (_) {}
      socket.disconnect();
      socket = null;
    }
    activeRoom = null;
    const host = document.getElementById('adminRoomDetail');
    if (host) {
      host.hidden = true;
      host.innerHTML = '';
    }
  }

  function renderRoom(room, station) {
    const host = ensureDetailHost();
    if (!host) return;
    const count = Math.max(0, Number(room.onlinePassengers) || 0);
    host.innerHTML = `
      <div class="panel">
        <div class="panel-head">
          <div>
            <p class="mini">LIVE WAITING ROOM</p>
            <h4>${esc(station.name)}</h4>
            <span>${esc(station.line || room.line || '—')} · ${esc(station.city || room.city || '—')}</span>
          </div>
          <button id="adminCloseActiveRoom" class="btn quiet" type="button">Leave room</button>
        </div>
        <div class="live-room-grid">
          <div class="live-room-card"><small>Waiting passengers</small><strong id="adminLivePassengerCount">${count}</strong></div>
          <div class="live-room-card"><small>Status</small><strong id="adminLiveRoomStatus">${count > 0 ? 'ACTIVE' : 'EMPTY'}</strong></div>
          <div class="live-room-card"><small>Arrival</small><strong>${esc(station.arrivalTime || '—')}</strong></div>
          <div class="live-room-card"><small>Departure</small><strong>${esc(station.departureTime || '—')}</strong></div>
        </div>
        <div class="live-room-meta">
          <span>Station: ${esc(station.name)}</span>
          <span>Line: ${esc(station.line || '—')}</span>
          <span>City: ${esc(station.city || '—')}</span>
          <span>Governorate: ${esc(station.governorate || '—')}</span>
          <span>Order: ${esc(station.order ?? '—')}</span>
        </div>
        <div class="room-message" style="margin-top:14px">
          <strong>Admin observer</strong>
          <span>This room is live. Passenger count changes automatically when users join or leave. The admin is not included in the count.</span>
        </div>
      </div>`;
    document.getElementById('adminCloseActiveRoom')?.addEventListener('click', closeRoom);
  }

  function applyPresence(payload) {
    if (!activeRoom || String(payload?.stationId) !== String(activeRoom.stationId)) return;
    const count = Math.max(0, Number(payload?.count) || 0);
    activeRoom.onlinePassengers = count;
    const countEl = document.getElementById('adminLivePassengerCount');
    const statusEl = document.getElementById('adminLiveRoomStatus');
    if (countEl) countEl.textContent = String(count);
    if (statusEl) statusEl.textContent = count > 0 ? 'ACTIVE' : 'EMPTY';
  }

  async function enterRoom(room) {
    if (!room?.active) return;
    try {
      closeRoom();
      const stations = await getStations();
      const station = stations.find(item => String(item._id) === String(room.stationId));
      if (!station) throw new Error('Station details could not be loaded.');
      activeRoom = { ...room, stationId: String(room.stationId) };
      renderRoom(activeRoom, station);

      if (typeof window.io !== 'function') throw new Error('Socket.IO is not available on this page.');
      socket = window.io(API, {
        auth: { token: token() },
        transports: ['websocket', 'polling']
      });
      socket.on('connect', () => socket.emit('joinStation', activeRoom.stationId));
      socket.on('presenceUpdate', applyPresence);
      socket.on('roomCount', applyPresence);
      socket.on('stationsUpdated', async () => {
        try {
          const latest = await getStations();
          const current = latest.find(item => String(item._id) === String(activeRoom.stationId));
          if (current) renderRoom(activeRoom, current);
        } catch (_) {}
      });
      socket.on('disconnect', () => {
        const status = document.getElementById('adminLiveRoomStatus');
        if (status) status.textContent = 'RECONNECTING';
      });
    } catch (error) {
      const host = ensureDetailHost();
      if (host) host.innerHTML = `<div class="panel"><p class="message">${esc(error.message)}</p></div>`;
    }
  }

  function patchRows(rooms) {
    const list = document.getElementById('adminRooms');
    if (!list) return;
    list.querySelectorAll('.admin-row').forEach(row => {
      const stationName = row.querySelector('strong')?.textContent?.trim();
      const room = rooms.find(item => String(item.name).trim() === stationName);
      if (!room) return;

      let actions = row.querySelector('.admin-room-entry');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'admin-room-entry';
        row.appendChild(actions);
      }
      actions.innerHTML = '';

      if (room.active) {
        const button = document.createElement('button');
        button.className = 'btn primary';
        button.type = 'button';
        button.textContent = 'Enter active room';
        button.addEventListener('click', () => enterRoom(room));
        actions.appendChild(button);
      } else {
        const label = document.createElement('span');
        label.className = 'muted';
        label.textContent = 'No active passengers';
        actions.appendChild(label);
      }
    });
  }

  async function refreshButtons() {
    if (localStorage.getItem('metro_role') !== 'admin') return;
    const list = document.getElementById('adminRooms');
    if (!list) return;
    try { patchRows(await getRooms()); } catch (_) {}
  }

  function start() {
    addStyles();
    refreshButtons();
    if (!refreshTimer) refreshTimer = setInterval(refreshButtons, 1500);
  }

  window.addEventListener('load', start);
  start();
})();
