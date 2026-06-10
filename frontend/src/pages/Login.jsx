import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Truck, Shield, BarChart3, Users } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('admin@logisticscrm.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#032d60] relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-[#0176d3] -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-[#06a59a] translate-y-1/3 -translate-x-1/4" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <span className="text-white text-[22px] font-bold tracking-tight">LogiCRM</span>
          </div>
          <p className="text-[#b4c7e7] text-[14px] mt-1">Enterprise Logistics Sales Platform</p>
        </div>
        <div className="relative z-10 space-y-8">
          <h2 className="text-white text-[32px] font-bold leading-tight">The #1 CRM built<br/>for logistics sales.</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: BarChart3, title: 'Pipeline Intelligence', desc: 'AI-powered deal forecasting' },
              { icon: Users, title: 'Account Management', desc: 'Full lifecycle tracking' },
              { icon: Shield, title: 'Enterprise Security', desc: 'SOC 2 compliant platform' },
              { icon: Truck, title: 'Logistics Native', desc: 'Built for freight & shipping' },
            ].map((f, i) => (
              <div key={i} className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
                <f.icon className="w-5 h-5 text-[#1b96ff] mb-2" />
                <p className="text-white text-[13px] font-semibold">{f.title}</p>
                <p className="text-[#b4c7e7] text-[11px] mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-[#b4c7e7] text-[11px]">Trusted by 500+ logistics companies worldwide</p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#f4f6f9]">
        <div className="w-full max-w-[380px]">
          <div className="text-center mb-8">
            <div className="lg:hidden flex items-center justify-center gap-2 mb-4">
              <Truck className="w-7 h-7 text-[#0176d3]" />
              <span className="text-[20px] font-bold text-[#181818]">LogiCRM</span>
            </div>
            <h1 className="text-[22px] font-bold text-[#181818]">Welcome back</h1>
            <p className="text-[13px] text-[#706e6b] mt-1">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[#fef0ef] border border-[#ba0517]/20 rounded-lg px-4 py-3 text-[12px] text-[#ba0517] font-medium">{error}</div>
            )}
            <div>
              <label className="sf-label">Email</label>
              <input type="email" className="sf-input" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
            </div>
            <div>
              <label className="sf-label">Password</label>
              <input type="password" className="sf-input" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="w-full h-[42px] bg-[#0176d3] hover:bg-[#014486] text-white rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[11px] text-[#939393]">Demo: admin@logisticscrm.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
