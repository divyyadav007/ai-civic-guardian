/**
 * api/client.ts — Centralized Axios-style fetch wrapper.
 * All API calls go through here so auth headers, base URL,
 * and error shapes are handled in one place (RULES §4).
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8000/api/v1"
    : "https://ai-civic-guardian.onrender.com/api/v1"
);

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const storedToken = token || localStorage.getItem("token");
  if (storedToken) {
    headers["Authorization"] = `Bearer ${storedToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const err = data as { error?: { code: string; message: string } };
    const code = err?.error?.code ?? String(res.status);
    const message = err?.error?.message ?? res.statusText;
    throw new ApiError(res.status, code, message);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
