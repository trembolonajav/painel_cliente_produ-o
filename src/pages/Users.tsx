import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users as UsersIcon, FileText, Settings, LogOut, Search, Plus, Edit2, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getItem } from "@/services/storage";
import { createUserRequest, listUsersRequest, updateUserRequest } from "@/services/backend";
import type { OfficeSettings, User, UserRole } from "@/types";
import abrLogo from "@/assets/abr-logo.png";

const roleLabel: Record<UserRole, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  estagiario: "Estagiário",
};

const Users = () => {
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const office = getItem<OfficeSettings>("office_settings");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("gestor");
  const [formActive, setFormActive] = useState(true);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await listUsersRequest();
      setUsers(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !searchQuery ||
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [searchQuery, users],
  );

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormRole("gestor");
    setFormActive(true);
  };

  const openNewForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (u: User) => {
    setEditingId(u.id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormPassword("");
    setFormRole(u.role);
    setFormActive(u.active);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      toast.error("Nome e e-mail são obrigatórios.");
      return;
    }

    const email = formEmail.trim().toLowerCase();
    const hasDuplicateEmail = users.some((u) => u.email.toLowerCase() === email && u.id !== editingId);
    if (hasDuplicateEmail) {
      toast.error("Já existe um usuário com este e-mail.");
      return;
    }

    if (!editingId && formPassword.trim().length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres.");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateUserRequest(editingId, {
          name: formName.trim(),
          email,
          role: formRole,
          active: formActive,
          ...(formPassword.trim() ? { password: formPassword.trim() } : {}),
        });
        toast.success("Usuário atualizado");
      } else {
        await createUserRequest({
          name: formName.trim(),
          email,
          password: formPassword.trim(),
          role: formRole,
          active: formActive,
        });
        toast.success("Usuário criado");
      }

      setShowForm(false);
      await loadUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar usuário.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (!can("users_manage")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-heading">Acesso restrito</p>
          <button onClick={() => navigate("/admin")} className="mt-4 btn-gold px-4 py-2 text-sm">Voltar</button>
        </div>
      </div>
    );
  }

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
            <UsersIcon className="w-4 h-4" /> Clientes
          </button>
          <button onClick={() => navigate("/admin/usuarios")} className="sidebar-link active w-full">
            <Shield className="w-4 h-4" /> Usuários
          </button>
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
            <h1 className="text-xl font-heading font-bold text-foreground">Usuários e Permissões</h1>
            <p className="text-sm text-muted-foreground">Gerencie acessos Administrador, Gestor e Estagiário</p>
          </div>
          <button onClick={openNewForm} className="btn-gold px-4 py-2 text-sm flex items-center gap-2" disabled={loading}>
            <Plus className="w-4 h-4" /> Novo Usuário
          </button>
        </header>

        <div className="p-6 space-y-6 max-w-5xl">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar usuário..."
              className="input-field pl-10 text-sm"
            />
          </div>

          {showForm && (
            <div className="bg-card rounded-xl border p-6 animate-fade-in">
              <h2 className="font-heading font-bold text-foreground mb-4">{editingId ? "Editar Usuário" : "Novo Usuário"}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} className="input-field text-sm" placeholder="Nome completo" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
                  <input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} className="input-field text-sm" placeholder="email@exemplo.com" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">{editingId ? "Nova senha (opcional)" : "Senha"}</label>
                  <input value={formPassword} onChange={(e) => setFormPassword(e.target.value)} type="password" className="input-field text-sm" placeholder="Mínimo 8 caracteres" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Perfil</label>
                  <select value={formRole} onChange={(e) => setFormRole(e.target.value as UserRole)} className="input-field text-sm">
                    <option value="administrador">Administrador</option>
                    <option value="gestor">Gestor</option>
                    <option value="estagiario">Estagiário</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input id="user-active" type="checkbox" checked={formActive} onChange={(e) => setFormActive(e.target.checked)} />
                  <label htmlFor="user-active" className="text-sm text-foreground">Usuário ativo</label>
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

          {loading && <div className="text-sm text-muted-foreground">Carregando usuários...</div>}

          <div className="space-y-3">
            {filtered.map((u) => (
              <div key={u.id} className="bg-card rounded-xl border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-foreground text-sm">{u.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{u.email}</span>
                    <span className="status-badge status-progress">{roleLabel[u.role]}</span>
                    <span className={u.active ? "text-[hsl(152_55%_39%)]" : "text-destructive"}>{u.active ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                <button onClick={() => openEditForm(u)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Users;

