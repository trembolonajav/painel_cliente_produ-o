import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, LogOut, Search, Plus,
  Phone, Mail, Edit2, Shield, Trash2,
  Handshake,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { listClientsRequest, createClientRequest, updateClientRequest, deleteClientRequest } from "@/services/backend";
import type { PaginatedResult } from "@/services/backend";
import { getItem } from "@/services/storage";
import type { OfficeSettings, Client } from "@/types";
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
  type?: string;
  cpf?: string;
  email?: string;
  phone?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAGE_SIZE = 10;

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

const normalizeOptionalText = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const formatStoredPhone = (value?: string) => {
  const digits = onlyDigits(value ?? "");
  if (digits.length === 10 || digits.length === 11) {
    return formatPhoneMask(digits);
  }
  return undefined;
};

const buildClientsQueryKey = (search: string, page: number) => ["clients", search, page, PAGE_SIZE] as const;

const Clients = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const office = getItem<OfficeSettings>("office_settings");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<Client["type"]>("Pessoa Física");
  const [formCpf, setFormCpf] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const updateClientsCache = (
    targetPage: number,
    updater: (current: Client[]) => Client[],
    nextTotalItems = totalItems,
    nextTotalPages = totalPages,
  ) => {
    const queryKey = buildClientsQueryKey(searchQuery, targetPage);
    setClients((current) => updater(current));
    queryClient.setQueryData<PaginatedResult<Client>>(queryKey, (cached) =>
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

  const loadData = async (targetPage = page, targetSearch = searchQuery) => {
    setLoading(true);
    try {
      const clientsData = await queryClient.fetchQuery({
        queryKey: ["clients", targetSearch, targetPage, PAGE_SIZE],
        queryFn: () => listClientsRequest({ search: targetSearch || undefined, page: targetPage, size: PAGE_SIZE }),
      });
      setClients(clientsData.items);
      setTotalPages(clientsData.totalPages);
      setTotalItems(clientsData.totalItems);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao carregar clientes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [page, searchQuery]);

  const openNewForm = () => {
    setEditingId(null);
    setFormName("");
    setFormType("Pessoa Física");
    setFormCpf("");
    setFormEmail("");
    setFormPhone("");
    setFormErrors({});
    setShowForm(true);
  };

  const openEditForm = (c: Client) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormType(c.type);
    setFormCpf(onlyDigits(c.cpf ?? "").slice(0, 3));
    setFormEmail(normalizeOptionalText(c.email) ?? "");
    setFormPhone(formatStoredPhone(c.phone) ?? "");
    setFormErrors({});
    setShowForm(true);
  };

  const handleSave = async () => {
    const trimmedName = formName.trim();
    const trimmedEmail = formEmail.trim();
    const cpfDigits = onlyDigits(formCpf).slice(0, 3);
    const phoneDigits = onlyDigits(formPhone).slice(0, 11);

    const nextErrors: FormErrors = {};
    if (!trimmedName) nextErrors.name = "Nome é obrigatório.";
    if (!formType) nextErrors.type = "Tipo é obrigatório.";
    if (cpfDigits.length !== 3) nextErrors.cpf = "Informe exatamente 3 dígitos numéricos.";
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) nextErrors.email = "Informe um e-mail válido.";
    if (phoneDigits && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
      nextErrors.phone = "Telefone deve ter 10 ou 11 dígitos.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    setSaving(true);
    try {
      const isFiltered = searchQuery.trim().length > 0;
      if (editingId) {
        const updatedClient = await updateClientRequest(editingId, {
          name: trimmedName,
          cpfLast3: cpfDigits,
          email: trimmedEmail || undefined,
          phone: phoneDigits || undefined,
        });
        if (!isFiltered) {
          updateClientsCache(page, (current) =>
            current.map((item) => (item.id === editingId ? updatedClient : item)),
          );
        }
      } else {
        const createdClient = await createClientRequest({
          name: trimmedName,
          cpfLast3: cpfDigits,
          email: trimmedEmail || undefined,
          phone: phoneDigits || undefined,
        });
        if (!isFiltered && page === 0) {
          const nextTotalItems = totalItems + 1;
          const nextTotalPages = Math.max(1, Math.ceil(nextTotalItems / PAGE_SIZE));
          updateClientsCache(
            0,
            (current) => [createdClient, ...current].slice(0, PAGE_SIZE),
            nextTotalItems,
            nextTotalPages,
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["clients"], refetchType: "none" });
      setShowForm(false);

      if (!editingId && page !== 0) {
        setPage(0);
      } else if (isFiltered) {
        await loadData(editingId ? page : 0);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteClient = async () => {
    if (!deletingClientId) return;
    try {
      const isFiltered = searchQuery.trim().length > 0;
      const result = await deleteClientRequest(deletingClientId);
      toast.success(result.message);
      await queryClient.invalidateQueries({ queryKey: ["clients"], refetchType: "none" });
      const nextPage = page > 0 && clients.length === 1 ? page - 1 : page;
      if (!isFiltered && nextPage === page) {
        const nextTotalItems = Math.max(totalItems - 1, 0);
        const nextTotalPages = nextTotalItems === 0 ? 0 : Math.ceil(nextTotalItems / PAGE_SIZE);
        updateClientsCache(
          page,
          (current) => current.filter((item) => item.id !== deletingClientId),
          nextTotalItems,
          nextTotalPages,
        );
      }
      setDeletingClientId(null);
      if (nextPage !== page) {
        setPage(nextPage);
      } else if (isFiltered) {
        await loadData(nextPage);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir cliente.");
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
          <button className="sidebar-link active w-full">
            <Users className="w-4 h-4" /> Clientes
          </button>
          {can("users_manage") && (
            <button onClick={() => navigate("/admin/usuarios")} className="sidebar-link w-full">
              <Shield className="w-4 h-4" /> Usuários
            </button>
          )}
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
              onChange={(e) => {
                setPage(0);
                setSearchQuery(e.target.value);
              }}
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
                  <input
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    onBlur={() => setFormName((prev) => prev.trim())}
                    className="input-field text-sm"
                    placeholder="Nome do cliente"
                  />
                  {formErrors.name && <p className="mt-1 text-xs text-destructive">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => {
                      setFormType(e.target.value as Client["type"]);
                      if (formErrors.type) setFormErrors((prev) => ({ ...prev, type: undefined }));
                    }}
                    className="input-field text-sm"
                  >
                    <option>Pessoa Física</option>
                    <option>Pessoa Jurídica</option>
                  </select>
                  {formErrors.type && <p className="mt-1 text-xs text-destructive">{formErrors.type}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Primeiros 3 dígitos CPF/CNPJ</label>
                  <input
                    value={formCpf}
                    onChange={(e) => {
                      setFormCpf(onlyDigits(e.target.value).slice(0, 3));
                      if (formErrors.cpf) setFormErrors((prev) => ({ ...prev, cpf: undefined }));
                    }}
                    maxLength={3}
                    inputMode="numeric"
                    className="input-field text-sm"
                    placeholder="000"
                  />
                  {formErrors.cpf && <p className="mt-1 text-xs text-destructive">{formErrors.cpf}</p>}
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
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border rounded-lg text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
            </div>
          )}

          {loading && <div className="text-sm text-muted-foreground">Carregando clientes...</div>}

          <div className="space-y-3">
            {clients.map((c) => (
              <div key={c.id} className="bg-card rounded-xl border p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-foreground text-sm">{c.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{c.type}</span>
                    {normalizeOptionalText(c.email) && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {normalizeOptionalText(c.email)}
                      </span>
                    )}
                    {formatStoredPhone(c.phone) && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {formatStoredPhone(c.phone)}
                      </span>
                    )}
                    <span>{c.caseCount} caso{c.caseCount !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                {can("clients_write") && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditForm(c)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingClientId(c.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages} · {totalItems} cliente{totalItems !== 1 ? "s" : ""}
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

          {!loading && clients.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum cliente encontrado.</p>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deletingClientId} onOpenChange={(open) => !open && setDeletingClientId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente e não poderá ser desfeita.
              <br />
              Cliente: vínculos relacionados podem ser afetados.
              <br />
              Casos vinculados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
