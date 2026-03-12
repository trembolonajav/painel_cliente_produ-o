import { useNavigate } from "react-router-dom";
import {
  Briefcase, Users, LogOut, Search, Plus, ChevronRight, Trash2, Shield,
  Clock, CheckCircle2, AlertCircle, AlertTriangle, ExternalLink, Handshake, Pencil
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { getItem } from "@/services/storage";
import type { OfficeSettings, CaseWithComputed } from "@/types";
import abrLogo from "@/assets/abr-logo.png";
import { deleteCaseRequest } from "@/services/backend";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDashboardCases } from "@/hooks/use-dashboard-cases";

const statusConfig: Record<CaseWithComputed["status"], { label: string; class: string; icon: typeof Clock }> = {
  em_andamento: { label: "Em andamento", class: "status-progress", icon: Clock },
  aguardando_cliente: { label: "Aguardando cliente", class: "status-waiting", icon: AlertCircle },
  concluido: { label: "Concluído", class: "status-complete", icon: CheckCircle2 },
  risco: { label: "Atenção", class: "status-risk", icon: AlertTriangle },
};

const priorityLabel: Record<string, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, can } = useAuth();
  const office = getItem<OfficeSettings>("office_settings");
  const {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filtered,
    stats,
    isCreateDialogOpen,
    editingCaseId,
    newCaseTitle,
    setNewCaseTitle,
    newCaseClientId,
    setNewCaseClientId,
    newCasePartnerId,
    setNewCasePartnerId,
    newCasePriority,
    setNewCasePriority,
    newCaseResponsible,
    setNewCaseResponsible,
    newCaseDocs,
    clients,
    partners,
    users,
    handleCreateCase,
    handleStartEditingCase,
    handleCreateDialogOpenChange,
    handleAddFilesToNewCase,
    handleAddPendingClientDoc,
    handleUpdateNewCaseDoc,
    handleRemoveNewCaseDoc,
  } = useDashboardCases({ officeInitials: office?.initials, user });
  const [deletingCaseId, setDeletingCaseId] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteCase = async () => {
    if (!deletingCaseId) return;
    try {
      const result = await deleteCaseRequest(deletingCaseId);
      toast.success(result.message);
      setDeletingCaseId(null);
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir caso.");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 bg-sidebar flex-col border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <img src={abrLogo} alt={office?.name} className="h-9 object-contain brightness-0 invert" />
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <button onClick={() => navigate("/admin")} className="sidebar-link active w-full">
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

      {/* Main */}
      <main className="flex-1 bg-background">
        {/* Top bar */}
        <header className="border-b px-6 py-4 flex items-center justify-between gap-4 bg-card">
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">Central de Casos</h1>
            <p className="text-sm text-muted-foreground">Gerencie e acompanhe todas as demandas do escritório</p>
          </div>
          <div className="flex items-center gap-3">
            {can("cases_write") && (
              <Dialog
                open={isCreateDialogOpen}
                onOpenChange={handleCreateDialogOpenChange}
              >
                <DialogTrigger asChild>
                  <button className="btn-gold px-4 py-2 text-sm flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Novo Caso
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCaseId ? "Editar Caso" : "Novo Caso"}</DialogTitle>
                    <DialogDescription>
                      {editingCaseId
                        ? "Atualize os dados principais do caso."
                        : "Preencha os dados principais para cadastrar um novo caso."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-case-title">Título</Label>
                      <Input
                        id="new-case-title"
                        placeholder="Ex: Revisão Contratual"
                        value={newCaseTitle}
                        onChange={(e) => setNewCaseTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-case-client">Cliente</Label>
                      <Select value={newCaseClientId} onValueChange={setNewCaseClientId}>
                        <SelectTrigger id="new-case-client">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-case-priority">Prioridade</Label>
                      <Select value={newCasePriority} onValueChange={(value) => setNewCasePriority(value as CaseWithComputed["priority"])}>
                        <SelectTrigger id="new-case-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="media">Média</SelectItem>
                          <SelectItem value="baixa">Baixa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-case-partner">Parceiro</Label>
                      <Select value={newCasePartnerId || "none"} onValueChange={(value) => setNewCasePartnerId(value === "none" ? "" : value)}>
                        <SelectTrigger id="new-case-partner">
                          <SelectValue placeholder="Selecione um parceiro" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sem parceiro</SelectItem>
                          {partners.map((partner) => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-case-responsible">Responsável</Label>
                      <Select value={newCaseResponsible} onValueChange={setNewCaseResponsible}>
                        <SelectTrigger id="new-case-responsible">
                          <SelectValue placeholder="Selecione o responsável" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!editingCaseId && (
                    <div className="space-y-2">
                      <Label htmlFor="new-case-doc-upload">Documentos</Label>
                      <Input
                        id="new-case-doc-upload"
                        type="file"
                        multiple
                        onChange={(e) => {
                          handleAddFilesToNewCase(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                      <div className="flex justify-end">
                        <Button variant="outline" onClick={handleAddPendingClientDoc}>Adicionar pendência do cliente</Button>
                      </div>
                      {newCaseDocs.length > 0 && (
                        <div className="space-y-2 max-h-52 overflow-auto pr-1">
                          {newCaseDocs.map((doc) => (
                            <div key={doc.id} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={doc.name}
                                  onChange={(e) => handleUpdateNewCaseDoc(doc.id, { name: e.target.value })}
                                  placeholder="Nome do documento"
                                />
                                <button
                                  onClick={() => handleRemoveNewCaseDoc(doc.id)}
                                  className="px-2 py-2 border rounded-md text-muted-foreground hover:text-foreground"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Select value={doc.visibility} onValueChange={(value) => handleUpdateNewCaseDoc(doc.id, { visibility: value as "cliente" | "interno" })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="interno">Interno</SelectItem>
                                    <SelectItem value="cliente">Visível ao cliente</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Select value={doc.status} onValueChange={(value) => handleUpdateNewCaseDoc(doc.id, { status: value as "disponivel" | "pendente" })}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="disponivel">Disponível</SelectItem>
                                    <SelectItem value="pendente">Pendente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => handleCreateDialogOpenChange(false)}>Cancelar</Button>
                    <Button
                      className="btn-gold"
                      onClick={handleCreateCase}
                      disabled={!newCaseTitle.trim() || !newCaseClientId}
                    >
                      {editingCaseId ? "Salvar alterações" : "Criar Caso"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        <div className="p-6 space-y-6 max-w-7xl">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Total de casos", value: stats.total, icon: Briefcase, accent: false },
              { label: "Em andamento", value: stats.andamento, icon: Clock, accent: false },
              { label: "Aguardando cliente", value: stats.aguardando, icon: AlertCircle, accent: false },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl border p-4 ${s.accent && s.value > 0 ? "border-destructive/30 bg-destructive/5" : "bg-card"}`}>
                <div className="flex items-center justify-between mb-2">
                  <s.icon className={`w-4 h-4 ${s.accent && s.value > 0 ? "text-destructive" : "text-muted-foreground"}`} />
                </div>
                <div className="text-2xl font-bold text-foreground font-heading">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por caso, cliente ou parceiro..."
                className="input-field pl-10 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: "todos", label: "Todos" },
                { key: "em_andamento", label: "Em andamento" },
                { key: "aguardando_cliente", label: "Aguardando" },
                { key: "concluido", label: "Concluído" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Case cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((c, i) => {
              const sc = statusConfig[c.status];
              const StatusIcon = sc.icon;
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/admin/caso/${c.id}`)}
                  className="card-case text-left p-0 group w-full"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="animate-fade-in opacity-0 p-5" style={{ animationFillMode: "forwards", animationDelay: `${i * 60}ms` }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-mono">{c.code}</span>
                          <span className={`status-badge ${sc.class}`}>
                            <StatusIcon className="w-3 h-3" /> {sc.label}
                          </span>
                        </div>
                        <h3 className="font-heading font-bold text-foreground text-sm leading-snug truncate">{c.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{c.clientName} · {c.clientType}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {can("cases_write") && (
                          <span
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleStartEditingCase(c);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar caso"
                          >
                            <Pencil className="w-4 h-4" />
                          </span>
                        )}
                        {can("cases_write") && (
                          <span
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeletingCaseId(c.id);
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Excluir caso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors shrink-0 mt-1" />
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium text-foreground">{c.progress}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${c.progress}%` }} />
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span>Responsável: <span className="text-foreground">{c.responsible || "Não definido"}</span></span>
                      <span className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline">Prioridade: <span className="text-foreground">{priorityLabel[c.priority]}</span></span>
                      {c.pendingClient > 0 && (
                        <span className="text-gold font-medium">
                          {c.pendingClient} pendência{c.pendingClient > 1 ? "s" : ""} do cliente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <span>Última atualização: {c.lastUpdate}</span>
                      <div className="flex items-center gap-1.5">
                        {c.portalActive ? (
                          <span className="flex items-center gap-1 text-gold">
                            <ExternalLink className="w-3 h-3" /> Portal ativo
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">Portal inativo</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhum caso encontrado com os filtros selecionados.</p>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deletingCaseId} onOpenChange={(open) => !open && setDeletingCaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este registro?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é permanente e não poderá ser desfeita.
              <br />
              Caso: documentos, etapas, tarefas, histórico, portal e outros vínculos também poderão ser removidos.
              <br />
              Arquivos físicos podem permanecer no storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;

