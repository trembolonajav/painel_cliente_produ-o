import { createContext, useContext, useState, ReactNode } from "react";

interface PortalSession {
  caseId: string;
  linkToken: string;
  sessionToken: string;
  expiresAt?: string;
}

interface PortalContextType {
  session: PortalSession | null;
  setSession: (s: PortalSession | null) => void;
  clearSession: () => void;
}

const PortalContext = createContext<PortalContextType | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PortalSession | null>(null);

  const clearSession = () => setSession(null);

  return (
    <PortalContext.Provider value={{ session, setSession, clearSession }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error("usePortal must be used within PortalProvider");
  return ctx;
}
