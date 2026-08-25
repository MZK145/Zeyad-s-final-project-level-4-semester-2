(() => {
  let roomSocket = null;
  let currentRoom = null;
  let timer = null;

  const API = String(window.BACKEND_URL || location.origin).replace(/\/+$/, '');
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function addStyles() {
    if (document.getElementById('activeRoomEntryStyles')) return;
    const style = document.createElement('style');
    style.id = 'activeRoomEntryStyles';
    style.textContent = `
      #adminRooms .admin-row { grid-template-columns: minmax(0,1fr) auto auto auto; }
      #adminRooms .active-room-actions { display:flex; justify-content:flex-end; gap:8px; }
      #adminRooms .active-room-actions button { white-space:nowrap; }
      #adminActiveRoomPanel { margin-bottom:18px; }
      @media(max-width:650px){ #adminRooms .admin-row { grid-template-columns:1fr; } #adminRooms .active-room-actions { justify-content:flex-start; } }
    `;
    document.head.appendChild(style);
  }

  function token() {
    return localStorage.getItem('metro_token') || '';
  }

  async function loadRooms() {
    const response = await fetch(`${API}/api/v1/users/waiting-rooms`, {
      headers: { Authorization: `Bearer ${token()}` },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load waiting rooms');
    return data.rooms || [];
  }

  function panel() {
    const list = document.getElementById('adminRooms');
    if (!list) return null;
    let host = document.getElementById('adminActiveRoomPanel');
    if (!host) {
      host = document.createElement('div');
      host.id = 'adminActiveRoomPanel';
      host.className = 'panel';
      host.hidden = true;
      list.parentElement?.insertBefore(host, list);
    }
    return host;
  }

  function closeRoom() {
    if (roomSocket) {
      try { roomSocket.emit('leaveStation'); } catch (_) {}
      roomSocket.disconnect();
      roomSocket = null;
    }
    currentRoom = null;
    const host = panel();
    if (host) { host.hidden = true; host.innerHTML = ''; }
  }

  function renderRoom(room) {
    const host = panel();
    if (!host) return;
    host.hidden = false;
    host.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="mini">LIVE WAITING ROOM</p>
          <h4>${esc(room.name)} <span style="display:inline-block;margin-left:8px;padding:4px 8px;border-radius:999px;background:#10362a;color:#8fe6bd;font-size:10px">ACTIVE</span></h4>
          <span>${esc(room.line)} · ${esc(room.city || '')}</span>
        </div>
        <button id="activeRoomClose" class="btn quiet" type="button">Close room</button>
      </div>
      <div class="room-stats">
        <article><small>Waiting passengers</small><strong id="activeRoomCount">${Number(room.onlinePassengers || 0)}</strong></article>
        <article><small>Room status</small><strong id="activeRoomStatus">${Number(room.onlinePassengers || 0) > 0 ? 'ACTIVE' : 'EMPTY'}</strong></article>
        <article><small>Arrival</small><strong>${esc(room.arrivalTime || '—')}</strong></article>
      </div>
      <div class="room-message">
        <strong>Admin is inside the room</strong>
        <span>Read-only observer mode. The admin does not increase the passenger count.</span>
      </div>
    `;
    document.getElementById('activeRoomClose')?.addEventListener('click', closeRoom);
  }

  function enter(room) {
    if (!room || !room.active) return;
    closeRoom();
    currentRoom = room;
    renderRoom(room);
    if (typeof window.io !== 'function') return;

    roomSocket = window.io(API, {
      auth: { token: token() },
      transports: ['websocket', 'polling']
    });

    roomSocket.on('connect', () => {
      roomSocket.emit('joinStation', String(room.stationId));
    });

    const updateCount = payload => {
      if (!currentRoom || String(payload?.stationId) !== String(currentRoom.stationId)) return;
      const count = Math.max(0, Number(payload?.count) || 0);
      currentRoom.onlinePassengers = count;
      const countEl = document.getElementById('activeRoomCount');
      const statusEl = document.getElementById('activeRoomStatus');
      if (countEl) countEl.textContent = String(count);
      if (statusEl) statusEl.textContent = count > 0 ? 'ACTIVE' : 'EMPTY';
    };

    roomSocket.on('presenceUpdate', updateCount);
    roomSocket.on('roomCount', updateCount);
  }

  function patchRows(rooms) {
    const list = document.getElementById('adminRooms');
    if (!list) return;
    const byName = new Map(rooms.map(room => [String(room.name), room]));

    list.querySelectorAll('.admin-row').forEach(row => {
      const name = row.querySelector('strong')?.textContent?.trim();
      const room = byName.get(name);
      if (!room) return;

      let actions = row.querySelector('.active-room-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'active-room-actions';
        row.appendChild(actions);
      }
      actions.innerHTML = '';

      if (room.active) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn primary';
        button.textContent = 'Enter active room';
        button.addEventListener('click', () => enter(room));
        actions.appendChild(button);
      }
    });
  }

  async function refresh() {
    if (localStorage.getItem('metro_role') !== 'admin') return;
    const list = document.getElementById('adminRooms');
    if (!list) return;
    try {
      patchRows(await loadRooms());
    } catch (_) {}
  }

  function start() {
    addStyles();
    refresh();
    if (!timer) timer = setInterval(refresh, 1000);
  }

  window.addEventListener('load', start);
  start();
})();
