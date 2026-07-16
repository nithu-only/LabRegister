/* ============================================================================
   reports.js — Attendance roll-up (days present / visits / hours) + CSV export
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('reports');

  const tbody = document.getElementById('tbody');
  const summary = document.getElementById('summary');
  const preset = document.getElementById('preset');
  const fDept = document.getElementById('fDept');
  const fYear = document.getElementById('fYear');
  const regNo = document.getElementById('regNo');

  let current = []; // last loaded rows, for CSV export

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

  async function load() {
    const q = new URLSearchParams({
      preset: preset.value,
      department: fDept.value,
      year: fYear.value,
      registerNumber: regNo.value.trim().toUpperCase(),
    });
    try {
      const r = await API.get('/reports/attendance?' + q.toString());
      current = r.data || [];
      if (!current.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center" style="padding:24px;color:var(--text-soft)">No attendance records for this range.</td></tr>';
        summary.innerHTML = '';
        return;
      }
      tbody.innerHTML = current
        .map(
          (s) => `
        <tr>
          <td data-key="registerNumber">${esc(s.registerNumber)}</td>
          <td data-key="name">${esc(s.name || '—')}</td>
          <td data-key="department">${esc(s.department || '—')}</td>
          <td data-key="year">${esc(s.year || '—')}</td>
          <td data-key="daysPresent">${s.daysPresent}</td>
          <td data-key="visits">${s.totalVisits}</td>
          <td data-key="totalHours">${s.totalHours}</td>
        </tr>`
        )
        .join('');
      makeSortable(document.getElementById('tbl'));

      const totalVisits = current.reduce((a, s) => a + (s.totalVisits || 0), 0);
      const totalHours = current.reduce((a, s) => a + parseFloat(s.totalHours || 0), 0);
      summary.innerHTML = `
        <div class="stat-card glass"><div class="stat-icon" style="background:#2563eb"><i class="fa-solid fa-users"></i></div><div class="stat-meta"><div class="val">${current.length}</div><div class="lbl">Students</div></div></div>
        <div class="stat-card glass"><div class="stat-icon" style="background:#7c3aed"><i class="fa-solid fa-arrow-right-arrow-left"></i></div><div class="stat-meta"><div class="val">${totalVisits}</div><div class="lbl">Total Visits</div></div></div>
        <div class="stat-card glass"><div class="stat-icon" style="background:#16a34a"><i class="fa-solid fa-clock"></i></div><div class="stat-meta"><div class="val">${totalHours.toFixed(1)}</div><div class="lbl">Total Hours</div></div></div>`;
    } catch (e) {
      toast(e.message || 'Failed to load report', 'error');
    }
  }

  function exportCsv() {
    if (!current.length) { toast('Nothing to export', 'warn'); return; }
    const headers = ['Register No', 'Name', 'Department', 'Year', 'Days Present', 'Total Visits', 'Total Hours'];
    const lines = current.map((s) => [
      s.registerNumber, s.name, s.department, s.year, s.daysPresent, s.totalVisits, s.totalHours,
    ]);
    const csv = [headers, ...lines]
      .map((row) => row.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    // UTF-8 BOM so Excel renders non-ASCII names correctly.
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${preset.value}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  document.getElementById('expCsv').onclick = exportCsv;

  // Weekly / monthly quick downloads (calendar-based presets).
  function download(preset, format) {
    window.location = `/api/sessions/export?preset=${preset}&format=${format}`;
  }
  document.getElementById('expWeekly').onclick = () => download('weekly', 'excel');
  document.getElementById('expMonthly').onclick = () => download('monthly', 'excel');
  document.getElementById('expWeeklyCsv').onclick = () => download('weekly', 'csv');
  document.getElementById('expMonthlyPdf').onclick = () => download('monthly', 'pdf');

  [preset, fDept, fYear].forEach((el) => el.addEventListener('change', load));
  let t;
  regNo.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 300); });

  await loadFilters();
  await load();
})();
