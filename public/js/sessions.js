/* ============================================================================
   sessions.js — Session history: filter / list / paginate / export (Excel/CSV/PDF)
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('sessions');

  const tbody = document.getElementById('tbody');
  const pager = document.getElementById('pager');
  const preset = document.getElementById('preset');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const fDept = document.getElementById('fDept');
  const fYear = document.getElementById('fYear');
  const fStatus = document.getElementById('fStatus');
  const search = document.getElementById('search');
  let page = 1;
  let lastPages = 1;

  async function loadFilters() {
    try {
      const b = await API.get('/settings/public');
      const depts = b.departments || [];
      const years = b.years || [];
      fDept.innerHTML =
        '<option value="">All Depts</option>' + depts.map((d) => `<option>${esc(d)}</option>`).join('');
      fYear.innerHTML =
        '<option value="">All Years</option>' + years.map((y) => `<option>${esc(y)}</option>`).join('');
    } catch (e) {}
  }

  function buildQuery(includePage = true) {
    const q = new URLSearchParams();
    q.set('preset', preset.value);
    if (preset.value === 'custom') {
      if (dateFrom.value) q.set('dateFrom', dateFrom.value);
      if (dateTo.value) q.set('dateTo', dateTo.value);
    }
    q.set('department', fDept.value);
    q.set('year', fYear.value);
    q.set('status', fStatus.value);
    q.set('search', search.value);
    if (includePage) {
      q.set('page', page);
      q.set('limit', 50);
    }
    return q;
  }

  async function load() {
    try {
      const r = await API.get('/sessions?' + buildQuery().toString());
      lastPages = r.pages;
      if (!r.rows.length) {
        tbody.innerHTML =
          '<tr><td colspan="9" class="text-center" style="padding:24px;color:var(--text-soft)">No sessions found.</td></tr>';
      } else {
        tbody.innerHTML = r.rows
          .map(
            (s) => `
          <tr>
            <td data-key="registerNumber">${esc(s.registerNumber)}</td>
            <td data-key="name">${esc(s.name || '—')}</td>
            <td data-key="department">${esc(s.department || '—')}</td>
            <td data-key="year">${esc(s.year || '—')}</td>
            <td data-key="loginTime">${fmtTime(s.loginTime)}</td>
            <td data-key="logoutTime">${s.logoutTime ? fmtTime(s.logoutTime) : '<span style="color:var(--ok);font-weight:700">Active</span>'}</td>
            <td data-key="duration">${s.duration ? fmtDuration(s.duration) : '—'}</td>
            <td data-key="status"><span class="badge ${s.status === 'ACTIVE' ? 'badge-active' : 'badge-completed'}">${esc(s.status)}</span></td>
            <td data-key="date">${esc(s.date)}</td>
          </tr>`
          )
          .join('');
        makeSortable(document.getElementById('tbl'));
      }
      renderPager();
    } catch (e) {
      toast(e.message || 'Failed to load sessions', 'error');
    }
  }

  function renderPager() {
    let html = `<button id="prev" ${page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
    html += `<span style="padding:0 6px;font-weight:700">Page ${page} / ${Math.max(1, lastPages)}</span>`;
    html += `<button id="next" ${page >= lastPages ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button>`;
    pager.innerHTML = html;
    const prev = document.getElementById('prev');
    const next = document.getElementById('next');
    if (prev) prev.onclick = () => { if (page > 1) { page--; load(); } };
    if (next) next.onclick = () => { if (page < lastPages) { page++; load(); } };
  }

  function exportAs(format) {
    const q = buildQuery(false);
    q.set('format', format);
    window.location.href = '/api/sessions/export?' + q.toString();
  }
  document.getElementById('expExcel').onclick = () => exportAs('excel');
  document.getElementById('expCsv').onclick = () => exportAs('csv');
  document.getElementById('expPdf').onclick = () => exportAs('pdf');

  preset.addEventListener('change', () => {
    const custom = preset.value === 'custom';
    dateFrom.classList.toggle('hidden', !custom);
    dateTo.classList.toggle('hidden', !custom);
    page = 1;
    load();
  });
  [dateFrom, dateTo, fDept, fYear, fStatus].forEach((el) =>
    el.addEventListener('change', () => { page = 1; load(); })
  );
  let t;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; load(); }, 300); });

  await loadFilters();
  await load();
})();
