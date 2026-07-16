/**
 * controllers/authController.js
 * -----------------------------------------------------------------------------
 * Admin authentication via Express Session + bcrypt.
 * Passwords are never returned to the client.
 * -----------------------------------------------------------------------------
 */
const adminModel = require('../models/adminModel');
const { writeLog } = require('../services/logService');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password required.' });
  }
  const admin = await adminModel.verify(username, password);
  if (!admin) {
    writeLog('warn', 'Admin login failed', { username });
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }
  req.session.adminId = admin.id;
  req.session.username = admin.username;
  writeLog('event', 'Admin login', { username });
  return res.json({ success: true, admin: { id: admin.id, username: admin.username } });
}

function logout(req, res) {
  const user = req.session.username;
  req.session.destroy(() => {
    writeLog('event', 'Admin logout', { username: user });
    res.clearCookie('labregister.sid');
    res.json({ success: true });
  });
}

function me(req, res) {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  return res.json({
    success: true,
    admin: { id: req.session.adminId, username: req.session.username },
  });
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both passwords required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'Password too short (min 6).' });
  }
  const admin = await adminModel.verify(req.session.username, currentPassword);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Current password incorrect.' });
  }
  await adminModel.updatePassword(req.session.username, newPassword);
  writeLog('event', 'Admin password changed', { username: req.session.username });
  return res.json({ success: true });
}

module.exports = { login, logout, me, changePassword };
