import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type User, PERMISSIONS } from "@/types";
import { getCurrentUser, login as authLogin, logout as authLogout } from "@/services/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<User | null> => {
    const u = await authLogin(email, password);
    setUser(u);
    return u;
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const can = (permission: string): boolean => {
    if (!user) return false;
    return PERMISSIONS[user.role]?.[permission] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
