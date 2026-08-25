(() => {
  function addActiveRoomButtons() {
    if (typeof state === 'undefined' || state.role !== 'admin') return;
    const list = document.getElementById('adminRooms');
    if (!list) return;

    list.querySelectorAll('.admin-row').forEach(row => {
      const status = row.querySelector('em');
      const name = row.querySelector('strong')?.textContent?.trim();
      if (!status || status.textContent.trim() !== 'ACTIVE' || !name) return;
      if (row.querySelector('[data-enter-active-room]')) return;

      const station = state.stations.find(item => item.name === name);
      if (!station) return;

      const actions = row.querySelector('.row-actions') || (() => {
        const holder = document.createElement('div');
        holder.className = 'row-actions';
        row.appendChild(holder);
        return holder;
      })();

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn primary';
      button.dataset.enterActiveRoom = String(station._id);
      button.textContent = 'Enter active room';
      button.addEventListener('click', () => {
        if (typeof openAdminRoom === 'function') {
          openAdminRoom(String(station._id));
        }
      });
      actions.appendChild(button);
    });
  }

  function start() {
    addActiveRoomButtons();
    const list = document.getElementById('adminRooms');
    if (!list || list.dataset.activeRoomObserver === '1') return;
    list.dataset.activeRoomObserver = '1';
    new MutationObserver(addActiveRoomButtons).observe(list, { childList: true, subtree: true });
  }

  window.addEventListener('load', start);
  window.setInterval(addActiveRoomButtons, 1000);
  start();
})();
