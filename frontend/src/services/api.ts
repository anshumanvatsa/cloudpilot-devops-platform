import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = '/api';
const CSRF_COOKIE_NAME = import.meta.env.VITE_CSRF_COOKIE_NAME ?? 'csrf_token';
const CSRF_HEADER_NAME = import.meta.env.VITE_CSRF_HEADER_NAME ?? 'X-CSRF-Token';

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let accessToken: string | null = null;
let csrfToken: string | null = null;

if (typeof window !== 'undefined') {
  accessToken = window.localStorage.getItem('token');
}

const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

const refreshClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

export class ApiError extends Error {
  status?: number;
  details?: unknown;

  constructor(message: string, status?: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function getCookie(name: string): string | null {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokens(tokens: { accessToken: string; csrfToken?: string }) {
  accessToken = tokens.accessToken;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('token', tokens.accessToken);
  }
  if (tokens.csrfToken) {
    csrfToken = tokens.csrfToken;
  }
}

export function getCsrfToken() {
  return csrfToken ?? getCookie(CSRF_COOKIE_NAME);
}

export function clearTokens() {
  accessToken = null;
  csrfToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('token');
  }
}

export function getAccessToken() {
  return accessToken;
}

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const method = (config.method ?? 'get').toUpperCase();
  const requiresCsrf = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  const url = config.url ?? '';
  const isAuthBootstrapRequest =
    url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/refresh');
  if (requiresCsrf && !isAuthBootstrapRequest) {
    const token = csrfToken ?? getCookie(CSRF_COOKIE_NAME);
    if (token) {
      config.headers[CSRF_HEADER_NAME] = token;
    }
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (!originalRequest) {
      throw normalizeAxiosError(error);
    }

    const isUnauthorized = error.response?.status === 401;
    const requestUrl = originalRequest.url ?? '';
    const isAuthEndpoint =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/refresh');

    if (!isUnauthorized || originalRequest._retry || isAuthEndpoint) {
      throw normalizeAxiosError(error);
    }

    originalRequest._retry = true;

    try {
      const refreshResponse = await refreshClient.post<{
        access_token: string;
        csrf_token: string;
      }>('/auth/refresh');

      setTokens({
        accessToken: refreshResponse.data.access_token,
        csrfToken: refreshResponse.data.csrf_token,
      });

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      const retried = await http.request(originalRequest);
      return retried;
    } catch (refreshErr) {
      clearTokens();
      throw normalizeAxiosError(refreshErr);
    }
  }
);

function normalizeAxiosError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const details = error.response?.data;
    const message =
      (typeof details === 'object' && details !== null && 'detail' in details
        ? String((details as { detail: string }).detail)
        : error.message) || 'Request failed';
    return new ApiError(message, status, details);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('Unknown API error');
}

export const api = {
  get: async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    try {
      const response = await http.get<T>(path, { params });
      return response.data;
    } catch (error) {
      throw normalizeAxiosError(error);
    }
  },
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    try {
      const response = await http.post<T>(path, body);
      return response.data;
    } catch (error) {
      throw normalizeAxiosError(error);
    }
  },
  patch: async <T>(path: string, body?: unknown): Promise<T> => {
    try {
      const response = await http.patch<T>(path, body);
      return response.data;
    } catch (error) {
      throw normalizeAxiosError(error);
    }
  },
  put: async <T>(path: string, body?: unknown): Promise<T> => {
    try {
      const response = await http.put<T>(path, body);
      return response.data;
    } catch (error) {
      throw normalizeAxiosError(error);
    }
  },
  delete: async <T>(path: string): Promise<T> => {
    try {
      const response = await http.delete<T>(path);
      return response.data;
    } catch (error) {
      throw normalizeAxiosError(error);
    }
  },
};
