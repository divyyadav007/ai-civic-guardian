import { config } from '../config';

export type ComplaintStatus =
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'rejected'
  | 'duplicate';

export interface StatusHistoryItem {
  id: string;
  status: ComplaintStatus;
  note?: string;
  changed_by_name?: string;
  changed_at: string;
}

export interface DraftCreatePayload {
  photo_url?: string;
  voice_note_url?: string;
  latitude?: number;
  longitude?: number;
  typed_description?: string;
}

export interface DraftResponse {
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

export interface DraftUpdatePayload {
  detected_issue_type?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface SubmitResponse {
  complaint_id: string;
  status: string;
  department_name?: string;
  department_id?: string;
  message?: string;
}

export interface PublicComplaintTrack {
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

export interface StoredComplaint {
  id: string;
  tracking_id: string;
  issue_type: string;
  description: string;
  address: string;
  status: ComplaintStatus;
  department_name: string;
  photo_url?: string;
  submitted_at: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = config.getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // ignore
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const mobileApi = {
  async checkBackendHealth(): Promise<{ ok: boolean; statusText: string }> {
    try {
      const baseUrl = config.getBaseUrl();
      const res = await fetch(`${baseUrl}/complaints/draft`, {
        method: 'OPTIONS',
      });
      if (res.ok || res.status === 405 || res.status === 200) {
        return { ok: true, statusText: 'Online & Connected' };
      }
      return { ok: false, statusText: `HTTP ${res.status}` };
    } catch (e: any) {
      return { ok: false, statusText: e?.message || 'Offline' };
    }
  },

  async createDraft(payload: DraftCreatePayload): Promise<DraftResponse> {
    return request<DraftResponse>('/complaints/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDraft(draftId: string, payload: DraftUpdatePayload): Promise<DraftResponse> {
    return request<DraftResponse>(`/complaints/draft/${draftId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async submitComplaint(draftId: string): Promise<SubmitResponse> {
    return request<SubmitResponse>(`/complaints/${draftId}/submit`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  async trackComplaint(complaintId: string): Promise<PublicComplaintTrack> {
    return request<PublicComplaintTrack>(`/complaints/public/track/${complaintId}`);
  },
};
