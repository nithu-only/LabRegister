/* ============================================================================
   home.js — Kiosk Home screen logic (enhanced)
   - Student searches for himself by USN/name (typeahead) and presses Continue.
   - System number is required at login.
   - After login the kiosk shows a live timer + instant "Logout" button.
   - A live footer board shows who is currently inside and who is registered.
   ============================================================================ */

const usnInput = document.getElementById('usn');
const systemInput = document.getElementById('systemNo');
const continueBtn = document.getElementById('continueBtn');
const suggestions = document.getElementById('suggestions');
const loginAs = document.getElementById('loginAs');

const registerModal = document.getElementById('registerModal');
const resultModal = document.getElementById('resultModal');

const entryCard = document.getElementById('entryCard');
const insidePanel = document.getElementById('insidePanel');
const insideName = document.getElementById('insideName');
const insideSys = document.getElementById('insideSys');
const insideTimer = document.getElementById('insideTimer');
const insideDuration = document.getElementById('insideDuration');
const logoutBtn = document.getElementById('logoutBtn');

const insideList = document.getElementById('insideList');
const insideCount = document.getElementById('insideCount');
const availableCount = document.getElementById('availableCount');

const TOTAL_PCS = 28; // number of lab PCs (matches the system-number dropdown)

let currentSession = null; // { uuid, loginTime, name, systemNumber }
let timerInt = null;
let activeRows = [];
let searchT = null;

/* ---------- Branding + departments/years ---------- */
async function loadBranding() {
  try {
    const b = await API.get('/settings/public');
    if (b.universityName) document.getElementById('universityName').textContent = b.universityName;
    if (b.labName) document.getElementById('labName').textContent = b.labName;
    // Reflect the admin-chosen theme on the kiosk (FR-7.2).
    if (b.theme) {
      document.documentElement.setAttribute('data-theme', b.theme === 'dark' ? 'dark' : 'light');
    }
    const dept = document.getElementById('reg_department');
    const year = document.getElementById('reg_year');
    (b.departments || []).forEach((d) => dept.insertAdjacentHTML('beforeend', `<option>${d}</option>`));
    (b.years || []).forEach((y) => year.insertAdjacentHTML('beforeend', `<option>${y}</option>`));
  } catch (e) { /* offline ok */ }
}

/* ---------- Live clock ---------- */
function tickClock() {
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.querySelector('.home-clock .time').textContent = time;
  document.querySelector('.home-clock .date').textContent = date;
}
setInterval(tickClock, 1000); tickClock();

/* ---------- Internet / sync status ---------- */
async function refreshNet() {
  const pill = document.getElementById('netPill');
  const text = document.getElementById('netText');
  const meta = document.getElementById('syncMeta');
  try {
    const s = await API.get('/sync/status');
    if (s.online && s.mongoConnected) {
      pill.className = 'net-pill online';
      text.textContent = 'Online · Cloud Sync Active';
    } else if (s.online) {
      pill.className = 'net-pill online';
      text.textContent = 'Online · Local Only';
    } else {
      pill.className = 'net-pill offline';
      text.textContent = 'Offline · Saving Locally';
    }
    const parts = [];
    if (s.pending > 0) parts.push(`Pending sync: ${s.pending}`);
    if (s.lastSyncedAt) parts.push('Last sync: ' + fmtTime(s.lastSyncedAt));
    meta.textContent = parts.join('  ·  ') || (s.online ? 'All synced' : 'No cloud connection');
  } catch (e) {
    pill.className = 'net-pill offline';
    text.textContent = 'Offline';
    meta.textContent = 'Sync status unavailable';
  }
}
setInterval(refreshNet, 5000); refreshNet();

/* ---------- USN typeahead search ---------- */
async function runSearch() {
  const q = usnInput.value.trim();
  if (q.length < 1) { suggestions.innerHTML = ''; suggestions.classList.remove('show'); return; }
  try {
    const r = await API.get('/students/public-search?q=' + encodeURIComponent(q));
    const rows = r.rows || [];
    if (!rows.length) { suggestions.innerHTML = ''; suggestions.classList.remove('show'); return; }
    suggestions.innerHTML = rows
      .map(
        (s) => `
        <div class="suggestion" data-reg="${esc(s.registerNumber)}">
          <div class="s-name">${esc(s.name)}</div>
          <div class="s-meta">${esc(s.registerNumber)} · ${esc(s.department || '')}</div>
        </div>`
      )
      .join('');
    suggestions.classList.add('show');
  } catch (e) {
    suggestions.innerHTML = ''; suggestions.classList.remove('show');
  }
}
usnInput.addEventListener('input', () => {
  clearTimeout(searchT);
  loginAs.classList.add('hidden');
  loginAs.textContent = '';
  searchT = setTimeout(runSearch, 250);
});
suggestions.addEventListener('click', (e) => {
  const item = e.target.closest('.suggestion');
  if (!item) return;
  usnInput.value = item.getAttribute('data-reg');
  const nameEl = item.querySelector('.s-name');
  if (nameEl) {
    loginAs.textContent = 'Logging in as: ' + nameEl.textContent;
    loginAs.classList.remove('hidden');
  }
  suggestions.innerHTML = '';
  suggestions.classList.remove('show');
  systemInput.focus();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.usn-search')) suggestions.classList.remove('show');
});

/* ---------- Core transaction ---------- */
async function submitUsn() {
  const raw = usnInput.value.trim().toUpperCase();
  if (!raw) { usnInput.focus(); return; }
  const sys = systemInput.value.trim();
  if (!sys) { toast('Please enter the system number', 'warn'); systemInput.focus(); return; }

  continueBtn.disabled = true;
  try {
    const res = await API.post('/sessions/transaction', { registerNumber: raw, systemNumber: sys });
    if (!res.success) { toast(res.error || res.message || 'Error', 'error'); return; }

    if (res.action === 'register') {
      openRegister(res.registerNumber);
    } else if (res.action === 'login') {
      showLoginSuccess(res.student);
      resetEntry();
      refreshActive();
    } else if (res.action === 'already-in') {
      showAlreadyIn(res.student, res.session.uuid);
    } else if (res.action === 'logout') {
      // Fallback: server still auto-logs-out (e.g. not yet restarted).
      showResult('logout', res.student, 'Logout Successful', res.durationText);
      resetEntry();
    }
  } catch (e) {
    toast(e.message || 'Something went wrong', 'error');
  } finally {
    continueBtn.disabled = false;
  }
}

continueBtn.addEventListener('click', submitUsn);
usnInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitUsn(); } });
systemInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitUsn(); } });

/* ---------- Inside panel (logged in on this kiosk) ---------- */
function enterInside(student, session) {
  currentSession = {
    uuid: session.uuid,
    loginTime: session.loginTime,
    name: student ? student.name : session.registerNumber,
    systemNumber: session.systemNumber,
  };
  insideName.textContent = currentSession.name;
  insideSys.textContent = currentSession.systemNumber || '—';
  insideDuration.textContent = '';
  entryCard.classList.add('hidden');
  insidePanel.classList.remove('hidden');
  usnInput.value = '';
  systemInput.value = '';
  suggestions.classList.remove('show');
  startTimer();
  refocus();
}

function startTimer() {
  stopTimer();
  const tick = () => {
    const sec = Math.floor((Date.now() - new Date(currentSession.loginTime)) / 1000);
    insideTimer.textContent = fmtDuration(sec);
  };
  tick();
  timerInt = setInterval(tick, 1000);
}
function stopTimer() {
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
}

logoutBtn.addEventListener('click', async () => {
  if (!currentSession) return;
  logoutBtn.disabled = true;
  try {
    const res = await API.post('/sessions/logout', { uuid: currentSession.uuid });
    if (res.success) {
      stopTimer();
      showResult('logout', { name: currentSession.name }, 'Logout Successful', res.durationText);
    } else {
      toast(res.error || 'Logout failed', 'error');
    }
  } catch (e) {
    toast(e.message || 'Logout failed', 'error');
  } finally {
    logoutBtn.disabled = false;
    resetEntry();
  }
});

function resetEntry() {
  stopTimer();
  currentSession = null;
  insidePanel.classList.add('hidden');
  entryCard.classList.remove('hidden');
  usnInput.value = '';
  systemInput.value = '';
  loginAs.classList.add('hidden');
  loginAs.textContent = '';
  refocus();
}

/* ---------- Registration modal ---------- */
function openRegister(registerNumber) {
  document.getElementById('reg_registerNumber').value = registerNumber;
  document.getElementById('reg_registerNumberShow').value = registerNumber;
  document.getElementById('regUsn').textContent = registerNumber;
  document.getElementById('reg_name').value = '';
  registerModal.classList.add('show');
  setTimeout(() => document.getElementById('reg_name').focus(), 50);
}
function closeRegister() { registerModal.classList.remove('show'); refocus(); }

document.getElementById('regCancel').addEventListener('click', closeRegister);

document.getElementById('registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    registerNumber: document.getElementById('reg_registerNumber').value,
    name: document.getElementById('reg_name').value.trim(),
    department: document.getElementById('reg_department').value,
    year: document.getElementById('reg_year').value,
    systemNumber: systemInput.value.trim(),
  };
  if (!payload.name) { toast('Name is required', 'warn'); return; }
  if (!payload.systemNumber) { toast('System number is required', 'warn'); systemInput.focus(); return; }
  try {
    const res = await API.post('/students/register', payload);
    registerModal.classList.remove('show');
    if (res.action === 'login') {
      showLoginSuccess(res.student);
      resetEntry();
      refreshActive();
    }
  } catch (err) {
    toast(err.message || 'Registration failed', 'error');
  }
});

/* ---------- Result modal ---------- */
function showResult(type, student, msg, durationText, countdownPrefix) {
  const icon = document.getElementById('resultIcon');
  const nameEl = document.getElementById('resultName');
  const msgEl = document.getElementById('resultMsg');
  const durEl = document.getElementById('resultDuration');
  const cdEl = document.getElementById('resultCountdown');

  icon.className = 'result-icon ' + (type === 'logout' ? 'result-logout' : 'result-login');
  icon.innerHTML = type === 'logout'
    ? '<i class="fa-solid fa-right-from-bracket"></i>'
    : '<i class="fa-solid fa-circle-check"></i>';
  nameEl.textContent = student ? student.name : '';
  msgEl.textContent = msg;
  if (durationText) { durEl.classList.remove('hidden'); durEl.textContent = 'Time spent: ' + durationText; }
  else durEl.classList.add('hidden');

  resultModal.classList.add('show');

  const prefix = countdownPrefix || 'Returning to home in ';
  let count = 3;
  cdEl.textContent = `${prefix}${count}s…`;
  clearInterval(resultTimer);
  resultTimer = setInterval(() => {
    count--;
    if (count <= 0) { clearInterval(resultTimer); closeResult(); }
    else cdEl.textContent = `${prefix}${count}s…`;
  }, 1000);
}

/* ---------- Login success popup ---------- */
function showLoginSuccess(student) {
  showResult('login', student, 'Login Successful to the System', null, 'Closing in ');
}

function closeResult() {
  resultModal.classList.remove('show');
  refocus();
}
function refocus() { setTimeout(() => usnInput.focus(), 50); usnInput.select(); }

let resultTimer = null;

/* ---------- Already-logged-in confirmation ---------- */
const alreadyInModal = document.getElementById('alreadyInModal');
let alreadyInUuid = null;
let alreadyInName = '';

function showAlreadyIn(student, uuid) {
  alreadyInUuid = uuid || null;
  alreadyInName = student ? student.name : '';
  document.getElementById('alreadyInName').textContent = alreadyInName;
  alreadyInModal.classList.add('show');
}
function closeAlreadyIn() {
  alreadyInModal.classList.remove('show');
  alreadyInUuid = null;
  alreadyInName = '';
  refocus();
}
document.getElementById('alreadyInNo').addEventListener('click', () => {
  // Keep the student logged in.
  closeAlreadyIn();
  resetEntry();
});
document.getElementById('alreadyInYes').addEventListener('click', async () => {
  const uuid = alreadyInUuid;
  const name = alreadyInName;
  closeAlreadyIn();
  if (!uuid) { resetEntry(); return; }
  try {
    const res = await API.post('/sessions/logout', { uuid });
    if (res.success) {
      showResult('logout', { name }, 'Logout Successful', res.durationText);
    } else {
      toast(res.error || 'Logout failed', 'error');
    }
  } catch (e) {
    toast(e.message || 'Logout failed', 'error');
  } finally {
    resetEntry();
    refreshActive();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (registerModal.classList.contains('show')) closeRegister();
    if (resultModal.classList.contains('show')) { clearInterval(resultTimer); closeResult(); }
    if (alreadyInModal.classList.contains('show')) closeAlreadyIn();
  }
});

/* ---------- Footer live board ---------- */
async function refreshActive() {
  try {
    const r = await API.get('/sessions/active');
    activeRows = r.rows || [];
    insideCount.textContent = activeRows.length;
    if (availableCount) availableCount.textContent = Math.max(0, TOTAL_PCS - activeRows.length);
    renderActive();
  } catch (e) { /* ignore */ }
}
function renderActive() {
  if (!activeRows.length) {
    insideList.innerHTML = '<div class="board-empty">No one inside right now.</div>';
    return;
  }
  insideList.innerHTML = activeRows
    .map((s) => {
      const sec = Math.floor((Date.now() - new Date(s.loginTime)) / 1000);
      return `
      <div class="board-row">
        <div class="br-main"><b>${esc(s.name || s.registerNumber)}</b><span class="br-sub">Sys ${esc(s.systemNumber || '—')}</span></div>
        <div class="br-right">
          <span class="br-time" data-login="${esc(s.loginTime)}">${fmtDuration(sec)}</span>
          <button class="br-logout" data-uuid="${esc(s.uuid)}" title="Logout"><i class="fa-solid fa-right-from-bracket"></i></button>
        </div>
      </div>`;
    })
    .join('');
}
// Tick durations every second without refetching.
setInterval(() => {
  if (!activeRows.length) return;
  insideList.querySelectorAll('.br-time').forEach((el) => {
    const sec = Math.floor((Date.now() - new Date(el.getAttribute('data-login'))) / 1000);
    el.textContent = fmtDuration(sec);
  });
}, 1000);
// Logout directly from the board.
insideList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.br-logout');
  if (!btn) return;
  const uuid = btn.getAttribute('data-uuid');
  try {
    const res = await API.post('/sessions/logout', { uuid });
    if (res.success) toast(res.durationText ? 'Logged out · ' + res.durationText : 'Logged out', 'success');
    else toast(res.error || 'Logout failed', 'error');
  } catch (err) { toast(err.message || 'Logout failed', 'error'); }
  refreshActive();
});

setInterval(refreshActive, 5000);

/* ---------- System number options (PC-01 … PC-28) ---------- */
function populateSystemOptions() {
  const dl = document.getElementById('systemList');
  if (!dl) return;
  let html = '';
  for (let i = 1; i <= TOTAL_PCS; i++) {
    const label = 'PC-' + String(i).padStart(2, '0');
    html += `<option value="${label}"></option>`;
  }
  dl.innerHTML = html;
}

/* ---------- Init ---------- */
loadBranding();
populateSystemOptions();
refocus();
refreshActive();
