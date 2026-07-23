/* auth.js — Admin login */
const form = document.getElementById('loginForm');
const errEl = document.getElementById('err');
const btn = document.getElementById('loginBtn');

(async () => {
  try {
    const b = await API.get('/settings/public');
    if (b.labName) document.getElementById('brandSub').textContent = b.labName;
    if (b.universityName) document.getElementById('authUniName').textContent = b.universityName;
  } catch (e) {}
})();

// If already logged in, go straight to dashboard.
(async () => {
  try {
    const r = await API.get('/auth/me');
    if (r.success) location.href = '/admin/dashboard';
  } catch (e) {}
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.textContent = '';
  btn.disabled = true;
  try {
    const res = await API.post('/auth/login', {
      username: document.getElementById('username').value.trim(),
      password: document.getElementById('password').value,
    });
    if (res.success) {
      toast('Welcome back!', 'success');
      location.href = '/admin/dashboard';
    }
  } catch (err) {
    errEl.textContent = err.message || 'Login failed';
  } finally {
    btn.disabled = false;
  }
});
