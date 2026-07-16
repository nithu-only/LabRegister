/* ============================================================================
   settings.js — Runtime settings (branding / depts / years / sync / theme)
   + change admin password.
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('settings');

  async function load() {
    try {
      const r = await API.get('/settings');
      const s = r.settings || {};
      document.getElementById('universityName').value = s.universityName || '';
      document.getElementById('labName').value = s.labName || '';
      document.getElementById('theme').value = s.theme || 'light';
      document.getElementById('syncInterval').value = s.syncInterval || '30';
      document.getElementById('backupLocation').value = s.backupLocation || '';
      try {
        document.getElementById('departments').value = (JSON.parse(s.departments || '[]')).join(', ');
      } catch (e) { document.getElementById('departments').value = ''; }
      try {
        document.getElementById('years').value = (JSON.parse(s.years || '[]')).join(', ');
      } catch (e) { document.getElementById('years').value = ''; }
    } catch (e) {
      toast(e.message || 'Failed to load settings', 'error');
    }
  }

  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      universityName: document.getElementById('universityName').value.trim(),
      labName: document.getElementById('labName').value.trim(),
      theme: document.getElementById('theme').value,
      syncInterval: document.getElementById('syncInterval').value,
      backupLocation: document.getElementById('backupLocation').value.trim(),
      departments: document
        .getElementById('departments')
        .value.split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      years: document
        .getElementById('years')
        .value.split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    };
    try {
      const r = await API.put('/settings', payload);
      toast('Settings saved', 'success');
      if (r.settings && r.settings.theme) setTheme(r.settings.theme);
      AdminLayout.loadBrand();
    } catch (err) {
      toast(err.message || 'Save failed', 'error');
    }
  });

  document.getElementById('pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
      currentPassword: document.getElementById('curPw').value,
      newPassword: document.getElementById('newPw').value,
    };
    if (body.newPassword.length < 6) { toast('New password too short (min 6)', 'warn'); return; }
    try {
      await API.post('/auth/change-password', body);
      toast('Password updated', 'success');
      document.getElementById('curPw').value = '';
      document.getElementById('newPw').value = '';
    } catch (err) {
      toast(err.message || 'Update failed', 'error');
    }
  });

  await load();
})();
