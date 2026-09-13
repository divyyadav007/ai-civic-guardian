import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { StatusBadge } from '../components/StatusBadge';
import { complaintsApi, PublicTrackData } from '../api/complaints';

export const PublicTrackPage: React.FC = () => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState<string>(paramId || '');
  const [complaint, setComplaint] = useState<PublicTrackData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchComplaint = async (targetId: string) => {
    const cleanId = targetId.trim();
    if (!cleanId) return;

    setLoading(true);
    setError('');
    setComplaint(null);

    try {
      const data = await complaintsApi.publicTrack(cleanId);
      setComplaint(data);
    } catch (err: any) {
      console.error('Track failed:', err);
      setError('No complaint found with this Reference ID. Please check the ID and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paramId) {
      setSearchId(paramId);
      fetchComplaint(paramId);
    }
  }, [paramId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      navigate(`/track/${searchId.trim()}`);
      fetchComplaint(searchId.trim());
    }
  };

  const getStepStatus = (stepName: string, currentStatus: string) => {
    const order = ['submitted', 'acknowledged', 'in_progress', 'resolved'];
    const norm = currentStatus?.toLowerCase() || 'submitted';
    const currIdx = order.indexOf(norm);
    const stepIdx = order.indexOf(stepName);

    if (currIdx === -1) return 'pending';
    if (stepIdx < currIdx) return 'completed';
    if (stepIdx === currIdx) return 'current';
    return 'pending';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6">
        {/* Top Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Track Civic Grievance Status
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
            Enter your complaint Reference ID to view live redressal progress, assigned municipal officer, and resolution notes.
          </p>
        </div>

        {/* Search Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-8 max-w-2xl mx-auto">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Complaint ID (e.g. 5240292b-38ab...)"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 text-sm font-mono focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchId.trim()}
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-md shadow-sky-500/20 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Searching...</span>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Card */}
        {complaint && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Grievance Details</span>
                <div className="flex items-center space-x-3 mt-1">
                  <h2 className="text-xl font-mono font-bold text-slate-900">{complaint.id}</h2>
                  <StatusBadge status={complaint.status} />
                </div>
              </div>
              <div className="text-sm text-slate-500 flex items-center space-x-1.5">
                <Calendar className="w-4 h-4" />
                <span>Filed on {new Date(complaint.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Stepper Timeline */}
            <div className="py-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-6 text-center">
                Redressal Lifecycle Stepper
              </h3>
              <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center max-w-2xl mx-auto">
                {[
                  { key: 'submitted', label: '1. Submitted' },
                  { key: 'acknowledged', label: '2. Acknowledged' },
                  { key: 'in_progress', label: '3. In Progress' },
                  { key: 'resolved', label: '4. Resolved' },
                ].map((step) => {
                  const state = getStepStatus(step.key, complaint.status);
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 transition-all ${
                          state === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : state === 'current'
                            ? 'bg-sky-600 text-white ring-4 ring-sky-100 shadow-md'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {state === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          state === 'current' ? 'text-sky-700' : state === 'completed' ? 'text-slate-800' : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
              {/* Photo preview if available */}
              {complaint.photo_url && (
                <div className="md:col-span-1">
                  <img
                    src={complaint.photo_url}
                    alt="Issue"
                    className="w-full h-44 object-cover rounded-xl border border-slate-200"
                  />
                </div>
              )}

              <div className={`${complaint.photo_url ? 'md:col-span-2' : 'md:col-span-3'} space-y-4`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block mb-0.5">Issue Category</span>
                    <span className="text-sm font-semibold text-slate-900 capitalize">
                      {complaint.detected_issue_type ? complaint.detected_issue_type.replace('_', ' ') : 'Civic Issue'}
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs text-slate-500 block mb-0.5">Assigned Department</span>
                    <div className="flex items-center space-x-1.5 text-sm font-semibold text-slate-900">
                      <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>{complaint.department_name || 'Municipal Headquarters'}</span>
                    </div>
                  </div>
                </div>

                {/* Location */}
                {complaint.address && (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs text-slate-500 block">Verified Location</span>
                      <span className="text-sm text-slate-800">{complaint.address}</span>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Issue Description</span>
                  <p className="text-sm text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 leading-relaxed">
                    {complaint.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Officer Status History Log */}
            {complaint.status_history && complaint.status_history.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <span>Official Activity & Resolution Log</span>
                </h3>
                <div className="space-y-3">
                  {complaint.status_history.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-900 capitalize">{item.status.replace('_', ' ')}</span>
                          {item.changed_by_name && (
                            <span className="text-slate-500">by {item.changed_by_name}</span>
                          )}
                        </div>
                        {item.note && <p className="text-slate-600 mt-1">{item.note}</p>}
                      </div>
                      <span className="text-slate-400 text-[11px] shrink-0 ml-2">
                        {new Date(item.changed_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>File Another Complaint</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
