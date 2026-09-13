import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, FileText, ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';
import { adminApi, AdminStats } from '../api/complaints';
import { ApiError } from '../api/client';

export const AdminOverviewPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        <span className="ml-3 text-slate-500">Loading dashboard…</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-600">{error || 'No data available'}</p>
        <button onClick={load} className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-800">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const topCards = [
    {
      label: 'Total Complaints Logged',
      value: stats.total_complaints.toLocaleString(),
      change: 'Across all departments',
      icon: FileText,
      color: 'text-sky-600 bg-sky-50',
    },
    {
      label: 'Resolved This Week',
      value: stats.resolved_this_week.toLocaleString(),
      change: 'Last 7 days',
      icon: CheckCircle2,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Average Resolution Time',
      value: stats.avg_resolution_hours != null ? `${stats.avg_resolution_hours.toFixed(1)}h` : 'N/A',
      change: 'Phase 6 metric',
      icon: Clock,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Active In-Progress',
      value: stats.active_in_progress.toLocaleString(),
      change: 'Needs officer action',
      icon: AlertCircle,
      color: 'text-orange-600 bg-orange-50',
    },
  ];

  const categoryBreakdown = Object.entries(stats.by_category).map(([cat, count]) => {
    const total = Object.values(stats.by_category).reduce((a, b) => a + b, 0) || 1;
    return { category: cat.replace(/_/g, ' '), count, percent: Math.round((count / total) * 100) };
  });

  const statusBreakdown = Object.entries(stats.by_status).map(([s, count]) => ({
    status: s.replace(/_/g, ' '),
    count,
  }));

  const statusColors: Record<string, string> = {
    submitted: 'bg-blue-500',
    acknowledged: 'bg-amber-500',
    'in progress': 'bg-orange-500',
    resolved: 'bg-emerald-500',
    rejected: 'bg-slate-400',
    duplicate: 'bg-slate-300',
  };

  return (
    <div className="space-y-8">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {topCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</span>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800 mt-2">{stat.value}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Grid: Charts / Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Complaints by Category</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No complaints yet</p>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{item.category}</span>
                    <span className="text-slate-500">{item.count} ({item.percent}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Complaints by Status</h3>
          {statusBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No complaints yet</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {statusBreakdown.map(({ status, count }) => (
                <div key={status} className="py-3.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status] || 'bg-slate-400'}`} />
                    <span className="font-medium text-slate-700 capitalize">{status}</span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700">
                    {count} complaints
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
