import React, { useEffect, useState } from 'react';
import { Search, Filter, Eye, CheckCircle2, Clock, AlertCircle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { adminApi, ComplaintSummary } from '../api/complaints';
import { ApiError } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

const priorityColors: Record<string, string> = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

export const AdminAllComplaintsPage: React.FC = () => {
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const navigate = useNavigate();

  const load = async (status?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAllComplaints({
        status: status && status !== 'all' ? status : undefined,
        limit: 100,
      });
      setComplaints(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(statusFilter); }, [statusFilter]);

  const filtered = complaints.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      (c.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">All Complaints</h2>
        <p className="text-sm text-slate-500">View and manage all submitted civic complaints</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="complaints-search"
            type="text"
            placeholder="Search by ID, description, address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            id="complaints-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button onClick={() => load(statusFilter)} className="p-2.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition" title="Refresh">
          <RefreshCw className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span className="text-slate-500">Loading complaints…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-slate-600">{error}</p>
            <button onClick={() => load(statusFilter)} className="text-sm text-sky-600 hover:underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Complaint</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Submitted</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {c.id.slice(0, 8)}…
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800 leading-snug line-clamp-2 max-w-xs">{c.description}</p>
                      {c.address && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{c.address}</p>}
                    </td>
                    <td className="px-5 py-4 text-slate-600 capitalize text-xs">
                      {c.detected_issue_type?.replace(/_/g, ' ') || '—'}
                    </td>
                    <td className="px-5 py-4 text-slate-600 text-xs">{c.department_name || '—'}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => navigate(`/officer/complaints/${c.id}`)}
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                      {complaints.length === 0
                        ? 'No complaints found. Submit a complaint from the mobile app to see it here.'
                        : 'No complaints match your search.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing {filtered.length} of {complaints.length} complaints
            </div>
          </div>
        )}
      </div>
    </div>
  );
};