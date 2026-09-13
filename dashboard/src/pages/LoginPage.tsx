import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@civic.gov.in');
  const [password, setPassword] = useState('Admin@123');
  const [role, setRole] = useState<'officer' | 'admin'>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login({ email, password });

      // Persist token + user info
      localStorage.setItem('token', res.access_token);
      localStorage.setItem('user_role', res.role);
      localStorage.setItem('user_name', res.name);
      localStorage.setItem('user_id', res.user_id);
      if (res.department_id) {
        localStorage.setItem('department_id', res.department_id);
      }

      if (res.role === 'admin') {
        navigate('/admin/overview');
      } else {
        navigate('/officer/queue');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Invalid credentials. Please try again.');
      } else {
        setError('Network error — is the backend running?');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-slate-100">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg">
            <Shield className="w-7 h-7" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-slate-800">AI Civic Guardian</h2>
        <p className="text-sm text-center text-slate-500 mt-1 mb-8">
          Municipal Redressal &amp; Triage Portal
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Role tabs — visual aid only; backend role comes from the account */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['officer', 'admin'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRole(r);
                    setEmail(r === 'admin' ? 'admin@civic.gov.in' : '');
                  }}
                  className={`py-2 text-xs font-medium rounded-lg border transition ${
                    role === r
                      ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {r === 'admin' ? 'Administrator' : 'Department Officer'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Official Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="name@department.gov.in"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-medium py-2.5 px-4 rounded-lg shadow transition focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-1">
          <p className="text-xs text-slate-400">
            Phase 2 · Connected to FastAPI backend at{' '}
            <span className="font-mono text-slate-500">localhost:8000</span>
          </p>
          <p className="text-xs text-slate-300">
            Default admin: admin@civic.gov.in / Admin@123
          </p>
        </div>
      </div>
    </div>
  );
};
