// ==================== INTEGRATIONS ENGINE ====================
// Comprehensive integration layer for TMS, WMS, ERP, Freight Platforms, and Tracking Providers

function registerIntegrationRoutes(app, getDb, authenticate) {

  // ==================== INTEGRATION CONFIGURATIONS ====================
  
  // Available integration providers catalog
  const PROVIDERS = {
    // TMS Systems
    oracle_tms: { id: 'oracle_tms', name: 'Oracle TMS', category: 'tms', icon: '🔶', description: 'Oracle Transportation Management System', capabilities: ['shipments', 'rates', 'carriers', 'tracking', 'orders'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'instance_url', 'environment'] },
    mercurygate: { id: 'mercurygate', name: 'MercuryGate', category: 'tms', icon: '🌐', description: 'MercuryGate TMS Platform', capabilities: ['shipments', 'rates', 'carriers', 'tracking', 'load_planning'], auth_type: 'api_key', fields: ['api_key', 'api_secret', 'base_url'] },
    blujay: { id: 'blujay', name: 'BluJay Solutions', category: 'tms', icon: '🔵', description: 'BluJay Transportation Management', capabilities: ['shipments', 'rates', 'tracking', 'compliance'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'tenant_id'] },
    trimble_tms: { id: 'trimble_tms', name: 'Trimble TMS', category: 'tms', icon: '📐', description: 'Trimble Transportation Management', capabilities: ['shipments', 'rates', 'carriers', 'fleet_tracking'], auth_type: 'api_key', fields: ['api_key', 'company_id', 'environment'] },
    kuebix: { id: 'kuebix', name: 'Kuebix TMS', category: 'tms', icon: '📦', description: 'Kuebix Community TMS', capabilities: ['shipments', 'rates', 'carriers', 'analytics'], auth_type: 'api_key', fields: ['api_key', 'account_id'] },
    
    // WMS Systems
    manhattan_wms: { id: 'manhattan_wms', name: 'Manhattan WMS', category: 'wms', icon: '🏢', description: 'Manhattan Associates WMS', capabilities: ['inventory', 'orders', 'receiving', 'shipping', 'labor'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'instance_url', 'warehouse_id'] },
    blue_yonder_wms: { id: 'blue_yonder_wms', name: 'Blue Yonder WMS', category: 'wms', icon: '🟦', description: 'Blue Yonder Warehouse Management', capabilities: ['inventory', 'orders', 'fulfillment', 'labor_mgmt'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'tenant_url'] },
    sap_ewm: { id: 'sap_ewm', name: 'SAP EWM', category: 'wms', icon: '🟡', description: 'SAP Extended Warehouse Management', capabilities: ['inventory', 'orders', 'receiving', 'shipping', 'slotting'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'sap_url', 'system_id'] },
    
    // ERP Systems
    sap_erp: { id: 'sap_erp', name: 'SAP S/4HANA', category: 'erp', icon: '🟡', description: 'SAP S/4HANA Enterprise Resource Planning', capabilities: ['customers', 'orders', 'invoices', 'materials', 'financials'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'sap_url', 'company_code'] },
    oracle_erp: { id: 'oracle_erp', name: 'Oracle NetSuite', category: 'erp', icon: '🔶', description: 'Oracle NetSuite ERP', capabilities: ['customers', 'orders', 'invoices', 'inventory', 'financials'], auth_type: 'oauth2', fields: ['account_id', 'consumer_key', 'consumer_secret', 'token_id', 'token_secret'] },
    dynamics_365: { id: 'dynamics_365', name: 'Microsoft Dynamics 365', category: 'erp', icon: '🟪', description: 'Microsoft Dynamics 365 Supply Chain', capabilities: ['customers', 'orders', 'invoices', 'warehouse', 'transport'], auth_type: 'oauth2', fields: ['tenant_id', 'client_id', 'client_secret', 'resource_url'] },
    
    // Freight Platforms
    flexport: { id: 'flexport', name: 'Flexport', category: 'freight', icon: '🚢', description: 'Flexport Digital Freight Platform', capabilities: ['shipments', 'tracking', 'documents', 'rates', 'bookings'], auth_type: 'api_key', fields: ['api_key', 'api_version'] },
    project44: { id: 'project44', name: 'project44', category: 'freight', icon: '📍', description: 'project44 Visibility Platform', capabilities: ['tracking', 'eta', 'events', 'analytics'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'environment'] },
    fourkites: { id: 'fourkites', name: 'FourKites', category: 'freight', icon: '🪁', description: 'FourKites Supply Chain Visibility', capabilities: ['tracking', 'eta', 'events', 'yard_mgmt'], auth_type: 'api_key', fields: ['api_key', 'customer_id'] },
    freightos: { id: 'freightos', name: 'Freightos', category: 'freight', icon: '💰', description: 'Freightos Rate Management', capabilities: ['rates', 'bookings', 'quotes', 'analytics'], auth_type: 'api_key', fields: ['api_key', 'account_id'] },
    
    // Carrier Integrations
    fedex: { id: 'fedex', name: 'FedEx', category: 'carrier', icon: '📮', description: 'FedEx Shipping & Tracking API', capabilities: ['tracking', 'rates', 'labels', 'pickup'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'account_number'] },
    ups: { id: 'ups', name: 'UPS', category: 'carrier', icon: '📦', description: 'UPS Shipping & Tracking API', capabilities: ['tracking', 'rates', 'labels', 'pickup', 'time_in_transit'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'account_number', 'access_license'] },
    dhl: { id: 'dhl', name: 'DHL', category: 'carrier', icon: '✈️', description: 'DHL Express & Global Forwarding', capabilities: ['tracking', 'rates', 'labels', 'pickup', 'customs'], auth_type: 'api_key', fields: ['api_key', 'site_id', 'password'] },
    maersk: { id: 'maersk', name: 'Maersk', category: 'carrier', icon: '🚢', description: 'Maersk Container Shipping', capabilities: ['tracking', 'schedules', 'bookings', 'rates'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'consumer_key'] },
    
    // Communication & Productivity
    salesforce: { id: 'salesforce', name: 'Salesforce', category: 'crm', icon: '☁️', description: 'Salesforce CRM Sync', capabilities: ['contacts', 'accounts', 'opportunities', 'activities'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'instance_url', 'refresh_token'] },
    hubspot: { id: 'hubspot', name: 'HubSpot', category: 'crm', icon: '🟠', description: 'HubSpot CRM & Marketing', capabilities: ['contacts', 'companies', 'deals', 'emails', 'activities'], auth_type: 'oauth2', fields: ['api_key', 'portal_id'] },
    slack: { id: 'slack', name: 'Slack', category: 'communication', icon: '💬', description: 'Slack Notifications & Alerts', capabilities: ['notifications', 'alerts', 'channels'], auth_type: 'oauth2', fields: ['bot_token', 'signing_secret', 'channel_id'] },
    microsoft_teams: { id: 'microsoft_teams', name: 'Microsoft Teams', category: 'communication', icon: '🟪', description: 'Teams Notifications & Channels', capabilities: ['notifications', 'alerts', 'channels'], auth_type: 'oauth2', fields: ['tenant_id', 'client_id', 'client_secret', 'webhook_url'] },
    
    // Document & Email
    gmail: { id: 'gmail', name: 'Gmail', category: 'email', icon: '📧', description: 'Gmail Email Sync & Tracking', capabilities: ['email_sync', 'send', 'tracking', 'templates'], auth_type: 'oauth2', fields: ['client_id', 'client_secret', 'refresh_token'] },
    outlook: { id: 'outlook', name: 'Microsoft Outlook', category: 'email', icon: '📬', description: 'Outlook Email & Calendar Sync', capabilities: ['email_sync', 'send', 'calendar', 'contacts'], auth_type: 'oauth2', fields: ['tenant_id', 'client_id', 'client_secret'] },
    docusign: { id: 'docusign', name: 'DocuSign', category: 'documents', icon: '✍️', description: 'DocuSign e-Signatures for Contracts', capabilities: ['signatures', 'templates', 'envelopes', 'status'], auth_type: 'oauth2', fields: ['integration_key', 'secret_key', 'account_id', 'base_url'] },
  };

  // ==================== GET ALL PROVIDERS ====================
  app.get('/api/integrations/providers', authenticate, (req, res) => {
    const { category } = req.query;
    let providers = Object.values(PROVIDERS);
    if (category && category !== 'all') {
      providers = providers.filter(p => p.category === category);
    }
    res.json(providers);
  });

  // ==================== GET CONNECTED INTEGRATIONS ====================
  app.get('/api/integrations', authenticate, (req, res) => {
    const db = getDb();
    const integrations = db.prepare('SELECT * FROM integrations ORDER BY updated_at DESC').all();
    res.json(integrations.map(i => ({
      ...i,
      config: JSON.parse(i.config || '{}'),
      sync_settings: JSON.parse(i.sync_settings || '{}'),
      provider: PROVIDERS[i.provider_id] || null
    })));
  });

  // ==================== GET SINGLE INTEGRATION ====================
  app.get('/api/integrations/:id', authenticate, (req, res) => {
    const db = getDb();
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    res.json({
      ...integration,
      config: JSON.parse(integration.config || '{}'),
      sync_settings: JSON.parse(integration.sync_settings || '{}'),
      provider: PROVIDERS[integration.provider_id] || null
    });
  });

  // ==================== CONNECT NEW INTEGRATION ====================
  app.post('/api/integrations', authenticate, (req, res) => {
    const db = getDb();
    const { provider_id, name, config, sync_settings } = req.body;
    const provider = PROVIDERS[provider_id];
    if (!provider) return res.status(400).json({ error: 'Invalid provider' });
    
    const id = db.prepare(`INSERT INTO integrations (provider_id, name, category, status, config, sync_settings, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`).run(
      provider_id,
      name || provider.name,
      provider.category,
      'connected',
      JSON.stringify(config || {}),
      JSON.stringify(sync_settings || { auto_sync: true, interval: '15min', direction: 'bidirectional' }),
      req.user.id
    );
    
    // Log the connection event
    db.prepare(`INSERT INTO integration_logs (integration_id, event_type, status, message, created_at) VALUES (?, 'connection', 'success', 'Integration connected successfully', datetime('now'))`).run(id.lastInsertRowid);
    
    res.json({ id: id.lastInsertRowid, message: 'Integration connected successfully' });
  });

  // ==================== UPDATE INTEGRATION ====================
  app.put('/api/integrations/:id', authenticate, (req, res) => {
    const db = getDb();
    const { name, config, sync_settings, status } = req.body;
    const updates = [];
    const values = [];
    
    if (name) { updates.push('name = ?'); values.push(name); }
    if (config) { updates.push('config = ?'); values.push(JSON.stringify(config)); }
    if (sync_settings) { updates.push('sync_settings = ?'); values.push(JSON.stringify(sync_settings)); }
    if (status) { updates.push('status = ?'); values.push(status); }
    updates.push("updated_at = datetime('now')");
    values.push(req.params.id);
    
    db.prepare(`UPDATE integrations SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    res.json({ message: 'Integration updated' });
  });

  // ==================== DELETE INTEGRATION ====================
  app.delete('/api/integrations/:id', authenticate, (req, res) => {
    const db = getDb();
    db.prepare('DELETE FROM integration_logs WHERE integration_id = ?').run(req.params.id);
    db.prepare('DELETE FROM integrations WHERE id = ?').run(req.params.id);
    res.json({ message: 'Integration disconnected' });
  });

  // ==================== SYNC INTEGRATION ====================
  app.post('/api/integrations/:id/sync', authenticate, (req, res) => {
    const db = getDb();
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    
    // Simulate sync process
    const syncResults = {
      records_synced: Math.floor(Math.random() * 50) + 10,
      records_created: Math.floor(Math.random() * 10) + 1,
      records_updated: Math.floor(Math.random() * 20) + 5,
      records_failed: Math.floor(Math.random() * 3),
      duration_ms: Math.floor(Math.random() * 5000) + 1000,
    };
    
    db.prepare(`UPDATE integrations SET last_sync = datetime('now'), sync_count = sync_count + 1, updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    db.prepare(`INSERT INTO integration_logs (integration_id, event_type, status, message, details, created_at) VALUES (?, 'sync', 'success', ?, ?, datetime('now'))`).run(
      req.params.id,
      `Synced ${syncResults.records_synced} records (${syncResults.records_created} created, ${syncResults.records_updated} updated)`,
      JSON.stringify(syncResults)
    );
    
    res.json({ message: 'Sync completed', results: syncResults });
  });

  // ==================== TEST CONNECTION ====================
  app.post('/api/integrations/:id/test', authenticate, (req, res) => {
    const db = getDb();
    const integration = db.prepare('SELECT * FROM integrations WHERE id = ?').get(req.params.id);
    if (!integration) return res.status(404).json({ error: 'Integration not found' });
    
    // Simulate connection test
    const success = Math.random() > 0.1; // 90% success rate
    const latency = Math.floor(Math.random() * 500) + 50;
    
    db.prepare(`INSERT INTO integration_logs (integration_id, event_type, status, message, details, created_at) VALUES (?, 'test', ?, ?, ?, datetime('now'))`).run(
      req.params.id,
      success ? 'success' : 'error',
      success ? `Connection test passed (${latency}ms)` : 'Connection test failed - check credentials',
      JSON.stringify({ latency, success })
    );
    
    if (success) {
      db.prepare(`UPDATE integrations SET status = 'connected', updated_at = datetime('now') WHERE id = ?`).run(req.params.id);
    }
    
    res.json({ success, latency, message: success ? 'Connection successful' : 'Connection failed' });
  });

  // ==================== GET INTEGRATION LOGS ====================
  app.get('/api/integrations/:id/logs', authenticate, (req, res) => {
    const db = getDb();
    const logs = db.prepare('SELECT * FROM integration_logs WHERE integration_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id);
    res.json(logs.map(l => ({ ...l, details: JSON.parse(l.details || '{}') })));
  });

  // ==================== GET ALL SYNC ACTIVITY ====================
  app.get('/api/integrations/activity/all', authenticate, (req, res) => {
    const db = getDb();
    const logs = db.prepare(`
      SELECT il.*, i.name as integration_name, i.provider_id 
      FROM integration_logs il 
      JOIN integrations i ON il.integration_id = i.id 
      ORDER BY il.created_at DESC LIMIT 100
    `).all();
    res.json(logs.map(l => ({ ...l, details: JSON.parse(l.details || '{}') })));
  });

  // ==================== WEBHOOK ENDPOINTS ====================
  
  // Receive webhooks from external systems
  app.post('/api/webhooks/:provider_id', (req, res) => {
    const db = getDb();
    const { provider_id } = req.params;
    const payload = req.body;
    
    // Log webhook receipt
    db.prepare(`INSERT INTO webhook_events (provider_id, event_type, payload, status, created_at) VALUES (?, ?, ?, 'received', datetime('now'))`).run(
      provider_id,
      payload.event_type || 'unknown',
      JSON.stringify(payload)
    );
    
    // Process webhook based on provider
    processWebhook(db, provider_id, payload);
    
    res.json({ received: true });
  });

  // Get webhook events
  app.get('/api/webhooks/events', authenticate, (req, res) => {
    const db = getDb();
    const events = db.prepare('SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 50').all();
    res.json(events.map(e => ({ ...e, payload: JSON.parse(e.payload || '{}') })));
  });

  // ==================== DATA MAPPING ENDPOINTS ====================
  
  app.get('/api/integrations/:id/mappings', authenticate, (req, res) => {
    const db = getDb();
    const mappings = db.prepare('SELECT * FROM field_mappings WHERE integration_id = ?').all(req.params.id);
    res.json(mappings);
  });

  app.post('/api/integrations/:id/mappings', authenticate, (req, res) => {
    const db = getDb();
    const { source_field, target_field, transform, entity_type } = req.body;
    db.prepare(`INSERT INTO field_mappings (integration_id, entity_type, source_field, target_field, transform, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(
      req.params.id, entity_type, source_field, target_field, transform || null
    );
    res.json({ message: 'Mapping created' });
  });

  // ==================== INTEGRATION DASHBOARD STATS ====================
  app.get('/api/integrations/stats/overview', authenticate, (req, res) => {
    const db = getDb();
    const total = db.prepare('SELECT COUNT(*) as count FROM integrations').get();
    const active = db.prepare("SELECT COUNT(*) as count FROM integrations WHERE status = 'connected'").get();
    const errored = db.prepare("SELECT COUNT(*) as count FROM integrations WHERE status = 'error'").get();
    const totalSyncs = db.prepare('SELECT COALESCE(SUM(sync_count), 0) as count FROM integrations').get();
    const recentLogs = db.prepare("SELECT COUNT(*) as count FROM integration_logs WHERE created_at > datetime('now', '-24 hours')").get();
    const totalRecordsSynced = db.prepare("SELECT COUNT(*) as count FROM integration_logs WHERE event_type = 'sync' AND status = 'success'").get();
    
    res.json({
      total_integrations: total.count,
      active_integrations: active.count,
      errored_integrations: errored.count,
      total_syncs: totalSyncs.count,
      events_24h: recentLogs.count,
      successful_syncs: totalRecordsSynced.count
    });
  });

  // ==================== WEBHOOK PROCESSOR ====================
  function processWebhook(db, provider_id, payload) {
    const eventType = payload.event_type || '';
    
    switch(provider_id) {
      case 'project44':
      case 'fourkites':
        // Tracking update - update shipment status
        if (eventType.includes('tracking') || eventType.includes('status')) {
          // Would update deal/shipment tracking status
          db.prepare(`UPDATE webhook_events SET status = 'processed' WHERE provider_id = ? ORDER BY created_at DESC LIMIT 1`).run(provider_id);
        }
        break;
      case 'flexport':
        // Shipment event
        if (eventType.includes('shipment')) {
          db.prepare(`UPDATE webhook_events SET status = 'processed' WHERE provider_id = ? ORDER BY created_at DESC LIMIT 1`).run(provider_id);
        }
        break;
      default:
        // Generic processing
        db.prepare(`UPDATE webhook_events SET status = 'processed' WHERE provider_id = ? ORDER BY created_at DESC LIMIT 1`).run(provider_id);
    }
  }
}

module.exports = { registerIntegrationRoutes };
