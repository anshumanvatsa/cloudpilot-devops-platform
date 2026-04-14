import { create } from 'zustand';
import { cloudpilotApi } from '@/services/cloudpilotApi';
import { getAccessToken } from '@/services/api';

interface AuthUser {
  id: number;
  email: string;
  role: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  loginLoading: boolean;
  csrfToken: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  initializeAuth: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,
  loginLoading: false,
  csrfToken: null,
  login: async (email, password) => {
    set({ loginLoading: true });
    try {
      const loginResponse = await cloudpilotApi.login(email, password);
      const user = await cloudpilotApi.me();
      set({
        user,
        isAuthenticated: true,
        accessToken: loginResponse.access_token,
        csrfToken: loginResponse.csrf_token,
      });
      return true;
    } catch {
      set({ accessToken: null, csrfToken: null, isAuthenticated: false, user: null });
      return false;
    } finally {
      set({ loginLoading: false });
    }
  },
  initializeAuth: async () => {
    try {
      if (!getAccessToken()) {
        const refreshResponse = await cloudpilotApi.refresh();
        set({ csrfToken: refreshResponse.csrf_token, accessToken: refreshResponse.access_token });
      }
      const user = await cloudpilotApi.me();
      set((state) => ({
        user,
        isAuthenticated: true,
        isBootstrapping: false,
        accessToken: state.accessToken,
        csrfToken: state.csrfToken,
      }));
    } catch {
      cloudpilotApi.logoutLocal();
      set({ user: null, isAuthenticated: false, isBootstrapping: false, accessToken: null, csrfToken: null });
    }
  },
  logout: () => {
    void cloudpilotApi.logout();
    set({ user: null, isAuthenticated: false, isBootstrapping: false, accessToken: null, csrfToken: null });
  },
}));
