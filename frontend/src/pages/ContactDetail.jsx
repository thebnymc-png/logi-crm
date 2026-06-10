import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Linkedin, User, Calendar, Clock, Plus, Send, CheckCircle2, Circle, AlertTriangle, MessageSquare, PhoneCall, Video, FileText, Edit3, Trash2, MoreVertical, Target, Star } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatDate, formatDateTime, getStageName, getStageColor, getPriorityColor } from '../utils/format';

const ACTIVITY_ICONS = {
  call: { icon: PhoneCall, color: 'bg-green-100 text-green-600', label: 'Call' },
  email: { icon: Send, color: 'bg-blue-100 text-blue-600', label: 'Email' },
  meeting: { icon: Video, color: 'bg-purple-100 text-purple-600', label: 'Meeting' },
  note: { icon: MessageSquare, color: 'bg-amber-100 text-amber-600', label: 'Note' },
  task: { icon: CheckCircle2, color: 'bg-teal-100 text-teal-600', label: 'Task' },
};

export default function ContactDetail() {
  const { id } = useParams();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: 'call', subject: '', outcome: '', duration_minutes: '', status: 'completed' });
  const [followUpForm, setFollowUpForm] = useState({ title: '', description: '', priority: 'medium', due_date: '', type: 'follow_up' });
  const [editForm, setEditForm] = useState({});
  const [tasks, setTasks] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => { loadContact(); loadTasks(); }, [id]);
  useEffect(() => { api.get('/accounts?limit=100').then(d => setAccounts(d.accounts || [])); }, []);

  const loadContact = () => {
    api.get(`/contacts/${id}`).then(data => {
      setContact(data);
      setEditForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        title: data.title || '',
        email: data.email || '',
        phone: data.phone || '',
        mobile: data.mobile || '',
        department: data.department || '',
        linkedin: data.linkedin || '',
        account_id: data.account_id || '',
        is_primary: data.is_primary,
        is_decision_maker: data.is_decision_maker,
        notes: data.notes || '',
      });
      setLoading(false);
    });
  };

  const loadTasks = () => {
    api.get(`/tasks?limit=100`).then(data => {
      setTasks((data.tasks || []).filter(t => t.contact_id == id));
    });
  };

  const handleLogActivity = async (e) => {
    e.preventDefault();
    await api.post('/activities', {
      ...activityForm,
      contact_id: Number(id),
      account_id: contact.account_id || null,
      duration_minutes: activityForm.duration_minutes ? Number(activityForm.duration_minutes) : null,
    });
    setShowActivityForm(false);
    setActivityForm({ type: 'call', subject: '', outcome: '', duration_minutes: '', status: 'completed' });
    loadContact();
  };

  const handleCreateFollowUp = async (e) => {
    e.preventDefault();
    await api.post('/tasks', {
      ...followUpForm,
      contact_id: Number(id),
      account_id: contact.account_id || null,
    });
    setShowFollowUpForm(false);
    setFollowUpForm({ title: '', description: '', priority: 'medium', due_date: '', type: 'follow_up' });
    loadTasks();
  };

  const handleEditContact = async (e) => {
    e.preventDefault();
    await api.put(`/contacts/${id}`, editForm);
    setShowEditForm(false);
    loadContact();
  };

  const toggleTaskComplete = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    await api.put(`/tasks/${task.id}`, { status: newStatus });
    loadTasks();
  };

  const deleteTask = async (taskId) => {
    if (confirm('Delete this follow-up?')) {
      await api.delete(`/tasks/${taskId}`);
      loadTasks();
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div></div>;
  if (!contact) return <div className="text-center py-12 text-gray-500">Contact not found</div>;

  const fullName = `${contact.first_name} ${contact.last_name}`;
  const initials = `${contact.first_name[0]}${contact.last_name[0]}`;
  const pendingFollowUps = tasks.filter(t => t.status !== 'completed');
  const completedFollowUps = tasks.filter(t => t.status === 'completed');
  const isOverdue = (task) => task.status !== 'completed' && task.due_date && new Date(task.due_date) < new Date();

  // Merge activities and tasks into a unified timeline
  const timeline = [
    ...(contact.activities || []).map(a => ({ ...a, _type: 'activity', _date: a.created_at })),
    ...tasks.map(t => ({ ...t, _type: 'task', _date: t.created_at })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date));

  const tabs = [
    { id: 'timeline', label: 'Timeline', count: timeline.length },
    { id: 'activities', label: 'Activities', count: contact.activities?.length || 0 },
    { id: 'followups', label: 'Follow-ups', count: tasks.length },
    { id: 'deals', label: 'Deals', count: contact.deals?.length || 0 },
    { id: 'details', label: 'Details', count: null },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/contacts" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors">
        <ArrowLeft size={16} /> Back to Contacts
      </Link>

      {/* Contact Header Card */}
      <div className="card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary-600 to-primary-800 rounded-t-xl"></div>
        <div className="relative pt-12 flex flex-col md:flex-row items-start gap-5">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center text-2xl font-bold text-primary-700 border-4 border-white">
            {initials}
          </div>
          <div className="flex-1 pt-2">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <p className="text-gray-500 mt-0.5">{contact.title || 'No title'}</p>
                {contact.account_name && (
                  <Link to={`/accounts/${contact.account_id}`} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 mt-1">
                    <Building2 size={14} /> {contact.account_name}
                  </Link>
                )}
              </div>
              <button onClick={() => setShowEditForm(true)} className="btn-secondary text-sm py-1.5 px-3">
                <Edit3 size={14} /> Edit
              </button>
            </div>

            {/* Contact info row */}
            <div className="flex flex-wrap gap-4 mt-4">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                  <Mail size={14} className="text-gray-400" /> {contact.email}
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                  <Phone size={14} className="text-gray-400" /> {contact.phone}
                </a>
              )}
              {contact.mobile && (
                <a href={`tel:${contact.mobile}`} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                  <Phone size={14} className="text-gray-400" /> {contact.mobile} (mobile)
                </a>
              )}
              {contact.linkedin && (
                <a href={contact.linkedin} target="_blank" rel="noopener" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors">
                  <Linkedin size={14} className="text-gray-400" /> LinkedIn
                </a>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {contact.is_primary ? <span className="badge bg-blue-100 text-blue-700"><Star size={10} className="mr-1" /> Primary Contact</span> : null}
              {contact.is_decision_maker ? <span className="badge bg-purple-100 text-purple-700"><Target size={10} className="mr-1" /> Decision Maker</span> : null}
              {contact.department && <span className="badge bg-gray-100 text-gray-600">{contact.department}</span>}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{contact.activities?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Activities</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{pendingFollowUps.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pending Follow-ups</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{contact.deals?.length || 0}</p>
            <p className="text-xs text-gray-500 mt-0.5">Deals</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(contact.deals?.reduce((s, d) => s + (d.value || 0), 0))}</p>
            <p className="text-xs text-gray-500 mt-0.5">Deal Value</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => setShowActivityForm(true)} className="btn-primary text-sm">
          <Plus size={16} /> Log Activity
        </button>
        <button onClick={() => setShowFollowUpForm(true)} className="btn-secondary text-sm">
          <Calendar size={16} /> Schedule Follow-up
        </button>
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="btn-secondary text-sm">
            <Mail size={16} /> Send Email
          </a>
        )}
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="btn-secondary text-sm">
            <Phone size={16} /> Call
          </a>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.id ? 'border-primary-600 text-primary-600 bg-primary-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              {tab.label}
              {tab.count !== null && <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && (
        <div className="space-y-1">
          {timeline.length === 0 && <div className="text-center py-12 text-gray-400">No activity yet. Log your first interaction above.</div>}
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gray-200"></div>
            <div className="space-y-4">
              {timeline.map((item, idx) => {
                if (item._type === 'activity') {
                  const config = ACTIVITY_ICONS[item.type] || ACTIVITY_ICONS.note;
                  const Icon = config.icon;
                  return (
                    <div key={`a-${item.id}`} className="relative flex items-start gap-4 pl-2">
                      <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center ${config.color} ring-4 ring-white`}>
                        <Icon size={16} />
                      </div>
                      <div className="flex-1 card py-4 px-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-gray-900">{item.subject}</span>
                              <span className={`badge ${item.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span>
                            </div>
                            {item.outcome && <p className="text-sm text-gray-600 mt-1">{item.outcome}</p>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            <p className="text-xs text-gray-400">{formatDateTime(item.created_at)}</p>
                            {item.duration_minutes && <p className="text-xs text-gray-400 mt-0.5">{item.duration_minutes} min</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={`t-${item.id}`} className="relative flex items-start gap-4 pl-2">
                      <div className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center ring-4 ring-white ${item.status === 'completed' ? 'bg-green-100 text-green-600' : isOverdue(item) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                        {item.status === 'completed' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div className={`flex-1 card py-4 px-5 ${isOverdue(item) ? 'border-l-4 border-l-red-400' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${item.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{item.title}</span>
                              <span className={`badge ${getPriorityColor(item.priority)}`}>{item.priority}</span>
                              {isOverdue(item) && <span className="badge bg-red-100 text-red-700"><AlertTriangle size={10} className="mr-0.5" /> Overdue</span>}
                            </div>
                            {item.description && <p className="text-sm text-gray-600 mt-1">{item.description}</p>}
                          </div>
                          <div className="text-right flex-shrink-0 ml-4">
                            {item.due_date && <p className="text-xs text-gray-400">Due {formatDate(item.due_date)}</p>}
                            <p className="text-xs text-gray-400 mt-0.5">Follow-up</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-3">
          {(!contact.activities || contact.activities.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <PhoneCall size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No activities logged yet</p>
              <button onClick={() => setShowActivityForm(true)} className="btn-primary text-sm mt-3"><Plus size={16} /> Log First Activity</button>
            </div>
          )}
          {contact.activities?.map(activity => {
            const config = ACTIVITY_ICONS[activity.type] || ACTIVITY_ICONS.note;
            const Icon = config.icon;
            return (
              <div key={activity.id} className="card flex items-start gap-4 hover:shadow-md transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-gray-900">{activity.subject}</h4>
                    <span className="text-xs text-gray-400 uppercase font-medium">{config.label}</span>
                  </div>
                  {activity.outcome && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{activity.outcome}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>{formatDateTime(activity.created_at)}</span>
                    {activity.duration_minutes && <span>• {activity.duration_minutes} min</span>}
                    <span className={`badge text-xs ${activity.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{activity.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'followups' && (
        <div className="space-y-6">
          {/* Pending Follow-ups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Pending ({pendingFollowUps.length})
              </h3>
              <button onClick={() => setShowFollowUpForm(true)} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                <Plus size={14} /> Add Follow-up
              </button>
            </div>
            {pendingFollowUps.length === 0 && (
              <div className="card text-center py-8 text-gray-400">
                <Calendar size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No pending follow-ups</p>
              </div>
            )}
            <div className="space-y-2">
              {pendingFollowUps.map(task => (
                <div key={task.id} className={`card flex items-start gap-3 hover:shadow-md transition-all ${isOverdue(task) ? 'border-l-4 border-l-red-400' : ''}`}>
                  <button onClick={() => toggleTaskComplete(task)} className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform">
                    <Circle size={20} className="text-gray-300 hover:text-primary-500" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm text-gray-900">{task.title}</h4>
                      <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                      {isOverdue(task) && <span className="badge bg-red-100 text-red-700 text-xs"><AlertTriangle size={10} className="mr-0.5" /> Overdue</span>}
                    </div>
                    {task.description && <p className="text-sm text-gray-500 mt-1">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {task.due_date && <span className="flex items-center gap-1"><Calendar size={12} /> Due {formatDate(task.due_date)}</span>}
                      <span className="badge bg-gray-50 text-gray-500 text-xs">{task.type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Completed Follow-ups */}
          {completedFollowUps.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-500 flex items-center gap-2 mb-3">
                <CheckCircle2 size={16} className="text-green-500" /> Completed ({completedFollowUps.length})
              </h3>
              <div className="space-y-2">
                {completedFollowUps.map(task => (
                  <div key={task.id} className="card flex items-start gap-3 opacity-60 hover:opacity-100 transition-opacity">
                    <button onClick={() => toggleTaskComplete(task)} className="mt-0.5 flex-shrink-0">
                      <CheckCircle2 size={20} className="text-green-500" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-500 line-through">{task.title}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        {task.completed_at && <span>Completed {formatDate(task.completed_at)}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="space-y-3">
          {(!contact.deals || contact.deals.length === 0) && (
            <div className="text-center py-12 text-gray-400">
              <Target size={40} className="mx-auto mb-3 text-gray-300" />
              <p>No deals associated with this contact</p>
            </div>
          )}
          {contact.deals?.map(deal => (
            <div key={deal.id} className="card hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">{deal.title}</h4>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {deal.service_type && <span className="badge bg-gray-100 text-gray-600">{deal.service_type}</span>}
                    {deal.origin && deal.destination && <span>{deal.origin} → {deal.destination}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(deal.value)}</p>
                  <span className={`badge ${getStageColor(deal.stage)}`}>{getStageName(deal.stage)}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                {deal.expected_close_date && <span>Expected close: {formatDate(deal.expected_close_date)}</span>}
                {deal.probability && <span>• {deal.probability}% probability</span>}
                {deal.frequency && <span>• {deal.frequency}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
            <dl className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">Full Name</dt><dd className="text-sm font-medium text-gray-900">{fullName}</dd></div>
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">Title</dt><dd className="text-sm font-medium text-gray-900">{contact.title || '-'}</dd></div>
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">Department</dt><dd className="text-sm font-medium text-gray-900">{contact.department || '-'}</dd></div>
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">Email</dt><dd className="text-sm font-medium text-gray-900">{contact.email || '-'}</dd></div>
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">Phone</dt><dd className="text-sm font-medium text-gray-900">{contact.phone || '-'}</dd></div>
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">Mobile</dt><dd className="text-sm font-medium text-gray-900">{contact.mobile || '-'}</dd></div>
              <div className="flex justify-between py-2 border-b border-gray-50"><dt className="text-sm text-gray-500">LinkedIn</dt><dd className="text-sm font-medium text-gray-900">{contact.linkedin || '-'}</dd></div>
              <div className="flex justify-between py-2"><dt className="text-sm text-gray-500">Account</dt><dd className="text-sm font-medium text-primary-600">{contact.account_name || '-'}</dd></div>
            </dl>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{contact.notes || 'No notes added yet.'}</p>
            <div className="mt-6 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Roles</h4>
              <div className="flex gap-2">
                {contact.is_primary ? <span className="badge bg-blue-100 text-blue-700">Primary Contact</span> : <span className="badge bg-gray-100 text-gray-500">Not Primary</span>}
                {contact.is_decision_maker ? <span className="badge bg-purple-100 text-purple-700">Decision Maker</span> : <span className="badge bg-gray-100 text-gray-500">Not Decision Maker</span>}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Record Info</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Created: {formatDateTime(contact.created_at)}</p>
                <p>Last Updated: {formatDateTime(contact.updated_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Activity Modal */}
      {showActivityForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowActivityForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Log Activity</h2>
            <p className="text-sm text-gray-500 mb-5">Record an interaction with {contact.first_name}</p>
            <form onSubmit={handleLogActivity} className="space-y-4">
              <div className="flex gap-2">
                {Object.entries(ACTIVITY_ICONS).filter(([k]) => k !== 'task').map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button key={key} type="button" onClick={() => setActivityForm({...activityForm, type: key})}
                      className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${activityForm.type === key ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Icon size={18} className={activityForm.type === key ? 'text-primary-600' : 'text-gray-400'} />
                      <span className={`text-xs font-medium ${activityForm.type === key ? 'text-primary-700' : 'text-gray-500'}`}>{config.label}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input value={activityForm.subject} onChange={e => setActivityForm({...activityForm, subject: e.target.value})} className="input-field" required placeholder={`What was this ${activityForm.type} about?`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Outcome / Notes</label>
                <textarea value={activityForm.outcome} onChange={e => setActivityForm({...activityForm, outcome: e.target.value})} className="input-field" rows={3} placeholder="Key takeaways, next steps, decisions made..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (min)</label>
                  <input type="number" value={activityForm.duration_minutes} onChange={e => setActivityForm({...activityForm, duration_minutes: e.target.value})} className="input-field" placeholder="30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={activityForm.status} onChange={e => setActivityForm({...activityForm, status: e.target.value})} className="select-field">
                    <option value="completed">Completed</option>
                    <option value="planned">Planned</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Log Activity</button>
                <button type="button" onClick={() => setShowActivityForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      {showFollowUpForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowFollowUpForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Schedule Follow-up</h2>
            <p className="text-sm text-gray-500 mb-5">Create a reminder to follow up with {contact.first_name}</p>
            <form onSubmit={handleCreateFollowUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">What needs to be done? *</label>
                <input value={followUpForm.title} onChange={e => setFollowUpForm({...followUpForm, title: e.target.value})} className="input-field" required placeholder="e.g., Send revised proposal, Follow up on pricing" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details</label>
                <textarea value={followUpForm.description} onChange={e => setFollowUpForm({...followUpForm, description: e.target.value})} className="input-field" rows={2} placeholder="Additional context..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input type="date" value={followUpForm.due_date} onChange={e => setFollowUpForm({...followUpForm, due_date: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select value={followUpForm.priority} onChange={e => setFollowUpForm({...followUpForm, priority: e.target.value})} className="select-field">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={followUpForm.type} onChange={e => setFollowUpForm({...followUpForm, type: e.target.value})} className="select-field">
                    <option value="follow_up">Follow Up</option>
                    <option value="call">Call</option>
                    <option value="email">Email</option>
                    <option value="meeting">Meeting</option>
                    <option value="proposal">Proposal</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Schedule Follow-up</button>
                <button type="button" onClick={() => setShowFollowUpForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-5">Edit Contact</h2>
            <form onSubmit={handleEditContact} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input value={editForm.first_name} onChange={e => setEditForm({...editForm, first_name: e.target.value})} className="input-field" required /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input value={editForm.last_name} onChange={e => setEditForm({...editForm, last_name: e.target.value})} className="input-field" required /></div>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Title</label><input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Department</label><input value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})} className="input-field" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Account</label><select value={editForm.account_id} onChange={e => setEditForm({...editForm, account_id: e.target.value})} className="select-field"><option value="">No account</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label><input value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} className="input-field" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label><input value={editForm.linkedin} onChange={e => setEditForm({...editForm, linkedin: e.target.value})} className="input-field" placeholder="https://linkedin.com/in/..." /></div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.is_primary} onChange={e => setEditForm({...editForm, is_primary: e.target.checked})} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> Primary Contact</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.is_decision_maker} onChange={e => setEditForm({...editForm, is_decision_maker: e.target.checked})} className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" /> Decision Maker</label>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="input-field" rows={3} /></div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1 justify-center">Save Changes</button>
                <button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
