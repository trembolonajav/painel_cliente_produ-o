import type { User } from "@/types";
import { ApiError, clearAuthToken, setAuthToken } from "./apiClient";
import { loginRequest, meRequest } from "./backend";

export async function login(email: string, password: string): Promise<User | null> {
  try {
    const result = await loginRequest(email, password);
    setAuthToken(result.token);
    return result.user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export function logout(): void {
  clearAuthToken();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    return await meRequest();
  } catch {
    clearAuthToken();
    return null;
  }
}

