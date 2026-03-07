import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PortalProvider } from "@/context/PortalContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CaseDetail from "./pages/CaseDetail";
import Clients from "./pages/Clients";
import Users from "./pages/Users";
import ClientVerify from "./pages/ClientVerify";
import ClientPortal from "./pages/ClientPortal";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children, requiredPermission }: { children: ReactNode; requiredPermission?: string }) {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (requiredPermission && !can(requiredPermission)) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <PortalProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/admin" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/caso/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
              <Route path="/admin/clientes" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
              <Route path="/admin/usuarios" element={<ProtectedRoute requiredPermission="users_manage"><Users /></ProtectedRoute>} />
              <Route path="/portal/verificar" element={<ClientVerify />} />
              <Route path="/portal/verificar/:token" element={<ClientVerify />} />
              <Route path="/client-portal" element={<ClientVerify />} />
              <Route path="/client-portal/:token" element={<ClientVerify />} />
              <Route path="/portal/caso" element={<ClientPortal />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PortalProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
