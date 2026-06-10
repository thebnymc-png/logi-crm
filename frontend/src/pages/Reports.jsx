import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { BarChart3, TrendingUp, Users, DollarSign, Download, Printer, FileText, Plus, Edit3, Trash2, Calendar, Target, Truck, Package, ChevronDown, ChevronRight, StickyNote, AlertTriangle, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ComposedChart } from 'recharts';

// JD Refrigerated Transport Brand Colors
const JD_BLUE = '#0096e0';
const JD_DARK = '#374151';
const JD_LIGHT_BLUE = '#e6f4fd';
const JD_ACCENT = '#0077b3';
const CHART_COLORS = ['#0096e0', '#2e844a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

// JD Logo Component
const JDLogo = ({ size = 'md' }) => {
  const sizes = { sm: 'h-8', md: 'h-12', lg: 'h-16' };
  return (
    <svg className={`${sizes[size]} w-auto`} viewBox="0 0 340 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 25 L40 5 L75 25 V65 L40 85 L5 65 Z" fill="#0096e0" />
      <path d="M30 22 H42 V50 C42 56 38 60 30 60 C25 60 21 57 21 52 H30 C30 53 31 54 32 54 C34 54 34 52 34 50 V22 Z" fill="white" />
      <path d="M44 22 H54 C63 22 68 28 68 41 C68 54 63 60 54 60 H44 V22 Z M52 30 V52 H54 C58 52 60 48 60 41 C60 34 58 30 54 30 H52 Z" fill="white" />
      <text x="90" y="40" fill="#374151" fontSize="23" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="0.8">REFRIGERATED</text>
      <text x="90" y="66" fill="#0096e0" fontSize="26" fontWeight="900" fontFamily="system-ui, -apple-system, sans-serif" letterSpacing="1.2">TRANSPORT</text>
    </svg>
  );
};

// Report Note Component
const ReportNote = ({ note, onDelete, onEdit }) => (
  <div className="flex items-start gap-3 p-3 bg-[#fffbeb] border border-[#fde68a] rounded-lg group">
    <StickyNote className="w-4 h-4 text-[#d97706] mt-0.5 flex-shrink-0" />
    <div className="flex-1 min-w-0">
      <p className="text-[12px] text-[#92400e] font-medium">{note.author} · {note.date}</p>
      <p className="text-[13px] text-[#78350f] mt-0.5">{note.text}</p>
    </div>
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={() => onEdit(note)} className="p-1 hover:bg-[#fde68a] rounded"><Edit3 className="w-3 h-3 text-[#92400e]" /></button>
      <button onClick={() => onDelete(note.id)} className="p-1 hover:bg-[#fecaca] rounded"><Trash2 className="w-3 h-3 text-[#dc2626]" /></button>
    </div>
  </div>
);

// KPI Trend Card
const KPICard = ({ label, value, trend, trendUp, icon: Icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      {trend && (
        <div className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
    <p className="text-[24px] font-bold text-[#1a1a1a]">{value}</p>
    <p className="text-[12px] text-[#6b7280] mt-1">{label}</p>
  </div>
);

// Section Header with Notes toggle
const SectionHeader = ({ title, subtitle, onAddNote, notesCount }) => (
  <div className="flex items-center justify-between mb-4">
    <div>
      <h3 className="text-[15px] font-bold text-[#1a1a1a]">{title}</h3>
      {subtitle && <p className="text-[11px] text-[#6b7280] mt-0.5">{subtitle}</p>}
    </div>
    <button onClick={onAddNote} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#0096e0] bg-[#e6f4fd] hover:bg-[#cce9fa] rounded-lg transition-colors">
      <Plus className="w-3 h-3" />
      Add Note {notesCount > 0 && <span className="bg-[#0096e0] text-white px-1.5 rounded-full text-[10px]">{notesCount}</span>}
    </button>
  </div>
);

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [notes, setNotes] = useState([
    { id: 1, section: 'pipeline', author: 'Admin', date: '10 Jun 2026', text: 'Pipeline velocity has improved 15% this quarter. Focus on converting Qualification stage deals.' },
    { id: 2, section: 'revenue', author: 'Admin', date: '9 Jun 2026', text: 'Ocean freight revenue up significantly due to new Maersk partnership. Target: $2M by Q3.' },
    { id: 3, section: 'accounts', author: 'Admin', date: '8 Jun 2026', text: 'Two accounts flagged at-risk. Schedule executive review meetings this week.' },
    { id: 4, section: 'performance', author: 'Admin', date: '7 Jun 2026', text: 'Win rate trending above target. Team performance strong in FTL and refrigerated segments.' },
  ]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteSection, setNoteSection] = useState('');
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('quarter');
  const [expandedSections, setExpandedSections] = useState({ pipeline: true, revenue: true, accounts: true, performance: true });
  const printRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/reports/win-rate').catch(() => ({ winRate: 75, won: 3, lost: 1 })),
      api.get('/reports/revenue-by-service').catch(() => []),
      api.get('/reports/account-health').catch(() => []),
      api.get('/dashboard/pipeline-summary').catch(() => []),
      api.get('/analytics/revenue-history').catch(() => []),
    ]).then(([s, wr, rs, ah, ps, rh]) => {
      const base = s.data || s || {};
      setStats({
        ...base,
        winRate: wr.data || wr,
        revenueByService: (rs.data || rs) || [],
        accountHealth: (ah.data || ah) || [],
        pipelineSummary: (ps.data || ps) || [],
        revenueHistory: (rh.data || rh) || [],
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    if (editingNote) {
      setNotes(prev => prev.map(n => n.id === editingNote.id ? { ...n, text: noteText } : n));
      setEditingNote(null);
    } else {
      setNotes(prev => [...prev, { id: Date.now(), section: noteSection, author: 'Admin', date: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }), text: noteText }]);
    }
    setNoteText('');
    setShowNoteModal(false);
  };

  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));
  const editNote = (note) => { setEditingNote(note); setNoteText(note.text); setNoteSection(note.section); setShowNoteModal(true); };
  const openNoteModal = (section) => { setNoteSection(section); setNoteText(''); setEditingNote(null); setShowNoteModal(true); };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const reportContent = generateReportText();
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JD_Transport_Report_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateReportText = () => {
    return `<!DOCTYPE html>
<html><head><title>JD Refrigerated Transport - Sales Report</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#374151}
.header{display:flex;align-items:center;gap:20px;border-bottom:3px solid #0096e0;padding-bottom:20px;margin-bottom:30px}
.logo-hex{width:60px;height:60px;background:#0096e0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:20px}
h1{color:#374151;margin:0;font-size:24px}
h2{color:#0096e0;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-top:30px}
.subtitle{color:#6b7280;font-size:14px;margin:0}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:20px 0}
.kpi{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center}
.kpi-value{font-size:24px;font-weight:700;color:#1a1a1a}
.kpi-label{font-size:12px;color:#6b7280;margin-top:4px}
.note{background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px;margin:8px 0;font-size:13px}
.note-meta{font-size:11px;color:#92400e;font-weight:600}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e5e7eb;font-size:13px}
th{background:#f9fafb;font-weight:600;color:#374151}
.footer{margin-top:40px;padding-top:20px;border-top:2px solid #0096e0;text-align:center;color:#6b7280;font-size:12px}
</style></head><body>
<div class="header"><div class="logo-hex">JD</div><div><h1>JD Refrigerated Transport</h1><p class="subtitle">Sales & Account Management Report · ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div></div>
<div class="kpi-grid">
<div class="kpi"><div class="kpi-value">$${((stats?.total_pipeline || 0) / 1e6).toFixed(1)}M</div><div class="kpi-label">Pipeline Value</div></div>
<div class="kpi"><div class="kpi-value">${stats?.winRate?.winRate || stats?.win_rate || 75}%</div><div class="kpi-label">Win Rate</div></div>
<div class="kpi"><div class="kpi-value">${stats?.total_accounts || 0}</div><div class="kpi-label">Active Accounts</div></div>
<div class="kpi"><div class="kpi-value">$${((stats?.avg_deal_size || 0) / 1000).toFixed(0)}K</div><div class="kpi-label">Avg Deal Size</div></div>
</div>
<h2>Pipeline Analysis</h2>
<table><tr><th>Stage</th><th>Deals</th><th>Value</th></tr>
${(stats?.pipelineSummary || []).map(p => `<tr><td>${p.stage}</td><td>${p.count || 0}</td><td>$${Number(p.total_value || p.value || 0).toLocaleString()}</td></tr>`).join('')}
</table>
${notes.filter(n => n.section === 'pipeline').map(n => `<div class="note"><div class="note-meta">${n.author} · ${n.date}</div>${n.text}</div>`).join('')}
<h2>Revenue by Service</h2>
<table><tr><th>Service Type</th><th>Revenue</th></tr>
${(stats?.revenueByService || []).map(s => `<tr><td>${s.service_type || s.name}</td><td>$${Number(s.revenue || s.value || 0).toLocaleString()}</td></tr>`).join('')}
</table>
${notes.filter(n => n.section === 'revenue').map(n => `<div class="note"><div class="note-meta">${n.author} · ${n.date}</div>${n.text}</div>`).join('')}
<h2>Account Health</h2>
<table><tr><th>Status</th><th>Count</th></tr>
${(stats?.accountHealth || []).map(h => `<tr><td>${h.account_health || h.name}</td><td>${h.count || h.value || 0}</td></tr>`).join('')}
</table>
${notes.filter(n => n.section === 'accounts').map(n => `<div class="note"><div class="note-meta">${n.author} · ${n.date}</div>${n.text}</div>`).join('')}
<h2>Notes & Observations</h2>
${notes.map(n => `<div class="note"><div class="note-meta">${n.author} · ${n.date} · ${n.section}</div>${n.text}</div>`).join('')}
<div class="footer"><strong>JD Refrigerated Transport</strong> · Queensland Intermodal Terminal · Brisbane QLD · ABN: 12 345 678 910<br/>Report generated ${new Date().toLocaleString('en-AU')}</div>
</body></html>`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#0096e0] border-t-transparent rounded-full animate-spin" /></div>;
  if (!stats) return <div className="text-center py-12 text-[#6b7280]">Unable to load reports</div>;

  const serviceData = (stats.revenueByService || []).map(s => ({ name: s.service_type || s.name, value: s.revenue || s.value || 0 }));
  const healthData = (stats.accountHealth || []).map(h => ({ name: h.account_health || h.name, value: h.count || h.value || 0 }));
  const pipelineData = (stats.pipelineSummary || []).map(p => ({ stage: p.stage, value: p.total_value || p.value || 0, count: p.count || 0 }));
  const revenueHistory = (stats.revenueHistory || []).map(r => ({ month: r.month, actual: r.actual_revenue || r.revenue || 0, target: r.target_revenue || r.target || 0 }));

  // Generate performance radar data
  const radarData = [
    { metric: 'Win Rate', value: stats.winRate?.winRate || stats.win_rate || 75, target: 70 },
    { metric: 'Pipeline Growth', value: 82, target: 75 },
    { metric: 'Account Retention', value: 90, target: 85 },
    { metric: 'Activity Score', value: 78, target: 80 },
    { metric: 'Response Time', value: 85, target: 80 },
    { metric: 'DIFOT', value: 94, target: 95 },
  ];

  // Conversion funnel data
  const funnelData = [
    { stage: 'Leads', value: 45, color: '#0096e0' },
    { stage: 'Qualified', value: 32, color: '#06b6d4' },
    { stage: 'Proposal', value: 18, color: '#8b5cf6' },
    { stage: 'Negotiation', value: 11, color: '#f59e0b' },
    { stage: 'Closed Won', value: 8, color: '#2e844a' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'pipeline', label: 'Pipeline Analysis', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: Target },
  ];

  return (
    <div className="space-y-0 pb-8 print:p-0" ref={printRef}>
      {/* Report Header with JD Branding */}
      <div className="bg-white border-b-[3px] border-[#0096e0] -mx-6 -mt-6 px-6 py-5 mb-6 print:border-b-4" style={{ boxShadow: '0 2px 8px rgba(0,150,224,0.08)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <JDLogo size="md" />
            <div className="pl-4 border-l-2 border-gray-200">
              <h1 className="text-[20px] font-bold text-[#374151]">Sales & Account Report</h1>
              <p className="text-[12px] text-[#6b7280] mt-0.5 flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Report Period: {reportPeriod === 'quarter' ? 'Q2 2026 (Apr-Jun)' : reportPeriod === 'month' ? 'June 2026' : reportPeriod === 'year' ? 'FY 2025-2026' : 'This Week'}
                <span className="text-[#0096e0]">·</span>
                Generated {new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} className="text-[12px] border border-gray-200 rounded-lg px-3 py-2 bg-white text-[#374151] font-medium focus:outline-none focus:ring-2 focus:ring-[#0096e0] focus:border-transparent">
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-[#374151] bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium text-white bg-[#0096e0] hover:bg-[#0077b3] rounded-lg transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 print:hidden">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium rounded-lg transition-all ${activeTab === tab.id ? 'bg-[#0096e0] text-white shadow-sm' : 'text-[#6b7280] hover:bg-gray-100'}`}>
              <tab.icon className="w-3.5 h-3.5" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Total Pipeline Value" value={`$${((stats.total_pipeline || 0) / 1e6).toFixed(1)}M`} trend="+12.5%" trendUp={true} icon={TrendingUp} color={JD_BLUE} />
        <KPICard label="Win Rate" value={`${stats.winRate?.winRate || stats.win_rate || 75}%`} trend="+5.2%" trendUp={true} icon={Target} color="#2e844a" />
        <KPICard label="Active Accounts" value={stats.total_accounts || 12} trend="+2" trendUp={true} icon={Users} color="#8b5cf6" />
        <KPICard label="Avg Deal Size" value={`$${((stats.avg_deal_size || 591667) / 1000).toFixed(0)}K`} trend="-3.1%" trendUp={false} icon={DollarSign} color="#f59e0b" />
      </div>

      {/* OVERVIEW TAB */}
      {(activeTab === 'overview' || activeTab === 'pipeline') && (
        <div className="space-y-6">
          {/* Pipeline Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('pipeline')}>
              <div className="flex items-center gap-3">
                {expandedSections.pipeline ? <ChevronDown className="w-4 h-4 text-[#6b7280]" /> : <ChevronRight className="w-4 h-4 text-[#6b7280]" />}
                <div className="w-8 h-8 rounded-lg bg-[#e6f4fd] flex items-center justify-center"><TrendingUp className="w-4 h-4 text-[#0096e0]" /></div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1a1a1a]">Pipeline Analysis</h3>
                  <p className="text-[11px] text-[#6b7280]">Deal progression and conversion metrics</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openNoteModal('pipeline'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#0096e0] bg-[#e6f4fd] hover:bg-[#cce9fa] rounded-lg transition-colors print:hidden">
                <Plus className="w-3 h-3" /> Note
                {notes.filter(n => n.section === 'pipeline').length > 0 && <span className="bg-[#0096e0] text-white px-1.5 rounded-full text-[10px]">{notes.filter(n => n.section === 'pipeline').length}</span>}
              </button>
            </div>
            {expandedSections.pipeline && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Pipeline by Stage Chart */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151] mb-3">Pipeline by Stage</p>
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pipelineData} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} width={100} />
                          <Tooltip formatter={v => [`$${Number(v).toLocaleString()}`, 'Value']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                          <Bar dataKey="value" fill={JD_BLUE} radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Conversion Funnel */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151] mb-3">Conversion Funnel</p>
                    <div className="space-y-2">
                      {funnelData.map((item, i) => {
                        const width = (item.value / funnelData[0].value) * 100;
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-[11px] text-[#6b7280] w-20 text-right font-medium">{item.stage}</span>
                            <div className="flex-1 h-9 bg-gray-50 rounded-lg overflow-hidden relative">
                              <div className="h-full rounded-lg flex items-center justify-end pr-3 transition-all duration-700" style={{ width: `${width}%`, backgroundColor: item.color }}>
                                <span className="text-[11px] font-bold text-white">{item.value}</span>
                              </div>
                            </div>
                            <span className="text-[11px] text-[#6b7280] w-12">{i > 0 ? `${Math.round((item.value / funnelData[i - 1].value) * 100)}%` : '100%'}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg">
                      <p className="text-[11px] font-semibold text-[#166534]">Overall Conversion: {Math.round((funnelData[4].value / funnelData[0].value) * 100)}%</p>
                      <p className="text-[10px] text-[#15803d] mt-0.5">Lead to Close conversion rate</p>
                    </div>
                  </div>
                </div>

                {/* Pipeline Notes */}
                {notes.filter(n => n.section === 'pipeline').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-[#92400e] uppercase tracking-wider">Analyst Notes</p>
                    {notes.filter(n => n.section === 'pipeline').map(note => (
                      <ReportNote key={note.id} note={note} onDelete={deleteNote} onEdit={editNote} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REVENUE TAB */}
      {(activeTab === 'overview' || activeTab === 'revenue') && (
        <div className="space-y-6 mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('revenue')}>
              <div className="flex items-center gap-3">
                {expandedSections.revenue ? <ChevronDown className="w-4 h-4 text-[#6b7280]" /> : <ChevronRight className="w-4 h-4 text-[#6b7280]" />}
                <div className="w-8 h-8 rounded-lg bg-[#ecfdf5] flex items-center justify-center"><DollarSign className="w-4 h-4 text-[#2e844a]" /></div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1a1a1a]">Revenue Analysis</h3>
                  <p className="text-[11px] text-[#6b7280]">Revenue trends, service breakdown, and forecasting</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openNoteModal('revenue'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#0096e0] bg-[#e6f4fd] hover:bg-[#cce9fa] rounded-lg transition-colors print:hidden">
                <Plus className="w-3 h-3" /> Note
                {notes.filter(n => n.section === 'revenue').length > 0 && <span className="bg-[#0096e0] text-white px-1.5 rounded-full text-[10px]">{notes.filter(n => n.section === 'revenue').length}</span>}
              </button>
            </div>
            {expandedSections.revenue && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Revenue Trend */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151] mb-3">Revenue vs Target (12 Months)</p>
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={revenueHistory.length > 0 ? revenueHistory : [
                          { month: 'Jul', actual: 420000, target: 400000 },
                          { month: 'Aug', actual: 380000, target: 420000 },
                          { month: 'Sep', actual: 510000, target: 440000 },
                          { month: 'Oct', actual: 470000, target: 460000 },
                          { month: 'Nov', actual: 560000, target: 480000 },
                          { month: 'Dec', actual: 490000, target: 500000 },
                          { month: 'Jan', actual: 530000, target: 520000 },
                          { month: 'Feb', actual: 620000, target: 540000 },
                          { month: 'Mar', actual: 580000, target: 560000 },
                          { month: 'Apr', actual: 650000, target: 580000 },
                          { month: 'May', actual: 710000, target: 600000 },
                          { month: 'Jun', actual: 680000, target: 620000 },
                        ]} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} />
                          <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#6b7280' }} />
                          <Tooltip formatter={(v, n) => [`$${Number(v).toLocaleString()}`, n === 'actual' ? 'Actual' : 'Target']} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                          <Area type="monotone" dataKey="actual" fill="#0096e015" stroke={JD_BLUE} strokeWidth={2.5} dot={{ r: 3, fill: JD_BLUE }} />
                          <Line type="monotone" dataKey="target" stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#0096e0] rounded" /><span className="text-[10px] text-[#6b7280]">Actual Revenue</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-[#ef4444] rounded border-dashed" style={{ borderTop: '1.5px dashed #ef4444', height: 0 }} /><span className="text-[10px] text-[#6b7280]">Target</span></div>
                    </div>
                  </div>

                  {/* Revenue by Service */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151] mb-3">Revenue by Service Type</p>
                    <div style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={serviceData.length > 0 ? serviceData : [
                            { name: 'FTL', value: 850000 },
                            { name: 'Refrigerated', value: 720000 },
                            { name: 'Ocean', value: 540000 },
                            { name: 'Air Freight', value: 380000 },
                            { name: 'Intermodal', value: 290000 },
                            { name: 'LTL', value: 180000 },
                          ]} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" nameKey="name" paddingAngle={2}>
                            {(serviceData.length > 0 ? serviceData : [1, 2, 3, 4, 5, 6]).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => `$${Number(v).toLocaleString()}`} contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Revenue Summary Table */}
                <div className="mt-6">
                  <p className="text-[12px] font-semibold text-[#374151] mb-3">Service Revenue Breakdown</p>
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-[#f9fafb]">
                          <th className="text-left text-[11px] font-semibold text-[#374151] px-4 py-3">Service Type</th>
                          <th className="text-right text-[11px] font-semibold text-[#374151] px-4 py-3">Revenue</th>
                          <th className="text-right text-[11px] font-semibold text-[#374151] px-4 py-3">% of Total</th>
                          <th className="text-left text-[11px] font-semibold text-[#374151] px-4 py-3 w-40">Distribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(serviceData.length > 0 ? serviceData : [
                          { name: 'FTL', value: 850000 },
                          { name: 'Refrigerated', value: 720000 },
                          { name: 'Ocean', value: 540000 },
                          { name: 'Air Freight', value: 380000 },
                          { name: 'Intermodal', value: 290000 },
                          { name: 'LTL', value: 180000 },
                        ]).map((item, i) => {
                          const total = serviceData.reduce((acc, s) => acc + s.value, 0) || 2960000;
                          const pct = ((item.value / total) * 100).toFixed(1);
                          return (
                            <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-[12px] text-[#1a1a1a] font-medium flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                {item.name}
                              </td>
                              <td className="px-4 py-2.5 text-[12px] text-[#1a1a1a] font-semibold text-right">${Number(item.value).toLocaleString()}</td>
                              <td className="px-4 py-2.5 text-[12px] text-[#6b7280] text-right">{pct}%</td>
                              <td className="px-4 py-2.5">
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Revenue Notes */}
                {notes.filter(n => n.section === 'revenue').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-[#92400e] uppercase tracking-wider">Analyst Notes</p>
                    {notes.filter(n => n.section === 'revenue').map(note => (
                      <ReportNote key={note.id} note={note} onDelete={deleteNote} onEdit={editNote} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ACCOUNTS SECTION */}
      {(activeTab === 'overview' || activeTab === 'performance') && (
        <div className="space-y-6 mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('accounts')}>
              <div className="flex items-center gap-3">
                {expandedSections.accounts ? <ChevronDown className="w-4 h-4 text-[#6b7280]" /> : <ChevronRight className="w-4 h-4 text-[#6b7280]" />}
                <div className="w-8 h-8 rounded-lg bg-[#fef3c7] flex items-center justify-center"><Users className="w-4 h-4 text-[#d97706]" /></div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1a1a1a]">Account Health & Performance</h3>
                  <p className="text-[11px] text-[#6b7280]">Account status, risk indicators, and team metrics</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openNoteModal('accounts'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#0096e0] bg-[#e6f4fd] hover:bg-[#cce9fa] rounded-lg transition-colors print:hidden">
                <Plus className="w-3 h-3" /> Note
                {notes.filter(n => n.section === 'accounts').length > 0 && <span className="bg-[#0096e0] text-white px-1.5 rounded-full text-[10px]">{notes.filter(n => n.section === 'accounts').length}</span>}
              </button>
            </div>
            {expandedSections.accounts && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Account Health Pie */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151] mb-3">Account Health Distribution</p>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={healthData.length > 0 ? healthData : [
                            { name: 'Excellent', value: 5 },
                            { name: 'Good', value: 4 },
                            { name: 'At Risk', value: 2 },
                            { name: 'Critical', value: 1 },
                          ]} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={{ stroke: '#d1d5db' }}>
                            {(healthData.length > 0 ? healthData : [1, 2, 3, 4]).map((entry, i) => {
                              const name = (healthData[i] || {}).name || ['Excellent', 'Good', 'At Risk', 'Critical'][i];
                              const color = name === 'excellent' || name === 'Excellent' ? '#2e844a' : name === 'good' || name === 'Good' ? '#0096e0' : name === 'at_risk' || name === 'At Risk' ? '#f59e0b' : '#ef4444';
                              return <Cell key={i} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Performance Radar */}
                  <div>
                    <p className="text-[12px] font-semibold text-[#374151] mb-3">Performance Scorecard</p>
                    <div style={{ height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: '#9ca3af' }} />
                          <Radar name="Actual" dataKey="value" stroke={JD_BLUE} fill={JD_BLUE} fillOpacity={0.2} strokeWidth={2} />
                          <Radar name="Target" dataKey="target" stroke="#ef4444" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
                          <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Risk Alerts */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#2e844a]" />
                    <div>
                      <p className="text-[13px] font-bold text-[#166534]">{healthData.find(h => h.name === 'excellent' || h.name === 'Excellent')?.value || 5}</p>
                      <p className="text-[10px] text-[#15803d]">Excellent Health</p>
                    </div>
                  </div>
                  <div className="p-3 bg-[#fffbeb] border border-[#fde68a] rounded-lg flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-[#d97706]" />
                    <div>
                      <p className="text-[13px] font-bold text-[#92400e]">{healthData.find(h => h.name === 'at_risk' || h.name === 'At Risk')?.value || 2}</p>
                      <p className="text-[10px] text-[#a16207]">At Risk</p>
                    </div>
                  </div>
                  <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-lg flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#dc2626]" />
                    <div>
                      <p className="text-[13px] font-bold text-[#991b1b]">{stats.pending_tasks || 9}</p>
                      <p className="text-[10px] text-[#b91c1c]">Pending Follow-ups</p>
                    </div>
                  </div>
                </div>

                {/* Account Notes */}
                {notes.filter(n => n.section === 'accounts').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-[#92400e] uppercase tracking-wider">Analyst Notes</p>
                    {notes.filter(n => n.section === 'accounts').map(note => (
                      <ReportNote key={note.id} note={note} onDelete={deleteNote} onEdit={editNote} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PERFORMANCE SECTION */}
      {(activeTab === 'overview' || activeTab === 'performance') && (
        <div className="space-y-6 mt-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer" onClick={() => toggleSection('performance')}>
              <div className="flex items-center gap-3">
                {expandedSections.performance ? <ChevronDown className="w-4 h-4 text-[#6b7280]" /> : <ChevronRight className="w-4 h-4 text-[#6b7280]" />}
                <div className="w-8 h-8 rounded-lg bg-[#ede9fe] flex items-center justify-center"><Target className="w-4 h-4 text-[#7c3aed]" /></div>
                <div>
                  <h3 className="text-[14px] font-bold text-[#1a1a1a]">Performance Summary</h3>
                  <p className="text-[11px] text-[#6b7280]">Key metrics and operational KPIs</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); openNoteModal('performance'); }} className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-[#0096e0] bg-[#e6f4fd] hover:bg-[#cce9fa] rounded-lg transition-colors print:hidden">
                <Plus className="w-3 h-3" /> Note
                {notes.filter(n => n.section === 'performance').length > 0 && <span className="bg-[#0096e0] text-white px-1.5 rounded-full text-[10px]">{notes.filter(n => n.section === 'performance').length}</span>}
              </button>
            </div>
            {expandedSections.performance && (
              <div className="p-6">
                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Deals Won', value: stats.winRate?.won || 3, sub: 'This quarter', color: '#2e844a', bg: '#f0fdf4' },
                    { label: 'Deals Lost', value: stats.winRate?.lost || 1, sub: 'This quarter', color: '#ef4444', bg: '#fef2f2' },
                    { label: 'Avg Days to Close', value: '32', sub: '-5 from last quarter', color: '#0096e0', bg: '#e6f4fd' },
                    { label: 'Activities Logged', value: stats.activities_this_month || 15, sub: 'This month', color: '#8b5cf6', bg: '#ede9fe' },
                    { label: 'Proposals Sent', value: '8', sub: 'This quarter', color: '#f59e0b', bg: '#fffbeb' },
                    { label: 'DIFOT Score', value: '94%', sub: 'Target: 95%', color: '#06b6d4', bg: '#ecfeff' },
                  ].map((metric, i) => (
                    <div key={i} className="p-4 rounded-lg border border-gray-100" style={{ backgroundColor: metric.bg }}>
                      <p className="text-[24px] font-bold" style={{ color: metric.color }}>{metric.value}</p>
                      <p className="text-[12px] font-semibold text-[#374151] mt-1">{metric.label}</p>
                      <p className="text-[10px] text-[#6b7280] mt-0.5">{metric.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Pipeline Summary Table */}
                <p className="text-[12px] font-semibold text-[#374151] mb-3">Pipeline Stage Summary</p>
                <div className="overflow-hidden rounded-lg border border-gray-100">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f9fafb]">
                        <th className="text-left text-[11px] font-semibold text-[#374151] px-4 py-3">Stage</th>
                        <th className="text-center text-[11px] font-semibold text-[#374151] px-4 py-3">Deals</th>
                        <th className="text-right text-[11px] font-semibold text-[#374151] px-4 py-3">Total Value</th>
                        <th className="text-right text-[11px] font-semibold text-[#374151] px-4 py-3">Avg Value</th>
                        <th className="text-left text-[11px] font-semibold text-[#374151] px-4 py-3 w-32">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipelineData.map((stage, i) => {
                        const maxVal = Math.max(...pipelineData.map(p => p.value));
                        return (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-4 py-3 text-[12px] text-[#1a1a1a] font-medium">{stage.stage}</td>
                            <td className="px-4 py-3 text-[12px] text-[#1a1a1a] text-center">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#e6f4fd] text-[#0096e0] font-bold text-[11px]">{stage.count}</span>
                            </td>
                            <td className="px-4 py-3 text-[12px] text-[#1a1a1a] font-semibold text-right">${Number(stage.value).toLocaleString()}</td>
                            <td className="px-4 py-3 text-[12px] text-[#6b7280] text-right">${stage.count > 0 ? Number(Math.round(stage.value / stage.count)).toLocaleString() : '0'}</td>
                            <td className="px-4 py-3">
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#0096e0]" style={{ width: `${(stage.value / maxVal) * 100}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Performance Notes */}
                {notes.filter(n => n.section === 'performance').length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-[#92400e] uppercase tracking-wider">Analyst Notes</p>
                    {notes.filter(n => n.section === 'performance').map(note => (
                      <ReportNote key={note.id} note={note} onDelete={deleteNote} onEdit={editNote} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Footer */}
      <div className="mt-8 pt-4 border-t-2 border-[#0096e0] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <JDLogo size="sm" />
          <div>
            <p className="text-[11px] text-[#6b7280]">Queensland Intermodal Terminal · Brisbane QLD</p>
            <p className="text-[10px] text-[#9ca3af]">ABN: 12 345 678 910</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#6b7280]">Confidential — Internal Use Only</p>
          <p className="text-[10px] text-[#9ca3af]">Generated by LogiCRM · {new Date().toLocaleString('en-AU')}</p>
        </div>
      </div>

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 print:hidden" onClick={() => setShowNoteModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between" style={{ backgroundColor: JD_LIGHT_BLUE }}>
              <div className="flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-[#0096e0]" />
                <h3 className="text-[14px] font-bold text-[#374151]">{editingNote ? 'Edit Note' : 'Add Report Note'}</h3>
              </div>
              <button onClick={() => setShowNoteModal(false)} className="text-[#6b7280] hover:text-[#1a1a1a]">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Section</label>
                <select value={noteSection} onChange={e => setNoteSection(e.target.value)} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0096e0] focus:border-transparent">
                  <option value="pipeline">Pipeline Analysis</option>
                  <option value="revenue">Revenue</option>
                  <option value="accounts">Account Health</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-[#374151] uppercase tracking-wider">Note</label>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} placeholder="Add your observation, insight, or action item..." className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0096e0] focus:border-transparent resize-none" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 text-[12px] font-medium text-[#6b7280] bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
                <button onClick={addNote} className="px-4 py-2 text-[12px] font-medium text-white bg-[#0096e0] hover:bg-[#0077b3] rounded-lg">{editingNote ? 'Update Note' : 'Add Note'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
