import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, X, DollarSign } from 'lucide-react';

const fmtCurrency = (val) => {
  if (!val) return '$0';
  return `$${Number(val).toLocaleString()}`;
};

export default function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ account_id:'', origin:'', destination:'', service_type:'FTL', weight:'', commodity:'', base_rate:'', fuel_surcharge:'', accessorial_charges:'', discount_percent:'0', valid_from:'', valid_until:'' });

  useEffect(() => { loadQuotes(); }, [statusFilter]);
  useEffect(() => { api.get('/accounts?limit=100').then(d => setAccounts((d.data||d).accounts||d.data||d||[])); }, []);

  const loadQuotes = () => {
    const params = statusFilter ? `?status=${statusFilter}` : '';
    api.get(`/quotes${params}`).then(d => { setQuotes((d.data||d).quotes||d.data||d||[]); setLoading(false); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/quotes', {
      ...form,
      weight: Number(form.weight)||null,
      base_rate: Number(form.base_rate)||0,
      fuel_surcharge: Number(form.fuel_surcharge)||0,
      accessorial_charges: Number(form.accessorial_charges)||0,
      discount_percent: Number(form.discount_percent)||0,
    });
    setShowForm(false);
    setForm({ account_id:'', origin:'', destination:'', service_type:'FTL', weight:'', commodity:'', base_rate:'', fuel_surcharge:'', accessorial_charges:'', discount_percent:'0', valid_from:'', valid_until:'' });
    loadQuotes();
  };

  const updateStatus = async (id, status) => {
    await api.put(`/quotes/${id}`, { status });
    loadQuotes();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#1763e6] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#2e844a] flex items-center justify-center"><DollarSign className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-[18px] font-bold text-[#181818]">Quotes & Rates</h1>
              <p className="text-[12px] text-[#706e6b] mt-0.5">{quotes.length} quotes</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> New Quote</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[{key:'',label:'All'},{key:'draft',label:'Draft'},{key:'sent',label:'Sent'},{key:'accepted',label:'Accepted'},{key:'rejected',label:'Rejected'}].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${statusFilter===f.key?'bg-[#1763e6] text-white':'bg-white border border-[#c9c9c9] text-[#181818] hover:bg-[#f3f3f3]'}`}>{f.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="sf-card">
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Account</th>
                <th>Route</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td className="font-medium text-[#181818]">{q.quote_number || `Q-${q.id}`}</td>
                  <td className="text-[#706e6b]">{q.account_name || '-'}</td>
                  <td className="text-[#706e6b]">{q.origin && q.destination ? `${q.origin} → ${q.destination}` : '-'}</td>
                  <td><span className="sf-badge sf-badge-info">{q.service_type}</span></td>
                  <td className="font-semibold text-[#181818]">{fmtCurrency(q.total_amount)}</td>
                  <td className="text-[11px] text-[#706e6b]">{q.valid_until ? new Date(q.valid_until).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '-'}</td>
                  <td><span className={`sf-badge ${q.status==='accepted'?'sf-badge-success':q.status==='sent'?'sf-badge-info':q.status==='rejected'?'sf-badge-error':'sf-badge-neutral'}`}>{q.status}</span></td>
                  <td>
                    <div className="flex gap-2">
                      {q.status === 'draft' && <button onClick={() => updateStatus(q.id, 'sent')} className="text-[11px] text-[#1763e6] font-semibold hover:underline">Send</button>}
                      {q.status === 'sent' && (
                        <>
                          <button onClick={() => updateStatus(q.id, 'accepted')} className="text-[11px] text-[#2e844a] font-semibold hover:underline">Accept</button>
                          <button onClick={() => updateStatus(q.id, 'rejected')} className="text-[11px] text-[#ba0517] font-semibold hover:underline">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {quotes.length === 0 && !loading && <div className="text-center py-12 text-[#939393] text-[13px]">No quotes found</div>}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="sf-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="sf-modal max-w-2xl" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">New Quote</h2>
              <button onClick={() => setShowForm(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sf-modal-body space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Account</label><select className="sf-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}><option value="">Select</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                  <div><label className="sf-label">Service Type</label><select className="sf-select" value={form.service_type} onChange={e => setForm({...form, service_type: e.target.value})}><option value="FTL">FTL</option><option value="LTL">LTL</option><option value="Ocean">Ocean</option><option value="Air Freight">Air Freight</option><option value="Intermodal">Intermodal</option><option value="Refrigerated">Refrigerated</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Origin *</label><input className="sf-input" value={form.origin} onChange={e => setForm({...form, origin: e.target.value})} required placeholder="Chicago, IL" /></div>
                  <div><label className="sf-label">Destination *</label><input className="sf-input" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} required placeholder="Los Angeles, CA" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Commodity</label><input className="sf-input" value={form.commodity} onChange={e => setForm({...form, commodity: e.target.value})} placeholder="Electronics" /></div>
                  <div><label className="sf-label">Weight (lbs)</label><input className="sf-input" type="number" value={form.weight} onChange={e => setForm({...form, weight: e.target.value})} /></div>
                </div>
                <div className="border-t border-[#e5e5e5] pt-4">
                  <p className="text-[12px] font-bold text-[#181818] mb-3">Pricing</p>
                  <div className="grid grid-cols-4 gap-3">
                    <div><label className="sf-label">Base Rate ($) *</label><input className="sf-input" type="number" step="0.01" value={form.base_rate} onChange={e => setForm({...form, base_rate: e.target.value})} required /></div>
                    <div><label className="sf-label">Fuel ($)</label><input className="sf-input" type="number" step="0.01" value={form.fuel_surcharge} onChange={e => setForm({...form, fuel_surcharge: e.target.value})} /></div>
                    <div><label className="sf-label">Accessorials ($)</label><input className="sf-input" type="number" step="0.01" value={form.accessorial_charges} onChange={e => setForm({...form, accessorial_charges: e.target.value})} /></div>
                    <div><label className="sf-label">Discount (%)</label><input className="sf-input" type="number" step="0.1" value={form.discount_percent} onChange={e => setForm({...form, discount_percent: e.target.value})} /></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Valid From</label><input className="sf-input" type="date" value={form.valid_from} onChange={e => setForm({...form, valid_from: e.target.value})} /></div>
                  <div><label className="sf-label">Valid Until</label><input className="sf-input" type="date" value={form.valid_until} onChange={e => setForm({...form, valid_until: e.target.value})} /></div>
                </div>
              </div>
              <div className="sf-modal-footer">
                <button type="button" onClick={() => setShowForm(false)} className="sf-btn-neutral">Cancel</button>
                <button type="submit" className="sf-btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
