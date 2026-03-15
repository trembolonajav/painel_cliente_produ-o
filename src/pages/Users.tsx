import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users as UsersIcon, LogOut, Search, Plus, Edit2, Shield, Trash2, Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getItem } from "@/services/storage";
import { createUserRequest, deleteUserRequest, listUsersRequest, updateUserRequest } from "@/services/backend";
import type { PaginatedResult } from "@/services/backend";
import type { OfficeSettings, User, UserRole } from "@/types";
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

const roleLabel: Record<UserRole, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  estagiario: "Estagiário",
};

const PAGE_SIZE = 10;
const normalizePhoneDigits = (value: string): string => value.replace(/\D/g, "").slice(0, 11);

const formatPhone = (value?: string): string => {
  if (!value) return "";
  const digits = normalizePhoneDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const buildUsersQueryKey = (search: string, page: number) => ["users", search, page, PAGE_SIZE] as const;

const Users = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const office = getItem<OfficeSettings>("office_settings");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("gestor");
  const [formActive, setFormActive] = useState(true);

  const updateUsersCache = (
    targetPage: number,
    updater: (current: User[]) => User[],
    nextTotalItems = totalItems,
    nextTotalPages = totalPages,
  ) => {
    const queryKey = buildUsersQueryKey(searchQuery, targetPage);
    setUsers((current) => updater(current));
    queryClient.setQueryData<PaginatedResult<User>>(queryKey, (cached) =>
      cached
        ? {
            ...cached,
            items: updater(cached.items),
            totalItems: nextTotalItems,
            totalPages: nextTotalPages,
          }
        : cached,
    );
    setTotalItems(nextTotalItems);
    setTotalPages(nextTotalPages);
  };

  const loadUsers = async (targetPage = page, targetSearch = searchQuery) => {
    setLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["users", targetSearch, targetPage, PAGE_SIZE],
        queryFn: () => listUsersRequest({ search: targetSearch || undefined, page: targetPage, size: PAGE_SIZE }),
      });
      setUsers(data.items);
      setTotalPages(data.totalPages);
      setTotalItems(data.totalItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar usuários.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, [page, searchQuery]);

  const resetForm = () => {
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
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
    setFormPhone(formatPhone(u.phone));
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
    const normalizedPhone = normalizePhoneDigits(formPhone);

    if (!editingId && formPassword.trim().length < 8) {
      toast.error("Senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (normalizedPhone && normalizedPhone.length !== 10 && normalizedPhone.length !== 11) {
      toast.error("Telefone deve conter 10 ou 11 dígitos.");
      return;
    }

    setSaving(true);
    try {
      const isFiltered = searchQuery.trim().length > 0;
      if (editingId) {
        const updatedUser = await updateUserRequest(editingId, {
          name: formName.trim(),
          email,
          phone: normalizedPhone || undefined,
          role: formRole,
          active: formActive,
          ...(formPassword.trim() ? { password: formPassword.trim() } : {}),
        });
        if (!isFiltered) {
          updateUsersCache(page, (current) =>
            current.map((item) => (item.id === editingId ? updatedUser : item)),
          );
        }
        toast.success("Usuário atualizado");
      } else {
        const createdUser = await createUserRequest({
          name: formName.trim(),
          email,
          phone: normalizedPhone || undefined,
          password: formPassword.trim(),
          role: formRole,
          active: formActive,
        });
        if (!isFiltered && page === 0) {
          const nextTotalItems = totalItems + 1;
          const nextTotalPages = Math.max(1, Math.ceil(nextTotalItems / PAGE_SIZE));
          updateUsersCache(
            0,
            (current) => [createdUser, ...current].slice(0, PAGE_SIZE),
            nextTotalItems,
            nextTotalPages,
          );
        }
        toast.success("Usuário criado");
      }

      await queryClient.invalidateQueries({ queryKey: ["users"], refetchType: "none" });
      setShowForm(false);

      if (!editingId && page !== 0) {
        setPage(0);
      } else if (isFiltered) {
        await loadUsers(editingId ? page : 0);
      }
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

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const isFiltered = searchQuery.trim().length > 0;
      const result = await deleteUserRequest(deletingId);
      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: ["users"], refetchType: "none" });
      const nextPage = page > 0 && users.length === 1 ? page - 1 : page;
      if (!isFiltered && nextPage === page) {
        const nextTotalItems = Math.max(totalItems - 1, 0);
        const nextTotalPages = nextTotalItems === 0 ? 0 : Math.ceil(nextTotalItems / PAGE_SIZE);
        updateUsersCache(
          page,
          (current) => current.filter((item) => item.id !== deletingId),
          nextTotalItems,
          nextTotalPages,
        );
      }
      setDeletingId(null);
      if (nextPage !== page) {
        setPage(nextPage);
      } else if (isFiltered) {
        await loadUsers(nextPage);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir usuário.");
    }
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
          <button onClick={() => navigate("/admin/parceiros")} className="sidebar-link w-full">
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
              onChange={(e) => {
                setPage(0);
                setSearchQuery(e.target.value);
              }}
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
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone</label>
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(formatPhone(e.target.value))}
                    className="input-field text-sm"
                    placeholder="(62) 9 9274-3454"
                    inputMode="numeric"
                  />
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
                <div className="flex items-center gap-2 pt-7">
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
            {users.map((u) => (
              <div key={u.id} className="bg-card rounded-xl border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-foreground text-sm">{u.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{u.email}</span>
                    {u.phone && <span>{formatPhone(u.phone)}</span>}
                    <span className="status-badge status-progress">{roleLabel[u.role]}</span>
                    <span className={u.active ? "text-[hsl(152_55%_39%)]" : "text-destructive"}>{u.active ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditForm(u)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingId(u.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages} · {totalItems} usuário{totalItems !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((prev) => Math.min(prev + 1, Math.max(totalPages - 1, 0)))}
                  disabled={page + 1 >= totalPages}
                  className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}

          {!loading && users.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <UsersIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente e não poderá ser desfeita.
              <br />
              Usuário: o acesso será revogado de forma definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Users;
