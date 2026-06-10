import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Plus, Search, X, Users } from 'lucide-react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ first_name:'', last_name:'', email:'', phone:'', title:'', account_id:'', role:'primary_contact' });

  useEffect(() => { loadContacts(); }, [search]);
  useEffect(() => { api.get('/accounts?limit=100').then(d => setAccounts((d.data||d).accounts||d.data||d||[])); }, []);

  const loadContacts = () => {
    const params = search ? `?search=${search}` : '';
    api.get(`/contacts${params}`).then(d => { setContacts((d.data||d).contacts||d.data||d||[]); setLoading(false); });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await api.post('/contacts', form);
    setShowForm(false);
    setForm({ first_name:'', last_name:'', email:'', phone:'', title:'', account_id:'', role:'primary_contact' });
    loadContacts();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-[3px] border-[#0176d3] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 pb-8">
      {/* Page Header */}
      <div className="bg-white border-b border-[#e5e5e5] -mx-6 -mt-6 px-6 py-4 mb-4" style={{boxShadow:'0 2px 4px rgba(0,0,0,0.07)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#06a59a] flex items-center justify-center"><Users className="w-4 h-4 text-white" /></div>
            <div>
              <h1 className="text-[18px] font-bold text-[#181818]">Contacts</h1>
              <p className="text-[12px] text-[#706e6b] mt-0.5">{contacts.length} records</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)} className="sf-btn-primary"><Plus className="w-3.5 h-3.5" /> New Contact</button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#939393]" />
          <input className="sf-input pl-9" placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="sf-card">
        <div className="overflow-x-auto">
          <table className="sf-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Title</th>
                <th>Account</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/contacts/${c.id}`} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#06a59a] flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <span className="sf-link font-medium">{c.first_name} {c.last_name}</span>
                    </Link>
                  </td>
                  <td className="text-[#706e6b]">{c.title || '-'}</td>
                  <td><Link to={`/accounts/${c.account_id}`} className="sf-link">{c.account_name || '-'}</Link></td>
                  <td className="text-[#706e6b]">{c.email ? <a href={`mailto:${c.email}`} className="sf-link">{c.email}</a> : '-'}</td>
                  <td className="text-[#706e6b]">{c.phone || '-'}</td>
                  <td><span className={`sf-badge ${c.is_decision_maker?'sf-badge-warning':c.is_primary?'sf-badge-info':'sf-badge-neutral'}`}>{c.is_decision_maker?'Decision Maker':c.is_primary?'Primary':'Contact'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contacts.length === 0 && (
          <div className="text-center py-12 text-[#939393]">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">No contacts found</p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="sf-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="sf-modal max-w-xl" onClick={e => e.stopPropagation()}>
            <div className="sf-modal-header">
              <h2 className="text-[15px] font-bold text-[#181818]">New Contact</h2>
              <button onClick={() => setShowForm(false)} className="sf-btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="sf-modal-body space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">First Name *</label><input className="sf-input" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
                  <div><label className="sf-label">Last Name *</label><input className="sf-input" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} required /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Email</label><input className="sf-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div><label className="sf-label">Phone</label><input className="sf-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="sf-label">Title</label><input className="sf-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="VP of Logistics" /></div>
                  <div><label className="sf-label">Account</label><select className="sf-select" value={form.account_id} onChange={e => setForm({...form, account_id: e.target.value})}><option value="">Select</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
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
