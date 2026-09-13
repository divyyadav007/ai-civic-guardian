import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    submitted: 'bg-blue-100 text-blue-800 border-blue-200',
    acknowledged: 'bg-amber-100 text-amber-800 border-amber-200',
    in_progress: 'bg-orange-100 text-orange-800 border-orange-200',
    resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-slate-100 text-slate-700 border-slate-200',
    duplicate: 'bg-slate-100 text-slate-700 border-slate-200',
    draft: 'bg-zinc-100 text-zinc-600 border-zinc-200',
  };

  const labels: Record<string, string> = {
    pending: 'Pending',
    submitted: 'Submitted',
    acknowledged: 'Acknowledged',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    rejected: 'Rejected',
    duplicate: 'Duplicate',
    draft: 'Draft',
  };

  const normalized = status?.toLowerCase() || 'submitted';
  const style = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = labels[normalized] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75"></span>
      {label}
    </span>
  );
};
