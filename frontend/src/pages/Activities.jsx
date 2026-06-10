import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, X, Phone, Mail, Calendar, FileText, Activity } from 'lucide-react';

export default function Activities() {
  const [activities, setActivities] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type:'call', subject:'', account_id:'', contact_id:'', outcome:'', duration_minutes:'', status:'completed' });

  useEffect(() => { loadData(); }, [typeFilter]);

  const loadData = async () => {
    try {
      const params = typeFilter ? `?type=${typeFilter}` : '';
      const [act, acc, con] = await Promise.all([
        api.get(`/activities${params}`),
        api.get('/accounts?limit=100'),
        api.get('/contacts?limit=100'),
      ]);
      setActivities((act.data||act).activities||act.data||act||[]);
      setAccounts((acc.data||acc).accounts||acc.data||acc||[]);
      setContacts((con.data||con).contacts||con.data||con||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/activities', { ...form, duration_minutes: Number(form.duration_minutes)||null });
    setShowCreate(false);
    setForm({ type:'call', subject:'', account_id:'', contact_id:'', outcome:'', duration_minutes:'', status:'completed' });
    loadData();
  };

  const typeIcon = (type) => {
    const icons = { call: Phone, email: Mail, meeting: Calendar, note: FileText };
    const Icon = icons[type] || Activity;
    const colors = { call:'bg-[#d8edff] text-[#1763e6]', email:'bg-[#e3f3e8] text-[#2e844a]', meeting:'bg-[#f3e8ff] text-[#7526c4]', note:'bg-[#fef3cd] text-[#8d6e00]' };
    return <div className={`w-7 h-7 rounded flex items-center justify-center ${colors[type]||'bg-[#f3f3f3] text-[#706e6b]'}`}><Icon className="w-3.5 h-3.5" /></div>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#1763e6] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#dd7a01] flex items-center justify-center"><Activity className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-[18px] font-bold text-[#181818]">Activities</h1>
              <p className="text-[12px] text-[#706e6b] mt-0.5">{activities.length} logged</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> Log Activity</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[{key:'',label:'All'},{key:'call',label:'Calls'},{key:'email',label:'Emails'},{key:'meeting',label:'Meetings'},{key:'note',label:'Notes'}].map(f => (
          <button key={f.key} onClick={() => setTypeFilter(f.key)} className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${typeFilter===f.key?'bg-[#1763e6] text-white':'bg-white border border-[#c9c9c9] text-[#181818] hover:bg-[#f3f3f3]'}`}>{f.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="sf-card">
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Subject</th>
                <th>Account</th>
                <th>Contact</th>
                <th>Outcome</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id}>
                  <td>{typeIcon(a.type)}</td>
                  <td className="font-medium text-[#181818]">{a.subject}</td>
                  <td className="text-[#706e6b]">{a.account_name || '-'}</td>
                  <td className="text-[#706e6b]">{a.contact_name || '-'}</td>
                  <td className="text-[#706e6b] max-w-[200px] truncate">{a.outcome || '-'}</td>
                  <td className="text-[#706e6b]">{a.duration_minutes ? `${a.duration_minutes} min` : '-'}</td>
                  <td><span className={`sf-badge ${a.status==='completed'?'sf-badge-success':'sf-badge-info'}`}>{a.status}</span></td>
                  <td className="text-[11px] text-[#706e6b]">{a.created_at ? new Date(a.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="sf-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="sf-modal max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">Log Activity</h2>
              <button onClick={() => setShowCreate(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="sf-modal-body space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Type</label><select className="sf-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}><option value="call">Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="note">Note</option></select></div>
                  <div><label className="sf-label">Status</label><select className="sf-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}><option value="completed">Completed</option><option value="planned">Planned</option></select></div>
                </div>
                <div><label className="sf-label">Subject *</label><input className="sf-input" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required placeholder="e.g., Quarterly review call" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Account</label><select className="sf-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}><option value="">Select</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                  <div><label className="sf-label">Contact</label><select className="sf-select" value={form.contact_id} onChange={e => setForm({...form, contact_id: e.target.value})}><option value="">Select</option>{contacts.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Outcome</label><input className="sf-input" value={form.outcome} onChange={e => setForm({...form, outcome: e.target.value})} placeholder="Positive response" /></div>
                  <div><label className="sf-label">Duration (min)</label><input className="sf-input" type="number" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} placeholder="30" /></div>
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
