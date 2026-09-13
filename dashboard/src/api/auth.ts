import { api } from "./client";

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  role: string;
  name: string;
  department_id?: string;
}

export interface RegisterRequest {
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  role?: string;
}

export interface RegisterResponse {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  message: string;
}

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<LoginResponse>("/auth/login", body),

  register: (body: RegisterRequest) =>
    api.post<RegisterResponse>("/auth/register", body),

  verifyOtp: (phone: string, otp_code: string) =>
    api.post<LoginResponse>("/auth/otp/verify", { phone, otp_code }),
};
