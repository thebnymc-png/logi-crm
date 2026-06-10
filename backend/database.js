const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'crm.db');
const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

setInterval(saveDatabase, 30000);
process.on('exit', saveDatabase);
process.on('SIGINT', () => { saveDatabase(); process.exit(); });
process.on('SIGTERM', () => { saveDatabase(); process.exit(); });

class DatabaseWrapper {
  constructor(sqlDb) {
    this.db = sqlDb;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self.db.run(sql, params);
        const lastId = self.db.exec("SELECT last_insert_rowid() as id")[0]?.values[0][0];
        const changes = self.db.getRowsModified();
        saveDatabase();
        return { lastInsertRowid: lastId, changes };
      },
      get(...params) {
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((col, i) => row[col] = vals[i]);
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const results = [];
        const stmt = self.db.prepare(sql);
        stmt.bind(params);
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((col, i) => row[col] = vals[i]);
          results.push(row);
        }
        stmt.free();
        return results;
      }
    };
  }

  exec(sql) {
    this.db.exec(sql);
    saveDatabase();
  }

  pragma(str) {
    try {
      this.db.exec(`PRAGMA ${str}`);
    } catch(e) {}
  }
}

async function initializeDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const wrapper = new DatabaseWrapper(db);
  
  wrapper.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      role TEXT DEFAULT 'sales_rep',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'prospect',
      industry TEXT,
      website TEXT,
      phone TEXT,
      email TEXT,
      address_line1 TEXT,
      address_line2 TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      country TEXT DEFAULT 'US',
      annual_revenue REAL,
      employee_count INTEGER,
      shipping_volume_monthly INTEGER,
      primary_modes TEXT,
      primary_lanes TEXT,
      current_carrier TEXT,
      contract_start DATE,
      contract_end DATE,
      account_health TEXT DEFAULT 'good',
      owner_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      title TEXT,
      department TEXT,
      email TEXT,
      phone TEXT,
      mobile TEXT,
      is_primary INTEGER DEFAULT 0,
      is_decision_maker INTEGER DEFAULT 0,
      linkedin TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      account_id INTEGER,
      contact_id INTEGER,
      owner_id INTEGER,
      stage TEXT DEFAULT 'prospecting',
      value REAL DEFAULT 0,
      probability INTEGER DEFAULT 10,
      expected_close_date DATE,
      actual_close_date DATE,
      service_type TEXT,
      origin TEXT,
      destination TEXT,
      frequency TEXT,
      estimated_volume TEXT,
      competitor TEXT,
      loss_reason TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT,
      account_id INTEGER,
      contact_id INTEGER,
      deal_id INTEGER,
      owner_id INTEGER,
      status TEXT DEFAULT 'completed',
      due_date DATETIME,
      completed_at DATETIME,
      duration_minutes INTEGER,
      outcome TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quote_number TEXT UNIQUE NOT NULL,
      deal_id INTEGER,
      account_id INTEGER,
      contact_id INTEGER,
      owner_id INTEGER,
      status TEXT DEFAULT 'draft',
      origin TEXT,
      destination TEXT,
      service_type TEXT,
      mode TEXT,
      weight REAL,
      weight_unit TEXT DEFAULT 'lbs',
      dimensions TEXT,
      commodity TEXT,
      special_requirements TEXT,
      base_rate REAL,
      fuel_surcharge REAL DEFAULT 0,
      accessorial_charges REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      total_amount REAL,
      currency TEXT DEFAULT 'USD',
      valid_from DATE,
      valid_until DATE,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'follow_up',
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date DATETIME,
      completed_at DATETIME,
      account_id INTEGER,
      contact_id INTEGER,
      deal_id INTEGER,
      owner_id INTEGER,
      assigned_to INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS lanes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      origin_city TEXT,
      origin_state TEXT,
      origin_zip TEXT,
      destination_city TEXT,
      destination_state TEXT,
      destination_zip TEXT,
      mode TEXT,
      frequency TEXT,
      avg_volume_per_shipment REAL,
      current_rate REAL,
      target_rate REAL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      account_id INTEGER,
      contact_id INTEGER,
      deal_id INTEGER,
      owner_id INTEGER,
      status TEXT DEFAULT 'draft',
      type TEXT DEFAULT 'service_agreement',
      priority TEXT DEFAULT 'medium',
      value REAL DEFAULT 0,
      monthly_value REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      service_type TEXT,
      origin TEXT,
      destination TEXT,
      mode TEXT,
      frequency TEXT,
      volume_commitment TEXT,
      sla_terms TEXT,
      difot_target REAL DEFAULT 95.0,
      payment_terms TEXT DEFAULT 'Net 30',
      auto_renew INTEGER DEFAULT 0,
      start_date DATE,
      end_date DATE,
      renewal_date DATE,
      signed_date DATE,
      terminated_date DATE,
      termination_reason TEXT,
      notes TEXT,
      group_name TEXT DEFAULT 'Active Contracts',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS revenue_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      year INTEGER NOT NULL,
      revenue REAL DEFAULT 0,
      target REAL DEFAULT 0,
      deals_closed INTEGER DEFAULT 0,
      new_accounts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'connected',
      config TEXT DEFAULT '{}',
      sync_settings TEXT DEFAULT '{}',
      last_sync DATETIME,
      sync_count INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integration_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      message TEXT,
      details TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      event_type TEXT,
      payload TEXT DEFAULT '{}',
      status TEXT DEFAULT 'received',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS field_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      integration_id INTEGER NOT NULL,
      entity_type TEXT NOT NULL,
      source_field TEXT NOT NULL,
      target_field TEXT NOT NULL,
      transform TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const userCount = wrapper.prepare('SELECT COUNT(*) as count FROM users').get();
  if (userCount.count === 0) {
    seedDemoData(wrapper);
  }

  return wrapper;
}

function seedDemoData(wrapper) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  wrapper.prepare('INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)').run('admin@logisticscrm.com', hashedPassword, 'Admin', 'User', 'admin');
  wrapper.prepare('INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)').run('sarah.j@logisticscrm.com', hashedPassword, 'Sarah', 'Johnson', 'sales_rep');
  wrapper.prepare('INSERT INTO users (email, password, first_name, last_name, role) VALUES (?, ?, ?, ?, ?)').run('mike.r@logisticscrm.com', hashedPassword, 'Mike', 'Rodriguez', 'sales_rep');

  // 12 accounts with realistic logistics data
  const accounts = [
    ['Global Freight Solutions', 'customer', 'Manufacturing', 'www.globalfreight.com', '(312) 555-4567', 'info@globalfreight.com', '1200 Industrial Blvd', '', 'Chicago', 'IL', '60601', 'US', 85000000, 450, 320, '["FTL", "LTL"]', 'XPO Logistics', '2025-01-01', '2027-12-31', 'excellent'],
    ['Pacific Trade Corp', 'customer', 'Retail', 'www.pacifictrade.com', '(310) 555-5678', 'logistics@pacifictrade.com', '8800 Harbor Dr', 'Suite 200', 'Los Angeles', 'CA', '90001', 'US', 120000000, 800, 480, '["Ocean", "FTL", "Drayage"]', 'Maersk', '2025-03-01', '2027-02-28', 'good'],
    ['Midwest Distribution Inc', 'prospect', 'Distribution', 'www.midwestdist.com', '(317) 555-6789', 'ops@midwestdist.com', '500 Logistics Way', '', 'Indianapolis', 'IN', '46201', 'US', 45000000, 200, 180, '["LTL", "Intermodal"]', 'Old Dominion', '2025-06-01', '2026-05-31', 'good'],
    ['TechParts International', 'customer', 'Technology', 'www.techparts.com', '(214) 555-7890', 'supply@techparts.com', '2400 Tech Center Dr', '', 'Dallas', 'TX', '75201', 'US', 200000000, 1200, 150, '["Air", "FTL", "White Glove"]', 'FedEx Supply Chain', '2024-09-01', '2026-08-31', 'at_risk'],
    ['Eastern Seaboard Logistics', 'customer', 'Transportation', 'www.eslogistics.com', '(973) 555-8901', 'dispatch@eslogistics.com', '100 Port Newark Rd', '', 'Newark', 'NJ', '07101', 'US', 65000000, 350, 600, '["FTL", "LTL", "Intermodal", "Drayage"]', 'Partner', '2025-01-01', '2028-12-31', 'excellent'],
    ['FreshFoods Supply Chain', 'prospect', 'Food & Beverage', 'www.freshfoods.com', '(404) 555-9012', 'logistics@freshfoods.com', '3300 Peachtree Rd', 'Floor 8', 'Atlanta', 'GA', '30301', 'US', 95000000, 600, 280, '["Refrigerated", "LTL", "Last Mile"]', 'Lineage Logistics', '2025-04-01', '2026-03-31', 'good'],
    ['AutoParts Direct', 'customer', 'Automotive', 'www.autopartsdirect.com', '(313) 555-0123', 'shipping@autopartsdirect.com', '7700 Assembly Dr', '', 'Detroit', 'MI', '48201', 'US', 55000000, 280, 220, '["FTL", "LTL", "JIT"]', 'Ryder', '2025-02-01', '2027-01-31', 'good'],
    ['Sunrise Pharmaceuticals', 'prospect', 'Healthcare', 'www.sunrisepharma.com', '(617) 555-1234', 'supply@sunrisepharma.com', '200 Research Park', 'Bldg C', 'Boston', 'MA', '02101', 'US', 300000000, 2000, 95, '["Air", "Temperature Controlled", "White Glove"]', 'UPS Healthcare', '2025-07-01', '2026-06-30', 'good'],
    ['Continental Chemicals', 'customer', 'Chemical', 'www.contchem.com', '(713) 555-2345', 'logistics@contchem.com', '4500 Refinery Rd', '', 'Houston', 'TX', '77001', 'US', 180000000, 900, 350, '["Tanker", "FTL", "Hazmat"]', 'Schneider', '2024-11-01', '2026-10-31', 'good'],
    ['NorthStar E-Commerce', 'customer', 'E-Commerce', 'www.northstarecom.com', '(206) 555-3456', 'ops@northstarecom.com', '1500 Fulfillment Ave', '', 'Seattle', 'WA', '98101', 'US', 250000000, 1500, 750, '["Parcel", "LTL", "Last Mile", "FTL"]', 'Amazon Logistics', '2025-01-01', '2026-12-31', 'excellent'],
    ['SouthWest Ag Products', 'prospect', 'Agriculture', 'www.swagproducts.com', '(602) 555-4567', 'transport@swagproducts.com', '800 Farm Rd', '', 'Phoenix', 'AZ', '85001', 'US', 35000000, 150, 400, '["Flatbed", "FTL", "Bulk"]', 'Werner', '2025-05-01', '2026-04-30', 'good'],
    ['MedDevice Logistics', 'customer', 'Medical Devices', 'www.meddevicelogistics.com', '(612) 555-5678', 'shipping@meddevice.com', '300 Innovation Pkwy', 'Suite 100', 'Minneapolis', 'MN', '55401', 'US', 150000000, 700, 120, '["Air", "Temperature Controlled", "FTL"]', 'Cardinal Health', '2025-03-01', '2027-02-28', 'at_risk'],
  ];

  for (const a of accounts) {
    wrapper.prepare('INSERT INTO accounts (name, type, industry, website, phone, email, address_line1, address_line2, city, state, zip, country, annual_revenue, employee_count, shipping_volume_monthly, primary_modes, current_carrier, contract_start, contract_end, account_health, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)').run(...a);
  }

  // 16 contacts across accounts
  const contacts = [
    [1, 'John', 'Martinez', 'VP of Logistics', 'Operations', 'jmartinez@globalfreight.com', '(312) 555-4568', '(312) 555-4570', 1, 1],
    [1, 'Sarah', 'Chen', 'Shipping Manager', 'Operations', 'schen@globalfreight.com', '(312) 555-4569', null, 0, 0],
    [2, 'Michael', 'Wong', 'Supply Chain Director', 'Supply Chain', 'mwong@pacifictrade.com', '(310) 555-5679', '(310) 555-5680', 1, 1],
    [2, 'Jennifer', 'Liu', 'Import Manager', 'Logistics', 'jliu@pacifictrade.com', '(310) 555-5681', null, 0, 0],
    [3, 'Lisa', 'Johnson', 'Operations Manager', 'Operations', 'ljohnson@midwestdist.com', '(317) 555-6790', '(317) 555-6791', 1, 0],
    [4, 'David', 'Park', 'Procurement Director', 'Procurement', 'dpark@techparts.com', '(214) 555-7891', '(214) 555-7892', 1, 1],
    [4, 'Karen', 'Smith', 'Logistics Analyst', 'Supply Chain', 'ksmith@techparts.com', '(214) 555-7893', null, 0, 0],
    [5, 'Robert', 'Thompson', 'Fleet Manager', 'Operations', 'rthompson@eslogistics.com', '(973) 555-8902', '(973) 555-8903', 1, 1],
    [6, 'Amanda', 'Rivera', 'Logistics Coordinator', 'Distribution', 'arivera@freshfoods.com', '(404) 555-9013', '(404) 555-9014', 1, 0],
    [7, 'James', 'Wilson', 'Warehouse Director', 'Warehousing', 'jwilson@autopartsdirect.com', '(313) 555-0124', '(313) 555-0125', 1, 1],
    [8, 'Dr. Rachel', 'Kim', 'VP Supply Chain', 'Operations', 'rkim@sunrisepharma.com', '(617) 555-1235', '(617) 555-1236', 1, 1],
    [9, 'Tom', 'Bradley', 'Transportation Manager', 'Logistics', 'tbradley@contchem.com', '(713) 555-2346', null, 1, 0],
    [10, 'Alex', 'Nguyen', 'Head of Fulfillment', 'Operations', 'anguyen@northstarecom.com', '(206) 555-3457', '(206) 555-3458', 1, 1],
    [10, 'Priya', 'Patel', 'Logistics Manager', 'Operations', 'ppatel@northstarecom.com', '(206) 555-3459', null, 0, 0],
    [11, 'Carlos', 'Mendez', 'Fleet Coordinator', 'Transportation', 'cmendez@swagproducts.com', '(602) 555-4568', null, 1, 0],
    [12, 'Diana', 'Foster', 'Distribution Director', 'Supply Chain', 'dfoster@meddevice.com', '(612) 555-5679', '(612) 555-5680', 1, 1],
  ];

  for (const c of contacts) {
    wrapper.prepare('INSERT INTO contacts (account_id, first_name, last_name, title, department, email, phone, mobile, is_primary, is_decision_maker) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...c);
  }

  // 14 deals across various stages
  const deals = [
    ['FTL Contract - Chicago to LA', 1, 1, 'negotiation', 450000, 75, 'FTL', 'Chicago, IL', 'Los Angeles, CA', 'weekly', '2026-07-15'],
    ['Ocean Import Program', 2, 3, 'proposal', 1200000, 50, 'Ocean', 'Shanghai, CN', 'Long Beach, CA', 'monthly', '2026-08-01'],
    ['LTL Distribution Network', 3, 5, 'qualification', 280000, 30, 'LTL', 'Indianapolis, IN', 'Multiple', 'daily', '2026-09-15'],
    ['Air Freight - Electronics', 4, 6, 'prospecting', 350000, 15, 'Air Freight', 'Dallas, TX', 'New York, NY', 'weekly', '2026-10-01'],
    ['Intermodal Contract Renewal', 5, 8, 'closed_won', 890000, 100, 'Intermodal', 'Newark, NJ', 'Chicago, IL', 'daily', '2026-06-01'],
    ['Cold Chain Solution', 6, 9, 'proposal', 520000, 45, 'Refrigerated', 'Atlanta, GA', 'Southeast Region', 'daily', '2026-08-15'],
    ['Auto Parts FTL Program', 7, 10, 'negotiation', 380000, 70, 'FTL', 'Detroit, MI', 'Multiple Plants', 'daily', '2026-07-01'],
    ['Pharma Air Express', 8, 11, 'prospecting', 650000, 10, 'Air Freight', 'Boston, MA', 'National', 'weekly', '2026-11-01'],
    ['Hazmat Tanker Fleet', 9, 12, 'qualification', 720000, 35, 'Tanker', 'Houston, TX', 'Gulf Coast', 'daily', '2026-09-01'],
    ['E-Commerce Last Mile', 10, 13, 'negotiation', 1800000, 80, 'Last Mile', 'Seattle, WA', 'West Coast', 'daily', '2026-07-01'],
    ['Ag Bulk Transport', 11, 15, 'prospecting', 290000, 20, 'Flatbed', 'Phoenix, AZ', 'California', 'weekly', '2026-10-15'],
    ['MedDevice Temp Control', 12, 16, 'proposal', 480000, 40, 'Temperature Controlled', 'Minneapolis, MN', 'National', 'weekly', '2026-08-30'],
    ['Pacific Trade Drayage', 2, 4, 'closed_won', 340000, 100, 'Drayage', 'Long Beach, CA', 'LA Warehouses', 'daily', '2026-05-15'],
    ['NorthStar Parcel Program', 10, 14, 'closed_won', 2200000, 100, 'Parcel', 'Multiple', 'National', 'daily', '2026-04-01'],
    ['Global Freight LTL Expansion', 1, 2, 'closed_lost', 180000, 0, 'LTL', 'Chicago, IL', 'Midwest', 'daily', '2026-03-15'],
  ];

  for (const d of deals) {
    wrapper.prepare('INSERT INTO deals (title, account_id, contact_id, stage, value, probability, service_type, origin, destination, frequency, expected_close_date, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)').run(...d);
  }

  wrapper.prepare("UPDATE deals SET actual_close_date = '2026-05-28' WHERE id = 5").run();
  wrapper.prepare("UPDATE deals SET actual_close_date = '2026-05-10' WHERE id = 13").run();
  wrapper.prepare("UPDATE deals SET actual_close_date = '2026-03-25' WHERE id = 14").run();
  wrapper.prepare("UPDATE deals SET actual_close_date = '2026-03-10' WHERE id = 15").run();

  // 20 activities with realistic dates
  const activities = [
    ['call', 'Discovery call with John Martinez', 'Discussed current FTL needs and pain points with existing carrier', 1, 1, 1, 'completed', 30, 'Interested in expanding FTL lanes, unhappy with current transit times', '2026-05-20'],
    ['meeting', 'Rate review meeting - Pacific Trade', 'Presented competitive ocean import rates vs Maersk', 2, 3, 2, 'completed', 60, 'Presented ocean import rates, client requested revised proposal', '2026-05-22'],
    ['email', 'Sent proposal for LTL network', 'Detailed LTL network proposal with volume discounts', 3, 5, 3, 'completed', 15, 'Awaiting response, follow up in 3 days', '2026-05-25'],
    ['call', 'Follow-up on air freight quote', 'Called David to discuss air freight pricing', 4, 6, 4, 'completed', 20, 'Needs board approval, will know by end of month', '2026-05-28'],
    ['meeting', 'Contract signing - Intermodal', 'Final contract review and signing ceremony', 5, 8, 5, 'completed', 45, 'Contract signed for 2 years, $890K annual value', '2026-05-28'],
    ['note', 'Competitive intel - FreshFoods', 'Gathered intel on current provider', 6, 9, 6, 'completed', null, 'Currently using Lineage, unhappy with service levels and visibility', '2026-05-30'],
    ['call', 'Cold call - Sunrise Pharma', 'Initial outreach to VP Supply Chain', 8, 11, 8, 'completed', 15, 'Very interested, needs temperature-controlled air freight', '2026-06-01'],
    ['meeting', 'Quarterly review - AutoParts', 'Q1 performance review with James Wilson', 7, 10, 7, 'completed', 90, 'Happy with service, discussing expansion to new plants', '2026-06-02'],
    ['email', 'E-Commerce proposal sent', 'Comprehensive last-mile delivery proposal', 10, 13, 10, 'completed', 20, 'Proposal well received, scheduling follow-up meeting', '2026-06-03'],
    ['call', 'Hazmat requirements discussion', 'Discussed DOT compliance and tanker specs', 9, 12, 9, 'completed', 45, 'Need to provide safety records and certifications', '2026-06-03'],
    ['meeting', 'NorthStar contract finalization', 'Final terms negotiation for parcel program', 10, 13, 14, 'completed', 120, 'Signed $2.2M annual contract, biggest win this quarter', '2026-03-25'],
    ['call', 'MedDevice cold chain inquiry', 'Initial discussion about temperature requirements', 12, 16, 12, 'completed', 25, 'Needs 2-8°C control, GDP compliance required', '2026-06-04'],
    ['email', 'Follow-up: Continental Chemicals', 'Sent hazmat certification documents', 9, 12, 9, 'completed', 10, 'Documents sent, awaiting review by safety team', '2026-06-05'],
    ['meeting', 'Pacific Trade drayage kickoff', 'Operational kickoff for new drayage contract', 2, 4, 13, 'completed', 60, 'Operations team aligned, starting service next week', '2026-05-12'],
    ['call', 'SouthWest Ag - intro call', 'First contact with fleet coordinator', 11, 15, 11, 'completed', 20, 'Interested in flatbed services for seasonal peaks', '2026-06-05'],
    ['note', 'TechParts risk assessment', 'Internal note on account risk factors', 4, 6, 4, 'completed', null, 'Contract expires Aug 2026, competitor FedEx aggressively pricing. Need retention strategy.', '2026-06-06'],
    ['email', 'Midwest Distribution - site visit request', 'Requesting facility tour for network design', 3, 5, 3, 'completed', 10, 'Site visit confirmed for June 12', '2026-06-06'],
    ['call', 'E-Commerce last mile negotiation', 'Pricing discussion for west coast coverage', 10, 13, 10, 'completed', 35, 'Agreed on per-package rates, finalizing SLA terms', '2026-06-06'],
    ['meeting', 'FreshFoods cold chain demo', 'Temperature monitoring tech demonstration', 6, 9, 6, 'planned', null, null, '2026-06-10'],
    ['call', 'Global Freight - rate negotiation', 'Final rate discussion for Chicago-LA lane', 1, 1, 1, 'planned', null, null, '2026-06-09'],
  ];

  for (const a of activities) {
    wrapper.prepare("INSERT INTO activities (type, subject, description, account_id, contact_id, deal_id, status, duration_minutes, outcome, owner_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime(?, '+' || abs(random() % 8) || ' hours'))").run(a[0], a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]);
  }

  // 12 tasks
  const tasks = [
    ['Follow up with John Martinez on FTL rates', 'Discuss revised pricing for Chicago-LA lane', 'follow_up', 'high', 'pending', '2026-06-10', 1, 1, 1],
    ['Send revised ocean import proposal', 'Include updated fuel surcharge and volume discounts', 'proposal', 'high', 'in_progress', '2026-06-08', 2, 3, 2],
    ['Schedule site visit - Midwest Distribution', 'Tour Indianapolis facility for network design', 'meeting', 'medium', 'pending', '2026-06-12', 3, 5, 3],
    ['Research TechParts current carrier rates', 'Competitive analysis vs FedEx Supply Chain pricing', 'other', 'medium', 'pending', '2026-06-15', 4, 6, 4],
    ['Call Amanda Rivera - Cold chain requirements', 'Discuss temperature monitoring and compliance needs', 'call', 'urgent', 'pending', '2026-06-07', 6, 9, 6],
    ['Prepare quarterly review for AutoParts Direct', 'Compile Q2 performance metrics and expansion plan', 'other', 'low', 'pending', '2026-06-20', 7, 10, 7],
    ['Send hazmat certifications to Continental', 'Compile DOT and EPA compliance documentation', 'email', 'high', 'in_progress', '2026-06-09', 9, 12, 9],
    ['Finalize E-Commerce SLA terms', 'Draft final SLA document for NorthStar review', 'proposal', 'urgent', 'pending', '2026-06-08', 10, 13, 10],
    ['Prepare MedDevice GDP compliance docs', 'Gather Good Distribution Practice certifications', 'other', 'medium', 'pending', '2026-06-18', 12, 16, 12],
    ['Follow up with Sunrise Pharma', 'Send temperature-controlled air freight capabilities deck', 'follow_up', 'high', 'pending', '2026-06-11', 8, 11, 8],
    ['Create retention plan for TechParts', 'Develop strategy to prevent churn before contract renewal', 'other', 'urgent', 'pending', '2026-06-09', 4, 6, 4],
    ['Ag Products seasonal capacity plan', 'Model flatbed capacity needs for harvest season', 'other', 'low', 'pending', '2026-06-25', 11, 15, 11],
  ];

  for (const t of tasks) {
    wrapper.prepare('INSERT INTO tasks (title, description, type, priority, status, due_date, account_id, contact_id, deal_id, owner_id, assigned_to) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1)').run(...t);
  }

  // 8 quotes
  const quotes = [
    ['Q-2026-001', 1, 1, 1, 'sent', 'Chicago, IL', 'Los Angeles, CA', 'FTL', 'Truckload', 42000, 'Industrial Equipment', 3200, 480, 150, 0, 3830, '2026-06-01', '2026-06-30'],
    ['Q-2026-002', 2, 2, 3, 'draft', 'Shanghai, CN', 'Long Beach, CA', 'Ocean', 'FCL', 18000, 'Consumer Electronics', 4500, 675, 200, 5, 5108, '2026-06-01', '2026-07-15'],
    ['Q-2026-003', 6, 6, 9, 'sent', 'Atlanta, GA', 'Miami, FL', 'Refrigerated', 'Reefer', 35000, 'Fresh Produce', 2800, 420, 180, 0, 3400, '2026-06-01', '2026-06-30'],
    ['Q-2026-004', 9, 9, 12, 'draft', 'Houston, TX', 'Baton Rouge, LA', 'Tanker', 'Hazmat', 44000, 'Chemical Compounds', 5200, 780, 350, 0, 6330, '2026-06-03', '2026-07-03'],
    ['Q-2026-005', 10, 10, 13, 'accepted', 'Seattle, WA', 'Portland, OR', 'Last Mile', 'Parcel', 500, 'E-Commerce Packages', 1.85, 0.28, 0, 10, 1.92, '2026-05-15', '2026-06-15'],
    ['Q-2026-006', 12, 12, 16, 'sent', 'Minneapolis, MN', 'Chicago, IL', 'Temperature Controlled', 'Reefer', 8000, 'Medical Devices', 4800, 720, 250, 0, 5770, '2026-06-04', '2026-07-04'],
    ['Q-2026-007', 7, 7, 10, 'accepted', 'Detroit, MI', 'Toledo, OH', 'FTL', 'Truckload', 38000, 'Auto Parts', 2400, 360, 100, 5, 2717, '2026-05-20', '2026-06-20'],
    ['Q-2026-008', 11, 11, 15, 'draft', 'Phoenix, AZ', 'Bakersfield, CA', 'Flatbed', 'Flatbed', 48000, 'Agricultural Products', 2900, 435, 0, 0, 3335, '2026-06-05', '2026-07-05'],
  ];

  for (const q of quotes) {
    wrapper.prepare('INSERT INTO quotes (quote_number, deal_id, account_id, contact_id, status, origin, destination, service_type, mode, weight, commodity, base_rate, fuel_surcharge, accessorial_charges, discount_percent, total_amount, valid_from, valid_until, owner_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)').run(...q);
  }

  // Revenue history for charts
  const revenueHistory = [
    ['2025-07', 2025, 320000, 350000, 3, 1],
    ['2025-08', 2025, 410000, 350000, 4, 0],
    ['2025-09', 2025, 380000, 400000, 3, 2],
    ['2025-10', 2025, 520000, 400000, 5, 1],
    ['2025-11', 2025, 480000, 450000, 4, 1],
    ['2025-12', 2025, 610000, 450000, 6, 0],
    ['2026-01', 2026, 450000, 500000, 4, 2],
    ['2026-02', 2026, 580000, 500000, 5, 1],
    ['2026-03', 2026, 2540000, 550000, 8, 1],
    ['2026-04', 2026, 680000, 550000, 5, 2],
    ['2026-05', 2026, 1230000, 600000, 7, 1],
    ['2026-06', 2026, 450000, 600000, 3, 1],
  ];

  for (const r of revenueHistory) {
    wrapper.prepare('INSERT INTO revenue_history (month, year, revenue, target, deals_closed, new_accounts) VALUES (?, ?, ?, ?, ?, ?)').run(...r);
  }

  // Lanes
  const lanes = [
    [1, 'Chicago', 'IL', '60601', 'Los Angeles', 'CA', '90001', 'FTL', 'weekly', 42000, 3200, 2900],
    [1, 'Chicago', 'IL', '60601', 'Dallas', 'TX', '75201', 'LTL', 'daily', 8000, 850, 780],
    [2, 'Long Beach', 'CA', '90802', 'Los Angeles', 'CA', '90001', 'Drayage', 'daily', 40000, 450, 400],
    [5, 'Newark', 'NJ', '07101', 'Chicago', 'IL', '60601', 'Intermodal', 'daily', 44000, 2800, 2600],
    [7, 'Detroit', 'MI', '48201', 'Toledo', 'OH', '43601', 'FTL', 'daily', 38000, 2400, 2200],
    [9, 'Houston', 'TX', '77001', 'Baton Rouge', 'LA', '70801', 'Tanker', 'daily', 44000, 5200, 4800],
    [10, 'Seattle', 'WA', '98101', 'Portland', 'OR', '97201', 'Last Mile', 'daily', 500, 1.85, 1.70],
  ];

  for (const l of lanes) {
    wrapper.prepare('INSERT INTO lanes (account_id, origin_city, origin_state, origin_zip, destination_city, destination_state, destination_zip, mode, frequency, avg_volume_per_shipment, current_rate, target_rate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...l);
  }

  // Contracts
  const contracts = [
    ['CTR-2026-001', 'Global Freight FTL Master Agreement', 1, 1, 1, 1, 'active', 'master_agreement', 'high', 2400000, 200000, 'USD', 'FTL', 'Chicago, IL', 'Los Angeles, CA', 'FTL', 'Weekly', '320 loads/month', '99% on-time delivery, 24hr response', 97.5, 'Net 30', 1, '2025-01-01', '2027-12-31', '2027-06-01', '2025-01-15', null, null, null, 'Active Contracts'],
    ['CTR-2026-002', 'Pacific Trade Ocean Import Program', 2, 3, 2, 1, 'active', 'service_agreement', 'high', 3600000, 300000, 'USD', 'Ocean', 'Shanghai, CN', 'Long Beach, CA', 'Ocean', 'Daily', '480 TEU/month', '95% DIFOT, 48hr dwell time max', 95.0, 'Net 45', 1, '2025-03-01', '2027-02-28', '2026-09-01', '2025-03-10', null, null, null, 'Active Contracts'],
    ['CTR-2026-003', 'NorthStar Last Mile Delivery', 10, 14, 8, 1, 'active', 'service_agreement', 'high', 5400000, 450000, 'USD', 'Last Mile', 'Seattle, WA', 'West Coast', 'Last Mile', 'Daily', '750 deliveries/day', '99.5% delivery success, same-day', 99.0, 'Net 15', 1, '2025-01-01', '2026-12-31', '2026-06-01', '2025-01-05', null, null, null, 'Active Contracts'],
    ['CTR-2026-004', 'Eastern Seaboard Intermodal Contract', 5, 8, 5, 1, 'active', 'rate_agreement', 'medium', 1800000, 150000, 'USD', 'Intermodal', 'Newark, NJ', 'Chicago, IL', 'Intermodal', 'Daily', '600 containers/month', '96% on-time, max 5-day transit', 96.0, 'Net 30', 1, '2025-01-01', '2028-12-31', '2027-06-01', '2025-01-20', null, null, null, 'Active Contracts'],
    ['CTR-2026-005', 'AutoParts JIT Supply Chain', 7, 10, 6, 1, 'active', 'service_agreement', 'medium', 960000, 80000, 'USD', 'FTL', 'Detroit, MI', 'Multiple Plants', 'FTL', 'Daily', '220 loads/month', 'JIT delivery within 2hr window, zero defect', 98.0, 'Net 30', 0, '2025-02-01', '2027-01-31', '2026-08-01', '2025-02-10', null, null, null, 'Active Contracts'],
    ['CTR-2026-006', 'Continental Chemicals Hazmat Transport', 9, 13, 9, 1, 'active', 'master_agreement', 'high', 2160000, 180000, 'USD', 'Tanker', 'Houston, TX', 'Gulf Coast', 'Tanker', 'Daily', '350 tanker loads/month', 'Hazmat compliance, 100% safety record', 99.5, 'Net 30', 1, '2024-11-01', '2026-10-31', '2026-05-01', '2024-11-15', null, null, null, 'Active Contracts'],
    ['CTR-2026-007', 'Sunrise Pharma Cold Chain', 8, 11, 10, 1, 'pending_signature', 'service_agreement', 'high', 1920000, 160000, 'USD', 'Temperature Controlled', 'Boston, MA', 'National', 'Air', 'Daily', '95 shipments/week', 'GDP compliant, 2-8C maintained, real-time monitoring', 99.0, 'Net 45', 0, '2026-07-01', '2028-06-30', null, null, null, null, null, 'Pending Approval'],
    ['CTR-2026-008', 'FreshFoods Refrigerated Distribution', 6, 9, 7, 1, 'in_review', 'rate_agreement', 'medium', 1440000, 120000, 'USD', 'Refrigerated', 'Atlanta, GA', 'Southeast Region', 'Refrigerated', 'Daily', '280 loads/month', '98% temp compliance, 24hr delivery window', 98.0, 'Net 30', 1, '2026-06-01', '2027-05-31', null, null, null, null, null, 'Pending Approval'],
    ['CTR-2026-009', 'Midwest Distribution LTL Network', 3, 5, 3, 1, 'draft', 'rate_agreement', 'low', 720000, 60000, 'USD', 'LTL', 'Indianapolis, IN', 'Multiple', 'LTL', 'Daily', '180 shipments/week', '95% on-time, next-day within 500mi', 95.0, 'Net 30', 0, '2026-08-01', '2027-07-31', null, null, null, null, null, 'Drafts'],
    ['CTR-2026-010', 'TechParts Air Freight Express', 4, 6, 4, 1, 'expired', 'service_agreement', 'medium', 840000, 70000, 'USD', 'Air Freight', 'Dallas, TX', 'New York, NY', 'Air', 'Daily', '150 shipments/week', '99% on-time, priority handling', 97.0, 'Net 30', 0, '2024-09-01', '2026-05-31', null, '2024-09-10', null, null, null, 'Expired'],
    ['CTR-2026-011', 'MedDevice GDP Logistics', 12, 16, 11, 1, 'at_risk', 'service_agreement', 'high', 1080000, 90000, 'USD', 'Temperature Controlled', 'Minneapolis, MN', 'National', 'FTL', 'Daily', '120 shipments/week', 'GDP compliant, validated packaging, 15-25C', 97.0, 'Net 45', 1, '2025-03-01', '2027-02-28', '2026-09-01', '2025-03-15', null, null, null, 'At Risk'],
    ['CTR-2026-012', 'SouthWest Ag Seasonal Bulk', 11, 15, 12, 1, 'draft', 'rate_agreement', 'low', 480000, 40000, 'USD', 'Flatbed', 'Phoenix, AZ', 'California', 'Flatbed', 'Seasonal', '400 loads/season', '90% on-time, weather-dependent flex', 90.0, 'Net 60', 0, '2026-09-01', '2027-03-31', null, null, null, null, null, 'Drafts'],
  ];

  for (const c of contracts) {
    wrapper.prepare('INSERT INTO contracts (contract_number, title, account_id, contact_id, deal_id, owner_id, status, type, priority, value, monthly_value, currency, service_type, origin, destination, mode, frequency, volume_commitment, sla_terms, difot_target, payment_terms, auto_renew, start_date, end_date, renewal_date, signed_date, terminated_date, termination_reason, notes, group_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(...c);
  }

  saveDatabase();
}

module.exports = { initializeDatabase };
