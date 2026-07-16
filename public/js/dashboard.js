/* ============================================================================
   dashboard.js — Admin dashboard: stat cards + analytics charts
   Loads: GET /api/dashboard/stats  and  GET /api/dashboard/charts
   ============================================================================ */

(async function () {
  if (!(await requireAdmin())) return;
  AdminLayout.mount('dashboard');

  const COLORS = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
  const charts = {};

  /* ---------- Stat cards ---------- */
  async function loadStats() {
    const el = document.getElementById('cards');
    try {
      const { stats } = await API.get('/dashboard/stats');
      const cards = [
        { icon: 'fa-users', color: '#2563eb', val: stats.totalStudents, lbl: 'Total Students' },
        { icon: 'fa-person-walking', color: '#16a34a', val: stats.studentsInside, lbl: 'Students Inside Now' },
        { icon: 'fa-clock-rotate-left', color: '#f59e0b', val: stats.completedSessions, lbl: 'Completed Sessions' },
        { icon: 'fa-calendar-day', color: '#7c3aed', val: stats.todayVisitors, lbl: "Today's Visitors" },
        {
          icon: 'fa-cloud-arrow-up',
          color: stats.pendingSync > 0 ? '#dc2626' : '#0891b2',
          val: stats.pendingSync,
          lbl: 'Pending Cloud Sync',
        },
        {
          icon: 'fa-circle-check',
          color: stats.internet === 'online' ? '#16a34a' : '#dc2626',
          val: stats.internet === 'online' ? 'Online' : 'Offline',
          lbl: 'Cloud Connection',
        },
      ];
      el.innerHTML = cards
        .map(
          (c) => `
        <div class="stat-card glass">
          <div class="stat-icon" style="background:${c.color}"><i class="fa-solid ${c.icon}"></i></div>
          <div class="stat-meta"><div class="val">${c.val}</div><div class="lbl">${c.lbl}</div></div>
        </div>`
        )
        .join('');
    } catch (e) {
      el.innerHTML =
        '<div class="stat-card glass" style="grid-column:1/-1">Failed to load statistics.</div>';
    }
  }

  /* ---------- Charts ---------- */
  function themeColors() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      text: dark ? '#cbd5e1' : '#475569',
      grid: dark ? 'rgba(148,163,184,0.15)' : 'rgba(15,23,42,0.08)',
    };
  }

  function renderCharts(data) {
    const t = themeColors();
    const mk = (id, type, labels, vals, label) => {
      const ctx = document.getElementById(id);
      if (!ctx) return;
      if (charts[id]) charts[id].destroy();
      charts[id] = new Chart(ctx, {
        type,
        data: {
          labels,
          datasets: [
            {
              label,
              data: vals,
              backgroundColor: type === 'line' ? 'rgba(37,99,235,0.15)' : COLORS,
              borderColor: '#2563eb',
              fill: type === 'line',
              tension: 0.3,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: type !== 'line', labels: { color: t.text } } },
          scales: {
            x: { ticks: { color: t.text }, grid: { color: t.grid } },
            y: { beginAtZero: true, ticks: { precision: 0, color: t.text }, grid: { color: t.grid } },
          },
        },
      });
    };

    mk('chDaily', 'line', data.dailyVisitors.map((x) => x.date), data.dailyVisitors.map((x) => x.count), 'Visitors');
    mk(
      'chDept',
      'doughnut',
      data.departmentUsage.map((x) => x.department),
      data.departmentUsage.map((x) => x.count),
      'Department'
    );
    mk('chYear', 'bar', data.yearUsage.map((x) => x.year), data.yearUsage.map((x) => x.count), 'Year');
    mk(
      'chPeak',
      'line',
      data.peakHours.map((x) => x.hour + ':00'),
      data.peakHours.map((x) => x.count),
      'Logins'
    );
    mk(
      'chMonthly',
      'bar',
      data.monthlySessions.map((x) => x.month),
      data.monthlySessions.map((x) => x.count),
      'Sessions'
    );
  }

  let lastCharts = null;
  async function loadCharts() {
    try {
      const { charts: data } = await API.get('/dashboard/charts');
      lastCharts = data;
      renderCharts(data);
    } catch (e) {
      /* charts fail silently — cards still useful */
    }
  }

  // Re-render charts when the theme changes so axis/legend colours stay readable.
  const themeObserver = new MutationObserver(() => {
    if (lastCharts) renderCharts(lastCharts);
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  await loadStats();
  await loadCharts();
  // Refresh stats periodically so "inside now" / "pending sync" stay fresh.
  setInterval(loadStats, 15000);
})();
