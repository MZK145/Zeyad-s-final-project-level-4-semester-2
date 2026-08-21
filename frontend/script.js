const API = window.BACKEND_URL || location.origin;
const $ = (id) => document.getElementById(id);
const state = { token: localStorage.getItem('metro_token') || '', role: localStorage.getItem('metro_role') || '', stations: [], socket: null, origin: null, destination: null, roomId: null, page: 'home', adminPage: 'dashboard' };

const html = (value) => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const authHeaders = () => state.token ? { Authorization: `Bearer ${state.token}` } : {};
const jsonHeaders = () => ({ 'Content-Type': 'application/json', ...authHeaders() });

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...(options.body ? jsonHeaders() : authHeaders()), ...(options.headers || {}) }, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function notice(text, good = false) { const box = $('authMessage'); if (!box) return; box.textContent = text || ''; box.className = `message${good ? ' good' : ''}`; }
function persist(data) { state.token = data.token; state.role = data.role; localStorage.setItem('metro_token', state.token); localStorage.setItem('metro_role', state.role); }

function setPassengerPage(page) {
  state.page = page;
  document.querySelectorAll('[data-page]').forEach((b) => b.classList.toggle('active', b.dataset.page === page));
  document.querySelectorAll('[data-page-view]').forEach((v) => v.classList.toggle('active', v.dataset.pageView === page));
  if (page === 'journey') renderJourney();
  if (page === 'room') renderRoom();
}
function setAdminPage(page) {
  state.adminPage = page;
  document.querySelectorAll('[data-admin-page]').forEach((b) => b.classList.toggle('active', b.dataset.adminPage === page));
  document.querySelectorAll('[data-admin-view]').forEach((v) => v.classList.toggle('active', v.dataset.adminView === page));
  if (page === 'stations') renderAdminStations();
  if (page === 'rooms') renderAdminRooms();
}
function setConnected(connected) { $('connectionText').textContent = connected ? 'Live connection' : 'Offline'; document.querySelector('.connection span').classList.toggle('off', !connected); $('statusChip').textContent = connected ? (state.role === 'admin' ? 'Admin · Live' : 'Passenger · Live') : 'Offline'; }

function renderOverview() {
  const lines = new Set(state.stations.map(s => s.line)).size;
  $('stationTotal').textContent = state.stations.length;
  $('lineTotal').textContent = lines;
  $('roomTotal').textContent = state.roomId ? (state.stations.find(s => String(s._id) === state.roomId)?.name || '—') : '—';
  $('stationSnapshot').innerHTML = state.stations.slice(0, 8).map(s => `<div class="snapshot-row"><div><strong>${html(s.name)}</strong><span>${html(s.line)} · ${html(s.city)}</span></div><b>${html(s.arrivalTime || '—')}</b></div>`).join('') || '<p class="muted">No stations available.</p>';
}
function governorates() { return [...new Set(state.stations.map(s => s.governorate).filter(Boolean))].sort(); }
function cityOptions(gov) { return [...new Set(state.stations.filter(s => s.governorate === gov).map(s => s.city).filter(Boolean))].sort(); }
function stationOptions(gov, city) { return state.stations.filter(s => s.governorate === gov && s.city === city).sort((a,b) => a.order - b.order); }

function renderJourney() {
  const body = $('journeyBody');
  if (!body) return;
  if (state.journeyStep === 2 && state.origin) {
    const destinations = state.stations.filter(s => s.line === state.origin.line && String(s._id) !== String(state.origin._id)).sort((a,b) => a.order - b.order);
    body.innerHTML = `<div class="route-choice"><div class="route-card"><small>ORIGIN</small><strong>${html(state.origin.name)}</strong><span>${html(state.origin.line)} · ${html(state.origin.city)}</span></div><div class="route-arrow">→</div><label class="route-dest">Destination<select id="destinationSelect"><option value="">Choose destination</option>${destinations.map(s => `<option value="${html(s._id)}">${html(s.name)} · ${html(s.city)}</option>`).join('')}</select></label></div><div class="action-row"><button id="backJourney" class="btn quiet">Back</button><button id="confirmJourney" class="btn primary">Enter waiting room</button></div>`;
    $('journeyTitle').textContent = 'Step 2 — Choose your destination'; $('journeyStep').textContent = '2 / 3';
    $('destinationSelect').value = state.destination ? String(state.destination._id) : '';
    $('destinationSelect').onchange = () => { state.destination = state.stations.find(s => String(s._id) === String($('destinationSelect').value)) || null; };
    $('backJourney').onclick = () => { state.journeyStep = 1; renderJourney(); };
    $('confirmJourney').onclick = () => { if (!state.destination) return notice('Choose a destination first.'); state.journeyStep = 3; joinRoom(); };
    return;
  }
  const oldGov = state.gov || ''; const oldCity = state.city || ''; const oldOrigin = state.origin ? String(state.origin._id) : '';
  body.innerHTML = `<div class="form-grid"><label>Governorate<select id="govSelect"><option value="">Choose governorate</option>${governorates().map(g => `<option value="${html(g)}">${html(g)}</option>`).join('')}</select></label><label>City<select id="citySelect" disabled><option value="">Choose city</option></select></label><label class="full">Origin station<select id="originSelect" disabled><option value="">Choose station</option></select></label></div><div class="action-row"><button id="continueJourney" class="btn primary">Continue</button></div>`;
  $('journeyTitle').textContent = 'Step 1 — Choose your origin'; $('journeyStep').textContent = '1 / 3';
  const gov = $('govSelect'), city = $('citySelect'), origin = $('originSelect'); gov.value = oldGov;
  function updateCities() { const values = cityOptions(gov.value); city.innerHTML = '<option value="">Choose city</option>' + values.map(v => `<option value="${html(v)}">${html(v)}</option>`).join(''); city.disabled = !values.length; city.value = oldCity; updateOrigins(); }
  function updateOrigins() { const values = stationOptions(gov.value, city.value); origin.innerHTML = '<option value="">Choose station</option>' + values.map(s => `<option value="${html(s._id)}">${html(s.name)} · ${html(s.line)}</option>`).join(''); origin.disabled = !values.length; origin.value = oldOrigin; }
  gov.onchange = updateCities; city.onchange = updateOrigins; if (oldGov) updateCities();
  $('continueJourney').onclick = () => { const station = state.stations.find(s => String(s._id) === String(origin.value)); if (!station) return notice('Choose an origin station first.'); state.origin = station; state.gov = station.governorate; state.city = station.city; state.journeyStep = 2; renderJourney(); };
}

async function syncStations(preserve = true) {
  const previous = preserve ? { gov: state.gov, city: state.city, origin: state.origin && String(state.origin._id) } : {};
  state.stations = (await api('/api/v1/stations')).slice().sort((a,b) => a.line.localeCompare(b.line) || a.order - b.order);
  if (previous.origin) state.origin = state.stations.find(s => String(s._id) === previous.origin) || null;
  if (state.destination) state.destination = state.stations.find(s => String(s._id) === String(state.destination._id)) || null;
  state.gov = previous.gov || state.origin?.governorate || ''; state.city = previous.city || state.origin?.city || '';
  renderOverview();
  if (state.role === 'admin') renderAdminDashboard();
  if (state.page === 'journey') renderJourney();
  if (state.roomId) refreshRoomFromStore();
}

function connectSocket() {
  if (!state.token) return;
  state.socket?.disconnect();
  state.socket = io(API, { auth: { token: state.token }, transports: ['websocket','polling'] });
  state.socket.on('connect', () => setConnected(true));
  state.socket.on('disconnect', () => setConnected(false));
  state.socket.on('onlineCount', (count) => { const node = document.querySelector('.stats article:nth-child(3) strong'); if (node) node.textContent = String(count || 0); });
  const onPresence = ({ stationId, count }) => { if (state.roomId && String(stationId) === String(state.roomId)) $('roomCount').textContent = String(count || 0); };
  state.socket.on('roomCount', onPresence); state.socket.on('presenceUpdate', onPresence);
  state.socket.on('stationsUpdated', async () => { await syncStations(true); addRoomFeed('Station data changed. This room is using the refreshed record.'); });
  state.socket.on('announcement', (item) => { if (state.roomId && String(item.stationId) === String(state.roomId)) addRoomFeed(`📢 ${item.message}`); });
}
function addRoomFeed(text) { const feed = $('roomFeed'); if (!feed) return; const el = document.createElement('div'); el.textContent = text; feed.prepend(el); }

function joinRoom() {
  state.roomId = String(state.origin._id);
  state.socket?.emit('joinStation', state.roomId);
  $('roomName').textContent = state.origin.name; $('roomLine').textContent = `${state.origin.line} · ${state.origin.city}`; $('roomDestination').textContent = state.destination?.name || '—'; $('roomArrival').textContent = state.origin.arrivalTime || '—'; $('roomStatus').textContent = 'Connected to station room'; $('roomStatusDetail').textContent = 'Presence updates continue while you stay on this page.'; $('roomView').hidden = false; $('noRoom').hidden = true;
  addRoomFeed(`Joined ${state.origin.name}.`); setPassengerPage('room');
}
function refreshRoomFromStore() { const station = state.stations.find(s => String(s._id) === state.roomId); if (!station) return leaveRoom(); state.origin = station; $('roomName').textContent = station.name; $('roomLine').textContent = `${station.line} · ${station.city}`; $('roomArrival').textContent = station.arrivalTime || '—'; $('roomTotal').textContent = station.name; }
function leaveRoom() { state.socket?.emit('leaveStation'); state.roomId = null; state.origin = null; state.destination = null; $('roomView').hidden = true; $('noRoom').hidden = false; $('roomTotal').textContent = '—'; setPassengerPage('home'); }

function renderAdminDashboard() { const active = $('adminActiveRooms'); const lines = new Set(state.stations.map(s => s.line)).size; $('adminStationTotal').textContent = state.stations.length; $('adminLineTotal').textContent = lines; $('adminSummary').innerHTML = `<p>${state.stations.length} stations across ${lines} lines are currently stored in the live database.</p><p class="muted">Station edits broadcast a synchronization event so passenger views refresh without losing their selected route.</p>`; if (active) active.textContent = active.textContent || '0'; }
async function renderAdminRooms() { try { const data = await api('/api/v1/users/waiting-rooms'); $('adminActiveRooms').textContent = String(data.activeRooms || 0); $('adminRooms').innerHTML = (data.rooms || []).map(r => `<div class="admin-row"><div><strong>${html(r.name)}</strong><span>${html(r.line)} · ${html(r.city || '')}</span></div><b>${Number(r.onlinePassengers || 0)} waiting</b><em class="${r.active ? 'on' : ''}">${r.active ? 'ACTIVE' : 'EMPTY'}</em></div>`).join('') || '<p class="muted">No rooms.</p>'; } catch(e) { $('adminRooms').innerHTML = `<p class="message">${html(e.message)}</p>`; } }
function renderAdminStations() { $('adminStations').innerHTML = state.stations.map(s => `<div class="admin-row station-edit-row"><div><strong>${html(s.name)}</strong><span>${html(s.line)} · ${html(s.city)}, ${html(s.governorate)}</span></div><span>${html(s.arrivalTime || '—')} → ${html(s.departureTime || '—')}</span><div class="row-actions"><button class="btn quiet" data-edit="${s._id}">Edit</button><button class="btn danger" data-delete="${s._id}">Delete</button></div></div>`).join('') || '<p class="muted">No stations.</p>'; $('adminStations').querySelectorAll('[data-edit]').forEach(b => b.onclick = () => editStation(b.dataset.edit)); $('adminStations').querySelectorAll('[data-delete]').forEach(b => b.onclick = () => removeStation(b.dataset.delete)); }
async function editStation(id) { const s = state.stations.find(x => String(x._id) === String(id)); if (!s) return; const next = { name: prompt('Station name', s.name), line: prompt('Line', s.line), order: Number(prompt('Order', s.order)), governorate: prompt('Governorate', s.governorate), city: prompt('City', s.city), arrivalTime: prompt('Arrival HH:MM', s.arrivalTime || '00:00'), departureTime: prompt('Departure HH:MM', s.departureTime || '00:05') }; if (Object.values(next).some(v => v === null)) return; await api(`/api/v1/stations/${id}`, { method: 'PUT', body: JSON.stringify(next) }); await syncStations(true); }
async function removeStation(id) { if (!confirm('Delete this station permanently?')) return; await api(`/api/v1/stations/${id}`, { method: 'DELETE' }); if (state.roomId === String(id)) leaveRoom(); await syncStations(true); }
async function addStation() { const station = { name: prompt('Station name'), line: prompt('Line', 'Line 1'), order: Number(prompt('Order', '1')), governorate: prompt('Governorate', 'Cairo'), city: prompt('City', 'Cairo'), arrivalTime: prompt('Arrival', '00:00'), departureTime: prompt('Departure', '00:05') }; if (!station.name) return; await api('/api/v1/stations', { method: 'POST', body: JSON.stringify(station) }); await syncStations(false); }

async function showWorkspace(data) { persist(data); $('authView').hidden = true; $('appView').hidden = false; $('logoutBtn').hidden = false; $('statusChip').textContent = data.role === 'admin' ? 'Admin' : 'Passenger'; $('welcomeTitle').textContent = data.role === 'admin' ? 'MetroFlow Admin' : 'Welcome to MetroFlow'; $('passengerApp').hidden = data.role === 'admin'; $('adminApp').hidden = data.role !== 'admin'; connectSocket(); await syncStations(false); if (data.role === 'admin') setAdminPage('dashboard'); else setPassengerPage('home'); }
async function login(e) { e.preventDefault(); try { await showWorkspace(await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: $('loginEmail').value.trim(), password: $('loginPassword').value }) })); } catch (e) { notice(e.message); } }
async function signup(e) { e.preventDefault(); try { await api('/api/v1/auth/signup', { method: 'POST', body: JSON.stringify({ name: $('signupName').value.trim(), email: $('signupEmail').value.trim(), password: $('signupPassword').value }) }); $('signupForm').hidden = true; $('loginForm').hidden = false; document.querySelector('[data-auth="login"]').click(); notice('Account created. Sign in to continue.', true); } catch (e) { notice(e.message); } }
function logout() { state.socket?.disconnect(); localStorage.removeItem('metro_token'); localStorage.removeItem('metro_role'); location.reload(); }

$('loginForm').onsubmit = login; $('signupForm').onsubmit = signup; $('logoutBtn').onclick = logout;
document.querySelectorAll('[data-auth]').forEach(btn => btn.onclick = () => { document.querySelectorAll('[data-auth]').forEach(x => x.classList.toggle('active', x === btn)); $('loginForm').hidden = btn.dataset.auth !== 'login'; $('signupForm').hidden = btn.dataset.auth !== 'signup'; notice(''); });
document.querySelectorAll('[data-page]').forEach(btn => btn.onclick = () => setPassengerPage(btn.dataset.page));
document.querySelectorAll('[data-admin-page]').forEach(btn => btn.onclick = () => setAdminPage(btn.dataset.adminPage));
$('startJourney').onclick = () => { state.journeyStep = 1; setPassengerPage('journey'); }; $('goJourney').onclick = $('startJourney').onclick; $('refreshStations').onclick = () => syncStations(true); $('leaveRoom').onclick = leaveRoom; $('reloadAdmin').onclick = () => renderAdminStations(); $('newStation').onclick = addStation; $('reloadRooms').onclick = renderAdminRooms;
document.querySelector('[data-admin-page="stations"]').onclick = () => setAdminPage('stations');

(async function boot() { if (!state.token || !state.role) return; try { await showWorkspace({ token: state.token, role: state.role }); } catch { localStorage.clear(); location.reload(); } })();
