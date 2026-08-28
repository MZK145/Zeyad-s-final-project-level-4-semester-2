(() => {
  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getState() {
    try {
      return typeof state !== 'undefined' ? state : null;
    } catch (_) {
      return null;
    }
  }

  function getOpenStation() {
    const appState = getState();
    if (appState?.role !== 'admin') return null;

    const adminRoomId = appState?.adminRoom?.stationId;
    if (adminRoomId && Array.isArray(appState.stations)) {
      return appState.stations.find(s => String(s._id) === String(adminRoomId)) || null;
    }

    const detail = document.getElementById('adminRoomDetail');
    if (!detail) return null;
    const heading = detail.querySelector('.panel-head h4, h4');
    const name = heading?.textContent?.trim();
    if (!name || !Array.isArray(appState?.stations)) return null;
    return appState.stations.find(s => String(s.name).trim() === name) || null;
  }

  function installStyles() {
    if (document.getElementById('adminRoomControlsStyles')) return;
    const style = document.createElement('style');
    style.id = 'adminRoomControlsStyles';
    style.textContent = `
      #adminRoomDetail .admin-room-control-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
      #adminRoomDetail .admin-room-edit-btn { border:0; border-radius:9px; padding:9px 13px; cursor:pointer; font-weight:700; color:#fff; background:#8b5cf6; }
      #adminRoomDetail .admin-room-edit-btn:hover { filter:brightness(1.08); }
      #adminRoomDetail .admin-room-edit-note { margin-top:12px; padding:11px 13px; border:1px solid rgba(139,92,246,.35); border-radius:10px; background:rgba(139,92,246,.08); color:#d8ccff; font-size:13px; }
      @media(max-width:650px){ #adminRoomDetail .admin-room-control-actions { justify-content:flex-start; } }
    `;
    document.head.appendChild(style);
  }

  function enhanceRoom() {
    const appState = getState();
    if (!appState || appState.role !== 'admin') return;

    const detail = document.getElementById('adminRoomDetail');
    if (!detail || detail.hidden) return;

    const station = getOpenStation();
    if (!station) return;

    const header = detail.querySelector('.panel-head');
    if (!header) return;

    let actions = header.querySelector('.admin-room-control-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'admin-room-control-actions';
      header.appendChild(actions);
    }

    if (!actions.querySelector('.admin-room-edit-btn')) {
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'admin-room-edit-btn';
      editButton.innerHTML = `✏️ Edit station`;
      editButton.addEventListener('click', () => {
        const current = getOpenStation() || station;
        if (current && typeof window.editStation === 'function') {
          window.editStation(String(current._id));
        }
      });
      actions.prepend(editButton);
    }

    const message = detail.querySelector('.room-message');
    if (message && !detail.querySelector('.admin-room-edit-note')) {
      const note = document.createElement('div');
      note.className = 'admin-room-edit-note';
      note.innerHTML = `<strong>Admin editing:</strong> changes to ${esc(station.name)} are broadcast live, so passengers already in this waiting room receive the updated station information automatically.`;
      message.parentElement?.insertBefore(note, message.nextSibling);
    }
  }

  function start() {
    installStyles();
    enhanceRoom();
  }

  const observer = new MutationObserver(() => enhanceRoom());

  window.addEventListener('load', () => {
    start();
    const target = document.getElementById('adminRoomDetail');
    if (target) observer.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
  });

  start();
  window.setInterval(enhanceRoom, 500);
})();
