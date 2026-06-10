import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from 'recharts';
import { TrendingUp, DollarSign, Target, Building2, Activity, CheckSquare, AlertTriangle, Phone, Mail, Calendar, FileText, ChevronRight, Clock, Award } from 'lucide-react';

const formatCurrency = (val) => {
  if (!val) return '$0';
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
};

const COLORS = ['#1763e6', '#2e844a', '#dd7a01', '#7526c4', '#ba0517', '#069', '#e87d7d', '#4bc076'];
const STAGE_LABELS = { prospecting: 'Prospecting', qualification: 'Qualification', proposal: 'Proposal', negotiation: 'Negotiation' };
const STAGE_COLORS = { prospecting: '#1763e6', qualification: '#7526c4', proposal: '#dd7a01', negotiation: '#2e844a' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [activities, setActivities] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [pipelineInspection, setPipelineInspection] = useState(null);
  const [topAccounts, setTopAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const [statsRes, pipelineRes, activitiesRes, tasksRes, serviceRes, revenueRes, inspectionRes, accountsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/pipeline-summary'),
        api.get('/dashboard/recent-activities'),
        api.get('/dashboard/upcoming-tasks'),
        api.get('/analytics/service-breakdown'),
        api.get('/analytics/revenue-history'),
        api.get('/analytics/pipeline-inspection'),
        api.get('/analytics/top-accounts'),
      ]);
      setStats(statsRes.data || statsRes);
      setPipeline(pipelineRes.data || pipelineRes);
      setActivities(activitiesRes.data || activitiesRes);
      setTasks(tasksRes.data || tasksRes);
      setServiceData(serviceRes.data || serviceRes);
      setRevenueHistory(revenueRes.data || revenueRes);
      setPipelineInspection(inspectionRes.data || inspectionRes);
      setTopAccounts(accountsRes.data || accountsRes);
    } catch (err) { console.error('Dashboard load error:', err); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-[3px] border-[#1763e6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const inspection = pipelineInspection?.summary || {};
  const deals = pipelineInspection?.deals || [];

  const revenueChartData = (revenueHistory || []).map(r => {
    const parts = r.month?.split('-') || [];
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return { month: monthNames[parseInt(parts[1]||1)-1] || '', revenue: r.revenue, target: r.target };
  });

  return (
    <div className="space-y-4 pb-8">
      {/* === PAGE HEADER === */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#181818]">Sales Home</h1>
            <p className="text-[12px] text-[#706e6b] mt-0.5">Welcome back, {user?.first_name}. Here's your pipeline at a glance.</p>
          </div>
          <div className="text-[11px] text-[#706e6b]">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* === PIPELINE INSPECTION KPI BAR === */}
      <div className="flex items-stretch bg-white rounded border border-[#e5e5e5] overflow-hidden divide-x divide-[#e5e5e5]" style={{boxShadow:'0 2px 2px rgba(0,0,0,0.1)'}}>
        <KPICell label="Total Pipeline" value={formatCurrency(inspection.totalPipeline)} active />
        <KPICell label="Closed Won" value={formatCurrency(inspection.closedWon)} color="#2e844a" />
        <KPICell label="Commit" value={formatCurrency(inspection.commitForecast)} />
        <KPICell label="Best Case" value={formatCurrency(inspection.bestCaseForecast)} />
        <KPICell label="Open" value={formatCurrency(inspection.openPipeline)} />
        <KPICell label="Closed Lost" value={formatCurrency(inspection.closedLost)} color="#ba0517" />
        <KPICell label="Win Rate" value={`${inspection.winRate || 0}%`} />
      </div>

      {/* === METRICS CARDS === */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={DollarSign} iconBg="bg-[#d8edff]" iconColor="text-[#1763e6]" label="Weighted Forecast" value={formatCurrency(inspection.weightedPipeline)} sub="Probability-adjusted" />
        <MetricCard icon={Building2} iconBg="bg-[#f3e8ff]" iconColor="text-[#7526c4]" label="Active Accounts" value={stats?.totalAccounts || 0} sub={`${stats?.atRiskAccounts || 0} at risk`} subColor="text-[#ba0517]" />
        <MetricCard icon={Target} iconBg="bg-[#e3f3e8]" iconColor="text-[#2e844a]" label="Active Opportunities" value={inspection.activeCount || 0} sub={`Avg: ${formatCurrency(inspection.avgDealSize)}`} />
        <MetricCard icon={CheckSquare} iconBg="bg-[#fef3cd]" iconColor="text-[#8d6e00]" label="Pending Tasks" value={stats?.pendingTasks || 0} sub={`${stats?.overdueTasks || 0} overdue`} subColor="text-[#dd7a01]" />
      </div>

      {/* === CHARTS ROW === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">Revenue Performance</h3>
            <div className="flex items-center gap-4 text-[11px] text-[#706e6b]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#1763e6]" />Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-[#c9c9c9]" />Target</span>
            </div>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={revenueChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1763e6" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#1763e6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#706e6b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#706e6b' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000)}K`} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: '1px solid #e5e5e5' }} formatter={(v) => [`$${(v/1000).toFixed(0)}K`]} />
                <Area type="monotone" dataKey="revenue" stroke="#1763e6" strokeWidth={2} fill="url(#revGrad)" dot={false} />
                <Line type="monotone" dataKey="target" stroke="#c9c9c9" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline by Stage */}
        <div className="sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">Pipeline by Stage</h3>
            <Link to="/pipeline" className="sf-link text-[11px]">View All</Link>
          </div>
          <div className="p-4 space-y-3">
            {['prospecting','qualification','proposal','negotiation'].map(stage => {
              const s = (pipeline || []).find(p => p.stage === stage);
              const val = s?.total_value || 0;
              const count = s?.count || 0;
              const maxVal = Math.max(...(pipeline || []).map(p => p.total_value || 0), 1);
              return (
                <div key={stage}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[12px] font-medium text-[#181818]">{STAGE_LABELS[stage]}</span>
                    <span className="text-[11px] text-[#706e6b]">{count} · {formatCurrency(val)}</span>
                  </div>
                  <div className="h-[6px] bg-[#e5e5e5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(val/maxVal)*100}%`, backgroundColor: STAGE_COLORS[stage] }} />
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t border-[#e5e5e5] flex justify-between">
              <span className="text-[12px] font-bold text-[#181818]">Total</span>
              <span className="text-[13px] font-bold text-[#1763e6]">{formatCurrency(inspection.totalPipeline)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* === OPPORTUNITIES TABLE + SERVICE CHART === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">My Opportunities</h3>
            <Link to="/pipeline" className="sf-link text-[11px] flex items-center gap-0.5">View All <ChevronRight className="w-3 h-3" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Opportunity Name</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Stage</th>
                  <th>Close Date</th>
                  <th>Prob</th>
                </tr>
              </thead>
              <tbody>
                {deals.slice(0, 8).map((d, i) => (
                  <tr key={i}>
                    <td><Link to="/pipeline" className="sf-link font-medium text-[12px]">{d.title}</Link></td>
                    <td className="text-[12px] text-[#706e6b]">{d.account_name}</td>
                    <td className="text-[12px] font-semibold">{formatCurrency(d.value)}</td>
                    <td>
                      <span className={`sf-badge ${d.stage==='negotiation'?'sf-badge-success':d.stage==='proposal'?'sf-badge-warning':d.stage==='qualification'?'sf-badge-info':'sf-badge-neutral'}`}>
                        {STAGE_LABELS[d.stage] || d.stage}
                      </span>
                    </td>
                    <td className="text-[11px] text-[#706e6b]">{d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '-'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-[4px] bg-[#e5e5e5] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${d.probability}%`, backgroundColor: d.probability>=70?'#2e844a':d.probability>=40?'#dd7a01':'#1763e6'}} />
                        </div>
                        <span className="text-[10px] text-[#706e6b]">{d.probability}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">Revenue by Service</h3>
          </div>
          <div className="p-4">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={(serviceData||[]).slice(0,6)} dataKey="total_value" nameKey="service_type" cx="50%" cy="50%" outerRadius={70} innerRadius={38} paddingAngle={2}>
                  {(serviceData||[]).slice(0,6).map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{fontSize:11,borderRadius:4,border:'1px solid #e5e5e5'}} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {(serviceData||[]).slice(0,6).map((s,i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{backgroundColor:COLORS[i]}} />
                    <span className="text-[11px] text-[#181818]">{s.service_type}</span>
                  </div>
                  <span className="text-[11px] font-semibold">{formatCurrency(s.total_value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* === BOTTOM ROW: Activities + Tasks + Top Accounts === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activities */}
        <div className="sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">Recent Activities</h3>
            <Link to="/activities" className="sf-link text-[11px]">View All</Link>
          </div>
          <div className="divide-y divide-[#e5e5e5]">
            {(activities||[]).slice(0,5).map((a,i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#fafaf9] transition-colors">
                <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
                  a.type==='call'?'bg-[#d8edff] text-[#1763e6]':a.type==='email'?'bg-[#e3f3e8] text-[#2e844a]':a.type==='meeting'?'bg-[#f3e8ff] text-[#7526c4]':'bg-[#f3f3f3] text-[#706e6b]'
                }`}>
                  {a.type==='call'?<Phone className="w-3 h-3"/>:a.type==='email'?<Mail className="w-3 h-3"/>:a.type==='meeting'?<Calendar className="w-3 h-3"/>:<FileText className="w-3 h-3"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#181818] truncate">{a.subject}</p>
                  <p className="text-[11px] text-[#706e6b] truncate">{a.account_name}</p>
                </div>
                <span className={`text-[10px] font-semibold ${a.status==='completed'?'text-[#2e844a]':'text-[#1763e6]'}`}>
                  {a.status==='completed'?'Done':'Planned'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tasks */}
        <div className="sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">My Tasks</h3>
            <Link to="/tasks" className="sf-link text-[11px]">View All</Link>
          </div>
          <div className="divide-y divide-[#e5e5e5]">
            {(tasks||[]).slice(0,5).map((t,i) => {
              const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
              return (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#fafaf9] transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    t.priority==='urgent'?'bg-[#ba0517]':t.priority==='high'?'bg-[#dd7a01]':t.priority==='medium'?'bg-[#1763e6]':'bg-[#c9c9c9]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#181818] truncate">{t.title}</p>
                    <p className="text-[11px] text-[#706e6b] truncate">{t.account_name || 'General'}</p>
                  </div>
                  <span className={`text-[10px] font-semibold ${overdue?'text-[#ba0517]':'text-[#706e6b]'}`}>
                    {overdue ? 'Overdue' : t.due_date ? new Date(t.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Accounts */}
        <div className="sf-card">
          <div className="sf-card-header">
            <h3 className="text-[13px] font-bold text-[#181818]">Top Accounts</h3>
            <Link to="/accounts" className="sf-link text-[11px]">View All</Link>
          </div>
          <div className="divide-y divide-[#e5e5e5]">
            {(topAccounts||[]).slice(0,5).map((a,i) => (
              <Link to={`/accounts/${a.id}`} key={i} className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#fafaf9] transition-colors block">
                <div className="w-7 h-7 rounded bg-[#7f8de1] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                  {a.name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#181818] truncate">{a.name}</p>
                  <p className="text-[11px] text-[#706e6b]">{a.industry} · {a.active_deals} deals</p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-bold text-[#181818]">{formatCurrency(a.pipeline_value)}</p>
                  <span className={`text-[10px] font-semibold ${a.account_health==='excellent'?'text-[#2e844a]':a.account_health==='good'?'text-[#1763e6]':'text-[#ba0517]'}`}>
                    {a.account_health}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// === Sub-components ===
function KPICell({ label, value, active, color }) {
  return (
    <div className={`flex-1 px-4 py-3 text-center ${active ? 'bg-[#1763e6]' : ''}`}>
      <div className={`text-[16px] font-bold leading-tight ${active ? 'text-white' : ''}`} style={!active && color ? {color} : {}}>
        {value}
      </div>
      <div className={`text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${active ? 'text-white/80' : 'text-[#706e6b]'}`}>
        {label}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <div className="sf-stat">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-7 h-7 rounded flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
        </div>
        <span className="text-[11px] font-semibold text-[#706e6b] uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-[20px] font-bold text-[#181818] leading-tight">{value}</div>
      {sub && <p className={`text-[11px] font-medium mt-1 ${subColor || 'text-[#706e6b]'}`}>{sub}</p>}
    </div>
  );
}
