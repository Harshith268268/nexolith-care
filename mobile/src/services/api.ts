import { API_ENDPOINTS } from '../constants/config';
import { StorageService } from './storage';
import { RegisterRequest, LoginRequest, VerifyOtpRequest } from '../types';

export class ApiService {
  private static async getHeaders(isJson: boolean = true): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    
    const token = await StorageService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    const responseText = await response.text();
    let data: any = {};
    
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      data = { detail: responseText };
    }

    if (!response.ok) {
      const errorMsg = data.detail || data.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg) as any;
      err.status = response.status;
      err.data = data;
      throw err;
    }

    return data as T;
  }

  // 1. Health Check
  static async checkHealth(): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(API_ENDPOINTS.HEALTH, { method: 'GET', headers });
    return this.handleResponse(response);
  }

  // 2. Register Account (Sends OTP)
  static async register(payload: RegisterRequest): Promise<any> {
    const headers = await this.getHeaders();
    const body = JSON.stringify({
      username: payload.username,
      email: payload.email,
      password: payload.password,
      confirm_password: payload.confirmPassword || payload.password,
    });

    const response = await fetch(API_ENDPOINTS.REGISTER, {
      method: 'POST',
      headers,
      body,
    });
    return this.handleResponse(response);
  }

  // 3. Verify Email OTP
  static async verifyEmail(payload: VerifyOtpRequest): Promise<any> {
    const headers = await this.getHeaders();
    const body = JSON.stringify({
      email: payload.email,
      otp: payload.otp,
    });

    const response = await fetch(API_ENDPOINTS.VERIFY_EMAIL, {
      method: 'POST',
      headers,
      body,
    });
    return this.handleResponse(response);
  }

  // 4. JWT Login
  static async login(payload: LoginRequest): Promise<any> {
    const headers = await this.getHeaders();
    const body = JSON.stringify({
      username: payload.username,
      password: payload.password,
    });

    const response = await fetch(API_ENDPOINTS.LOGIN, {
      method: 'POST',
      headers,
      body,
    });
    return this.handleResponse(response);
  }

  // 5. Resend OTP Verification
  static async resendOtp(email: string): Promise<any> {
    const headers = await this.getHeaders();
    const body = JSON.stringify({ email });

    const response = await fetch(API_ENDPOINTS.RESEND_OTP, {
      method: 'POST',
      headers,
      body,
    });
    return this.handleResponse(response);
  }
}
