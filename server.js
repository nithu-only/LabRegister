/**
 * server.js
 * -----------------------------------------------------------------------------
 * Lab Register Management System — application entry point (Kiosk Mode).
 *
 * Responsibilities:
 *   1. Load config + connect to SQLite (primary) and optionally MongoDB (cloud).
 *   2. Expose the REST API under /api.
 *   3. Serve the static Home screen + Admin SPA (HTML/CSS/JS).
 *   4. Start background jobs: cloud sync (every SYNC_INTERVAL_SECONDS) and
 *      nightly SQLite backup (cron at BACKUP_TIME).
 *   5. Graceful shutdown logging.
 *
 * Offline-first guarantee: the server is fully usable with NO internet and NO
 * MongoDB. Cloud features simply wait in the background.
 * -----------------------------------------------------------------------------
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const cron = require('node-cron');

const env = require('./config/env');
const { connectMongo } = require('./config/mongoose');
const adminModel = require('./models/adminModel');
const apiRouter = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const log = require('./services/logService');
const syncWorker = require('./sync/syncWorker');
const backupService = require('./services/backupService');

const app = express();

// ---------------- Middleware ----------------
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    name: 'labregister.sid',
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 12, httpOnly: true, secure: env.SECURE_COOKIE },
  })
);

// ---------------- Static assets ----------------
app.use(express.static(path.join(__dirname, 'public')));
app.use('/views', express.static(path.join(__dirname, 'views')));

const VIEWS = path.join(__dirname, 'views');

// ---------------- Page routes (clean URLs) ----------------
const pages = {
  '/': 'index.html',
  '/admin': 'admin/login.html',
  '/admin/dashboard': 'admin/dashboard.html',
  '/admin/students': 'admin/students.html',
  '/admin/sessions': 'admin/sessions.html',
  '/admin/reports': 'admin/reports.html',
  '/admin/active': 'admin/active.html',
  '/admin/settings': 'admin/settings.html',
  '/admin/backup': 'admin/backup.html',
};
for (const [route, file] of Object.entries(pages)) {
  app.get(route, (req, res) => res.sendFile(path.join(VIEWS, file)));
}

// ---------------- API ----------------
app.use('/api', apiRouter);

// 404 for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Not found' }));

// ---------------- Error handling ----------------
app.use(errorHandler);

// ---------------- Startup sequence ----------------
async function start() {
  log.event('Application start', { node: process.version, port: env.PORT });

  // Optional cloud connection (never blocks startup).
  await connectMongo();

  // Create the bootstrap admin account if none exists.
  await adminModel.ensureBootstrapAdmin();

  // Background sync scheduler.
  syncWorker.start();

  // Nightly backup via cron.
  const [bh, bm] = (env.BACKUP_TIME || '23:55').split(':').map(Number);
  const cronExpr = `${bm} ${bh} * * *`;
  if (cron.validate(cronExpr)) {
    cron.schedule(cronExpr, () => {
      try {
        backupService.createBackup();
      } catch (e) {
        log.error('Scheduled backup failed', { error: e.message });
      }
    });
    log.info(`Nightly backup scheduled at ${env.BACKUP_TIME} (${cronExpr})`);
  } else {
    log.warn('Invalid BACKUP_TIME; nightly backup not scheduled', { value: env.BACKUP_TIME });
  }

  app.listen(env.PORT, () => {
    log.event(`Server listening on http://localhost:${env.PORT}`);
    // eslint-disable-next-line no-console
    console.log(`\n  🚀 Lab Register running at http://localhost:${env.PORT}\n`);
  });
}

// ---------------- Graceful shutdown ----------------
function shutdown(signal) {
  log.event(`Application stop (${signal})`);
  syncWorker.stop();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  log.error('Fatal startup error', { error: err.message, stack: err.stack });
  process.exit(1);
});
