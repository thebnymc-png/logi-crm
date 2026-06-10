import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, ArrowRight, X, Building2, MapPin } from 'lucide-react';

const STAGES = [
  { key: 'prospecting', label: 'Prospecting', color: '#1763e6' },
  { key: 'qualification', label: 'Qualification', color: '#7526c4' },
  { key: 'proposal', label: 'Proposal', color: '#dd7a01' },
  { key: 'negotiation', label: 'Negotiation', color: '#2e844a' },
];

const formatCurrency = (val) => {
  if (!val) return '$0';
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`;
  return `$${val}`;
};

export default function Pipeline() {
  const [pipeline, setPipeline] = useState({});
  const [allDeals, setAllDeals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState('kanban');
  const [form, setForm] = useState({ title:'', account_id:'', value:'', service_type:'', origin:'', destination:'', expected_close_date:'', stage:'prospecting' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [p, a, d] = await Promise.all([
        api.get('/deals/pipeline'),
        api.get('/accounts?limit=100'),
        api.get('/deals'),
      ]);
      setPipeline(p.data || p);
      setAccounts((a.data || a).accounts || a.data || a || []);
      setAllDeals((d.data || d).deals || d.data || d || []);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const moveStage = async (dealId, newStage) => {
    const prob = { prospecting: 15, qualification: 35, proposal: 50, negotiation: 75, closed_won: 100, closed_lost: 0 };
    await api.put(`/deals/${dealId}`, { stage: newStage, probability: prob[newStage] || 50 });
    loadData();
  };

  const createDeal = async (e) => {
    e.preventDefault();
    await api.post('/deals', { ...form, value: parseFloat(form.value) || 0, probability: 10 });
    setShowCreate(false);
    setForm({ title:'', account_id:'', value:'', service_type:'', origin:'', destination:'', expected_close_date:'', stage:'prospecting' });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#1763e6] border-t-transparent rounded-full animate-spin" /></div>;

  const totalPipeline = STAGES.reduce((s, st) => s + ((pipeline[st.key]||[]).reduce((a,d) => a + (d.value||0), 0)), 0);

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-bold text-[#181818]">Opportunities</h1>
            <p className="text-[12px] text-[#706e6b] mt-0.5">{allDeals.length} total · {formatCurrency(totalPipeline)} in pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded border border-[#c9c9c9] overflow-hidden">
              <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${view==='kanban'?'bg-[#1763e6] text-white':'bg-white text-[#181818] hover:bg-[#f3f3f3]'}`}>Board</button>
              <button onClick={() => setView('list')} className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${view==='list'?'bg-[#1763e6] text-white':'bg-white text-[#181818] hover:bg-[#f3f3f3]'}`}>List</button>
            </div>
            <button onClick={() => setShowCreate(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> New</button>
          </div>
        </div>
      </div>

      {/* Path indicator */}
      <div className="sf-path">
        {STAGES.map((stage, i) => {
          const deals = pipeline[stage.key] || [];
          const total = deals.reduce((s,d) => s + (d.value||0), 0);
          return (
            <div key={stage.key} className={`sf-path-step ${i === 0 ? 'rounded-l-full' : ''} ${i === STAGES.length-1 ? 'rounded-r-full' : ''} sf-path-incomplete`} style={{borderRight: i < STAGES.length-1 ? '1px solid #e5e5e5' : 'none'}}>
              <span className="font-bold">{stage.label}</span>
              <span className="block text-[10px] opacity-70">{deals.length} · {formatCurrency(total)}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban View */}
      {view === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {STAGES.map(stage => {
            const deals = pipeline[stage.key] || [];
            const stageTotal = deals.reduce((s,d) => s + (d.value||0), 0);
            return (
              <div key={stage.key} className="bg-[#fafaf9] rounded border border-[#e5e5e5] p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: stage.color}} />
                    <span className="text-[12px] font-bold text-[#181818]">{stage.label}</span>
                    <span className="text-[10px] bg-[#e5e5e5] text-[#514f4d] px-1.5 py-0.5 rounded-full font-bold">{deals.length}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-[#706e6b]">{formatCurrency(stageTotal)}</span>
                </div>
                <div className="space-y-2">
                  {deals.map(deal => {
                    const currentIdx = STAGES.findIndex(s => s.key === stage.key);
                    const nextStage = STAGES[currentIdx + 1];
                    return (
                      <div key={deal.id} className="bg-white rounded border border-[#e5e5e5] p-3 hover:border-[#1763e6] transition-colors group" style={{boxShadow:'0 1px 2px rgba(0,0,0,0.06)'}}>
                        <p className="text-[12px] font-semibold text-[#1763e6] truncate">{deal.title}</p>
                        {deal.account_name && <p className="text-[11px] text-[#706e6b] mt-1 flex items-center gap-1"><Building2 className="w-3 h-3" />{deal.account_name}</p>}
                        {deal.origin && <p className="text-[10px] text-[#939393] mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" />{deal.origin} → {deal.destination}</p>}
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#e5e5e5]">
                          <span className="text-[13px] font-bold text-[#181818]">{formatCurrency(deal.value)}</span>
                          <div className="flex items-center gap-1">
                            {deal.service_type && <span className="sf-badge sf-badge-info">{deal.service_type}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 mt-2 pt-2 border-t border-[#e5e5e5] opacity-0 group-hover:opacity-100 transition-opacity">
                          {nextStage ? (
                            <button onClick={() => moveStage(deal.id, nextStage.key)} className="text-[10px] text-[#1763e6] font-semibold hover:underline flex items-center gap-0.5">
                              Move to {nextStage.label} <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <>
                              <button onClick={() => moveStage(deal.id, 'closed_won')} className="text-[10px] text-[#2e844a] font-semibold hover:underline">Mark Won</button>
                              <button onClick={() => moveStage(deal.id, 'closed_lost')} className="text-[10px] text-[#ba0517] font-semibold hover:underline ml-2">Mark Lost</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {deals.length === 0 && <p className="text-center text-[11px] text-[#939393] py-8">No opportunities</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="sf-card">
          <div className="overflow-x-auto">
            <table className="sf-table">
              <thead>
                <tr>
                  <th>Opportunity Name</th>
                  <th>Account</th>
                  <th>Amount</th>
                  <th>Stage</th>
                  <th>Service</th>
                  <th>Route</th>
                  <th>Close Date</th>
                  <th>Probability</th>
                </tr>
              </thead>
              <tbody>
                {allDeals.map(deal => (
                  <tr key={deal.id}>
                    <td><span className="sf-link font-medium">{deal.title}</span></td>
                    <td className="text-[#706e6b]">{deal.account_name || '-'}</td>
                    <td className="font-semibold">{formatCurrency(deal.value)}</td>
                    <td><span className={`sf-badge ${deal.stage==='closed_won'?'sf-badge-success':deal.stage==='closed_lost'?'sf-badge-error':deal.stage==='negotiation'?'sf-badge-success':deal.stage==='proposal'?'sf-badge-warning':deal.stage==='qualification'?'sf-badge-info':'sf-badge-neutral'}`}>{deal.stage?.replace('_',' ')}</span></td>
                    <td className="text-[#706e6b]">{deal.service_type || '-'}</td>
                    <td className="text-[11px] text-[#706e6b]">{deal.origin && deal.destination ? `${deal.origin} → ${deal.destination}` : '-'}</td>
                    <td className="text-[11px] text-[#706e6b]">{deal.expected_close_date ? new Date(deal.expected_close_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '-'}</td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-[4px] bg-[#e5e5e5] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{width:`${deal.probability}%`,backgroundColor:deal.probability>=70?'#2e844a':deal.probability>=40?'#dd7a01':'#1763e6'}} />
                        </div>
                        <span className="text-[10px] text-[#706e6b]">{deal.probability}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="sf-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="sf-modal max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">New Opportunity</h2>
              <button onClick={() => setShowCreate(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={createDeal}>
              <div className="sf-modal-body space-y-4">
                <div>
                  <label className="sf-label">Opportunity Name *</label>
                  <input className="sf-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g., FTL Contract - Acme Corp" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="sf-label">Account</label>
                    <select className="sf-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}>
                      <option value="">Select</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="sf-label">Service Type</label>
                    <select className="sf-select" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}>
                      <option value="">Select</option>
                      {['FTL','LTL','Ocean','Air Freight','Intermodal','Refrigerated','Last Mile','Drayage','Tanker','Flatbed','Parcel'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Amount ($)</label><input className="sf-input" type="number" value={form.value} onChange={e => setForm({...form, value: e.target.value})} placeholder="500000" /></div>
                  <div><label className="sf-label">Close Date</label><input className="sf-input" type="date" value={form.expected_close_date} onChange={e => setForm({...form, expected_close_date: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Origin</label><input className="sf-input" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} placeholder="Chicago, IL" /></div>
                  <div><label className="sf-label">Destination</label><input className="sf-input" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Los Angeles, CA" /></div>
                </div>
              </div>
              <div className="sf-modal-footer">
                <button type="button" onClick={() => setShowCreate(false)} className="sf-btn-neutral">Cancel</button>
                <button type="submit" className="sf-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
