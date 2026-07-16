/**
 * scripts/seed.js
 * -----------------------------------------------------------------------------
 * Populate DEMO data: a handful of students and a spread of sessions
 * (some completed in the past, a few ACTIVE right now).
 *
 * Only seeds when the database has no students, so it is safe to re-run after
 * a reset. To re-seed, clear the database first (delete data/labregister.db*).
 *
 *   npm run seed
 * -----------------------------------------------------------------------------
 */
const studentModel = require('../models/studentModel');
const sessionModel = require('../models/sessionModel');
const { v4: uuidv4 } = require('uuid');
const { writeLog } = require('../services/logService');

const SAMPLE = [
  { registerNumber: '1SU21CS001', name: 'Aarav Sharma', department: 'CSE', year: '2nd Year' },
  { registerNumber: '1SU21CS002', name: 'Bhavana Rao', department: 'CSE', year: '2nd Year' },
  { registerNumber: '1SU21IS003', name: 'Chirag Nair', department: 'ISE', year: '2nd Year' },
  { registerNumber: '1SU20EC014', name: 'Deepika Shetty', department: 'ECE', year: '3rd Year' },
  { registerNumber: '1SU20EC021', name: 'Eshan Kumar', department: 'ECE', year: '3rd Year' },
  { registerNumber: '1SU22AI045', name: 'Fatima Khan', department: 'AIML', year: '1st Year' },
  { registerNumber: '1SU22DS052', name: 'Ganesh Reddy', department: 'AI&DS', year: '1st Year' },
  { registerNumber: '1SU19ME008', name: 'Harsha Vardhan', department: 'ME', year: '4th Year' },
];

function atDaysAgo(days, hour, minute) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

(async () => {
  if (studentModel.count() > 0) {
    // eslint-disable-next-line no-console
    console.log('ℹ️  Students already exist — skipping seed. Delete data/labregister.db* to re-seed.');
    process.exit(0);
  }

  const inserted = studentModel.bulkInsert(SAMPLE);

  let sessions = 0;
  const now = new Date();

  SAMPLE.forEach((stu, i) => {
    // A completed session a few days ago.
    const login = atDaysAgo(2 + (i % 5), 10, i * 7);
    const created = sessionModel.create({
      uuid: uuidv4(),
      registerNumber: stu.registerNumber,
      loginTime: login.toISOString(),
      date: login.toISOString().slice(0, 10),
    });
    const logout = new Date(login.getTime() + (50 + i * 12) * 60000);
    sessionModel.complete(created.uuid, {
      logoutTime: logout.toISOString(),
      duration: Math.floor((logout - login) / 1000),
    });
    sessions++;

    // First three students are ACTIVE in the lab right now.
    if (i < 3) {
      const l = new Date(now.getTime() - (8 + i * 6) * 60000);
      sessionModel.create({
        uuid: uuidv4(),
        registerNumber: stu.registerNumber,
        loginTime: l.toISOString(),
        date: now.toISOString().slice(0, 10),
      });
      sessions++;
    }
  });

  // eslint-disable-next-line no-console
  console.log(`✅ Seeded ${inserted} students and ${sessions} sessions.`);
  writeLog('event', 'seed completed', { inserted, sessions });
  process.exit(0);
})();
