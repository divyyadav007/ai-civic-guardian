import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Save, CheckCircle, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { complaintsApi, ComplaintDetail } from '../api/complaints';
import { ApiError } from '../api/client';

const VALID_STATUSES = ['acknowledged', 'in_progress', 'resolved', 'rejected'];

export const OfficerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState<ComplaintDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await complaintsApi.getById(id);
      setComplaint(data);
      setSelectedStatus(data.status);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load complaint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !complaint) return;
    setSaving(true);
    setSaveError(null);
    setSavedSuccess(false);
    try {
      const updated = await complaintsApi.updateStatus(id, selectedStatus, note || undefined);
      setComplaint(updated);
      setSelectedStatus(updated.status);
      setNote('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
        <span className="ml-3 text-slate-500">Loading complaint…</span>
      </div>
    );
  }

  if (error || !complaint) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-600">{error || 'Complaint not found'}</p>
        <div className="flex gap-3">
          <button onClick={load} className="flex items-center gap-2 text-sm text-sky-600 hover:text-sky-800">
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
          <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-slate-700">
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Queue
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Complaint info */}
        <div className="lg:col-span-3 space-y-5">
          {/* Photo */}
          {complaint.photo_url && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <img
                src={complaint.photo_url}
                alt="Civic issue"
                className="w-full h-72 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}

          {/* Core Details */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-800 capitalize">
                  {(complaint.detected_issue_type || 'Civic Issue').replace(/_/g, ' ')}
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{complaint.id}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <StatusBadge status={complaint.status} />
                {complaint.needs_manual_category && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                    Manual category
                  </span>
                )}
              </div>
            </div>

            {complaint.classification_confidence != null && (
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                AI Confidence: {(complaint.classification_confidence * 100).toFixed(0)}%
                {complaint.model_version && <span className="text-emerald-500 font-normal">· {complaint.model_version}</span>}
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{complaint.description}</p>
            </div>

            {complaint.transcript && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Citizen Voice Note</p>
                <p className="text-sm text-slate-600 italic bg-slate-50 rounded-lg p-3 border border-slate-100">
                  "{complaint.transcript}"
                </p>
              </div>
            )}

            {complaint.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-700">{complaint.address}</p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs text-slate-500">
              <div>
                <span className="font-semibold text-slate-600">Citizen: </span>
                {complaint.citizen_name || complaint.citizen_id.slice(0, 8) + '…'}
              </div>
              <div>
                <span className="font-semibold text-slate-600">Department: </span>
                {complaint.department_name || '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-600">Submitted: </span>
                {new Date(complaint.created_at).toLocaleString('en-IN')}
              </div>
              {complaint.approved_at && (
                <div>
                  <span className="font-semibold text-slate-600">Approved: </span>
                  {new Date(complaint.approved_at).toLocaleString('en-IN')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status update + history */}
        <div className="lg:col-span-2 space-y-5">
          {/* Status update form */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Update Status</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">New Status</label>
                <select
                  id="status-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {VALID_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Resolution Note <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="resolution-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="Describe action taken or reason for status change…"
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              {saveError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
              )}
              {savedSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4" /> Status updated successfully
                </div>
              )}

              <button
                id="save-status-btn"
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white text-sm font-medium py-2.5 rounded-lg transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Update'}
              </button>
            </form>
          </div>

          {/* Status history */}
          {complaint.status_history && complaint.status_history.length > 0 && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Status Timeline</h3>
              <div className="space-y-4">
                {[...complaint.status_history].reverse().map((h, i) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1 flex-shrink-0" />
                      {i < complaint.status_history.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 mt-1" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-0.5">
                        <StatusBadge status={h.status} />
                        <span className="text-xs text-slate-400">
                          {new Date(h.changed_at).toLocaleString('en-IN')}
                        </span>
                      </div>
                      {h.note && <p className="text-xs text-slate-600 mt-1">{h.note}</p>}
                      {h.changed_by_name && (
                        <p className="text-xs text-slate-400 mt-0.5">by {h.changed_by_name}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
