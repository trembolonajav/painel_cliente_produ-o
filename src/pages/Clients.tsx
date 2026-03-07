import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, FileText, Settings, LogOut, Search, Plus,
  Phone, Mail, Edit2, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { listCasesRequest, listClientsRequest, createClientRequest, updateClientRequest } from "@/services/backend";
import { getItem } from "@/services/storage";
import type { OfficeSettings, Client, CaseData } from "@/types";
import abrLogo from "@/assets/abr-logo.png";

const Clients = () => {
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const office = getItem<OfficeSettings>("office_settings");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<CaseData[]>([]);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Client["type"]>("Pessoa Física");
  const [formCpf, setFormCpf] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, casesData] = await Promise.all([listClientsRequest(), listCasesRequest()]);
      setClients(clientsData);
      setCases(casesData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(
    () =>
      clients.filter((c) =>
        !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [clients, searchQuery],
  );

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormType("Pessoa Física");
    setFormCpf("");
    setFormEmail("");
    setFormPhone("");
    setShowForm(true);
  };

  const openEditForm = (c: Client) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormType(c.type);
    setFormCpf(c.cpf ?? "");
    setFormEmail(c.email ?? "");
    setFormPhone(c.phone ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await updateClientRequest(editingId, {
          name: formName.trim(),
          cpfLast3: formCpf || undefined,
          email: formEmail || undefined,
          phone: formPhone || undefined,
        });
      } else {
        await createClientRequest({
          name: formName.trim(),
          cpfLast3: formCpf || undefined,
          email: formEmail || undefined,
          phone: formPhone || undefined,
        });
      }
      setShowForm(false);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const getCaseCount = (clientId: string) => cases.filter((c) => c.clientId === clientId).length;

  const handleLogout = () => {
    logout();
    navigate("/");
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
          <button className="sidebar-link active w-full">
            <Users className="w-4 h-4" /> Clientes
          </button>
          {can("users_manage") && (
            <button onClick={() => navigate("/admin/usuarios")} className="sidebar-link w-full">
              <Shield className="w-4 h-4" /> Usuários
            </button>
          )}
          <button className="sidebar-link w-full">
            <FileText className="w-4 h-4" /> Documentos
          </button>
          {can("settings_manage") && (
            <button className="sidebar-link w-full">
              <Settings className="w-4 h-4" /> Configurações
            </button>
          )}
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
            <h1 className="text-xl font-heading font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie os clientes do escritório</p>
          </div>
          {can("clients_write") && (
            <button onClick={openNewForm} className="btn-gold px-4 py-2 text-sm flex items-center gap-2" disabled={loading}>
              <Plus className="w-4 h-4" /> Novo Cliente
            </button>
          )}
        </header>

        <div className="p-6 space-y-6 max-w-5xl">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="input-field pl-10 text-sm"
            />
          </div>

          {showForm && (
            <div className="bg-card rounded-xl border p-6 animate-fade-in">
              <h2 className="font-heading font-bold text-foreground mb-4">{editingId ? "Editar Cliente" : "Novo Cliente"}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field text-sm" placeholder="Nome do cliente" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo</label>
                  <select value={formType} onChange={(e) => setFormType(e.target.value as Client["type"])} className="input-field text-sm">
                    <option>Pessoa Física</option>
                    <option>Pessoa Jurídica</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Últimos 3 dígitos CPF/CNPJ</label>
                  <input value={formCpf} onChange={(e) => setFormCpf(e.target.value.replace(/\D/g, "").slice(0, 3))} maxLength={3} className="input-field text-sm" placeholder="000" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} type="email" className="input-field text-sm" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone</label>
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} className="input-field text-sm" placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleSave} className="btn-gold px-4 py-2 text-sm" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            </div>
          )}

          {loading && <div className="text-sm text-muted-foreground">Carregando clientes...</div>}

          <div className="space-y-3">
            {filtered.map((c) => (
              <div key={c.id} className="bg-card rounded-xl border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-foreground text-sm">{c.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{c.type}</span>
                    {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {c.email}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone}</span>}
                    <span>{getCaseCount(c.id)} caso{getCaseCount(c.id) !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {can("clients_write") && (
                  <button onClick={() => openEditForm(c)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Clients;

