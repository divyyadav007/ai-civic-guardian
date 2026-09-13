import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LayoutDashboard, Inbox, GitBranch, ListFilter, LogOut, User } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Simulated role for Phase 0 navigation shell
  const userRole = localStorage.getItem('user_role') || 'admin';
  const userName = localStorage.getItem('user_name') || 'Officer Sharma';
  const userDept = localStorage.getItem('user_dept') || 'Roads Department';

  const navItems = [
    { label: 'Admin Overview', path: '/admin/overview', icon: LayoutDashboard, roles: ['admin'] },
    { label: 'All Complaints', path: '/admin/complaints', icon: ListFilter, roles: ['admin'] },
    { label: 'Routing Rules', path: '/admin/routing-rules', icon: GitBranch, roles: ['admin'] },
    { label: 'Department Queue', path: '/officer/queue', icon: Inbox, roles: ['officer', 'admin'] },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_role');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shadow-lg">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white font-bold shadow-md">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-white">AI Civic Guardian</h1>
            <p className="text-[11px] text-slate-400">Municipal Operations</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.filter((item) => item.roles.includes(userRole)).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Card */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sky-400">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 truncate">{userRole === 'admin' ? 'System Administrator' : userDept}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {navItems.find((i) => location.pathname.startsWith(i.path))?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs px-2.5 py-1 rounded bg-sky-50 text-sky-700 font-medium border border-sky-200">
              Environment: Local Dev
            </span>
          </div>
        </header>

        {/* View body */}
        <main className="flex-1 overflow-y-auto p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
