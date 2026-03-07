import { useState, FormEvent, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Mail, ChevronDown, Scale } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getItem } from "@/services/storage";
import type { OfficeSettings } from "@/types";
import abrLogo from "@/assets/abr-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const [showTenant, setShowTenant] = useState(false);
  const [email, setEmail] = useState("admin@painel.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const office = getItem<OfficeSettings>("office_settings");

  useEffect(() => {
    if (user) {
      navigate("/admin", { replace: true });
    }
  }, [navigate, user]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result) {
        navigate("/admin");
      } else {
        setError("E-mail ou senha incorretos.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao autenticar.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left hero */}
      <div className="hidden lg:flex lg:w-[48%] bg-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-20 -left-20 w-96 h-96 border border-primary-foreground rounded-full" />
          <div className="absolute top-40 left-20 w-72 h-72 border border-primary-foreground rounded-full" />
          <div className="absolute -bottom-10 right-10 w-80 h-80 border border-primary-foreground rounded-full" />
          <div className="absolute bottom-40 -right-20 w-64 h-64 border border-primary-foreground rounded-full" />
        </div>

        <div className="relative z-10">
          <img src={abrLogo} alt={office?.name ?? "ABR"} className="h-14 object-contain brightness-0 invert" />
        </div>

        <div className="relative z-10 max-w-lg">
          <Scale className="w-10 h-10 text-gold mb-6" />
          <h1 className="text-4xl xl:text-5xl font-heading text-primary-foreground font-bold leading-tight mb-5">
            Gestão jurídica<br />inteligente e segura
          </h1>
          <p className="text-primary-foreground/60 text-lg leading-relaxed">
            Acompanhe seus casos, organize documentos e mantenha seus clientes informados — tudo em um só lugar.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-6 text-primary-foreground/30 text-xs">
          <span>© 2026 {office?.name}</span>
          <span>Todos os direitos reservados</span>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <img src={abrLogo} alt={office?.name ?? "ABR"} className="h-12 object-contain" />
          </div>

          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Acesse sua conta</h1>
          <p className="text-muted-foreground mb-8">Entre com suas credenciais para acessar o painel do escritório.</p>

          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
                <button type="button" className="text-xs text-gold hover:underline">Esqueci minha senha</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Tenant fallback */}
            <div>
              <button
                type="button"
                onClick={() => setShowTenant(!showTenant)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Building2 className="w-3 h-3" />
                Identificação do escritório
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showTenant ? "rotate-180" : ""}`} />
              </button>
              {showTenant && (
                <div className="mt-2 p-3 bg-muted rounded-lg animate-fade-in">
                  <p className="text-xs text-muted-foreground mb-1.5">Código do escritório (uso técnico)</p>
                  <input
                    value="abr-advogados"
                    readOnly
                    className="input-field text-sm text-muted-foreground"
                    tabIndex={-1}
                  />
                </div>
              )}
            </div>

            <button type="submit" className="btn-gold w-full py-3 text-sm" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar no painel"}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <img src={abrLogo} alt={office?.name ?? "ABR"} className="h-5 object-contain opacity-40" />
            <span>Ambiente: <strong className="text-foreground">{office?.domain}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
