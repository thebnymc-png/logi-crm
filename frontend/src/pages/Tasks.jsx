import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Plus, X, CheckSquare, AlertTriangle } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [showCreate, setShowCreate] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ title:'', priority:'medium', due_date:'', account_id:'', description:'' });

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    try {
      const params = filter ? `?status=${filter}` : '';
      const [t, a] = await Promise.all([
        api.get(`/tasks${params}`),
        api.get('/accounts?limit=100'),
      ]);
      setTasks((t.data||t).tasks||t.data||t||[]);
      setAccounts((a.data||a).accounts||a.data||a||[]);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/tasks', form);
    setShowCreate(false);
    setForm({ title:'', priority:'medium', due_date:'', account_id:'', description:'' });
    loadData();
  };

  const completeTask = async (id) => {
    await api.put(`/tasks/${id}`, { status: 'completed' });
    loadData();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#1763e6] border-t-transparent rounded-full animate-spin" /></div>;

  const priorityColors = { urgent:'bg-[#ba0517]', high:'bg-[#dd7a01]', medium:'bg-[#1763e6]', low:'bg-[#c9c9c9]' };

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#ba0517] flex items-center justify-center"><CheckSquare className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-[18px] font-bold text-[#181818]">Tasks</h1>
              <p className="text-[12px] text-[#706e6b] mt-0.5">{tasks.length} tasks</p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> New Task</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {[{key:'pending',label:'Open'},{key:'completed',label:'Completed'},{key:'',label:'All'}].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${filter===f.key?'bg-[#1763e6] text-white':'bg-white border border-[#c9c9c9] text-[#181818] hover:bg-[#f3f3f3]'}`}>{f.label}</button>
        ))}
      </div>

      {/* Table */}
      <div className="sf-card">
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th style={{width:'32px'}}></th>
                <th>Task</th>
                <th>Priority</th>
                <th>Account</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => {
                const overdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed';
                return (
                  <tr key={t.id}>
                    <td><div className={`w-2.5 h-2.5 rounded-full ${priorityColors[t.priority]||'bg-[#c9c9c9]'}`} /></td>
                    <td className="font-medium text-[#181818]">{t.title}</td>
                    <td><span className={`sf-badge ${t.priority==='urgent'?'sf-badge-error':t.priority==='high'?'sf-badge-warning':t.priority==='medium'?'sf-badge-info':'sf-badge-neutral'}`}>{t.priority}</span></td>
                    <td className="text-[#706e6b]">{t.account_name || '-'}</td>
                    <td className={`text-[11px] ${overdue?'text-[#ba0517] font-semibold':'text-[#706e6b]'}`}>
                      {overdue && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {t.due_date ? new Date(t.due_date).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '-'}
                    </td>
                    <td><span className={`sf-badge ${t.status==='completed'?'sf-badge-success':'sf-badge-neutral'}`}>{t.status}</span></td>
                    <td>
                      {t.status !== 'completed' && (
                        <button onClick={() => completeTask(t.id)} className="text-[11px] text-[#1763e6] font-semibold hover:underline">Complete</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="sf-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="sf-modal max-w-md" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">New Task</h2>
              <button onClick={() => setShowCreate(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="sf-modal-body space-y-4">
                <div><label className="sf-label">Task Title *</label><input className="sf-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required placeholder="e.g., Follow up with client" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Priority</label><select className="sf-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}><option value="urgent">Urgent</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
                  <div><label className="sf-label">Due Date</label><input className="sf-input" type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
                </div>
                <div><label className="sf-label">Account</label><select className="sf-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}><option value="">Select</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
                <div><label className="sf-label">Description</label><textarea className="sf-input" rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
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
