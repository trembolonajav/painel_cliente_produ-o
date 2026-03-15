import { useMemo, useState, FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Shield, Lock, Clock } from "lucide-react";
import { usePortal } from "@/context/PortalContext";
import { createClientPortalSessionRequest, getClientPortalMeRequest } from "@/services/backend";
import { getItem } from "@/services/storage";
import type { OfficeSettings } from "@/types";
import abrLogo from "@/assets/abr-logo.png";

const ClientVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token: tokenParam } = useParams();
  const { setSession } = usePortal();
  const [cpfDigits, setCpfDigits] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const office = getItem<OfficeSettings>("office_settings");

  const token = useMemo(() => {
    const queryToken = new URLSearchParams(location.search).get("token");
    return tokenParam || queryToken || "";
  }, [location.search, tokenParam]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    if (cpfDigits.length !== 3) {
      setError("Por favor, insira exatamente 3 dígitos.");
      return;
    }

    if (!token) {
      setError("Link de acesso inválido. Solicite um novo link ao escritório.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const session = await createClientPortalSessionRequest(token, cpfDigits);
      const me = await getClientPortalMeRequest(session.sessionToken);
      setSession({
        caseId: me.caseId,
        linkToken: token,
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
      });
      navigate("/portal/caso");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na verificação.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <img src={abrLogo} alt={office?.name ?? "ABR"} className="h-9 object-contain" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-gold" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-2">Verificação de Identidade</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Para proteger suas informações, precisamos confirmar sua identidade antes de exibir os dados do seu caso.
            </p>
          </div>

          <form onSubmit={handleVerify} className="bg-card rounded-xl border p-6 space-y-5">
            <div>
              <label htmlFor="cpf" className="text-sm font-medium text-foreground mb-1.5 block">
                Primeiros 3 dígitos do seu CPF
              </label>
              <input
                id="cpf"
                type="text"
                maxLength={3}
                inputMode="numeric"
                pattern="[0-9]*"
                value={cpfDigits}
                onChange={(e) => {
                  setCpfDigits(e.target.value.replace(/\D/g, "").slice(0, 3));
                  setError("");
                }}
                className={`input-field text-center text-2xl tracking-[0.5em] font-mono ${error ? "ring-2 ring-destructive/40 border-destructive/50" : ""}`}
                placeholder="•••"
                autoFocus
              />
              {error && <p className="text-xs text-destructive mt-1.5">{error}</p>}
            </div>

            <button type="submit" className="btn-gold w-full py-3 text-sm" disabled={submitting}>
              {submitting ? "Validando..." : "Acessar meu caso"}
            </button>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted text-xs text-muted-foreground">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-0.5">Acesso seguro e confidencial</p>
                <p>Suas informações são protegidas e este link é temporário.</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Este link possui tempo limitado</span>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ClientVerify;
