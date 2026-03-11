import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, Shield, Handshake, LogOut, Plus, Mail, Phone, Edit2, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getItem } from "@/services/storage";
import { createPartnerRequest, deletePartnerRequest, listPartnersRequest, updatePartnerRequest } from "@/services/backend";
import type { OfficeSettings, Partner } from "@/types";
import abrLogo from "@/assets/abr-logo.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

const formatPhoneMask = (rawDigits: string) => {
  const digits = onlyDigits(rawDigits).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  if (digits.length <= 10) {
    const part1 = digits.slice(2, 6);
    const part2 = digits.slice(6, 10);
    if (!part2) return `(${ddd}) ${part1}`;
    return `(${ddd}) ${part1}-${part2}`;
  }

  const first = digits.slice(2, 3);
  const part1 = digits.slice(3, 7);
  const part2 = digits.slice(7, 11);
  if (!part2) return `(${ddd}) ${first} ${part1}`;
  return `(${ddd}) ${first} ${part1}-${part2}`;
};

const formatStoredPhone = (value?: string) => {
  const digits = onlyDigits(value ?? "");
  if (digits.length === 10 || digits.length === 11) {
    return formatPhoneMask(digits);
  }
  return value ?? "";
};

const Partners = () => {
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const office = getItem<OfficeSettings>("office_settings");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingPartnerId, setDeletingPartnerId] = useState<string | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const loadPartners = async () => {
    setLoading(true);
    try {
      const data = await listPartnersRequest();
      setPartners(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar parceiros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPartners();
  }, []);

  const sortedPartners = useMemo(
    () => partners.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [partners],
  );

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormErrors({});
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (partner: Partner) => {
    setEditingId(partner.id);
    setFormName(partner.name);
    setFormEmail(partner.email);
    setFormPhone(formatStoredPhone(partner.phone));
    setFormErrors({});
    setShowForm(true);
  };

  const handleSave = async () => {
    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim().toLowerCase();
    const phoneDigits = onlyDigits(formPhone).slice(0, 11);

    const nextErrors: FormErrors = {};
    if (!trimmedName) nextErrors.name = "Nome é obrigatório.";
    if (!trimmedEmail) nextErrors.email = "E-mail é obrigatório.";
    else if (!EMAIL_REGEX.test(trimmedEmail)) nextErrors.email = "Informe um e-mail válido.";
    if (!phoneDigits) nextErrors.phone = "Telefone é obrigatório.";
    else if (phoneDigits.length !== 10 && phoneDigits.length !== 11) nextErrors.phone = "Telefone deve ter 10 ou 11 dígitos.";

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      if (editingId) {
        await updatePartnerRequest(editingId, {
          name: trimmedName,
          email: trimmedEmail,
          phone: phoneDigits,
        });
        toast.success("Parceiro atualizado");
      } else {
        await createPartnerRequest({
          name: trimmedName,
          email: trimmedEmail,
          phone: phoneDigits,
        });
        toast.success("Parceiro criado");
      }
      setShowForm(false);
      resetForm();
      await loadPartners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar parceiro.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeletePartner = async () => {
    if (!deletingPartnerId) return;
    try {
      const result = await deletePartnerRequest(deletingPartnerId);
      toast.success(result.message);
      setDeletingPartnerId(null);
      await loadPartners();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir parceiro.");
    }
  };

  return (
    <div className="flex min-h-screen">
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <img src={abrLogo} alt={office?.name} className="h-9 object-contain brightness-0 invert" />
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button onClick={() => navigate("/admin")} className="sidebar-link w-full">
            <Briefcase className="w-4 h-4" /> Casos
          </button>
          <button onClick={() => navigate("/admin/clientes")} className="sidebar-link w-full">
            <Users className="w-4 h-4" /> Clientes
          </button>
          {can("users_manage") && (
            <button onClick={() => navigate("/admin/usuarios")} className="sidebar-link w-full">
              <Shield className="w-4 h-4" /> Usuários
            </button>
          )}
          <button className="sidebar-link active w-full">
            <Handshake className="w-4 h-4" /> Parceiros
          </button>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-4 py-2 text-xs text-sidebar-foreground/50 mb-1">
            {user?.name} <span className="text-sidebar-primary">({user?.role})</span>
          </div>
          <button onClick={handleLogout} className="sidebar-link w-full text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-background">
        <header className="border-b px-6 py-4 flex items-center justify-between gap-4 bg-card">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Parceiros</h1>
            <p className="text-sm text-muted-foreground">Gerencie os parceiros cadastrados</p>
          </div>
          {can("clients_write") && (
            <button onClick={openNewForm} className="btn-gold px-4 py-2 text-sm flex items-center gap-2" disabled={loading}>
              <Plus className="w-4 h-4" /> Novo Parceiro
            </button>
          )}
        </header>

        <div className="p-6 space-y-6 max-w-5xl">
          {showForm && (
            <div className="bg-card rounded-xl border p-6 animate-fade-in">
              <h2 className="font-heading font-bold text-foreground mb-4">{editingId ? "Editar Parceiro" : "Novo Parceiro"}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
                  <input
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    onBlur={() => setFormName((prev) => prev.trim())}
                    className="input-field text-sm"
                    placeholder="Nome do parceiro"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
                  <input
                    value={formEmail}
                    onChange={(e) => {
                      setFormEmail(e.target.value);
                      if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    onBlur={() => setFormEmail((prev) => prev.trim())}
                    type="email"
                    className="input-field text-sm"
                    placeholder="email@exemplo.com"
                  />
                  {formErrors.email && <p className="mt-1 text-xs text-destructive">{formErrors.email}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone</label>
                  <input
                    value={formPhone}
                    onChange={(e) => {
                      const digits = onlyDigits(e.target.value).slice(0, 11);
                      setFormPhone(formatPhoneMask(digits));
                      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    inputMode="numeric"
                    className="input-field text-sm"
                    placeholder="(00) 0 0000-0000"
                  />
                  {formErrors.phone && <p className="mt-1 text-xs text-destructive">{formErrors.phone}</p>}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} className="btn-gold px-4 py-2 text-sm" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-sm border rounded-lg text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading && <div className="text-sm text-muted-foreground">Carregando parceiros...</div>}

          <div className="space-y-3">
            {sortedPartners.map((partner) => (
              <div key={partner.id} className="bg-card rounded-xl border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {partner.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-foreground text-sm">{partner.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {partner.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {formatStoredPhone(partner.phone)}
                    </span>
                  </div>
                </div>
                {can("clients_write") && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditForm(partner)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPartnerId(partner.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir parceiro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!loading && sortedPartners.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum parceiro encontrado.</p>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deletingPartnerId} onOpenChange={(open) => !open && setDeletingPartnerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente e não poderá ser desfeita.
              <br />
              Parceiro: o cadastro será removido definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePartner} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Partners;
