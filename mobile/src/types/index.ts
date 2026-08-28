export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isEmailUnverified?: boolean;
  pendingEmail?: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  detail?: string;
  emailUnverified?: boolean;
  cooldownSeconds?: number;
}
