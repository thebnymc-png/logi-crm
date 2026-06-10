// Comprehensive analytics routes for Salesforce-level dashboard

function registerAnalyticsRoutes(app, getDb, authenticate) {
  
  // Revenue history for trend charts
  app.get('/api/analytics/revenue-history', authenticate, (req, res) => {
    const db = getDb();
    const data = db.prepare('SELECT * FROM revenue_history ORDER BY year ASC, month ASC').all();
    res.json(data);
  });

  // Pipeline inspection - Salesforce style
  app.get('/api/analytics/pipeline-inspection', authenticate, (req, res) => {
    const db = getDb();
    const activeDeals = db.prepare("SELECT d.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name FROM deals d LEFT JOIN accounts a ON d.account_id = a.id LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.stage NOT IN ('closed_won', 'closed_lost') ORDER BY d.value DESC").all();
    const wonDeals = db.prepare("SELECT * FROM deals WHERE stage = 'closed_won'").all();
    const lostDeals = db.prepare("SELECT * FROM deals WHERE stage = 'closed_lost'").all();
    
    const totalPipeline = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
    const closedWon = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const closedLost = lostDeals.reduce((s, d) => s + (d.value || 0), 0);
    const commitDeals = activeDeals.filter(d => d.probability >= 70);
    const bestCaseDeals = activeDeals.filter(d => d.probability >= 40 && d.probability < 70);
    const commitForecast = commitDeals.reduce((s, d) => s + (d.value || 0), 0);
    const bestCaseForecast = bestCaseDeals.reduce((s, d) => s + (d.value || 0), 0);
    const weightedPipeline = Math.round(activeDeals.reduce((s, d) => s + ((d.value || 0) * (d.probability || 0) / 100), 0));
    
    const totalClosed = wonDeals.length + lostDeals.length;
    const winRate = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;
    const avgDealSize = activeDeals.length > 0 ? Math.round(activeDeals.reduce((s, d) => s + (d.value || 0), 0) / activeDeals.length) : 0;
    
    // Stage breakdown
    const stages = {};
    activeDeals.forEach(d => {
      if (!stages[d.stage]) stages[d.stage] = { count: 0, value: 0 };
      stages[d.stage].count++;
      stages[d.stage].value += (d.value || 0);
    });

    res.json({
      summary: {
        totalPipeline,
        closedWon,
        closedLost,
        commitForecast,
        bestCaseForecast,
        openPipeline: totalPipeline,
        weightedPipeline,
        winRate,
        avgDealSize,
        activeCount: activeDeals.length,
        wonCount: wonDeals.length,
        lostCount: lostDeals.length,
      },
      stages,
      deals: activeDeals,
    });
  });

  // Forecast data
  app.get('/api/analytics/forecast', authenticate, (req, res) => {
    const db = getDb();
    const deals = db.prepare("SELECT * FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')").all();
    const wonDeals = db.prepare("SELECT * FROM deals WHERE stage = 'closed_won'").all();
    
    const commit = deals.filter(d => d.probability >= 70).reduce((s, d) => s + (d.value || 0), 0);
    const bestCase = deals.filter(d => d.probability >= 40 && d.probability < 70).reduce((s, d) => s + (d.value || 0), 0);
    const pipeline = deals.filter(d => d.probability < 40).reduce((s, d) => s + (d.value || 0), 0);
    const closed = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
    const quota = 1500000; // Monthly quota

    res.json({
      commit,
      bestCase,
      pipeline,
      closed,
      quota,
      attainment: Math.round((closed / (quota * 6)) * 100), // YTD
      gap: Math.max(0, (quota * 6) - closed - commit),
    });
  });

  // Activity metrics
  app.get('/api/analytics/activity-metrics', authenticate, (req, res) => {
    const db = getDb();
    const totalActivities = db.prepare('SELECT COUNT(*) as count FROM activities').get().count;
    const completedActivities = db.prepare("SELECT COUNT(*) as count FROM activities WHERE status = 'completed'").get().count;
    const plannedActivities = db.prepare("SELECT COUNT(*) as count FROM activities WHERE status = 'planned'").get().count;
    const callCount = db.prepare("SELECT COUNT(*) as count FROM activities WHERE type = 'call'").get().count;
    const meetingCount = db.prepare("SELECT COUNT(*) as count FROM activities WHERE type = 'meeting'").get().count;
    const emailCount = db.prepare("SELECT COUNT(*) as count FROM activities WHERE type = 'email'").get().count;
    const noteCount = db.prepare("SELECT COUNT(*) as count FROM activities WHERE type = 'note'").get().count;
    const avgDuration = db.prepare("SELECT AVG(duration_minutes) as avg FROM activities WHERE duration_minutes IS NOT NULL").get().avg || 0;
    
    res.json({
      total: totalActivities,
      completed: completedActivities,
      planned: plannedActivities,
      byType: { call: callCount, meeting: meetingCount, email: emailCount, note: noteCount },
      avgDuration: Math.round(avgDuration),
      completionRate: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
    });
  });

  // Service type breakdown
  app.get('/api/analytics/service-breakdown', authenticate, (req, res) => {
    const db = getDb();
    const data = db.prepare(`
      SELECT service_type, stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
      FROM deals WHERE service_type IS NOT NULL
      GROUP BY service_type, stage ORDER BY total_value DESC
    `).all();
    
    const byService = {};
    data.forEach(row => {
      if (!byService[row.service_type]) {
        byService[row.service_type] = { service_type: row.service_type, total_value: 0, count: 0, won: 0, active: 0, won_value: 0 };
      }
      byService[row.service_type].total_value += row.total_value;
      byService[row.service_type].count += row.count;
      if (row.stage === 'closed_won') {
        byService[row.service_type].won += row.count;
        byService[row.service_type].won_value += row.total_value;
      }
      if (!['closed_won', 'closed_lost'].includes(row.stage)) byService[row.service_type].active += row.count;
    });
    
    res.json(Object.values(byService).sort((a, b) => b.total_value - a.total_value));
  });

  // Top accounts with comprehensive data
  app.get('/api/analytics/top-accounts', authenticate, (req, res) => {
    const db = getDb();
    const data = db.prepare(`
      SELECT a.id, a.name, a.account_health, a.shipping_volume_monthly, a.type, a.industry, a.city, a.state,
        COALESCE(SUM(CASE WHEN d.stage = 'closed_won' THEN d.value ELSE 0 END), 0) as won_revenue,
        COALESCE(SUM(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN d.value ELSE 0 END), 0) as pipeline_value,
        COUNT(CASE WHEN d.stage NOT IN ('closed_won', 'closed_lost') THEN 1 END) as active_deals,
        COUNT(CASE WHEN d.stage = 'closed_won' THEN 1 END) as won_deals
      FROM accounts a LEFT JOIN deals d ON a.id = d.account_id
      GROUP BY a.id ORDER BY pipeline_value DESC LIMIT 10
    `).all();
    res.json(data);
  });

  // Lanes analytics
  app.get('/api/analytics/lanes', authenticate, (req, res) => {
    const db = getDb();
    const data = db.prepare(`
      SELECT l.*, a.name as account_name 
      FROM lanes l LEFT JOIN accounts a ON l.account_id = a.id 
      ORDER BY l.current_rate DESC
    `).all();
    res.json(data);
  });

  // Tasks overview
  app.get('/api/analytics/tasks-overview', authenticate, (req, res) => {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
    const pending = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get().count;
    const inProgress = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get().count;
    const completed = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get().count;
    const overdue = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'completed' AND due_date < date('now')").get().count;
    const urgent = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE priority = 'urgent' AND status != 'completed'").get().count;
    
    res.json({ total, pending, inProgress, completed, overdue, urgent });
  });

  // Quotes summary
  app.get('/api/analytics/quotes-summary', authenticate, (req, res) => {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM quotes').get().count;
    const draft = db.prepare("SELECT COUNT(*) as count FROM quotes WHERE status = 'draft'").get().count;
    const sent = db.prepare("SELECT COUNT(*) as count FROM quotes WHERE status = 'sent'").get().count;
    const accepted = db.prepare("SELECT COUNT(*) as count FROM quotes WHERE status = 'accepted'").get().count;
    const totalValue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM quotes").get().total;
    const acceptedValue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM quotes WHERE status = 'accepted'").get().total;
    
    res.json({ total, draft, sent, accepted, totalValue, acceptedValue, conversionRate: total > 0 ? Math.round((accepted / total) * 100) : 0 });
  });
}

module.exports = { registerAnalyticsRoutes };
