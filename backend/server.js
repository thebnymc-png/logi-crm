require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { initializeDatabase } = require('./database');
const { registerAnalyticsRoutes } = require('./analytics');
const { registerIntegrationRoutes } = require('./integrations');

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// JWT secret must come from the environment in production. A weak fallback is
// only allowed for local development, and it is loudly flagged.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is required in production.');
    process.exit(1);
  }
  console.warn('WARNING: JWT_SECRET is not set — using an insecure development fallback. Do NOT use in production.');
}
const ACTIVE_JWT_SECRET = JWT_SECRET || 'insecure-dev-only-secret';

// Trust the reverse proxy (Nginx) so client IPs / rate limiting work correctly.
app.set('trust proxy', 1);

// Security headers. CSP is disabled here because the SPA is served from the
// same origin and tightening it needs per-asset auditing — tracked as follow-up.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS: lock to an explicit allow-list in production, permissive in dev.
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors(isProduction && allowedOrigins.length
  ? { origin: allowedOrigins, credentials: true }
  : {}));

app.use(express.json({ limit: '1mb' }));

// Rate limiting: a broad cap on the API surface plus a stricter cap on auth.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts, please try again later.' } });
app.use('/api/', apiLimiter);

app.use(express.static(path.join(__dirname, '../frontend/dist')));

let db = null;

// Lightweight, unauthenticated health check for load balancers / uptime probes.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Auth middleware
function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(token, ACTIVE_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Role guard — use after `authenticate` to restrict a route to given roles.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', authLimiter, (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, ACTIVE_JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role } });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, first_name, last_name, role FROM users WHERE id = ?').get(req.user.id);
  res.json(user);
});

// Registration creates users and is therefore an admin-only operation.
app.post('/api/auth/register', authenticate, requireRole('admin'), (req, res) => {
  const { email, password, first_name, last_name, role } = req.body;
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'email, password, first_name and last_name are required' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare('INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)').run(email, hashedPassword, first_name, last_name, role || 'sales_rep');
    res.status(201).json({ user: { id: result.lastInsertRowid, email, first_name, last_name, role: role || 'sales_rep' } });
  } catch (err) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

// ==================== DASHBOARD ROUTES ====================
app.get('/api/dashboard/stats', authenticate, (req, res) => {
  const totalAccounts = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
  const activeDeals = db.prepare("SELECT COUNT(*) as count FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')").get().count;
  const pipelineValue = db.prepare("SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')").get().total;
  const wonThisMonth = db.prepare("SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage = 'closed_won' AND actual_close_date >= date('now', 'start of month')").get().total;
  const wonThisQuarter = db.prepare("SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE stage = 'closed_won' AND actual_close_date >= date('now', '-3 months')").get().total;
  const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('pending', 'in_progress')").get().count;
  const overdueTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending' AND due_date < date('now')").get().count;
  const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
  const atRiskAccounts = db.prepare("SELECT COUNT(*) as count FROM accounts WHERE account_health = 'at_risk'").get().count;
  res.json({ totalAccounts, activeDeals, pipelineValue, wonThisMonth, wonThisQuarter, pendingTasks, overdueTasks, totalContacts, atRiskAccounts });
});

app.get('/api/dashboard/pipeline-summary', authenticate, (req, res) => {
  const stages = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
    FROM deals WHERE stage NOT IN ('closed_won', 'closed_lost')
    GROUP BY stage ORDER BY CASE stage WHEN 'prospecting' THEN 1 WHEN 'qualification' THEN 2 WHEN 'proposal' THEN 3 WHEN 'negotiation' THEN 4 END
  `).all();
  res.json(stages);
});

app.get('/api/dashboard/recent-activities', authenticate, (req, res) => {
  const activities = db.prepare(`
    SELECT a.*, ac.name as account_name, c.first_name || ' ' || c.last_name as contact_name
    FROM activities a LEFT JOIN accounts ac ON a.account_id = ac.id LEFT JOIN contacts c ON a.contact_id = c.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all();
  res.json(activities);
});

app.get('/api/dashboard/upcoming-tasks', authenticate, (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, ac.name as account_name, c.first_name || ' ' || c.last_name as contact_name
    FROM tasks t LEFT JOIN accounts ac ON t.account_id = ac.id LEFT JOIN contacts c ON t.contact_id = c.id
    WHERE t.status IN ('pending', 'in_progress')
    ORDER BY t.due_date ASC LIMIT 10
  `).all();
  res.json(tasks);
});

app.get('/api/dashboard/deals-by-service', authenticate, (req, res) => {
  const data = db.prepare(`
    SELECT service_type, COUNT(*) as count, COALESCE(SUM(value), 0) as total_value
    FROM deals WHERE stage NOT IN ('closed_lost') AND service_type IS NOT NULL
    GROUP BY service_type ORDER BY total_value DESC
  `).all();
  res.json(data);
});

// ==================== ACCOUNTS ROUTES ====================
app.get('/api/accounts', authenticate, (req, res) => {
  const { search, type, health, page = 1, limit = 50 } = req.query;
  let query = "SELECT a.*, u.first_name || ' ' || u.last_name as owner_name FROM accounts a LEFT JOIN users u ON a.owner_id = u.id WHERE 1=1";
  const params = [];
  if (search) { query += ' AND (a.name LIKE ? OR a.city LIKE ? OR a.email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (type) { query += ' AND a.type = ?'; params.push(type); }
  if (health) { query += ' AND a.account_health = ?'; params.push(health); }
  query += ' ORDER BY a.updated_at DESC';
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const accounts = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM accounts').get().count;
  res.json({ accounts, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/accounts/:id', authenticate, (req, res) => {
  const account = db.prepare("SELECT a.*, u.first_name || ' ' || u.last_name as owner_name FROM accounts a LEFT JOIN users u ON a.owner_id = u.id WHERE a.id = ?").get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const contacts = db.prepare('SELECT * FROM contacts WHERE account_id = ? ORDER BY is_primary DESC').all(req.params.id);
  const deals = db.prepare('SELECT * FROM deals WHERE account_id = ? ORDER BY created_at DESC').all(req.params.id);
  const activities = db.prepare('SELECT * FROM activities WHERE account_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const lanes = db.prepare('SELECT * FROM lanes WHERE account_id = ?').all(req.params.id);
  const quotes = db.prepare('SELECT * FROM quotes WHERE account_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...account, contacts, deals, activities, lanes, quotes });
});

app.post('/api/accounts', authenticate, (req, res) => {
  const { name, type, industry, website, phone, email, address_line1, address_line2, city, state, zip, country, annual_revenue, employee_count, shipping_volume_monthly, primary_modes, current_carrier, contract_start, contract_end, account_health, notes } = req.body;
  const result = db.prepare('INSERT INTO accounts (name, type, industry, website, phone, email, address_line1, address_line2, city, state, zip, country, annual_revenue, employee_count, shipping_volume_monthly, primary_modes, current_carrier, contract_start, contract_end, account_health, owner_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, type, industry, website, phone, email, address_line1, address_line2, city, state, zip, country || 'US', annual_revenue, employee_count, shipping_volume_monthly, JSON.stringify(primary_modes || []), current_carrier, contract_start, contract_end, account_health || 'good', req.user.id, notes);
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(account);
});

app.put('/api/accounts/:id', authenticate, (req, res) => {
  const fields = req.body;
  if (fields.primary_modes && Array.isArray(fields.primary_modes)) fields.primary_modes = JSON.stringify(fields.primary_modes);
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE accounts SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(req.params.id);
  res.json(account);
});

app.delete('/api/accounts/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM accounts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== CONTACTS ROUTES ====================
app.get('/api/contacts', authenticate, (req, res) => {
  const { search, account_id, page = 1, limit = 50 } = req.query;
  let query = 'SELECT c.*, a.name as account_name FROM contacts c LEFT JOIN accounts a ON c.account_id = a.id WHERE 1=1';
  const params = [];
  if (search) { query += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.title LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }
  if (account_id) { query += ' AND c.account_id = ?'; params.push(account_id); }
  query += ' ORDER BY c.updated_at DESC';
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const contacts = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
  res.json({ contacts, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/contacts/:id', authenticate, (req, res) => {
  const contact = db.prepare('SELECT c.*, a.name as account_name FROM contacts c LEFT JOIN accounts a ON c.account_id = a.id WHERE c.id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  const activities = db.prepare('SELECT * FROM activities WHERE contact_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  const deals = db.prepare('SELECT * FROM deals WHERE contact_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...contact, activities, deals });
});

app.post('/api/contacts', authenticate, (req, res) => {
  const { account_id, first_name, last_name, title, department, email, phone, mobile, is_primary, is_decision_maker, linkedin, notes } = req.body;
  const result = db.prepare('INSERT INTO contacts (account_id, first_name, last_name, title, department, email, phone, mobile, is_primary, is_decision_maker, linkedin, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(account_id || null, first_name, last_name, title, department, email, phone, mobile, is_primary ? 1 : 0, is_decision_maker ? 1 : 0, linkedin, notes);
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(contact);
});

app.put('/api/contacts/:id', authenticate, (req, res) => {
  const fields = req.body;
  if ('is_primary' in fields) fields.is_primary = fields.is_primary ? 1 : 0;
  if ('is_decision_maker' in fields) fields.is_decision_maker = fields.is_decision_maker ? 1 : 0;
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE contacts SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(contact);
});

app.delete('/api/contacts/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== DEALS ROUTES ====================
app.get('/api/deals', authenticate, (req, res) => {
  const { search, stage, service_type, page = 1, limit = 50 } = req.query;
  let query = `SELECT d.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name, u.first_name || ' ' || u.last_name as owner_name FROM deals d LEFT JOIN accounts a ON d.account_id = a.id LEFT JOIN contacts c ON d.contact_id = c.id LEFT JOIN users u ON d.owner_id = u.id WHERE 1=1`;
  const params = [];
  if (search) { query += ' AND (d.title LIKE ? OR a.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (stage) { query += ' AND d.stage = ?'; params.push(stage); }
  if (service_type) { query += ' AND d.service_type = ?'; params.push(service_type); }
  query += ' ORDER BY d.updated_at DESC';
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const deals = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM deals').get().count;
  res.json({ deals, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/deals/pipeline', authenticate, (req, res) => {
  const deals = db.prepare(`
    SELECT d.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name
    FROM deals d LEFT JOIN accounts a ON d.account_id = a.id LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.stage NOT IN ('closed_won', 'closed_lost') ORDER BY d.value DESC
  `).all();
  const pipeline = {
    prospecting: deals.filter(d => d.stage === 'prospecting'),
    qualification: deals.filter(d => d.stage === 'qualification'),
    proposal: deals.filter(d => d.stage === 'proposal'),
    negotiation: deals.filter(d => d.stage === 'negotiation'),
  };
  res.json(pipeline);
});

app.get('/api/deals/:id', authenticate, (req, res) => {
  const deal = db.prepare(`SELECT d.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name FROM deals d LEFT JOIN accounts a ON d.account_id = a.id LEFT JOIN contacts c ON d.contact_id = c.id WHERE d.id = ?`).get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const activities = db.prepare('SELECT * FROM activities WHERE deal_id = ? ORDER BY created_at DESC').all(req.params.id);
  const quotes = db.prepare('SELECT * FROM quotes WHERE deal_id = ? ORDER BY created_at DESC').all(req.params.id);
  res.json({ ...deal, activities, quotes });
});

app.post('/api/deals', authenticate, (req, res) => {
  const { title, account_id, contact_id, stage, value, probability, expected_close_date, service_type, origin, destination, frequency, estimated_volume, competitor, notes } = req.body;
  const result = db.prepare('INSERT INTO deals (title, account_id, contact_id, owner_id, stage, value, probability, expected_close_date, service_type, origin, destination, frequency, estimated_volume, competitor, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(title, account_id || null, contact_id || null, req.user.id, stage || 'prospecting', value || 0, probability || 10, expected_close_date, service_type, origin, destination, frequency, estimated_volume, competitor, notes);
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(deal);
});

app.put('/api/deals/:id', authenticate, (req, res) => {
  const fields = req.body;
  if (fields.stage === 'closed_won' && !fields.actual_close_date) fields.actual_close_date = new Date().toISOString().split('T')[0];
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE deals SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  const deal = db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id);
  res.json(deal);
});

app.delete('/api/deals/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== ACTIVITIES ROUTES ====================
app.get('/api/activities', authenticate, (req, res) => {
  const { type, account_id, contact_id, deal_id, page = 1, limit = 50 } = req.query;
  let query = `SELECT a.*, ac.name as account_name, c.first_name || ' ' || c.last_name as contact_name, d.title as deal_title FROM activities a LEFT JOIN accounts ac ON a.account_id = ac.id LEFT JOIN contacts c ON a.contact_id = c.id LEFT JOIN deals d ON a.deal_id = d.id WHERE 1=1`;
  const params = [];
  if (type) { query += ' AND a.type = ?'; params.push(type); }
  if (account_id) { query += ' AND a.account_id = ?'; params.push(account_id); }
  if (contact_id) { query += ' AND a.contact_id = ?'; params.push(contact_id); }
  if (deal_id) { query += ' AND a.deal_id = ?'; params.push(deal_id); }
  query += ' ORDER BY a.created_at DESC';
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const activities = db.prepare(query).all(...params);
  res.json({ activities });
});

app.post('/api/activities', authenticate, (req, res) => {
  const { type, subject, description, account_id, contact_id, deal_id, status, due_date, duration_minutes, outcome } = req.body;
  const result = db.prepare('INSERT INTO activities (type, subject, description, account_id, contact_id, deal_id, owner_id, status, due_date, duration_minutes, outcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(type, subject, description, account_id || null, contact_id || null, deal_id || null, req.user.id, status || 'completed', due_date, duration_minutes, outcome);
  const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(activity);
});

app.delete('/api/activities/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== QUOTES ROUTES ====================
app.get('/api/quotes', authenticate, (req, res) => {
  const { status, account_id, page = 1, limit = 50 } = req.query;
  let query = `SELECT q.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name FROM quotes q LEFT JOIN accounts a ON q.account_id = a.id LEFT JOIN contacts c ON q.contact_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { query += ' AND q.status = ?'; params.push(status); }
  if (account_id) { query += ' AND q.account_id = ?'; params.push(account_id); }
  query += ' ORDER BY q.created_at DESC';
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const quotes = db.prepare(query).all(...params);
  res.json({ quotes });
});

app.get('/api/quotes/:id', authenticate, (req, res) => {
  const quote = db.prepare(`SELECT q.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name FROM quotes q LEFT JOIN accounts a ON q.account_id = a.id LEFT JOIN contacts c ON q.contact_id = c.id WHERE q.id = ?`).get(req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  res.json(quote);
});

app.post('/api/quotes', authenticate, (req, res) => {
  const { deal_id, account_id, contact_id, origin, destination, service_type, mode, weight, weight_unit, dimensions, commodity, special_requirements, base_rate, fuel_surcharge, accessorial_charges, discount_percent, valid_from, valid_until, notes } = req.body;
  const quote_number = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
  const total_amount = (base_rate || 0) + (fuel_surcharge || 0) + (accessorial_charges || 0) - ((base_rate || 0) * (discount_percent || 0) / 100);
  const result = db.prepare('INSERT INTO quotes (quote_number, deal_id, account_id, contact_id, owner_id, origin, destination, service_type, mode, weight, weight_unit, dimensions, commodity, special_requirements, base_rate, fuel_surcharge, accessorial_charges, discount_percent, total_amount, valid_from, valid_until, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(quote_number, deal_id || null, account_id || null, contact_id || null, req.user.id, origin, destination, service_type, mode, weight, weight_unit || 'lbs', dimensions, commodity, special_requirements, base_rate, fuel_surcharge || 0, accessorial_charges || 0, discount_percent || 0, total_amount, valid_from, valid_until, notes);
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(quote);
});

app.put('/api/quotes/:id', authenticate, (req, res) => {
  const fields = req.body;
  if (fields.base_rate !== undefined) {
    fields.total_amount = (fields.base_rate || 0) + (fields.fuel_surcharge || 0) + (fields.accessorial_charges || 0) - ((fields.base_rate || 0) * (fields.discount_percent || 0) / 100);
  }
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE quotes SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  const quote = db.prepare('SELECT * FROM quotes WHERE id = ?').get(req.params.id);
  res.json(quote);
});

app.delete('/api/quotes/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== TASKS ROUTES ====================
app.get('/api/tasks', authenticate, (req, res) => {
  const { status, priority, type, page = 1, limit = 50 } = req.query;
  let query = `SELECT t.*, a.name as account_name, c.first_name || ' ' || c.last_name as contact_name, d.title as deal_title FROM tasks t LEFT JOIN accounts a ON t.account_id = a.id LEFT JOIN contacts c ON t.contact_id = c.id LEFT JOIN deals d ON t.deal_id = d.id WHERE 1=1`;
  const params = [];
  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }
  if (type) { query += ' AND t.type = ?'; params.push(type); }
  query += " ORDER BY CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END, t.due_date ASC";
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

app.post('/api/tasks', authenticate, (req, res) => {
  const { title, description, type, priority, due_date, account_id, contact_id, deal_id, assigned_to } = req.body;
  const result = db.prepare('INSERT INTO tasks (title, description, type, priority, due_date, account_id, contact_id, deal_id, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(title, description, type || 'follow_up', priority || 'medium', due_date, account_id || null, contact_id || null, deal_id || null, req.user.id, assigned_to || req.user.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', authenticate, (req, res) => {
  const fields = req.body;
  if (fields.status === 'completed' && !fields.completed_at) fields.completed_at = new Date().toISOString();
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE tasks SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(task);
});

app.delete('/api/tasks/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== LANES ROUTES ====================
app.get('/api/lanes', authenticate, (req, res) => {
  const { account_id } = req.query;
  let query = 'SELECT l.*, a.name as account_name FROM lanes l LEFT JOIN accounts a ON l.account_id = a.id WHERE 1=1';
  const params = [];
  if (account_id) { query += ' AND l.account_id = ?'; params.push(account_id); }
  query += ' ORDER BY l.created_at DESC';
  const lanes = db.prepare(query).all(...params);
  res.json({ lanes });
});

app.post('/api/lanes', authenticate, (req, res) => {
  const { account_id, origin_city, origin_state, origin_zip, destination_city, destination_state, destination_zip, mode, frequency, avg_volume_per_shipment, current_rate, target_rate, notes } = req.body;
  const result = db.prepare('INSERT INTO lanes (account_id, origin_city, origin_state, origin_zip, destination_city, destination_state, destination_zip, mode, frequency, avg_volume_per_shipment, current_rate, target_rate, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(account_id, origin_city, origin_state, origin_zip, destination_city, destination_state, destination_zip, mode, frequency, avg_volume_per_shipment, current_rate, target_rate, notes);
  const lane = db.prepare('SELECT * FROM lanes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(lane);
});

app.delete('/api/lanes/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM lanes WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== REPORTS ROUTES ====================
app.get('/api/reports/win-rate', authenticate, (req, res) => {
  const won = db.prepare("SELECT COUNT(*) as count FROM deals WHERE stage = 'closed_won'").get().count;
  const lost = db.prepare("SELECT COUNT(*) as count FROM deals WHERE stage = 'closed_lost'").get().count;
  const total = won + lost;
  const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
  res.json({ won, lost, total, winRate });
});

app.get('/api/reports/revenue-by-service', authenticate, (req, res) => {
  const data = db.prepare("SELECT service_type, COALESCE(SUM(value), 0) as revenue, COUNT(*) as deal_count FROM deals WHERE stage = 'closed_won' AND service_type IS NOT NULL GROUP BY service_type ORDER BY revenue DESC").all();
  res.json(data);
});

app.get('/api/reports/account-health', authenticate, (req, res) => {
  const data = db.prepare('SELECT account_health, COUNT(*) as count FROM accounts GROUP BY account_health').all();
  res.json(data);
});

// ==================== CONTRACTS ROUTES ====================
app.get('/api/contracts', authenticate, (req, res) => {
  const { search, status, type, group_name, page = 1, limit = 50 } = req.query;
  let query = `SELECT c.*, a.name as account_name, ct.first_name || ' ' || ct.last_name as contact_name, u.first_name || ' ' || u.last_name as owner_name FROM contracts c LEFT JOIN accounts a ON c.account_id = a.id LEFT JOIN contacts ct ON c.contact_id = ct.id LEFT JOIN users u ON c.owner_id = u.id WHERE 1=1`;
  const params = [];
  if (search) { query += ' AND (c.title LIKE ? OR c.contract_number LIKE ? OR a.name LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { query += ' AND c.status = ?'; params.push(status); }
  if (type) { query += ' AND c.type = ?'; params.push(type); }
  if (group_name) { query += ' AND c.group_name = ?'; params.push(group_name); }
  query += ' ORDER BY c.updated_at DESC';
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;
  const contracts = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM contracts').get().count;
  res.json({ contracts, total, page: Number(page), limit: Number(limit) });
});

app.get('/api/contracts/board', authenticate, (req, res) => {
  const contracts = db.prepare(`
    SELECT c.*, a.name as account_name, ct.first_name || ' ' || ct.last_name as contact_name
    FROM contracts c LEFT JOIN accounts a ON c.account_id = a.id LEFT JOIN contacts ct ON c.contact_id = ct.id
    ORDER BY c.priority DESC, c.value DESC
  `).all();
  const groups = {};
  contracts.forEach(c => {
    const g = c.group_name || 'Ungrouped';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  });
  res.json(groups);
});

app.get('/api/contracts/:id', authenticate, (req, res) => {
  const contract = db.prepare(`SELECT c.*, a.name as account_name, ct.first_name || ' ' || ct.last_name as contact_name, u.first_name || ' ' || u.last_name as owner_name FROM contracts c LEFT JOIN accounts a ON c.account_id = a.id LEFT JOIN contacts ct ON c.contact_id = ct.id LEFT JOIN users u ON c.owner_id = u.id WHERE c.id = ?`).get(req.params.id);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  res.json(contract);
});

app.post('/api/contracts', authenticate, (req, res) => {
  const { contract_number, title, account_id, contact_id, deal_id, status, type, priority, value, monthly_value, currency, service_type, origin, destination, mode, frequency, volume_commitment, sla_terms, difot_target, payment_terms, auto_renew, start_date, end_date, renewal_date, signed_date, notes, group_name } = req.body;
  const num = contract_number || `CTR-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;
  const result = db.prepare('INSERT INTO contracts (contract_number, title, account_id, contact_id, deal_id, owner_id, status, type, priority, value, monthly_value, currency, service_type, origin, destination, mode, frequency, volume_commitment, sla_terms, difot_target, payment_terms, auto_renew, start_date, end_date, renewal_date, signed_date, notes, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(num, title, account_id || null, contact_id || null, deal_id || null, req.user.id, status || 'draft', type || 'service_agreement', priority || 'medium', value || 0, monthly_value || 0, currency || 'USD', service_type, origin, destination, mode, frequency, volume_commitment, sla_terms, difot_target || 95, payment_terms || 'Net 30', auto_renew ? 1 : 0, start_date, end_date, renewal_date, signed_date, notes, group_name || 'Drafts');
  const contract = db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(contract);
});

app.put('/api/contracts/:id', authenticate, (req, res) => {
  const fields = req.body;
  const sets = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  const values = Object.values(fields);
  db.prepare(`UPDATE contracts SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...values, req.params.id);
  const contract = db.prepare('SELECT c.*, a.name as account_name FROM contracts c LEFT JOIN accounts a ON c.account_id = a.id WHERE c.id = ?').get(req.params.id);
  res.json(contract);
});

app.delete('/api/contracts/:id', authenticate, (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ==================== USERS ROUTES ====================
const VALID_ROLES = ['admin', 'manager', 'sales_rep'];

app.get('/api/users', authenticate, (req, res) => {
  const users = db.prepare('SELECT id, email, first_name, last_name, role, created_at FROM users').all();
  res.json({ users });
});

app.put('/api/users/:id', authenticate, requireRole('admin'), (req, res) => {
  const { first_name, last_name, email, role } = req.body;
  if (role && !VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  try {
    db.prepare('UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), email = COALESCE(?, email), role = COALESCE(?, role), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(first_name, last_name, email, role, req.params.id);
  } catch (err) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  const user = db.prepare('SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

// Password change: admins may reset anyone; users may change their own.
app.post('/api/users/:id/password', authenticate, (req, res) => {
  const targetId = Number(req.params.id);
  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(targetId);
  if (!existing) return res.status(404).json({ error: 'User not found' });
  db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(bcrypt.hashSync(password, 10), targetId);
  res.json({ success: true });
});

app.delete('/api/users/:id', authenticate, requireRole('admin'), (req, res) => {
  if (req.user.id === Number(req.params.id)) return res.status(400).json({ error: 'You cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Initialize and start
async function start() {
  db = await initializeDatabase();
  registerAnalyticsRoutes(app, () => db, authenticate);
  registerIntegrationRoutes(app, () => db, authenticate);

  // Catch-all: serve frontend (MUST be after all API routes)
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Logistics CRM API running on port ${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
