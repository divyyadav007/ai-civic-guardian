import { api } from "./client";

export type ComplaintStatus =
  | "draft" | "submitted" | "acknowledged"
  | "in_progress" | "resolved" | "rejected" | "duplicate";

export interface ComplaintSummary {
  id: string;
  detected_issue_type?: string;
  classification_confidence?: number;
  description: string;
  address?: string;
  status: ComplaintStatus;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  department_name?: string;
  created_at: string;
  updated_at: string;
  is_duplicate: boolean;
}

export interface StatusHistoryItem {
  id: string;
  status: ComplaintStatus;
  note?: string;
  changed_by_name?: string;
  changed_at: string;
}

export interface ComplaintDetail extends ComplaintSummary {
  citizen_id: string;
  citizen_name?: string;
  voice_note_url?: string;
  transcript?: string;
  model_version?: string;
  needs_manual_category: boolean;
  duplicate_of?: string;
  approved_at?: string;
  status_history: StatusHistoryItem[];
}

export interface AdminStats {
  total_complaints: number;
  resolved_this_week: number;
  avg_resolution_hours?: number;
  active_in_progress: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
}

export interface DraftCreatePayload {
  photo_url?: string;
  voice_note_url?: string;
  latitude?: number;
  longitude?: number;
  typed_description?: string;
}

export interface DraftResponseData {
  draft_id: string;
  detected_issue_type?: string;
  classification_confidence?: number;
  model_version?: string;
  needs_manual_category: boolean;
  transcript?: string;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  photo_url?: string;
  voice_note_url?: string;
  status: string;
}

export interface SubmitResponseData {
  complaint_id: string;
  status: string;
  department_name?: string;
  department_id?: string;
  message: string;
}

export interface PublicTrackData {
  id: string;
  detected_issue_type?: string;
  description: string;
  address?: string;
  status: ComplaintStatus;
  photo_url?: string;
  department_name?: string;
  created_at: string;
  updated_at: string;
  status_history: StatusHistoryItem[];
}

export const complaintsApi = {
  createDraft: (data: DraftCreatePayload) =>
    api.post<DraftResponseData>("/complaints/draft", data),

  updateDraft: (draftId: string, data: Partial<DraftResponseData>) =>
    api.patch<DraftResponseData>(`/complaints/draft/${draftId}`, data),

  submit: (draftId: string) =>
    api.post<SubmitResponseData>(`/complaints/${draftId}/submit`, {}),

  publicTrack: (id: string) =>
    api.get<PublicTrackData>(`/complaints/public/track/${id}`),

  getMine: (status?: string) =>
    api.get<ComplaintSummary[]>(`/complaints/mine${status ? `?status=${status}` : ""}`),

  getById: (id: string) =>
    api.get<ComplaintDetail>(`/complaints/${id}`),

  updateStatus: (id: string, status: string, note?: string) =>
    api.patch<ComplaintDetail>(`/complaints/${id}/status`, { status, note }),
};

export const adminApi = {
  getStats: () =>
    api.get<AdminStats>("/admin/stats"),

  getAllComplaints: (params?: { status?: string; category?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return api.get<ComplaintSummary[]>(`/admin/complaints${query ? `?${query}` : ""}`);
  },
};

export const departmentsApi = {
  getAll: () =>
    api.get<{ id: string; name: string; routing_keys: string[] }[]>("/departments/"),

  getComplaints: (deptId: string, status?: string) =>
    api.get<ComplaintSummary[]>(
      `/departments/${deptId}/complaints${status ? `?status=${status}` : ""}`
    ),

  updateRouting: (deptId: string, routing_keys: string[]) =>
    api.patch<{ id: string; name: string; routing_keys: string[] }>(
      `/departments/${deptId}`,
      { routing_keys }
    ),
};
