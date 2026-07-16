/* ============================================================================
   students.js — Student directory: list / search / filter / add / edit / delete / import
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('students');

  const tbody = document.getElementById('tbody');
  const pager = document.getElementById('pager');
  const search = document.getElementById('search');
  const fDept = document.getElementById('fDept');
  const fYear = document.getElementById('fYear');
  const formModal = document.getElementById('formModal');
  let page = 1;
  let lastPages = 1;

  /* ---------- Filters ---------- */
  async function loadFilters() {
    try {
      const b = await API.get('/settings/public');
      const depts = b.departments || [];
      const years = b.years || [];
      fDept.innerHTML =
        '<option value="">All Depts</option>' + depts.map((d) => `<option>${esc(d)}</option>`).join('');
      fYear.innerHTML =
        '<option value="">All Years</option>' + years.map((y) => `<option>${esc(y)}</option>`).join('');
      document.getElementById('f_department').innerHTML = depts
        .map((d) => `<option>${esc(d)}</option>`)
        .join('');
      document.getElementById('f_year').innerHTML = years
        .map((y) => `<option>${esc(y)}</option>`)
        .join('');
    } catch (e) {}
  }

  /* ---------- List ---------- */
  async function load() {
    const q = new URLSearchParams({
      search: search.value,
      department: fDept.value,
      year: fYear.value,
      page,
      limit: 50,
    });
    try {
      const r = await API.get('/students?' + q.toString());
      lastPages = r.pages;
      if (!r.rows.length) {
        tbody.innerHTML =
          '<tr><td colspan="5" class="text-center" style="padding:24px;color:var(--text-soft)">No students found.</td></tr>';
      } else {
        tbody.innerHTML = r.rows
          .map(
            (s) => `
          <tr>
            <td data-key="registerNumber">${esc(s.registerNumber)}</td>
            <td data-key="name">${esc(s.name)}</td>
            <td data-key="department">${esc(s.department)}</td>
            <td data-key="year">${esc(s.year)}</td>
            <td>
              <button class="btn btn-ghost btn-sm" data-edit="${s.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-ghost btn-sm" data-del="${s.id}" title="Delete"><i class="fa-solid fa-trash" style="color:var(--danger)"></i></button>
            </td>
          </tr>`
          )
          .join('');
        makeSortable(document.getElementById('tbl'));
      }
      renderPager();
    } catch (e) {
      toast(e.message || 'Failed to load students', 'error');
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

  /* ---------- Add / Edit ---------- */
  function openAdd() {
    document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-user-plus"></i> Add Student';
    document.getElementById('f_id').value = '';
    document.getElementById('f_registerNumber').value = '';
    document.getElementById('f_registerNumber').disabled = false;
    document.getElementById('f_name').value = '';
    document.getElementById('f_department').selectedIndex = 0;
    document.getElementById('f_year').selectedIndex = 0;
    formModal.classList.add('show');
    setTimeout(() => document.getElementById('f_registerNumber').focus(), 50);
  }

  async function openEdit(id) {
    try {
      const s = await API.get('/students/' + id);
      document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Student';
      document.getElementById('f_id').value = s.id;
      document.getElementById('f_registerNumber').value = s.registerNumber;
      document.getElementById('f_registerNumber').disabled = true;
      document.getElementById('f_name').value = s.name;
      document.getElementById('f_department').value = s.department;
      document.getElementById('f_year').value = s.year;
      formModal.classList.add('show');
    } catch (e) {
      toast(e.message || 'Failed to load student', 'error');
    }
  }

  function closeForm() { formModal.classList.remove('show'); }

  document.getElementById('addBtn').onclick = openAdd;
  document.getElementById('formCancel').onclick = closeForm;

  tbody.addEventListener('click', (e) => {
    const ed = e.target.closest('[data-edit]');
    const del = e.target.closest('[data-del]');
    if (ed) openEdit(ed.getAttribute('data-edit'));
    if (del) removeStudent(del.getAttribute('data-del'));
  });

  async function removeStudent(id) {
    if (!confirm('Delete this student? This cannot be undone.')) return;
    try {
      await API.del('/students/' + id);
      toast('Student deleted', 'success');
      load();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  }

  document.getElementById('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('f_id').value;
    const payload = {
      registerNumber: document.getElementById('f_registerNumber').value.trim().toUpperCase(),
      name: document.getElementById('f_name').value.trim(),
      department: document.getElementById('f_department').value,
      year: document.getElementById('f_year').value,
    };
    if (!payload.registerNumber || !payload.name) { toast('Register number and name are required', 'warn'); return; }
    try {
      if (id) await API.put('/students/' + id, payload);
      else await API.post('/students', payload);
      toast(id ? 'Student updated' : 'Student added', 'success');
      closeForm();
      load();
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    }
  });

  /* ---------- Excel import ---------- */
  document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const r = await API.postForm('/students/import', fd);
      const parts = [`Imported ${r.inserted} student(s)`];
      if (r.duplicates) parts.push(`${r.duplicates} duplicate(s) skipped`);
      if (r.skipped) parts.push(`${r.skipped} invalid row(s)`);
      toast(parts.join(', '), 'success');
      load();
    } catch (err) {
      toast(err.message || 'Import failed', 'error');
    } finally {
      e.target.value = '';
    }
  });

  /* ---------- Wire filters ---------- */
  let t;
  search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { page = 1; load(); }, 300); });
  fDept.addEventListener('change', () => { page = 1; load(); });
  fYear.addEventListener('change', () => { page = 1; load(); });

  await loadFilters();
  await load();
})();
