import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Building2, Phone, Mail, MapPin, Globe, Users, FileText, Activity, Truck } from 'lucide-react';
import api from '../utils/api';
import { formatCurrency, formatDate, getStageName, getStageColor, getHealthColor, getActivityIcon } from '../utils/format';

export default function AccountDetail() {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get(`/accounts/${id}`).then(data => { setAccount(data); setLoading(false); });
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>;
  if (!account) return <div className="text-center py-12 text-gray-500">Account not found</div>;

  const modes = (() => { try { return JSON.parse(account.primary_modes || '[]'); } catch { return []; } })();
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: `Contacts (${account.contacts?.length || 0})` },
    { id: 'deals', label: `Deals (${account.deals?.length || 0})` },
    { id: 'activities', label: `Activities (${account.activities?.length || 0})` },
    { id: 'quotes', label: `Quotes (${account.quotes?.length || 0})` },
  ];

  return (
    <div className="space-y-6">
      <Link to="/accounts" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> Back to Accounts
      </Link>

      {/* Header */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center">
            <Building2 size={28} className="text-primary-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{account.name}</h1>
              <span className={`badge ${account.type === 'customer' ? 'bg-green-100 text-green-700' : account.type === 'carrier' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{account.type}</span>
              <span className={`badge ${getHealthColor(account.account_health)}`}>{account.account_health}</span>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
              {account.industry && <span>{account.industry}</span>}
              {account.city && <span className="flex items-center gap-1"><MapPin size={14} />{account.city}, {account.state}</span>}
              {account.phone && <span className="flex items-center gap-1"><Phone size={14} />{account.phone}</span>}
              {account.email && <span className="flex items-center gap-1"><Mail size={14} />{account.email}</span>}
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {modes.map(mode => <span key={mode} className="badge bg-blue-50 text-blue-600">{mode}</span>)}
              {account.shipping_volume_monthly && <span className="badge bg-gray-100 text-gray-600"><Truck size={12} className="mr-1" />{account.shipping_volume_monthly} shipments/mo</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card lg:col-span-2">
            <h3 className="font-semibold mb-3">Account Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-gray-500">Owner</dt><dd className="font-medium">{account.owner_name || '-'}</dd></div>
              <div><dt className="text-gray-500">Current Carrier</dt><dd className="font-medium">{account.current_carrier || '-'}</dd></div>
              <div><dt className="text-gray-500">Contract Start</dt><dd className="font-medium">{formatDate(account.contract_start)}</dd></div>
              <div><dt className="text-gray-500">Contract End</dt><dd className="font-medium">{formatDate(account.contract_end)}</dd></div>
              <div><dt className="text-gray-500">Annual Revenue</dt><dd className="font-medium">{account.annual_revenue ? formatCurrency(account.annual_revenue) : '-'}</dd></div>
              <div><dt className="text-gray-500">Employees</dt><dd className="font-medium">{account.employee_count || '-'}</dd></div>
            </dl>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Active Deals</span><span className="font-semibold">{account.deals?.filter(d => !['closed_won','closed_lost'].includes(d.stage)).length || 0}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Total Deal Value</span><span className="font-semibold">{formatCurrency(account.deals?.reduce((s,d) => s + (d.value||0), 0))}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Contacts</span><span className="font-semibold">{account.contacts?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Activities</span><span className="font-semibold">{account.activities?.length || 0}</span></div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="table-header">Name</th><th className="table-header">Title</th><th className="table-header">Email</th><th className="table-header">Phone</th><th className="table-header">Role</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {account.contacts?.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{c.first_name} {c.last_name}</td>
                  <td className="table-cell">{c.title}</td>
                  <td className="table-cell">{c.email}</td>
                  <td className="table-cell">{c.phone}</td>
                  <td className="table-cell">
                    {c.is_primary ? <span className="badge bg-blue-100 text-blue-700">Primary</span> : null}
                    {c.is_decision_maker ? <span className="badge bg-purple-100 text-purple-700 ml-1">Decision Maker</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'deals' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="table-header">Deal</th><th className="table-header">Service</th><th className="table-header">Value</th><th className="table-header">Stage</th><th className="table-header">Close Date</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {account.deals?.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{d.title}</td>
                  <td className="table-cell"><span className="badge bg-gray-100 text-gray-600">{d.service_type}</span></td>
                  <td className="table-cell font-semibold">{formatCurrency(d.value)}</td>
                  <td className="table-cell"><span className={`badge ${getStageColor(d.stage)}`}>{getStageName(d.stage)}</span></td>
                  <td className="table-cell">{formatDate(d.expected_close_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="space-y-3">
          {account.activities?.map(a => (
            <div key={a.id} className="card flex items-start gap-3">
              <span className="text-lg">{getActivityIcon(a.type)}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">{a.subject}</p>
                <p className="text-xs text-gray-500">{a.outcome}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(a.created_at)}</p>
              </div>
              <span className={`badge ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'quotes' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="table-header">Quote #</th><th className="table-header">Route</th><th className="table-header">Service</th><th className="table-header">Amount</th><th className="table-header">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-100">
              {account.quotes?.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="table-cell font-medium">{q.quote_number}</td>
                  <td className="table-cell">{q.origin} → {q.destination}</td>
                  <td className="table-cell">{q.service_type}</td>
                  <td className="table-cell font-semibold">{formatCurrency(q.total_amount)}</td>
                  <td className="table-cell"><span className={`badge ${q.status === 'accepted' ? 'bg-green-100 text-green-700' : q.status === 'sent' ? 'bg-blue-100 text-blue-700' : q.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
