/* ============================================================================
   backup.js — Manual backup + list / download / restore backups.
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('backup');

  const tbody = document.getElementById('tbody');

  async function load() {
    try {
      const r = await API.get('/backups');
      const list = r.backups || [];
      if (!list.length) {
        tbody.innerHTML =
          '<tr><td colspan="4" class="text-center" style="padding:24px;color:var(--text-soft)">No backups yet. Click “Backup Now”.</td></tr>';
        return;
      }
      tbody.innerHTML = list
        .map(
          (b) => `
        <tr>
          <td data-key="name">${esc(b.name)}</td>
          <td data-key="sizeKb">${b.sizeKb}</td>
          <td data-key="createdAt">${fmtTime(b.createdAt)}</td>
          <td>
            <a class="btn btn-ghost btn-sm" href="/api/backups/download/${encodeURIComponent(b.name)}" download><i class="fa-solid fa-download"></i> Download</a>
            <button class="btn btn-ghost btn-sm" data-restore="${esc(b.name)}"><i class="fa-solid fa-rotate-left"></i> Restore</button>
          </td>
        </tr>`
        )
        .join('');
      makeSortable(document.getElementById('tbl'));
    } catch (e) {
      toast(e.message || 'Failed to load backups', 'error');
    }
  }

  document.getElementById('backupNow').onclick = async () => {
    try {
      const r = await API.post('/backups/now');
      toast('Backup created: ' + r.file, 'success');
      load();
    } catch (err) {
      toast(err.message || 'Backup failed', 'error');
    }
  };

  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-restore]');
    if (!btn) return;
    const name = btn.getAttribute('data-restore');
    if (!confirm(`Restore from ${name}? The current database will be backed up first, then replaced. A server restart is recommended.`)) return;
    btn.disabled = true;
    try {
      await API.post('/backups/restore', { filename: name });
      toast('Restored. Restart the server to load it fully.', 'success');
      load();
    } catch (err) {
      toast(err.message || 'Restore failed', 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // --- Cloud Restore section ---
  const mongoStatusEl = document.getElementById('mongoStatus');
  const pullBtn = document.getElementById('pullNow');

  async function checkMongoStatus() {
    try {
      const r = await API.get('/sync/status');
      if (r.mongoConnected) {
        mongoStatusEl.innerHTML = '<i class="fa-solid fa-circle" style="color:var(--green,#22c55e)"></i> MongoDB connected — ready to restore';
        pullBtn.disabled = false;
      } else if (r.mongoConfigured) {
        mongoStatusEl.innerHTML = '<i class="fa-solid fa-circle" style="color:var(--yellow,#eab308)"></i> MongoDB configured but not connected';
        pullBtn.disabled = true;
      } else {
        mongoStatusEl.innerHTML = '<i class="fa-solid fa-circle" style="color:var(--red,#ef4444)"></i> MongoDB not configured';
        pullBtn.disabled = true;
      }
    } catch (e) {
      mongoStatusEl.innerHTML = '<i class="fa-solid fa-circle" style="color:var(--red,#ef4444)"></i> Could not check status';
      pullBtn.disabled = true;
    }
  }

  pullBtn.onclick = async () => {
    if (!confirm('Restore students and sessions from MongoDB Atlas? Existing records will not be duplicated.')) return;
    pullBtn.disabled = true;
    pullBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring…';
    try {
      const r = await API.post('/sync/pull');
      if (r.error) {
        toast('Restore failed: ' + r.error, 'error');
      } else {
        toast(`Restored ${r.studentsRestored} students and ${r.sessionsRestored} sessions from cloud.`, 'success');
      }
    } catch (err) {
      toast(err.message || 'Restore failed', 'error');
    } finally {
      pullBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-down"></i> Restore from Cloud';
      checkMongoStatus();
    }
  };

  await checkMongoStatus();
  await load();
})();
