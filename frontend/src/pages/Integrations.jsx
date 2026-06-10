import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const CATEGORY_META = {
  tms: { label: 'TMS', color: '#0176d3', bg: '#e1f5fe', description: 'Transportation Management' },
  wms: { label: 'WMS', color: '#7c3aed', bg: '#ede9fe', description: 'Warehouse Management' },
  erp: { label: 'ERP', color: '#ea580c', bg: '#fff7ed', description: 'Enterprise Resource Planning' },
  freight: { label: 'Freight', color: '#0891b2', bg: '#ecfeff', description: 'Freight Platforms' },
  carrier: { label: 'Carrier', color: '#16a34a', bg: '#f0fdf4', description: 'Carrier APIs' },
  crm: { label: 'CRM', color: '#dc2626', bg: '#fef2f2', description: 'CRM Systems' },
  communication: { label: 'Comms', color: '#9333ea', bg: '#faf5ff', description: 'Communication' },
  email: { label: 'Email', color: '#2563eb', bg: '#eff6ff', description: 'Email & Calendar' },
  documents: { label: 'Docs', color: '#ca8a04', bg: '#fefce8', description: 'Documents' },
};

const STATUS_STYLES = {
  connected: { bg: '#dcfce7', color: '#166534', label: 'Connected' },
  error: { bg: '#fef2f2', color: '#991b1b', label: 'Error' },
  disconnected: { bg: '#f3f4f6', color: '#374151', label: 'Disconnected' },
  syncing: { bg: '#dbeafe', color: '#1e40af', label: 'Syncing' },
};

export default function Integrations() {
  const [view, setView] = useState('connected'); // connected, marketplace, logs
  const [providers, setProviders] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [connectModal, setConnectModal] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [connectForm, setConnectForm] = useState({});
  const [syncing, setSyncing] = useState({});
  const [testing, setTesting] = useState({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [provs, ints, st] = await Promise.all([
        api.get('/integrations/providers'),
        api.get('/integrations'),
        api.get('/integrations/stats/overview'),
      ]);
      setProviders(provs);
      setIntegrations(ints);
      setStats(st);
    } catch (e) {
      console.error('Failed to load integrations:', e);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      const l = await api.get('/integrations/activity/all');
      setLogs(l);
    } catch (e) { console.error(e); }
  }

  async function handleConnect(provider) {
    try {
      await api.post('/integrations', {
        provider_id: provider.id,
        name: connectForm.name || provider.name,
        config: connectForm,
        sync_settings: { auto_sync: true, interval: '15min', direction: 'bidirectional' }
      });
      setConnectModal(null);
      setConnectForm({});
      loadData();
    } catch (e) { console.error(e); }
  }

  async function handleSync(id) {
    setSyncing(s => ({ ...s, [id]: true }));
    try {
      await api.post(`/integrations/${id}/sync`);
      loadData();
    } catch (e) { console.error(e); }
    finally { setSyncing(s => ({ ...s, [id]: false })); }
  }

  async function handleTest(id) {
    setTesting(s => ({ ...s, [id]: true }));
    try {
      const result = await api.post(`/integrations/${id}/test`);
      alert(result.success ? `Connection OK (${result.latency}ms)` : 'Connection failed');
      loadData();
    } catch (e) { console.error(e); }
    finally { setTesting(s => ({ ...s, [id]: false })); }
  }

  async function handleDisconnect(id) {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;
    try {
      await api.delete(`/integrations/${id}`);
      loadData();
    } catch (e) { console.error(e); }
  }

  async function handleViewLogs(integration) {
    try {
      const l = await api.get(`/integrations/${integration.id}/logs`);
      setDetailModal({ ...integration, logs: l });
    } catch (e) { console.error(e); }
  }

  const filteredProviders = providers.filter(p => {
    if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const connectedProviderIds = integrations.map(i => i.provider_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0176d3]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#032d60]">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">{integrations.length} connected · {providers.length} available integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setView('connected'); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'connected' ? 'bg-[#0176d3] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            Connected ({integrations.length})
          </button>
          <button onClick={() => { setView('marketplace'); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'marketplace' ? 'bg-[#0176d3] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            Marketplace
          </button>
          <button onClick={() => { setView('logs'); loadLogs(); }} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'logs' ? 'bg-[#0176d3] text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            Activity Log
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Integrations', value: stats.total_integrations || 0, color: '#0176d3' },
          { label: 'Active', value: stats.active_integrations || 0, color: '#16a34a' },
          { label: 'Errors', value: stats.errored_integrations || 0, color: '#dc2626' },
          { label: 'Total Syncs', value: stats.total_syncs || 0, color: '#7c3aed' },
          { label: 'Events (24h)', value: stats.events_24h || 0, color: '#ea580c' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</div>
            <div className="text-2xl font-bold mt-1" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Connected Integrations View */}
      {view === 'connected' && (
        <div className="space-y-4">
          {integrations.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="text-4xl mb-4">🔌</div>
              <h3 className="text-lg font-semibold text-gray-700">No Integrations Connected</h3>
              <p className="text-gray-500 mt-2">Browse the marketplace to connect your first integration</p>
              <button onClick={() => setView('marketplace')} className="mt-4 px-6 py-2 bg-[#0176d3] text-white rounded-md text-sm font-medium hover:bg-[#014486] transition-colors">
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Integration</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Sync</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Syncs</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {integrations.map((integration, idx) => {
                    const provider = integration.provider || {};
                    const catMeta = CATEGORY_META[integration.category] || {};
                    const statusStyle = STATUS_STYLES[integration.status] || STATUS_STYLES.disconnected;
                    return (
                      <tr key={integration.id} className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: catMeta.bg || '#f3f4f6' }}>
                              {provider.icon || '🔗'}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 text-sm">{integration.name}</div>
                              <div className="text-xs text-gray-500">{provider.description || integration.provider_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: catMeta.bg || '#f3f4f6', color: catMeta.color || '#374151' }}>
                            {catMeta.label || integration.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: statusStyle.color }}></span>
                            {statusStyle.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {integration.last_sync ? new Date(integration.last_sync).toLocaleString() : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700">
                          {integration.sync_count || 0}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSync(integration.id)}
                              disabled={syncing[integration.id]}
                              className="px-3 py-1.5 text-xs font-medium bg-[#0176d3] text-white rounded-md hover:bg-[#014486] disabled:opacity-50 transition-colors"
                            >
                              {syncing[integration.id] ? '⟳ Syncing...' : '⟳ Sync'}
                            </button>
                            <button
                              onClick={() => handleTest(integration.id)}
                              disabled={testing[integration.id]}
                              className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                              {testing[integration.id] ? 'Testing...' : 'Test'}
                            </button>
                            <button
                              onClick={() => handleViewLogs(integration)}
                              className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                              Logs
                            </button>
                            <button
                              onClick={() => handleDisconnect(integration.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-white text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
                            >
                              Disconnect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Marketplace View */}
      {view === 'marketplace' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0176d3] focus:border-transparent"
              />
              <svg className="absolute left-3 top-3 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {[{ key: 'all', label: 'All' }, ...Object.entries(CATEGORY_META).map(([k, v]) => ({ key: k, label: v.label }))].map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${categoryFilter === cat.key ? 'bg-[#0176d3] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProviders.map(provider => {
              const catMeta = CATEGORY_META[provider.category] || {};
              const isConnected = connectedProviderIds.includes(provider.id);
              return (
                <div key={provider.id} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-[#0176d3]/30 transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ background: catMeta.bg || '#f3f4f6' }}>
                        {provider.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm">{provider.name}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide" style={{ background: catMeta.bg, color: catMeta.color }}>
                          {catMeta.label}
                        </span>
                      </div>
                    </div>
                    {isConnected && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                        ✓ Connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{provider.description}</p>
                  
                  {/* Capabilities */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {provider.capabilities.slice(0, 4).map(cap => (
                      <span key={cap} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium">
                        {cap.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {provider.capabilities.length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-[10px]">
                        +{provider.capabilities.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Auth type badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                      {provider.auth_type === 'oauth2' ? '🔐 OAuth 2.0' : '🔑 API Key'}
                    </span>
                    {!isConnected ? (
                      <button
                        onClick={() => { setConnectModal(provider); setConnectForm({}); }}
                        className="px-4 py-1.5 bg-[#0176d3] text-white rounded-md text-xs font-medium hover:bg-[#014486] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Connect
                      </button>
                    ) : (
                      <button className="px-4 py-1.5 bg-gray-100 text-gray-500 rounded-md text-xs font-medium cursor-default">
                        Connected
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activity Log View */}
      {view === 'logs' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-700">Integration Activity Log</h3>
            <p className="text-xs text-gray-500 mt-0.5">Recent sync events, connection tests, and webhook activity</p>
          </div>
          {logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm">No activity logs yet. Connect an integration and run a sync to see activity here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {logs.map((log, idx) => (
                <div key={idx} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{log.integration_name || 'System'}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase">{log.event_type}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{log.message}</p>
                  </div>
                  <div className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(log.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Connect Modal */}
      {connectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-fadeIn" onClick={() => setConnectModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-[#032d60] to-[#0176d3]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">
                  {connectModal.icon}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Connect {connectModal.name}</h3>
                  <p className="text-xs text-blue-100">{connectModal.description}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder={connectModal.name}
                  value={connectForm.name || ''}
                  onChange={e => setConnectForm({ ...connectForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0176d3] focus:border-transparent"
                />
              </div>
              {connectModal.fields.map(field => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-700 mb-1 capitalize">{field.replace(/_/g, ' ')}</label>
                  <input
                    type={field.includes('secret') || field.includes('password') || field.includes('token') ? 'password' : 'text'}
                    placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                    value={connectForm[field] || ''}
                    onChange={e => setConnectForm({ ...connectForm, [field]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0176d3] focus:border-transparent"
                  />
                </div>
              ))}
              
              {/* Sync Settings */}
              <div className="pt-3 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-3">Sync Settings</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Sync Interval</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0176d3]">
                      <option value="5min">Every 5 minutes</option>
                      <option value="15min" selected>Every 15 minutes</option>
                      <option value="30min">Every 30 minutes</option>
                      <option value="1hr">Every hour</option>
                      <option value="manual">Manual only</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Direction</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#0176d3]">
                      <option value="bidirectional">Bidirectional</option>
                      <option value="inbound">Inbound only</option>
                      <option value="outbound">Outbound only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div className="pt-3 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Capabilities</h4>
                <div className="flex flex-wrap gap-1.5">
                  {connectModal.capabilities.map(cap => (
                    <span key={cap} className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                      {cap.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-3">
              <button onClick={() => setConnectModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleConnect(connectModal)} className="px-6 py-2 text-sm font-medium text-white bg-[#0176d3] rounded-md hover:bg-[#014486] transition-colors shadow-sm">
                Connect Integration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/Logs Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] animate-fadeIn" onClick={() => setDetailModal(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: CATEGORY_META[detailModal.category]?.bg || '#f3f4f6' }}>
                  {detailModal.provider?.icon || '🔗'}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{detailModal.name}</h3>
                  <p className="text-xs text-gray-500">{detailModal.provider?.description || ''}</p>
                </div>
              </div>
              <button onClick={() => setDetailModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {/* Connection Info */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="text-sm font-semibold mt-0.5" style={{ color: STATUS_STYLES[detailModal.status]?.color }}>{STATUS_STYLES[detailModal.status]?.label}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Last Sync</div>
                  <div className="text-sm font-semibold mt-0.5">{detailModal.last_sync ? new Date(detailModal.last_sync).toLocaleString() : 'Never'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">Total Syncs</div>
                  <div className="text-sm font-semibold mt-0.5">{detailModal.sync_count || 0}</div>
                </div>
              </div>

              {/* Sync Settings */}
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Sync Configuration</h4>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-medium">Auto Sync:</span> {detailModal.sync_settings?.auto_sync ? 'Enabled' : 'Disabled'}</div>
                    <div><span className="font-medium">Interval:</span> {detailModal.sync_settings?.interval || '15min'}</div>
                    <div><span className="font-medium">Direction:</span> {detailModal.sync_settings?.direction || 'Bidirectional'}</div>
                    <div><span className="font-medium">Connected:</span> {detailModal.created_at ? new Date(detailModal.created_at).toLocaleDateString() : 'Unknown'}</div>
                  </div>
                </div>
              </div>

              {/* Activity Logs */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Activity History</h4>
                {detailModal.logs && detailModal.logs.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
                    {detailModal.logs.map((log, idx) => (
                      <div key={idx} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${log.status === 'success' ? 'bg-green-500' : log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-medium uppercase">{log.event_type}</span>
                            <span className="text-xs text-gray-500">{log.message}</span>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm">No activity logs for this integration</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
