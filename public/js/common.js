/* ============================================================================
   common.js — shared helpers for every page (Home + Admin)
   Provides: API client, toast notifications, spinner, admin sidebar layout.
   ============================================================================ */

const API = {
  async request(method, url, body, isForm = false) {
    const opts = { method, headers: {} };
    if (body !== undefined) {
      if (isForm) {
        opts.body = body; // FormData
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch('/api' + url, opts);
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (!res.ok) {
      const err = new Error(data.message || ('Request failed (' + res.status + ')'));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },
  get: (u) => API.request('GET', u),
  post: (u, b) => API.request('POST', u, b),
  put: (u, b) => API.request('PUT', u, b),
  del: (u) => API.request('DELETE', u),
  postForm: (u, form) => API.request('POST', u, form, true),
};

/** Toast notifications. type: success|error|info|warn */
function toast(message, type = 'info', timeout = 3500) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info', warn: 'fa-triangle-exclamation' };
  el.innerHTML = `<i class="fa-solid ${icons[type] || 'fa-circle-info'}"></i><span></span>`;
  el.querySelector('span').textContent = message;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; setTimeout(() => el.remove(), 250); }, timeout);
}

/** Small loading spinner HTML. */
function spinnerHtml() {
  return '<div class="spinner-center"><span class="spinner"></span></div>';
}

/** Escape HTML for safe interpolation into innerHTML. */
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/* ---------------- Modal close (shared) ----------------
   Any .modal-overlay is dismissed by: Esc, clicking the dark
   backdrop, or a [data-close] element (e.g. an × button). */
function closeTopModal() {
  const open = document.querySelector('.modal-overlay.show');
  if (open) open.classList.remove('show');
}
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeTopModal();
});
document.addEventListener('click', (e) => {
  if (e.target.classList && e.target.classList.contains('modal-overlay')) closeTopModal();
  const closer = e.target.closest('[data-close]');
  if (closer) { e.preventDefault(); closeTopModal(); }
});

/* ---------------- Admin layout (sidebar + topbar) ---------------- */
const AdminLayout = {
  /** Inject the responsive sidebar + topbar into #sidebar / #topbar slots. */
  mount(active) {
    const sidebar = document.getElementById('sidebar');
    const topbar = document.getElementById('topbar');
    if (sidebar) {
      sidebar.innerHTML = `
        <div class="side-brand">
          <div class="side-logo"><i class="fa-solid fa-graduation-cap"></i></div>
          <div>
            <div class="side-title" id="sideUniversity">Lab Register</div>
            <div class="side-sub">Admin Panel</div>
          </div>
        </div>
        <nav class="side-nav">
          <a href="/admin/dashboard" class="${active==='dashboard'?'active':''}"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>
          <a href="/admin/students" class="${active==='students'?'active':''}"><i class="fa-solid fa-users"></i> Students</a>
          <a href="/admin/sessions" class="${active==='sessions'?'active':''}"><i class="fa-solid fa-clock-rotate-left"></i> Sessions</a>
          <a href="/admin/active" class="${active==='active'?'active':''}"><i class="fa-solid fa-person-walking"></i> Active Now</a>
          <a href="/admin/reports" class="${active==='reports'?'active':''}"><i class="fa-solid fa-chart-pie"></i> Reports</a>
          <a href="/admin/backup" class="${active==='backup'?'active':''}"><i class="fa-solid fa-database"></i> Backup</a>
          <a href="/admin/settings" class="${active==='settings'?'active':''}"><i class="fa-solid fa-gear"></i> Settings</a>
        </nav>
        <div class="side-foot">
          <a href="/" class="side-home"><i class="fa-solid fa-house"></i> Kiosk Home</a>
          <button id="logoutBtn" class="side-logout"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>
        </div>`;
      const lb = document.getElementById('logoutBtn');
      if (lb) lb.addEventListener('click', async () => {
        try { await API.post('/auth/logout'); } catch (e) {}
        location.href = '/admin';
      });
    }
    if (topbar) {
      topbar.innerHTML = `
        <button class="side-toggle" id="sideToggle"><i class="fa-solid fa-bars"></i></button>
        <div class="topbar-title" id="pageTitle">${document.title}</div>
        <div class="topbar-right">
          <button class="theme-toggle" id="themeToggle" title="Toggle theme"><i class="fa-solid fa-moon"></i></button>
          <span class="admin-chip"><i class="fa-solid fa-user-shield"></i> <span id="adminName">admin</span></span>
        </div>`;
      const t = document.getElementById('themeToggle');
      if (t) t.addEventListener('click', () => toggleTheme());
    }
    // Mobile sidebar toggle
    const toggle = document.getElementById('sideToggle');
    if (toggle) toggle.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));

    this.applyTheme();
    this.loadBrand();
  },

  async loadBrand() {
    try {
      const b = await API.get('/settings/public');
      const uni = document.getElementById('sideUniversity');
      if (uni && b.universityName) uni.textContent = b.universityName;
      // Server settings are the source of truth for theme (FR-7.2).
      if (b.theme) setTheme(b.theme);
    } catch (e) {}
  },

  applyTheme() {
    const saved = localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(saved);
  },
};

/** Apply a theme everywhere: <html> attribute + persist + toggle-button icon. */
function setTheme(theme) {
  const t = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('theme', t); } catch (e) { /* storage may be unavailable */ }
  const btn = document.getElementById('themeToggle');
  if (btn) btn.innerHTML = t === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

/**
 * Live theme toggle. Applies locally for instant feedback, then persists the
 * choice to the settings table so it survives restart / other browsers (FR-7.2).
 */
function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  setTheme(next);
  API.put('/settings', { theme: next }).catch(() => { /* localhost save; best-effort */ });
}

/** Redirect to login if not authenticated. */
async function requireAdmin() {
  try {
    const r = await API.get('/auth/me');
    if (r.success && r.admin) {
      const el = document.getElementById('adminName');
      if (el) el.textContent = r.admin.username;
      return true;
    }
  } catch (e) {}
  location.href = '/admin';
  return false;
}

/** Format seconds → "1h 23m 4s". */
function fmtDuration(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return [h ? h + 'h' : '', m ? m + 'm' : '', s + 's'].filter(Boolean).join(' ') || '0s';
}

/** Format ISO time to HH:MM:SS local. */
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** Reusable table sort (click headers). */
function makeSortable(table) {
  const ths = table.querySelectorAll('th[data-sort]');
  ths.forEach((th) => th.addEventListener('click', () => {
    const key = th.getAttribute('data-sort');
    const dir = th.classList.toggle('asc') ? 1 : -1;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.sort((a, b) => {
      const va = a.querySelector(`[data-key="${key}"]`)?.textContent || '';
      const vb = b.querySelector(`[data-key="${key}"]`)?.textContent || '';
      return va.localeCompare(vb, undefined, { numeric: true }) * dir;
    });
    rows.forEach((r) => tbody.appendChild(r));
  }));
}
