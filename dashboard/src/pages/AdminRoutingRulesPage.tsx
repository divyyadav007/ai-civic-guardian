import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, GitBranch, Tag, Building2, Loader2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { departmentsApi } from '../api/complaints';
import { ApiError } from '../api/client';

interface DepartmentData {
  id: string;
  name: string;
  routing_keys: string[];
}

export const AdminRoutingRulesPage: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit state
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editKeys, setEditKeys] = useState<string[]>([]);
  const [newKeyInput, setNewKeyInput] = useState('');

  // Add rule / key modal state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [newRoutingKey, setNewRoutingKey] = useState('');

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await departmentsApi.getAll();
      setDepartments(data);
      if (data.length > 0 && !selectedDeptId) {
        setSelectedDeptId(data[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to fetch departments and routing rules.');
      } else {
        setError('Network error — check that backend is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleStartEdit = (dept: DepartmentData) => {
    setEditingDeptId(dept.id);
    setEditKeys([...dept.routing_keys]);
    setNewKeyInput('');
  };

  const handleCancelEdit = () => {
    setEditingDeptId(null);
    setEditKeys([]);
    setNewKeyInput('');
  };

  const handleRemoveKey = (keyToRemove: string) => {
    setEditKeys(editKeys.filter(k => k !== keyToRemove));
  };

  const handleAddKeyToDraft = () => {
    const trimmed = newKeyInput.trim().toLowerCase().replace(/\s+/g, '_');
    if (trimmed && !editKeys.includes(trimmed)) {
      setEditKeys([...editKeys, trimmed]);
      setNewKeyInput('');
    }
  };

  const handleSaveEdit = async (deptId: string) => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await departmentsApi.updateRouting(deptId, editKeys);
      setDepartments(prev => prev.map(d => (d.id === deptId ? updated : d)));
      setEditingDeptId(null);
      setSuccessMsg(`Routing keys for ${updated.name} updated successfully!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to update department routing keys.');
      } else {
        setError('Network error updating routing keys.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const key = newRoutingKey.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || !selectedDeptId) return;

    const dept = departments.find(d => d.id === selectedDeptId);
    if (!dept) return;

    if (dept.routing_keys.includes(key)) {
      setError(`Key "${key}" is already mapped to ${dept.name}.`);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updatedKeys = [...dept.routing_keys, key];
      const updated = await departmentsApi.updateRouting(selectedDeptId, updatedKeys);
      setDepartments(prev => prev.map(d => (d.id === selectedDeptId ? updated : d)));
      setShowAddForm(false);
      setNewRoutingKey('');
      setSuccessMsg(`Added "${key}" routing to ${updated.name}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to add routing rule.');
      } else {
        setError('Network error saving routing rule.');
      }
    } finally {
      setSaving(false);
    }
  };

  const totalRules = departments.reduce((acc, d) => acc + d.routing_keys.length, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-50 rounded-xl text-sky-600 border border-sky-100">
            <GitBranch className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Department Routing Rules</h2>
            <p className="text-sm text-slate-500">Configure AI auto-assignment rules by grievance category</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDepartments}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            id="add-routing-rule-btn"
            onClick={() => {
              setShowAddForm(true);
              if (departments.length > 0 && !selectedDeptId) {
                setSelectedDeptId(departments[0].id);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1">{successMsg}</span>
        </div>
      )}

      {/* Add Rule Form */}
      {showAddForm && (
        <form onSubmit={handleAddNewRule} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-600" />
            Map Category to Department
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Target Department
              </label>
              <select
                id="new-rule-department"
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Issue Category / Keyword (e.g. pothole, garbage, streetlight)
              </label>
              <input
                id="new-rule-category"
                type="text"
                value={newRoutingKey}
                onChange={(e) => setNewRoutingKey(e.target.value)}
                placeholder="e.g. open_drain, traffic_signal"
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-5">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 text-white text-sm font-semibold rounded-lg hover:bg-sky-700 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Rule
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewRoutingKey('');
              }}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <Loader2 className="w-8 h-8 text-sky-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Loading department routing rules...</p>
        </div>
      )}

      {/* Departments & Rules Cards / Table */}
      {!loading && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Active Department Mappings</h3>
            <span className="text-xs text-slate-500">
              {departments.length} departments · {totalRules} mapped categories
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {departments.map((dept) => {
              const isEditing = editingDeptId === dept.id;

              return (
                <div key={dept.id} className="p-5 hover:bg-slate-50/50 transition">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-sky-600" />
                        <h4 className="font-semibold text-slate-900">{dept.name}</h4>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                          {dept.id.slice(0, 8)}...
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Incoming grievances matching these category keys will automatically route to {dept.name}.
                      </p>

                      {/* Display or Edit Routing Keys */}
                      <div className="pt-2">
                        {isEditing ? (
                          <div className="space-y-3 bg-sky-50/60 p-4 rounded-xl border border-sky-100">
                            <div className="flex flex-wrap gap-2">
                              {editKeys.map((k) => (
                                <span
                                  key={k}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-sky-800 border border-sky-200 shadow-sm"
                                >
                                  <Tag className="w-3 h-3 text-sky-500" />
                                  {k}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveKey(k)}
                                    className="text-slate-400 hover:text-red-600 transition"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              ))}
                              {editKeys.length === 0 && (
                                <span className="text-xs text-slate-400 italic">No keys assigned yet</span>
                              )}
                            </div>

                            <div className="flex gap-2 max-w-sm">
                              <input
                                type="text"
                                value={newKeyInput}
                                onChange={(e) => setNewKeyInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddKeyToDraft();
                                  }
                                }}
                                placeholder="Add key (e.g. street_hazard)"
                                className="flex-1 text-xs border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                              />
                              <button
                                type="button"
                                onClick={handleAddKeyToDraft}
                                className="px-3 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700"
                              >
                                Add Key
                              </button>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={() => handleSaveEdit(dept.id)}
                                disabled={saving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition disabled:opacity-50"
                              >
                                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                Save Changes
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2 items-center">
                            {dept.routing_keys && dept.routing_keys.length > 0 ? (
                              dept.routing_keys.map((key) => (
                                <span
                                  key={key}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  <Tag className="w-3 h-3 text-slate-400" />
                                  {key}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Default Fallback / No specific keys
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(dept)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Keys
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};