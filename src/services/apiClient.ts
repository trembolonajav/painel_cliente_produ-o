const apiFromEnv = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
const API_BASE_URL = apiFromEnv ?? (import.meta.env.DEV ? "http://localhost:8080" : "");
const AUTH_TOKEN_KEY = "api_auth_token";

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  headers?: Record<string, string>;
  includeCredentials?: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL nao configurada para ambiente de producao.");
  }
  return API_BASE_URL;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL nao configurada para ambiente de producao.");
  }
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.auth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    credentials: options.includeCredentials ? "include" : "same-origin",
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload
        ? String((payload as { message?: string }).message)
        : `Erro HTTP ${response.status}`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
