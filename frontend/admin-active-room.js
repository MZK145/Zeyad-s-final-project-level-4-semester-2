(() => {
  let socket = null;
  let activeRoom = null;
  let refreshTimer = null;

  const apiBase = String(window.BACKEND_URL || location.origin).replace(/\/+$/, '');
  const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

  function installStyles() {
    if (document.getElementById('adminActiveRoomStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminActiveRoomStyles';
    style.textContent = `
      #adminRooms .admin-row { grid-template-columns: minmax(0, 1fr) auto auto auto; }
      #adminRooms .admin-active-room-actions { display:flex; gap:7px; justify-content:flex-end; }
      #adminRooms .admin-active-room-actions .btn { white-space:nowrap; padding:8px 10px; }
      .admin-active-room-panel { margin: 14px 0 18px; padding:22px; border:1px solid var(--line); border-radius:16px; background:linear-gradient(180deg,#101f2d,#09151f); }
      .admin-active-room-panel .panel-head { margin-bottom:16px; }
      .admin-active-room-panel .room-stats { margin-top:10px; }
      .admin-active-room-badge { display:inline-block; margin-left:8px; padding:5px 8px; border-radius:999px; font-size:10px; color:#8fe6bd; background:#10362a; }
      .admin-active-room-close { margin-top:14px; }
      @media(max-width:650px){ #adminRooms .admin-row { grid-template-columns:1fr; } #adminRooms .admin-active-room-actions { justify-content:flex-start; } }
    `;
    document.head.appendChild(style);
  }

  function getToken() {
    return localStorage.getItem('metro_token') || '';
  }

  async function getRooms() {
    const token = getToken();
    if (!token) return { rooms: [] };
    const response = await fetch(`${apiBase}/api/v1/users/waiting-rooms`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load waiting rooms');
    return data;
  }

  function getPanelHost() {
    const list = document.getElementById('adminRooms');
    if (!list) return null;
    let panel = document.getElementById('adminActiveRoomPanel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'adminActiveRoomPanel';
      panel.className = 'admin-active-room-panel';
      panel.hidden = true;
      list.parentElement?.insertBefore(panel, list);
    }
    return panel;
  }

  function closeRoom() {
    if (socket) {
      try { socket.emit('leaveStation'); } catch (_) {}
      socket.disconnect();
      socket = null;
    }
    activeRoom = null;
    const panel = getPanelHost();
    if (panel) {
      panel.hidden = true;
      panel.innerHTML = '';
    }
  }

  function renderRoom(room) {
    const panel = getPanelHost();
    if (!panel) return;
    panel.hidden = false;
    panel.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="mini">LIVE WAITING ROOM</p>
          <h4>${esc(room.name)} <span class="admin-active-room-badge">ACTIVE</span></h4>
          <span>${esc(room.line)} · ${esc(room.city || '')}</span>
        </div>
        <button id="adminActiveRoomClose" class="btn quiet" type="button">Close room</button>
      </div>
      <div class="room-stats">
        <article><small>Waiting passengers</small><strong id="adminActiveRoomCount">${Number(room.onlinePassengers || 0)}</strong></article>
        <article><small>Room status</small><strong id="adminActiveRoomStatus">${room.active ? 'ACTIVE' : 'EMPTY'}</strong></article>
        <article><small>Station ID</small><strong style="font-size:14px">${esc(room.stationId)}</strong></article>
      </div>
      <div class="room-message">
        <strong>Admin observer</strong>
        <span>You are inside the active passenger room as an observer. You do not increase the passenger count.</span>
      </div>
    `;
    document.getElementById('adminActiveRoomClose')?.addEventListener('click', closeRoom);
  }

  function openRoom(room) {
    if (!room || !room.active || !room.stationId) return;
    closeRoom();
    activeRoom = room;
    renderRoom(room);

    if (typeof window.io !== 'function') return;
    socket = window.io(apiBase, {
      auth: { token: getToken() },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => socket.emit('joinStation', String(room.stationId)));
    socket.on('presenceUpdate', payload => {
      if (!activeRoom || String(payload?.stationId) !== String(activeRoom.stationId)) return;
      const count = Math.max(0, Number(payload?.count) || 0);
      activeRoom.onlinePassengers = count;
      const countEl = document.getElementById('adminActiveRoomCount');
      const statusEl = document.getElementById('adminActiveRoomStatus');
      if (countEl) countEl.textContent = String(count);
      if (statusEl) statusEl.textContent = count > 0 ? 'ACTIVE' : 'EMPTY';
    });
    socket.on('roomCount', payload => {
      if (!activeRoom || String(payload?.stationId) !== String(activeRoom.stationId)) return;
      const count = Math.max(0, Number(payload?.count) || 0);
      const countEl = document.getElementById('adminActiveRoomCount');
      if (countEl) countEl.textContent = String(count);
    });
    socket.on('connect_error', () => {
      const statusEl = document.getElementById('adminActiveRoomStatus');
      if (statusEl) statusEl.textContent = 'OFFLINE';
    });
  }

  function patchRows(rooms) {
    const list = document.getElementById('adminRooms');
    if (!list) return;
    const roomByName = new Map(rooms.map(room => [String(room.name), room]));

    list.querySelectorAll('.admin-row').forEach(row => {
      const name = row.querySelector('strong')?.textContent?.trim();
      const room = roomByName.get(name);
      if (!room) return;

      let actions = row.querySelector('.admin-active-room-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'admin-active-room-actions';
        row.appendChild(actions);
      }
      actions.innerHTML = '';

      if (room.active) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn primary';
        button.textContent = 'Enter active room';
        button.addEventListener('click', () => openRoom(room));
        actions.appendChild(button);
      }
    });
  }

  async function refresh() {
    if (localStorage.getItem('metro_role') !== 'admin') return;
    const list = document.getElementById('adminRooms');
    if (!list) return;
    try {
      const data = await getRooms();
      patchRows(data.rooms || []);
      if (activeRoom) {
        const current = (data.rooms || []).find(room => String(room.stationId) === String(activeRoom.stationId));
        if (current) {
          activeRoom = current;
          const countEl = document.getElementById('adminActiveRoomCount');
          const statusEl = document.getElementById('adminActiveRoomStatus');
          if (countEl) countEl.textContent = String(current.onlinePassengers || 0);
          if (statusEl) statusEl.textContent = current.active ? 'ACTIVE' : 'EMPTY';
        }
      }
    } catch (_) {}
  }

  function start() {
    installStyles();
    refresh();
    if (!refreshTimer) refreshTimer = window.setInterval(refresh, 1200);
  }

  window.addEventListener('load', start);
  start();
})();
