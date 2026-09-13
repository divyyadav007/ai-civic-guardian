import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge';
import { Filter, Search, Inbox, AlertTriangle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { departmentsApi, ComplaintSummary } from '../api/complaints';
import { ApiError } from '../api/client';

export const OfficerQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [complaints, setComplaints] = useState<ComplaintSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deptId = localStorage.getItem('department_id');

  const load = async () => {
    if (!deptId) {
      setError('No department assigned to your account. Contact an admin.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await departmentsApi.getComplaints(
        deptId,
        statusFilter !== 'all' ? statusFilter : undefined
      );
      setComplaints(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = complaints.filter((c) => {
    if (!searchQuery) return true;
    return (c.address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by locality or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
          <button onClick={load} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition" title="Refresh">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span className="text-slate-500">Loading queue…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-slate-600 text-sm">{error}</p>
            <button onClick={load} className="text-sm text-sky-600 hover:underline">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No complaints in your queue right now</h3>
            <p className="text-sm text-slate-500 mt-1">
              New civic reports assigned to your department will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Photo</th>
                  <th className="py-3 px-4">Issue Type</th>
                  <th className="py-3 px-4">Locality / Address</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4">AI Confidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => navigate(`/officer/complaints/${item.id}`)}
                    className="hover:bg-sky-50/50 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt="Issue"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shadow-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">N/A</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 capitalize">
                      {(item.detected_issue_type || 'Unknown').replace(/_/g, ' ')}
                      {item.is_duplicate && (
                        <span className="ml-2 inline-flex items-center text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold">
                          <AlertTriangle className="w-3 h-3 mr-0.5" /> Duplicate
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {item.address || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap">
                      {new Date(item.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      {item.classification_confidence != null ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {(item.classification_confidence * 100).toFixed(0)}% match
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/officer/complaints/${item.id}`); }}
                        className="text-xs font-medium text-sky-600 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition"
                      >
                        Triage &amp; Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              {filtered.length} complaint{filtered.length !== 1 ? 's' : ''} in queue
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
