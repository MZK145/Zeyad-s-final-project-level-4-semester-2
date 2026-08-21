const API = window.BACKEND_URL;
let stations = [];
let socket = null;
let selectedOrigin = null;
let selectedDestination = null;
let currentRoom = null;

const $ = (id) => document.getElementById(id);
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('metro_token') || ''}` });

function escapeHtml(value){return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');}
function setMessage(text, error=false){$('authMessage').textContent=text||'';$('authMessage').style.color=error?'#fb7185':'';}

function showApp(role){
  $('authView').hidden=true;$('appView').hidden=false;$('logoutBtn').hidden=false;
  $('sessionBadge').textContent=role==='admin'?'Admin':'Passenger';
  $('welcomeTitle').textContent=role==='admin'?'Admin operations dashboard':'Welcome to your metro dashboard';
  if(role==='admin'){$('passengerHome').hidden=true;$('adminPanel').hidden=false;renderAdmin();}
  connectSocket();
  refreshStations();
}

async function request(path, options={}){
  const res=await fetch(`${API}${path}`,{...options,headers:{...(options.headers||{}),...(localStorage.getItem('metro_token')?authHeaders():{})}});
  const data=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error||'Request failed');
  return data;
}

async function refreshStations(preserve=true){
  const oldGov=$('govSelect').value, oldCity=$('citySelect').value, oldOrigin=$('originSelect').value;
  stations=await request('/api/v1/stations');
  const govs=[...new Set(stations.map(s=>s.governorate))].sort();
  $('govSelect').innerHTML='<option value="">Choose governorate</option>'+govs.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join('');
  if(preserve&&govs.includes(oldGov)){$('govSelect').value=oldGov;populateCities(oldCity,oldOrigin);} else { $('citySelect').innerHTML='<option>Choose a city</option>'; $('citySelect').disabled=true; $('originSelect').innerHTML='<option>Choose a station</option>'; $('originSelect').disabled=true; }
  $('pulseText').textContent=`${stations.length} stations are available across ${[...new Set(stations.map(s=>s.line))].length} lines.`;
  if(currentRoom) syncRoomFromFreshData();
  if(!$('adminPanel').hidden) renderAdmin();
}

function populateCities(restore='',restoreStation=''){
  const gov=$('govSelect').value;
  const cities=[...new Set(stations.filter(s=>s.governorate===gov).map(s=>s.city))].sort();
  $('citySelect').disabled=!gov;$('citySelect').innerHTML='<option value="">Choose city</option>'+cities.map(c=>`<option>${escapeHtml(c)}</option>`).join('');
  if(restore&&cities.includes(restore)){ $('citySelect').value=restore; populateOrigins(restoreStation); }
  else {$('originSelect').disabled=true;$('originSelect').innerHTML='<option value="">Choose origin station</option>';}
}
function populateOrigins(restore=''){
  const gov=$('govSelect').value,city=$('citySelect').value;
  const list=stations.filter(s=>s.governorate===gov&&s.city===city).sort((a,b)=>a.order-b.order);
  $('originSelect').disabled=!city;$('originSelect').innerHTML='<option value="">Choose origin station</option>'+list.map(s=>`<option value="${s._id}">${escapeHtml(s.name)} · ${escapeHtml(s.line)}</option>`).join('');
  if(restore&&list.some(s=>String(s._id)===String(restore))) $('originSelect').value=restore;
}

async function refreshPulse(){await refreshStations();setMessage('Station data refreshed.');}

function connectSocket(){
  if(socket) socket.disconnect();
  socket=io(API,{auth:{token:localStorage.getItem('metro_token')||''},transports:['websocket','polling']});
  socket.on('roomCount',({stationId,count})=>{if(currentRoom&&String(currentRoom.stationId)===String(stationId)){$('roomCount').textContent=String(count);}});
  socket.on('stationsUpdated',async()=>{await refreshStations(true);setMessage('Station changes synchronized across the application.');});
}

function openPlanner(){ $('planner').hidden=false; $('roomPanel').hidden=true; $('destinationStep').hidden=true; $('originStep').hidden=false; $('planner').scrollIntoView({behavior:'smooth'}); }
function closePlanner(){ $('planner').hidden=true; }

function buildDestinationStep(){
  selectedOrigin=stations.find(s=>String(s._id)===String($('originSelect').value));
  if(!selectedOrigin){setMessage('Choose an origin station first.',true);return;}
  const candidates=stations.filter(s=>s.line===selectedOrigin.line&&String(s._id)!==String(selectedOrigin._id)).sort((a,b)=>a.order-b.order);
  $('destinationSelect').innerHTML='<option value="">Choose destination</option>'+candidates.map(s=>`<option value="${s._id}">${escapeHtml(s.name)} · ${escapeHtml(s.city)}</option>`).join('');
  $('originStep').hidden=true;$('destinationStep').hidden=false;
}
function updateRoutePreview(){
  selectedDestination=stations.find(s=>String(s._id)===String($('destinationSelect').value));
  $('routePreview').innerHTML=selectedDestination?`<strong>${escapeHtml(selectedOrigin.name)}</strong> → <strong>${escapeHtml(selectedDestination.name)}</strong><br><small>Line ${escapeHtml(selectedOrigin.line)} · ${Math.abs(selectedDestination.order-selectedOrigin.order)} station stops between the endpoints.</small>`:'Select a destination to preview the route.';
}

function joinWaitingRoom(){
  if(!selectedDestination){setMessage('Select a destination first.',true);return;}
  currentRoom={stationId:selectedOrigin._id,destination:selectedDestination.name};
  socket.emit('joinStation',String(selectedOrigin._id));
  $('planner').hidden=true;$('roomPanel').hidden=false;
  $('roomTitle').textContent=`${selectedOrigin.name} waiting room`;
  $('roomDestination').textContent=selectedDestination.name;
  $('roomHint').textContent=`Live updates are enabled. Changing the station in Admin Console will refresh this room automatically.`;
  $('roomPanel').scrollIntoView({behavior:'smooth'});
}
function leaveRoom(){if(socket)socket.emit('leaveStation');currentRoom=null;$('roomPanel').hidden=true;$('roomSummary').textContent='No room selected.';}
async function syncRoomFromFreshData(){
  if(!currentRoom)return;
  const station=stations.find(s=>String(s._id)===String(currentRoom.stationId));
  if(!station){leaveRoom();return;}
  $('roomTitle').textContent=`${station.name} waiting room`;
  $('roomSummary').textContent=`Watching ${station.name} · ${station.line}`;
}

function renderAdmin(){
  const rows=stations.map(s=>`<div class="station-row"><div><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.city)}, ${escapeHtml(s.governorate)}</small></div><div><small>Line</small><br>${escapeHtml(s.line)}</div><div><small>Arrival</small><br>${escapeHtml(s.arrivalTime||'—')}</div><div><small>Departure</small><br>${escapeHtml(s.departureTime||'—')}</div><div><button class="edit" data-edit="${s._id}">Edit</button> <button class="delete" data-delete="${s._id}">Delete</button></div></div>`).join('');
  $('stationTable').innerHTML=rows||'<p class="message">No stations available.</p>';
  $('stationTable').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editStation(b.dataset.edit));
  $('stationTable').querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteStation(b.dataset.delete));
}

async function editStation(id){
  const s=await request(`/api/v1/stations/${id}`);
  const nextName=prompt('Station name',s.name);if(nextName===null)return;
  const nextLine=prompt('Line',s.line);if(nextLine===null)return;
  const nextCity=prompt('City',s.city);if(nextCity===null)return;
  const nextGov=prompt('Governorate',s.governorate);if(nextGov===null)return;
  const nextOrder=prompt('Order',s.order);if(nextOrder===null)return;
  const nextArrival=prompt('Arrival HH:MM',s.arrivalTime||'00:00');if(nextArrival===null)return;
  const nextDeparture=prompt('Departure HH:MM',s.departureTime||'00:05');if(nextDeparture===null)return;
  await request(`/api/v1/stations/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:nextName.trim(),line:nextLine.trim(),city:nextCity.trim(),governorate:nextGov.trim(),order:Number(nextOrder),arrivalTime:nextArrival.trim(),departureTime:nextDeparture.trim()})});
  setMessage('Station updated. All open views received the change.');
}
async function deleteStation(id){if(!confirm('Delete this station?'))return;await request(`/api/v1/stations/${id}`,{method:'DELETE'});setMessage('Station deleted and synchronized.');}

$('loginTab').onclick=()=>{$('loginTab').classList.add('active');$('signupTab').classList.remove('active');$('loginForm').hidden=false;$('signupForm').hidden=true;setMessage('');};
$('signupTab').onclick=()=>{$('signupTab').classList.add('active');$('loginTab').classList.remove('active');$('signupForm').hidden=false;$('loginForm').hidden=true;setMessage('');};
$('loginForm').onsubmit=async(e)=>{e.preventDefault();try{const d=await request('/api/v1/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('loginEmail').value.trim(),password:$('loginPassword').value})});localStorage.setItem('metro_token',d.token);showApp(d.role);}catch(err){setMessage(err.message,true);}};
$('signupForm').onsubmit=async(e)=>{e.preventDefault();try{await request('/api/v1/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('signupName').value.trim(),email:$('signupEmail').value.trim(),password:$('signupPassword').value})});$('loginTab').click();setMessage('Account created. Sign in to continue.');}catch(err){setMessage(err.message,true);}};
$('logoutBtn').onclick=()=>{localStorage.removeItem('metro_token');if(socket)socket.disconnect();location.reload();};
$('openPlanner').onclick=openPlanner;$('refreshPulse').onclick=refreshPulse;$('openMyRoom').onclick=()=>currentRoom?$('roomPanel').scrollIntoView({behavior:'smooth'}):openPlanner();
$('govSelect').onchange=()=>populateCities();$('citySelect').onchange=()=>populateOrigins();$('toDestination').onclick=buildDestinationStep;$('backOrigin').onclick=()=>{$('destinationStep').hidden=true;$('originStep').hidden=false;};$('destinationSelect').onchange=updateRoutePreview;$('joinRoom').onclick=joinWaitingRoom;$('leaveRoom').onclick=leaveRoom;$('adminRefresh').onclick=refreshStations;
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closePlanner);

(async function bootstrap(){
  if(localStorage.getItem('metro_token')){
    try{const payload=JSON.parse(atob(localStorage.getItem('metro_token').split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));showApp(payload.role||'user');}
    catch{localStorage.removeItem('metro_token');}
  }
})();
