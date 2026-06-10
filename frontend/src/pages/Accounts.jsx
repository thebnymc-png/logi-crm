import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Search, X, Building2 } from 'lucide-react';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', type:'shipper', industry:'', phone:'', city:'', state:'', shipping_volume_monthly:'' });

  useEffect(() => { loadAccounts(); }, [search, typeFilter, healthFilter]);

  const loadAccounts = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    if (healthFilter) params.set('health', healthFilter);
    api.get(`/accounts?${params}`).then(d => { setAccounts((d.data||d).accounts||d.data||d||[]); setLoading(false); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/accounts', { ...form, shipping_volume_monthly: Number(form.shipping_volume_monthly)||null });
    setShowForm(false);
    setForm({ name:'', type:'shipper', industry:'', phone:'', city:'', state:'', shipping_volume_monthly:'' });
    loadAccounts();
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#7f8de1] flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-[18px] font-bold text-[#181818]">Accounts</h1>
              <p className="text-[12px] text-[#706e6b] mt-0.5">{accounts.length} records</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> New Account</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#939393]" />
          <input className="sf-input pl-9" placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="sf-select w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          <option value="shipper">Shipper</option>
          <option value="carrier">Carrier</option>
          <option value="partner">Partner</option>
        </select>
        <select className="sf-select w-auto" value={healthFilter} onChange={e => setHealthFilter(e.target.value)}>
          <option value="">All Health</option>
          <option value="excellent">Excellent</option>
          <option value="good">Good</option>
          <option value="at_risk">At Risk</option>
        </select>
      </div>

      {/* Table */}
      <div className="sf-card">
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Account Name</th>
                <th>Type</th>
                <th>Industry</th>
                <th>Location</th>
                <th>Health</th>
                <th>Monthly Volume</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(a => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/accounts/${a.id}`} className="sf-link font-medium">{a.name}</Link>
                  </td>
                  <td><span className={`sf-badge ${a.type==='shipper'?'sf-badge-info':a.type==='carrier'?'sf-badge-success':'sf-badge-neutral'}`}>{a.type}</span></td>
                  <td className="text-[#706e6b]">{a.industry || '-'}</td>
                  <td className="text-[#706e6b]">{a.city && a.state ? `${a.city}, ${a.state}` : '-'}</td>
                  <td><span className={`sf-badge ${a.account_health==='excellent'?'sf-badge-success':a.account_health==='good'?'sf-badge-info':'sf-badge-error'}`}>{a.account_health==='at_risk'?'At Risk':a.account_health||'N/A'}</span></td>
                  <td className="text-[#706e6b]">{a.shipping_volume_monthly ? `${(a.shipping_volume_monthly/1000).toFixed(0)}K lbs` : '-'}</td>
                  <td className="text-[#706e6b]">{a.phone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {accounts.length === 0 && !loading && (
          <div className="text-center py-12 text-[#939393]">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">No accounts found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="sf-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="sf-modal max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">New Account</h2>
              <button onClick={() => setShowForm(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sf-modal-body space-y-4">
                <div><label className="sf-label">Account Name *</label><input className="sf-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Type</label><select className="sf-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="shipper">Shipper</option><option value="carrier">Carrier</option><option value="partner">Partner</option></select></div>
                  <div><label className="sf-label">Industry</label><input className="sf-input" value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">City</label><input className="sf-input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                  <div><label className="sf-label">State</label><input className="sf-input" value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Phone</label><input className="sf-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div><label className="sf-label">Monthly Volume (lbs)</label><input className="sf-input" type="number" value={form.shipping_volume_monthly} onChange={e => setForm({...form, shipping_volume_monthly: e.target.value})} /></div>
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
