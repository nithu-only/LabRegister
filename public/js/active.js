/* ============================================================================
   active.js — Live view of students currently inside the lab.
   Auto-refreshes the list and ticks durations every second.
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('active');

  const tbody = document.getElementById('tbody');
  const countEl = document.getElementById('count');
  let lastRows = []; // for live duration ticking

  async function load() {
    try {
      const r = await API.get('/sessions/active');
      lastRows = r.rows || [];
      countEl.innerHTML = `<i class="fa-solid fa-users"></i> ${lastRows.length} inside`;

      if (!lastRows.length) {
        tbody.innerHTML =
          '<tr><td colspan="7" class="text-center" style="padding:24px;color:var(--text-soft)">No students currently inside.</td></tr>';
        return;
      }
      tbody.innerHTML = lastRows
        .map(
          (s) => `
        <tr>
          <td data-key="name">${esc(s.name || '—')}</td>
          <td data-key="registerNumber">${esc(s.registerNumber)}</td>
          <td data-key="department">${esc(s.department || '—')}</td>
          <td data-key="year">${esc(s.year || '—')}</td>
          <td data-key="loginTime">${fmtTime(s.loginTime)}</td>
          <td data-key="duration"><span class="live-dur" data-login="${esc(s.loginTime)}">${esc(s.currentDurationText || '')}</span></td>
          <td><button class="btn btn-danger btn-sm" data-force="${esc(s.uuid)}"><i class="fa-solid fa-right-from-bracket"></i> Force Logout</button></td>
        </tr>`
        )
        .join('');
      makeSortable(document.getElementById('tbl'));
      tick();
    } catch (e) {
      toast(e.message || 'Failed to load active sessions', 'error');
    }
  }

  // Update only the duration cells every second (cheap, no refetch).
  function tick() {
    document.querySelectorAll('.live-dur').forEach((el) => {
      const login = new Date(el.getAttribute('data-login'));
      if (isNaN(login)) return;
      el.textContent = fmtDuration((Date.now() - login) / 1000);
    });
  }

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-force]');
    if (!btn) return;
    if (!confirm('Force logout this student?')) return;
    btn.disabled = true;
    try {
      await API.post(`/sessions/${btn.getAttribute('data-force')}/force-logout`);
      toast('Student logged out', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Force logout failed', 'error');
      btn.disabled = false;
    }
  });

  document.getElementById('refresh').onclick = load;

  await load();
  setInterval(tick, 1000);        // live durations
  setInterval(load, 10000);       // refresh list (new arrivals / departures)
})();
