import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, GitBranch, Building2, Users, Activity, FileText, CheckSquare, BarChart3, Search, Bell, Settings, LogOut, ChevronDown, Truck, X, Plus, HelpCircle } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/pipeline', label: 'Opportunities' },
  { path: '/accounts', label: 'Accounts' },
  { path: '/contacts', label: 'Contacts' },
  { path: '/activities', label: 'Activities' },
  { path: '/quotes', label: 'Quotes' },
  { path: '/tasks', label: 'Tasks' },
  { path: '/contracts', label: 'Contracts' },
  { path: '/integrations', label: 'Integrations' },
  { path: '/reports', label: 'Reports' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setUserMenuOpen(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f3f3f3]">
      {/* === SALESFORCE TOP NAV BAR === */}
      <header className="h-[45px] bg-[#032d60] flex items-center px-4 flex-shrink-0 z-50 relative">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-4">
          <div className="w-[26px] h-[26px] bg-white/15 rounded flex items-center justify-center">
            <Truck className="w-[14px] h-[14px] text-white" />
          </div>
          <span className="text-white font-bold text-[15px] tracking-tight hidden sm:block">LogiCRM</span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20 mr-3 hidden sm:block" />

        {/* Navigation Tabs */}
        <nav className="flex items-center h-full overflow-x-auto">
          {navItems.map(item => {
            const isActive = item.path === '/' 
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`h-full flex items-center px-3 text-[13px] font-medium transition-colors relative whitespace-nowrap ${
                  isActive 
                    ? 'text-white' 
                    : 'text-white/65 hover:text-white/90 hover:bg-white/5'
                }`}
              >
                {item.label}
                {isActive && (
                  <div className="absolute bottom-0 left-1 right-1 h-[3px] bg-white rounded-t-sm" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="ml-auto flex items-center gap-0.5">
          {/* Global Search */}
          <button 
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 h-[30px] px-3 rounded bg-white/10 border border-white/20 text-white/70 text-[12px] hover:bg-white/15 transition-colors mr-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search...</span>
          </button>

          {/* New Record */}
          <button 
            onClick={() => navigate('/pipeline')}
            className="w-[30px] h-[30px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="New Record"
          >
            <Plus className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <button className="w-[30px] h-[30px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-[7px] h-[7px] bg-[#ba0517] rounded-full border border-[#032d60]" />
          </button>

          {/* Help */}
          <button className="w-[30px] h-[30px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button className="w-[30px] h-[30px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors">
            <Settings className="w-4 h-4" />
          </button>

          {/* User Avatar */}
          <div className="relative ml-1.5">
            <button 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-[30px] h-[30px] rounded-full bg-[#0176d3] flex items-center justify-center text-white text-[11px] font-bold hover:ring-2 hover:ring-white/30 transition-all"
            >
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-lg shadow-dropdown border border-[#e5e5e5] z-50 animate-slideDown overflow-hidden">
                  <div className="px-4 py-3 bg-[#fafaf9] border-b border-[#e5e5e5]">
                    <p className="text-[13px] font-bold text-[#181818]">{user?.first_name} {user?.last_name}</p>
                    <p className="text-[11px] text-[#706e6b] mt-0.5">{user?.email}</p>
                    <p className="text-[11px] text-[#706e6b]">{user?.role === 'admin' ? 'System Administrator' : 'Sales Representative'}</p>
                  </div>
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-left text-[13px] text-[#181818] hover:bg-[#f3f3f3] flex items-center gap-2.5">
                      <Settings className="w-3.5 h-3.5 text-[#706e6b]" />
                      My Settings
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-[13px] text-[#181818] hover:bg-[#f3f3f3] flex items-center gap-2.5"
                    >
                      <LogOut className="w-3.5 h-3.5 text-[#706e6b]" />
                      Log Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* === MAIN CONTENT === */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* === SEARCH MODAL === */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh]" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-[540px] mx-4 bg-white rounded-lg shadow-modal border border-[#e5e5e5] overflow-hidden animate-slideDown" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e5e5e5]">
              <Search className="w-4 h-4 text-[#706e6b] flex-shrink-0" />
              <input
                type="text"
                placeholder="Search accounts, contacts, opportunities..."
                className="flex-1 text-[14px] outline-none text-[#181818] placeholder-[#939393]"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setSearchOpen(false)} className="text-[#706e6b] hover:text-[#181818]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 max-h-[320px] overflow-y-auto">
              <p className="text-[11px] uppercase tracking-wider text-[#706e6b] font-bold px-3 py-2">Quick Actions</p>
              {[
                { icon: GitBranch, color: 'bg-[#fcb95b]', label: 'New Opportunity', sub: 'Create a deal', path: '/pipeline' },
                { icon: Building2, color: 'bg-[#7f8de1]', label: 'New Account', sub: 'Add a company', path: '/accounts' },
                { icon: Users, color: 'bg-[#a094ed]', label: 'New Contact', sub: 'Add a person', path: '/contacts' },
                { icon: FileText, color: 'bg-[#e87d7d]', label: 'New Quote', sub: 'Create a rate proposal', path: '/quotes' },
                { icon: CheckSquare, color: 'bg-[#4bc076]', label: 'New Task', sub: 'Add a to-do item', path: '/tasks' },
              ].map((item, i) => (
                <button key={i} onClick={() => { setSearchOpen(false); navigate(item.path); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded hover:bg-[#f3f7ff] text-left transition-colors">
                  <div className={`w-7 h-7 ${item.color} rounded flex items-center justify-center`}>
                    <item.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#181818]">{item.label}</p>
                    <p className="text-[11px] text-[#706e6b]">{item.sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
