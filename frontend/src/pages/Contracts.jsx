import { useState, useEffect, useMemo } from 'react';
import api from '../utils/api';
import { Plus, X, ChevronDown, ChevronRight, FileText, Calendar, DollarSign, Building2, MapPin, Clock, Shield, AlertTriangle, CheckCircle2, Send, Edit3, Trash2, MoreHorizontal, Filter, Search, LayoutGrid, List, ArrowUpDown } from 'lucide-react';

const STATUS_CONFIG = {
  active: { label: 'Active', color: '#00c875', bg: '#00c87520' },
  pending_signature: { label: 'Pending Signature', color: '#fdab3d', bg: '#fdab3d20' },
  in_review: { label: 'In Review', color: '#0086c0', bg: '#0086c020' },
  draft: { label: 'Draft', color: '#c4c4c4', bg: '#c4c4c420' },
  expired: { label: 'Expired', color: '#e2445c', bg: '#e2445c20' },
  at_risk: { label: 'At Risk', color: '#ff642e', bg: '#ff642e20' },
  terminated: { label: 'Terminated', color: '#333333', bg: '#33333320' },
};

const PRIORITY_CONFIG = {
  high: { label: 'High', color: '#e2445c', icon: '🔴' },
  medium: { label: 'Medium', color: '#fdab3d', icon: '🟡' },
  low: { label: 'Low', color: '#00c875', icon: '🟢' },
};

const TYPE_CONFIG = {
  master_agreement: { label: 'Master Agreement', short: 'MA' },
  service_agreement: { label: 'Service Agreement', short: 'SA' },
  rate_agreement: { label: 'Rate Agreement', short: 'RA' },
  amendment: { label: 'Amendment', short: 'AM' },
};

const GROUP_COLORS = {
  'Active Contracts': '#00c875',
  'Pending Approval': '#fdab3d',
  'Drafts': '#c4c4c4',
  'Expired': '#e2445c',
  'At Risk': '#ff642e',
};

const formatCurrency = (val) => {
  if (!val) return '$0';
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
};

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const getDaysRemaining = (endDate) => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return diff;
};

const getTimelineProgress = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
};

export default function Contracts() {
  const [boardData, setBoardData] = useState({});
  const [allContracts, setAllContracts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('board');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editingStatus, setEditingStatus] = useState(null);
  const [form, setForm] = useState({
    title: '', account_id: '', type: 'service_agreement', priority: 'medium', value: '', monthly_value: '',
    service_type: '', origin: '', destination: '', mode: '', frequency: '', volume_commitment: '',
    sla_terms: '', difot_target: '95', payment_terms: 'Net 30', auto_renew: false,
    start_date: '', end_date: '', group_name: 'Active Contracts', status: 'draft'
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [board, list, accts] = await Promise.all([
        api.get('/contracts/board'),
        api.get('/contracts'),
        api.get('/accounts?limit=100'),
      ]);
      setBoardData(board.data || board);
      setAllContracts((list.data || list).contracts || []);
      setAccounts((accts.data || accts).accounts || accts.data || accts || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createContract = async (e) => {
    e.preventDefault();
    await api.post('/contracts', {
      ...form,
      value: parseFloat(form.value) || 0,
      monthly_value: parseFloat(form.monthly_value) || 0,
      difot_target: parseFloat(form.difot_target) || 95,
      auto_renew: form.auto_renew ? 1 : 0,
    });
    setShowCreate(false);
    setForm({ title: '', account_id: '', type: 'service_agreement', priority: 'medium', value: '', monthly_value: '', service_type: '', origin: '', destination: '', mode: '', frequency: '', volume_commitment: '', sla_terms: '', difot_target: '95', payment_terms: 'Net 30', auto_renew: false, start_date: '', end_date: '', group_name: 'Active Contracts', status: 'draft' });
    loadData();
  };

  const updateStatus = async (id, newStatus) => {
    await api.put(`/contracts/${id}`, { status: newStatus });
    setEditingStatus(null);
    loadData();
  };

  const deleteContract = async (id) => {
    if (!confirm('Delete this contract?')) return;
    await api.delete(`/contracts/${id}`);
    loadData();
  };

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const filteredContracts = useMemo(() => {
    let filtered = allContracts;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(c => c.title?.toLowerCase().includes(s) || c.contract_number?.toLowerCase().includes(s) || c.account_name?.toLowerCase().includes(s));
    }
    if (statusFilter) {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    return filtered;
  }, [allContracts, searchTerm, statusFilter]);

  // Summary stats
  const stats = useMemo(() => {
    const active = allContracts.filter(c => c.status === 'active');
    const totalValue = active.reduce((s, c) => s + (c.value || 0), 0);
    const monthlyRevenue = active.reduce((s, c) => s + (c.monthly_value || 0), 0);
    const atRisk = allContracts.filter(c => c.status === 'at_risk').length;
    const renewingSoon = allContracts.filter(c => {
      const days = getDaysRemaining(c.end_date);
      return days !== null && days > 0 && days <= 90 && c.status === 'active';
    }).length;
    return { active: active.length, totalValue, monthlyRevenue, atRisk, renewingSoon, total: allContracts.length };
  }, [allContracts]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#0176d3] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header - Monday.com style */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6161ff] to-[#4040c8] flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-[#181818]">Contracts</h1>
              <p className="text-[12px] text-[#706e6b] mt-0.5">{stats.total} contracts · {formatCurrency(stats.totalValue)} total value</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-[#c9c9c9] overflow-hidden">
              <button onClick={() => setView('board')} className={`px-3 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-1 ${view==='board'?'bg-[#0176d3] text-white':'bg-white text-[#181818] hover:bg-[#f3f3f3]'}`}><LayoutGrid className="w-3 h-3" />Board</button>
              <button onClick={() => setView('table')} className={`px-3 py-1.5 text-[12px] font-medium transition-colors flex items-center gap-1 ${view==='table'?'bg-[#0176d3] text-white':'bg-white text-[#181818] hover:bg-[#f3f3f3]'}`}><List className="w-3 h-3" />Table</button>
            </div>
            <button onClick={() => setShowCreate(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> New Contract</button>
          </div>
        </div>
      </div>

      {/* KPI Summary Bar - Monday.com style */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#00c875]" />
          <p className="text-[20px] font-bold text-[#181818] ml-2">{stats.active}</p>
          <p className="text-[11px] text-[#706e6b] font-medium uppercase tracking-wide ml-2">Active</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#0086c0]" />
          <p className="text-[20px] font-bold text-[#181818] ml-2">{formatCurrency(stats.monthlyRevenue)}</p>
          <p className="text-[11px] text-[#706e6b] font-medium uppercase tracking-wide ml-2">Monthly Revenue</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#6161ff]" />
          <p className="text-[20px] font-bold text-[#181818] ml-2">{formatCurrency(stats.totalValue)}</p>
          <p className="text-[11px] text-[#706e6b] font-medium uppercase tracking-wide ml-2">Total Value</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ff642e]" />
          <p className="text-[20px] font-bold text-[#181818] ml-2">{stats.atRisk}</p>
          <p className="text-[11px] text-[#706e6b] font-medium uppercase tracking-wide ml-2">At Risk</p>
        </div>
        <div className="bg-white rounded-lg border border-[#e5e5e5] p-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#fdab3d]" />
          <p className="text-[20px] font-bold text-[#181818] ml-2">{stats.renewingSoon}</p>
          <p className="text-[11px] text-[#706e6b] font-medium uppercase tracking-wide ml-2">Renewing Soon</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#939393]" />
          <input className="sf-input pl-9" placeholder="Search contracts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="sf-select w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Board View - Monday.com style grouped rows */}
      {view === 'board' && (
        <div className="space-y-4">
          {Object.entries(boardData).map(([groupName, contracts]) => {
            const groupColor = GROUP_COLORS[groupName] || '#0086c0';
            const isCollapsed = collapsedGroups[groupName];
            const groupTotal = contracts.reduce((s, c) => s + (c.value || 0), 0);
            const filteredGroupContracts = contracts.filter(c => {
              if (searchTerm) {
                const s = searchTerm.toLowerCase();
                if (!c.title?.toLowerCase().includes(s) && !c.contract_number?.toLowerCase().includes(s) && !c.account_name?.toLowerCase().includes(s)) return false;
              }
              if (statusFilter && c.status !== statusFilter) return false;
              return true;
            });
            if (filteredGroupContracts.length === 0 && (searchTerm || statusFilter)) return null;

            return (
              <div key={groupName} className="bg-white rounded-lg border border-[#e5e5e5] overflow-hidden" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.06)'}}>
                {/* Group Header */}
                <div className="flex items-center gap-2 px-4 py-2.5 cursor-pointer select-none hover:bg-[#fafaf9] transition-colors" onClick={() => toggleGroup(groupName)} style={{borderLeft: `4px solid ${groupColor}`}}>
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-[#706e6b]" /> : <ChevronDown className="w-4 h-4 text-[#706e6b]" />}
                  <span className="text-[13px] font-bold" style={{color: groupColor}}>{groupName}</span>
                  <span className="text-[11px] bg-[#f3f3f3] text-[#706e6b] px-2 py-0.5 rounded-full font-semibold">{filteredGroupContracts.length}</span>
                  <span className="text-[11px] text-[#706e6b] ml-auto font-semibold">{formatCurrency(groupTotal)}</span>
                </div>

                {/* Column Headers */}
                {!isCollapsed && (
                  <>
                    <div className="grid grid-cols-[2fr_1.2fr_0.8fr_0.7fr_1.5fr_0.8fr_0.6fr_0.5fr] gap-0 border-t border-[#e5e5e5] bg-[#fafaf9] px-4 py-2" style={{borderLeft: `4px solid ${groupColor}`}}>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">Contract</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">Account</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">Status</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">Priority</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">Timeline</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">Value</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">DIFOT</span>
                      <span className="text-[10px] font-bold text-[#706e6b] uppercase tracking-wider">SLA</span>
                    </div>

                    {/* Rows */}
                    {filteredGroupContracts.map(contract => {
                      const progress = getTimelineProgress(contract.start_date, contract.end_date);
                      const daysLeft = getDaysRemaining(contract.end_date);
                      const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                      const priorityCfg = PRIORITY_CONFIG[contract.priority] || PRIORITY_CONFIG.medium;

                      return (
                        <div key={contract.id} className="grid grid-cols-[2fr_1.2fr_0.8fr_0.7fr_1.5fr_0.8fr_0.6fr_0.5fr] gap-0 border-t border-[#e5e5e5] px-4 py-2.5 hover:bg-[#f3f7ff] transition-colors group items-center" style={{borderLeft: `4px solid ${groupColor}`}}>
                          {/* Contract Name */}
                          <div className="pr-2">
                            <button onClick={() => setShowDetail(contract)} className="text-[12px] font-semibold text-[#0176d3] hover:underline text-left truncate block max-w-full">{contract.title}</button>
                            <p className="text-[10px] text-[#939393] mt-0.5">{contract.contract_number} · {TYPE_CONFIG[contract.type]?.short || contract.type}</p>
                          </div>

                          {/* Account */}
                          <div className="pr-2">
                            <p className="text-[11px] text-[#181818] truncate">{contract.account_name || '-'}</p>
                            {contract.origin && <p className="text-[10px] text-[#939393] truncate">{contract.origin} → {contract.destination}</p>}
                          </div>

                          {/* Status - Monday.com colored pill */}
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingStatus(editingStatus === contract.id ? null : contract.id); }}
                              className="inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold text-white transition-transform hover:scale-105 cursor-pointer"
                              style={{backgroundColor: statusCfg.color}}
                            >
                              {statusCfg.label}
                            </button>
                            {editingStatus === contract.id && (
                              <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#e5e5e5] shadow-lg z-50 py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
                                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                  <button key={key} onClick={() => updateStatus(contract.id, key)} className="w-full px-3 py-1.5 text-left text-[11px] hover:bg-[#f3f3f3] flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: cfg.color}} />
                                    {cfg.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Priority */}
                          <div>
                            <span className="text-[11px]">{priorityCfg.icon} {priorityCfg.label}</span>
                          </div>

                          {/* Timeline Bar */}
                          <div className="pr-2">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-[6px] bg-[#e5e5e5] rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{
                                  width: `${progress}%`,
                                  backgroundColor: progress > 85 ? '#e2445c' : progress > 60 ? '#fdab3d' : '#00c875'
                                }} />
                              </div>
                              <span className="text-[10px] text-[#706e6b] whitespace-nowrap min-w-[50px]">
                                {daysLeft !== null ? (daysLeft > 0 ? `${daysLeft}d left` : 'Expired') : '-'}
                              </span>
                            </div>
                            <p className="text-[9px] text-[#939393] mt-0.5">
                              {formatDate(contract.start_date)} — {formatDate(contract.end_date)}
                            </p>
                          </div>

                          {/* Value */}
                          <div>
                            <p className="text-[12px] font-bold text-[#181818]">{formatCurrency(contract.value)}</p>
                            <p className="text-[10px] text-[#939393]">{formatCurrency(contract.monthly_value)}/mo</p>
                          </div>

                          {/* DIFOT */}
                          <div>
                            <span className={`text-[11px] font-bold ${contract.difot_target >= 98 ? 'text-[#00c875]' : contract.difot_target >= 95 ? 'text-[#fdab3d]' : 'text-[#e2445c]'}`}>
                              {contract.difot_target}%
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setShowDetail(contract)} className="p-1 rounded hover:bg-[#e5e5e5]"><Edit3 className="w-3 h-3 text-[#706e6b]" /></button>
                            <button onClick={() => deleteContract(contract.id)} className="p-1 rounded hover:bg-[#fce4e4]"><Trash2 className="w-3 h-3 text-[#e2445c]" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="sf-card">
          <div className="overflow-x-auto">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Contract</th>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Value</th>
                  <th>Monthly</th>
                  <th>Service</th>
                  <th>DIFOT Target</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days Left</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map(contract => {
                  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.draft;
                  const daysLeft = getDaysRemaining(contract.end_date);
                  return (
                    <tr key={contract.id}>
                      <td>
                        <button onClick={() => setShowDetail(contract)} className="sf-link font-medium text-left">{contract.title}</button>
                        <p className="text-[10px] text-[#939393]">{contract.contract_number}</p>
                      </td>
                      <td className="text-[#706e6b]">{contract.account_name || '-'}</td>
                      <td><span className="sf-badge sf-badge-neutral">{TYPE_CONFIG[contract.type]?.short || contract.type}</span></td>
                      <td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold text-white" style={{backgroundColor: statusCfg.color}}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td><span className="text-[11px]">{PRIORITY_CONFIG[contract.priority]?.icon} {PRIORITY_CONFIG[contract.priority]?.label}</span></td>
                      <td className="font-semibold">{formatCurrency(contract.value)}</td>
                      <td className="text-[#706e6b]">{formatCurrency(contract.monthly_value)}/mo</td>
                      <td><span className="sf-badge sf-badge-info">{contract.service_type || '-'}</span></td>
                      <td><span className={`font-bold text-[11px] ${contract.difot_target >= 98 ? 'text-[#00c875]' : contract.difot_target >= 95 ? 'text-[#fdab3d]' : 'text-[#e2445c]'}`}>{contract.difot_target}%</span></td>
                      <td className="text-[11px] text-[#706e6b]">{formatDate(contract.start_date)}</td>
                      <td className="text-[11px] text-[#706e6b]">{formatDate(contract.end_date)}</td>
                      <td>
                        {daysLeft !== null && (
                          <span className={`text-[11px] font-bold ${daysLeft <= 30 ? 'text-[#e2445c]' : daysLeft <= 90 ? 'text-[#fdab3d]' : 'text-[#00c875]'}`}>
                            {daysLeft > 0 ? `${daysLeft} days` : 'Expired'}
                          </span>
                        )}
                      </td>
                      <td className="text-[11px] text-[#706e6b]">{contract.payment_terms}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Contract Detail Slide-over */}
      {showDetail && (
        <div className="sf-modal-overlay" onClick={() => setShowDetail(null)}>
          <div className="bg-white w-full max-w-2xl h-[85vh] rounded-lg overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} style={{boxShadow:'0 8px 32px rgba(0,0,0,0.2)', animation:'slideDown 0.2s ease-out'}}>
            {/* Detail Header */}
            <div className="px-6 py-4 border-b border-[#e5e5e5] bg-gradient-to-r from-[#6161ff] to-[#4040c8]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-white/70 font-medium">{showDetail.contract_number}</p>
                  <h2 className="text-[16px] font-bold text-white mt-0.5">{showDetail.title}</h2>
                  <p className="text-[12px] text-white/80 mt-1">{showDetail.account_name}</p>
                </div>
                <button onClick={() => setShowDetail(null)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"><X className="w-4 h-4 text-white" /></button>
              </div>
            </div>

            {/* Detail Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Status & Priority Row */}
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1 rounded text-[11px] font-bold text-white" style={{backgroundColor: STATUS_CONFIG[showDetail.status]?.color}}>
                  {STATUS_CONFIG[showDetail.status]?.label}
                </span>
                <span className="text-[12px]">{PRIORITY_CONFIG[showDetail.priority]?.icon} {PRIORITY_CONFIG[showDetail.priority]?.label} Priority</span>
                <span className="sf-badge sf-badge-neutral">{TYPE_CONFIG[showDetail.type]?.label || showDetail.type}</span>
                {showDetail.auto_renew ? <span className="sf-badge sf-badge-success">Auto-Renew</span> : null}
              </div>

              {/* Value Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#f3f3f3] rounded-lg p-3">
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase">Total Value</p>
                  <p className="text-[18px] font-bold text-[#181818]">{formatCurrency(showDetail.value)}</p>
                </div>
                <div className="bg-[#f3f3f3] rounded-lg p-3">
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase">Monthly</p>
                  <p className="text-[18px] font-bold text-[#181818]">{formatCurrency(showDetail.monthly_value)}</p>
                </div>
                <div className="bg-[#f3f3f3] rounded-lg p-3">
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase">DIFOT Target</p>
                  <p className="text-[18px] font-bold" style={{color: showDetail.difot_target >= 98 ? '#00c875' : showDetail.difot_target >= 95 ? '#fdab3d' : '#e2445c'}}>{showDetail.difot_target}%</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-[#f3f3f3] rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#706e6b] uppercase">Contract Timeline</span>
                  <span className="text-[11px] text-[#706e6b]">{getTimelineProgress(showDetail.start_date, showDetail.end_date)}% elapsed</span>
                </div>
                <div className="h-3 bg-[#e5e5e5] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#00c875] to-[#0086c0] transition-all" style={{width: `${getTimelineProgress(showDetail.start_date, showDetail.end_date)}%`}} />
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-[#706e6b]">{formatDate(showDetail.start_date)}</span>
                  <span className="text-[10px] text-[#706e6b]">{formatDate(showDetail.end_date)}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase mb-1">Service Type</p>
                  <p className="text-[13px] text-[#181818]">{showDetail.service_type || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase mb-1">Mode</p>
                  <p className="text-[13px] text-[#181818]">{showDetail.mode || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase mb-1">Route</p>
                  <p className="text-[13px] text-[#181818]">{showDetail.origin && showDetail.destination ? `${showDetail.origin} → ${showDetail.destination}` : '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase mb-1">Frequency</p>
                  <p className="text-[13px] text-[#181818]">{showDetail.frequency || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase mb-1">Volume Commitment</p>
                  <p className="text-[13px] text-[#181818]">{showDetail.volume_commitment || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#706e6b] font-semibold uppercase mb-1">Payment Terms</p>
                  <p className="text-[13px] text-[#181818]">{showDetail.payment_terms || '-'}</p>
                </div>
              </div>

              {/* SLA Section */}
              {showDetail.sla_terms && (
                <div className="bg-[#d8edff] rounded-lg p-4 border border-[#0176d3]/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-[#0176d3]" />
                    <span className="text-[11px] font-bold text-[#014486] uppercase">SLA Terms</span>
                  </div>
                  <p className="text-[12px] text-[#181818]">{showDetail.sla_terms}</p>
                </div>
              )}

              {/* Key Dates */}
              <div>
                <p className="text-[11px] font-bold text-[#706e6b] uppercase mb-2">Key Dates</p>
                <div className="grid grid-cols-2 gap-2">
                  {showDetail.signed_date && <div className="flex items-center gap-2 text-[12px]"><CheckCircle2 className="w-3.5 h-3.5 text-[#00c875]" /><span className="text-[#706e6b]">Signed:</span> {formatDate(showDetail.signed_date)}</div>}
                  {showDetail.renewal_date && <div className="flex items-center gap-2 text-[12px]"><Calendar className="w-3.5 h-3.5 text-[#fdab3d]" /><span className="text-[#706e6b]">Renewal:</span> {formatDate(showDetail.renewal_date)}</div>}
                  <div className="flex items-center gap-2 text-[12px]"><Calendar className="w-3.5 h-3.5 text-[#0086c0]" /><span className="text-[#706e6b]">Start:</span> {formatDate(showDetail.start_date)}</div>
                  <div className="flex items-center gap-2 text-[12px]"><Calendar className="w-3.5 h-3.5 text-[#e2445c]" /><span className="text-[#706e6b]">End:</span> {formatDate(showDetail.end_date)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreate && (
        <div className="sf-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="sf-modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">New Contract</h2>
              <button onClick={() => setShowCreate(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={createContract}>
              <div className="sf-modal-body space-y-4 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="sf-label">Contract Title *</label>
                  <input className="sf-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g., FTL Master Agreement - Acme Corp" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sf-label">Account</label>
                    <select className="sf-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}>
                      <option value="">Select Account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="sf-label">Contract Type</label>
                    <select className="sf-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                      {Object.entries(TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="sf-label">Total Value ($)</label>
                    <input className="sf-input" type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="1000000" />
                  </div>
                  <div>
                    <label className="sf-label">Monthly Value ($)</label>
                    <input className="sf-input" type="number" value={form.monthly_value} onChange={e => setForm({...form, monthly_value: e.target.value})} placeholder="80000" />
                  </div>
                  <div>
                    <label className="sf-label">Priority</label>
                    <select className="sf-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sf-label">Service Type</label>
                    <select className="sf-select" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                      <option value="">Select</option>
                      {['FTL','LTL','Ocean','Air Freight','Intermodal','Refrigerated','Last Mile','Drayage','Tanker','Flatbed','Parcel','Temperature Controlled'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="sf-label">Mode</label>
                    <select className="sf-select" value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}>
                      <option value="">Select</option>
                      {['FTL','LTL','Ocean','Air','Intermodal','Refrigerated','Last Mile','Tanker','Flatbed','Rail'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Origin</label><input className="sf-input" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="Chicago, IL" /></div>
                  <div><label className="sf-label">Destination</label><input className="sf-input" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Los Angeles, CA" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Frequency</label><input className="sf-input" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} placeholder="Daily" /></div>
                  <div><label className="sf-label">Volume Commitment</label><input className="sf-input" value={form.volume_commitment} onChange={e => setForm({...form, volume_commitment: e.target.value})} placeholder="200 loads/month" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="sf-label">DIFOT Target (%)</label><input className="sf-input" type="number" value={form.difot_target} onChange={e => setForm({...form, difot_target: e.target.value})} placeholder="95" /></div>
                  <div>
                    <label className="sf-label">Payment Terms</label>
                    <select className="sf-select" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})}>
                      <option value="Net 15">Net 15</option>
                      <option value="Net 30">Net 30</option>
                      <option value="Net 45">Net 45</option>
                      <option value="Net 60">Net 60</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.auto_renew} onChange={e => setForm({...form, auto_renew: e.target.checked})} className="w-4 h-4 rounded border-[#c9c9c9]" />
                      <span className="text-[12px] font-medium text-[#181818]">Auto-Renew</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="sf-label">SLA Terms</label>
                  <textarea className="sf-input min-h-[60px]" value={form.sla_terms} onChange={e => setForm({...form, sla_terms: e.target.value})} placeholder="e.g., 99% on-time delivery, 24hr response time, max 2% damage rate" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Start Date</label><input className="sf-input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></div>
                  <div><label className="sf-label">End Date</label><input className="sf-input" type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} /></div>
                </div>
                <div>
                  <label className="sf-label">Group</label>
                  <select className="sf-select" value={form.group_name} onChange={e => setForm({...form, group_name: e.target.value})}>
                    <option value="Active Contracts">Active Contracts</option>
                    <option value="Pending Approval">Pending Approval</option>
                    <option value="Drafts">Drafts</option>
                  </select>
                </div>
              </div>
              <div className="sf-modal-footer">
                <button type="button" onClick={() => setShowCreate(false)} className="sf-btn-neutral">Cancel</button>
                <button type="submit" className="sf-btn-primary">Create Contract</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
