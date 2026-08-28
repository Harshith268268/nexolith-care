import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginRequest, RegisterRequest, VerifyOtpRequest } from '../types';
import { ApiService } from '../services/api';
import { StorageService } from '../services/storage';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  pendingEmail: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  logout: () => Promise<void>;
  setPendingEmail: (email: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  useEffect(() => {
    // Restore persistent session on startup
    const restoreSession = async () => {
      try {
        const storedToken = await StorageService.getToken();
        const storedUser = await StorageService.getUser();
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      const resp = await ApiService.login(credentials);
      if (resp.access) {
        const userData: User = {
          id: resp.user_id || 1,
          username: resp.username || credentials.username,
          email: resp.email || '',
        };
        setToken(resp.access);
        setUser(userData);
        await StorageService.saveToken(resp.access);
        await StorageService.saveUser(userData);
      }
    } catch (err: any) {
      if (err.data && err.data.emailUnverified) {
        setPendingEmail(err.data.email || credentials.username);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setIsLoading(true);
    try {
      await ApiService.register(data);
      setPendingEmail(data.email);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (otp: string) => {
    if (!pendingEmail) {
      throw new Error('No pending email for OTP verification.');
    }
    setIsLoading(true);
    try {
      await ApiService.verifyEmail({ email: pendingEmail, otp });
      setPendingEmail(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    setPendingEmail(null);
    await StorageService.clearAll();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        pendingEmail,
        login,
        register,
        verifyOtp,
        logout,
        setPendingEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
