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
      #adminRooms .row-actions { display:flex; justify-content:flex-end; align-items:center; gap:8px; }
      #adminRooms .row-actions button { white-space:nowrap; }
      #adminActiveRoomPanel { margin-bottom:18px; }
      #adminActiveRoomPanel .room-info-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-top:14px; }
      #adminActiveRoomPanel .room-info-card { padding:12px 14px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background:rgba(255,255,255,.02); }
      #adminActiveRoomPanel .room-info-card small { display:block; opacity:.7; margin-bottom:5px; }
      #adminActiveRoomPanel .room-info-card strong { display:block; font-size:18px; }
      #adminActiveRoomPanel .room-live-note { margin-top:14px; }
      @media(max-width:800px){ #adminActiveRoomPanel .room-info-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
      @media(max-width:520px){ #adminActiveRoomPanel .room-info-grid { grid-template-columns:1fr; } #adminRooms .row-actions { justify-content:flex-start; } }
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
    const count = Math.max(0, Number(room.onlinePassengers) || 0);
    host.innerHTML = `
      <div class="panel-head">
        <div>
          <p class="mini">LIVE WAITING ROOM</p>
          <h4>${esc(room.name)} <span style="display:inline-block;margin-left:8px;padding:4px 8px;border-radius:999px;background:#10362a;color:#8fe6bd;font-size:10px">ACTIVE</span></h4>
          <span>${esc(room.line)} · ${esc(room.city || '')}</span>
        </div>
        <button id="activeRoomClose" class="btn quiet" type="button">Close room</button>
      </div>
      <div class="room-info-grid">
        <div class="room-info-card"><small>Waiting passengers</small><strong id="activeRoomCount">${count}</strong></div>
        <div class="room-info-card"><small>Room status</small><strong id="activeRoomStatus">${count > 0 ? 'ACTIVE' : 'EMPTY'}</strong></div>
        <div class="room-info-card"><small>Arrival</small><strong id="activeRoomArrival">${esc(room.arrivalTime || '—')}</strong></div>
        <div class="room-info-card"><small>Departure</small><strong id="activeRoomDeparture">${esc(room.departureTime || '—')}</strong></div>
      </div>
      <div class="room-message room-live-note">
        <strong>Live admin view</strong>
        <span>Station: ${esc(room.name)} · ${esc(room.city || '—')} · ${esc(room.line || '—')}</span>
        <span>Passenger count updates automatically when users enter or leave this room.</span>
      </div>
    `;
    document.getElementById('activeRoomClose')?.addEventListener('click', closeRoom);
  }

  function enter(room) {
    if (!room || !room.active) return;
    closeRoom();
    currentRoom = { ...room };
    renderRoom(currentRoom);
    if (typeof window.io !== 'function') return;

    roomSocket = window.io(API, {
      auth: { token: token() },
      transports: ['websocket', 'polling']
    });

    roomSocket.on('connect', () => {
      roomSocket.emit('joinStation', String(currentRoom.stationId));
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

    const roomById = new Map(rooms.map(room => [String(room.stationId), room]));

    list.querySelectorAll('.admin-row').forEach(row => {
      const button = row.querySelector('.row-actions button[data-open-room], .row-actions button[data-open-room]');
      const name = row.querySelector('strong')?.textContent?.trim();
      const room = rooms.find(item => String(item.name).trim() === String(name).trim());
      const target = button || row.querySelector('.row-actions button');
      if (!target || !room) return;

      target.onclick = null;
      target.replaceWith(target.cloneNode(true));
      const action = row.querySelector('.row-actions button');
      action.type = 'button';

      if (room.active) {
        action.disabled = false;
        action.className = 'btn primary';
        action.textContent = 'Enter active room';
        action.title = 'Open the live waiting room as an admin observer';
        action.onclick = () => enter(room);
      } else {
        action.disabled = true;
        action.className = 'btn quiet';
        action.textContent = 'No active users';
        action.title = 'This waiting room has no passengers';
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
