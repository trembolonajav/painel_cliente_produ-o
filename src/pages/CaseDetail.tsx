import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink,
  FileText, Copy, Bell, RefreshCw, Download, Eye, Plus,
  CircleDot, Circle, Check, User, Users, Calendar, Trash2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { CaseWithComputed, CaseStage } from "@/types";
import { useCaseDetail } from "@/hooks/use-case-detail";
import PatrimonyBuilder from "@/components/patrimony/PatrimonyBuilder";
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

const statusConfig: Record<CaseWithComputed["status"], { label: string; class: string; icon: typeof Clock }> = {
  em_andamento: { label: "Em andamento", class: "status-progress", icon: Clock },
  aguardando_cliente: { label: "Aguardando cliente", class: "status-waiting", icon: AlertCircle },
  concluido: { label: "Concluído", class: "status-complete", icon: CheckCircle2 },
  risco: { label: "Atenção", class: "status-risk", icon: AlertTriangle },
};

const stageIcon = (status: CaseStage["status"]) => {
  if (status === "concluido") return <CheckCircle2 className="w-5 h-5 text-[hsl(152_55%_39%)]" />;
  if (status === "em_andamento") return <CircleDot className="w-5 h-5 text-gold" />;
  return <Circle className="w-5 h-5 text-muted-foreground/40" />;
};

const tabs = [
  { key: "andamento", label: "Andamento" },
  { key: "tarefas", label: "Tarefas" },
  { key: "documentos", label: "Documentos" },
  { key: "atividade", label: "Atividade" },
  { key: "estruturacao", label: "Estruturacao" },
  { key: "portal", label: "Portal do Cliente" },
];

type PendingDelete = {
  kind: "stage" | "substep" | "task" | "document" | "update";
  id: string;
  title: string;
  message: string;
};

const CaseDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, can } = useAuth();
  const {
    activeTab,
    setActiveTab,
    loading,
    newStageName,
    setNewStageName,
    newStageDescription,
    setNewStageDescription,
    newSubstepTitles,
    setNewSubstepTitle,
    newTaskLabel,
    setNewTaskLabel,
    newUpdateText,
    setNewUpdateText,
    newDocName,
    setNewDocName,
    newDocVisibility,
    setNewDocVisibility,
    newDocStatus,
    setNewDocStatus,
    handleSetNewDocFile,
    caseData,
    portalLinks,
    activeLink,
    handleAddStage,
    handleAddSubstep,
    handleSubstepStatusChange,
    handleSubstepOrderChange,
    handleDeleteSubstep,
    handleStageClick,
    handleToggleTask,
    handleAddTask,
    handleAddUpdate,
    handleAddDocument,
    handleResolvePendingDocument,
    handleDeleteDocument,
    handleDeleteStage,
    handleDeleteTask,
    handleDeleteUpdate,
    handleDownloadDocument,
    handleGenerateLink,
    handleRevokeLink,
    handleCopyLink,
    handleOpenLink,
  } = useCaseDetail({ caseId: id, user, can });
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "stage") await handleDeleteStage(pendingDelete.id);
    if (pendingDelete.kind === "substep") await handleDeleteSubstep(pendingDelete.id);
    if (pendingDelete.kind === "task") await handleDeleteTask(pendingDelete.id);
    if (pendingDelete.kind === "document") await handleDeleteDocument(pendingDelete.id);
    if (pendingDelete.kind === "update") await handleDeleteUpdate(pendingDelete.id);
    setPendingDelete(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-heading">Carregando caso...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-heading">Caso não encontrado</p>
          <button onClick={() => navigate("/admin")} className="mt-4 btn-gold px-4 py-2 text-sm">Voltar</button>
        </div>
      </div>
    );
  }

  const sc = statusConfig[caseData.status];
  const StatusIcon = sc.icon;
  const pendingDocuments = caseData.documents.filter((doc) => doc.status === "pendente");
  const availableDocuments = caseData.documents.filter((doc) => doc.status === "disponivel");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate("/admin")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
            <ArrowLeft className="w-4 h-4" /> Voltar aos casos
          </button>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground font-mono">{caseData.code}</span>
                <span className={`status-badge ${sc.class}`}><StatusIcon className="w-3 h-3" /> {sc.label}</span>
              </div>
              <h1 className="text-xl font-heading font-bold text-foreground">{caseData.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{caseData.clientName} · {caseData.clientType}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button className="px-3 py-2 text-sm border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                <Bell className="w-4 h-4" /> Notificar
              </button>
              {can("portal_manage") && (
                <button onClick={handleGenerateLink} className="btn-gold px-3 py-2 text-sm flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4" /> Gerar Link
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Progresso geral</span>
              <span className="font-medium text-foreground">{caseData.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${caseData.progress}%` }} />
            </div>
          </div>

          <div className="flex gap-1 mt-5 -mb-4 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === t.key
                    ? "border-gold text-foreground bg-background"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {activeTab === "andamento" && (
          <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-2 bg-card rounded-xl border p-6">
              <h2 className="font-heading font-bold text-foreground mb-5">Etapas do Processo</h2>
              {can("stages_write") && (
                <div className="space-y-2 mb-5 pb-5 border-b">
                  <input
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                    placeholder="Nome da nova etapa..."
                    className="input-field text-sm"
                  />
                  <input
                    value={newStageDescription}
                    onChange={(e) => setNewStageDescription(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddStage()}
                    placeholder="Descrição da etapa (opcional)..."
                    className="input-field text-sm"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddStage}
                      className="btn-gold px-4 py-2 text-sm flex items-center gap-1"
                      disabled={!newStageName.trim()}
                    >
                      <Plus className="w-4 h-4" /> Adicionar etapa
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-0">
                {caseData.stages.map((stage, i) => (
                  <div key={stage.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleStageClick(stage)}
                        className={`transition-transform ${can("stages_write") ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
                        title={can("stages_write") ? "Clique para alterar status" : undefined}
                      >
                        {stageIcon(stage.status)}
                      </button>
                      {i < caseData.stages.length - 1 && (
                        <div className={`w-px flex-1 my-1 ${stage.status === "concluido" ? "bg-[hsl(152_55%_39%/0.3)]" : "bg-border"}`} />
                      )}
                    </div>
                    <div className={`pb-6 flex-1 ${stage.status === "pendente" ? "opacity-50" : ""}`}>
                      <div className="flex items-center justify-between">
                        <h3 className={`font-medium text-sm ${stage.status === "em_andamento" ? "text-gold" : "text-foreground"}`}>
                          {stage.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          {stage.date && <span className="text-xs text-muted-foreground">{stage.date}</span>}
                          {can("stages_write") && (
                            <button
                              onClick={() =>
                                setPendingDelete({
                                  kind: "stage",
                                  id: stage.id,
                                  title: "Excluir etapa",
                                  message: "Tem certeza que deseja excluir esta etapa? Essa ação é permanente e não poderá ser desfeita.",
                                })
                              }
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Excluir etapa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{stage.description}</p>
                      <div className="mt-3 ml-1 pl-3 border-l border-border/60 space-y-2">
                        {stage.substeps && stage.substeps.length > 0 ? (
                          stage.substeps.map((substep) => (
                            <div key={substep.id} className="rounded-md border border-border/70 bg-background/50 p-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground">#{substep.order}</span>
                                <span className="text-xs text-foreground flex-1">{substep.title}</span>
                                <select
                                  value={substep.status}
                                  onChange={(e) => handleSubstepStatusChange(substep, e.target.value as "pendente" | "em_andamento" | "concluido")}
                                  className="input-field text-[11px] h-7 py-0 px-2 w-[132px]"
                                  disabled={!can("stages_write")}
                                >
                                  <option value="pendente">Pendente</option>
                                  <option value="em_andamento">Em andamento</option>
                                  <option value="concluido">Concluído</option>
                                </select>
                                <input
                                  type="number"
                                  min={1}
                                  defaultValue={substep.order}
                                  onBlur={(e) => handleSubstepOrderChange(substep, Number(e.target.value))}
                                  className="input-field text-[11px] h-7 py-0 px-2 w-16"
                                  disabled={!can("stages_write")}
                                  title="Ordem"
                                />
                                {can("stages_write") && (
                                  <button
                                    onClick={() =>
                                      setPendingDelete({
                                        kind: "substep",
                                        id: substep.id,
                                        title: "Excluir subprocesso",
                                        message: "Tem certeza que deseja excluir este subprocesso? Essa ação é permanente e não poderá ser desfeita.",
                                      })
                                    }
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Excluir subprocesso"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Sem subprocessos nesta etapa.</p>
                        )}

                        {can("stages_write") && (
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              value={newSubstepTitles[stage.id] ?? ""}
                              onChange={(e) => setNewSubstepTitle(stage.id, e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleAddSubstep(stage.id)}
                              placeholder="Novo subprocesso..."
                              className="input-field text-xs h-8"
                            />
                            <button
                              onClick={() => handleAddSubstep(stage.id)}
                              className="px-3 h-8 text-xs rounded-md border text-muted-foreground hover:text-foreground"
                              disabled={!(newSubstepTitles[stage.id] ?? "").trim()}
                            >
                              Adicionar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {caseData.stages.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Nenhuma etapa cadastrada ainda.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-xl border p-5">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Informações</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><dt className="text-xs text-muted-foreground">Responsável</dt><dd className="text-foreground">{caseData.responsible || "Não definido"}</dd></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><dt className="text-xs text-muted-foreground">Equipe</dt><dd className="text-foreground">{caseData.team.length > 0 ? caseData.team.join(", ") : "Sem equipe adicional"}</dd></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><dt className="text-xs text-muted-foreground">Última atualização</dt><dd className="text-foreground">{caseData.lastUpdate}</dd></div>
                  </div>
                </dl>
              </div>

              {caseData.pendingClient > 0 && (
                <div className="bg-gold/10 rounded-xl border border-gold/20 p-5">
                  <h3 className="text-sm font-medium text-foreground mb-1">Pendências do cliente</h3>
                  <p className="text-xs text-muted-foreground">{caseData.nextAction}</p>
                  <p className="text-lg font-bold text-gold mt-2">{caseData.pendingClient} item{caseData.pendingClient > 1 ? "ns" : ""}</p>
                </div>
              )}

              {activeLink && (
                <div className="bg-card rounded-xl border p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ExternalLink className="w-4 h-4 text-gold" />
                    <h3 className="text-sm font-medium text-foreground">Portal do Cliente</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Link ativo até {new Date(activeLink.expiresAt).toLocaleDateString("pt-BR")}</p>
                  <div className="flex gap-2">
                    <button onClick={handleCopyLink} className="flex-1 text-xs px-3 py-2 border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1">
                      <Copy className="w-3 h-3" /> Copiar link
                    </button>
                    <button
                      onClick={handleOpenLink}
                      className="flex-1 text-xs px-3 py-2 border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> Visualizar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tarefas" && (
          <div className="bg-card rounded-xl border p-6 animate-fade-in">
            <h2 className="font-heading font-bold text-foreground mb-5">Checklist de Tarefas</h2>
            <div className="space-y-3">
              {caseData.checklist.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border ${item.done ? "bg-muted/50" : "bg-card"}`}>
                  <button
                    onClick={() => handleToggleTask(item.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${item.done ? "bg-[hsl(152_55%_39%)] border-[hsl(152_55%_39%)]" : "border-border hover:border-gold"}`}
                    disabled={!can("tasks_write")}
                  >
                    {item.done && <Check className="w-3 h-3 text-card" />}
                  </button>
                  <span className={`text-sm flex-1 ${item.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {item.label}
                  </span>
                  {item.responsible && <span className="text-xs text-muted-foreground hidden sm:inline">{item.responsible}</span>}
                  {can("tasks_write") && (
                    <button
                      onClick={() =>
                        setPendingDelete({
                          kind: "task",
                          id: item.id,
                          title: "Excluir tarefa",
                          message: "Tem certeza que deseja excluir esta tarefa? Essa ação é permanente e não poderá ser desfeita.",
                        })
                      }
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir tarefa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {can("tasks_write") && (
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <input
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                  placeholder="Nova tarefa..."
                  className="input-field flex-1 text-sm"
                />
                <button onClick={handleAddTask} className="btn-gold px-4 py-2 text-sm flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "documentos" && (
          <div className="bg-card rounded-xl border p-6 animate-fade-in">
            <h2 className="font-heading font-bold text-foreground mb-5">Documentos</h2>
            {can("docs_write") && (
              <div className="space-y-2 mb-5 pb-5 border-b">
                <input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Nome do documento..."
                  className="input-field text-sm"
                />
                <div className="grid sm:grid-cols-3 gap-2">
                  <select
                    value={newDocVisibility}
                    onChange={(e) => setNewDocVisibility(e.target.value as "cliente" | "interno")}
                    className="input-field text-sm"
                  >
                    <option value="interno">Interno</option>
                    <option value="cliente">Visível ao cliente</option>
                  </select>
                  <select
                    value={newDocStatus}
                    onChange={(e) => setNewDocStatus(e.target.value as "disponivel" | "pendente")}
                    className="input-field text-sm"
                  >
                    <option value="disponivel">Disponível</option>
                    <option value="pendente">Pendente</option>
                  </select>
                  <input
                    type="file"
                    className="input-field text-sm"
                    onChange={(e) => handleSetNewDocFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex justify-end">
                  <button onClick={handleAddDocument} className="btn-gold px-4 py-2 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Adicionar documento
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-5">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-foreground">Documentos pendentes</h3>
                  <span className="text-xs text-muted-foreground">Pendente = aguardando envio</span>
                </div>
                <div className="space-y-2">
                  {pendingDocuments.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum documento pendente.</p>
                  )}
                  {pendingDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gold/20 bg-gold/5 hover:border-gold/30 transition-colors">
                      <FileText className="w-5 h-5 text-gold shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{doc.type}</span>
                          <span>·</span>
                          <span>{doc.date}</span>
                          <span>·</span>
                          <span className={`${doc.visibility === "cliente" ? "text-gold" : "text-muted-foreground"}`}>
                            {doc.visibility === "cliente" ? "Disponível ao cliente" : "Interno"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-badge status-waiting">Pendente</span>
                        {can("docs_write") && (
                          <>
                            <button
                              onClick={() => handleResolvePendingDocument(doc.id)}
                              className="px-2 py-1 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                            >
                              Recebido
                            </button>
                            <button
                              onClick={() =>
                                setPendingDelete({
                                  kind: "document",
                                  id: doc.id,
                                  title: "Excluir documento",
                                  message:
                                    "Tem certeza que deseja excluir este documento? Essa ação é permanente e não poderá ser desfeita. O registro será removido e o arquivo físico pode permanecer no storage.",
                                })
                              }
                              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                              title="Excluir documento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-foreground">Documentos recebidos / disponíveis</h3>
                  <span className="text-xs text-muted-foreground">Disponível = já recebido / acessível</span>
                </div>
                <div className="space-y-2">
                  {availableDocuments.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum documento recebido.</p>
                  )}
                  {availableDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border hover:border-gold/30 transition-colors">
                      <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{doc.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{doc.type}</span>
                          <span>·</span>
                          <span>{doc.date}</span>
                          <span>·</span>
                          <span className={`${doc.visibility === "cliente" ? "text-gold" : "text-muted-foreground"}`}>
                            {doc.visibility === "cliente" ? "Disponível ao cliente" : "Interno"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-badge status-complete">Disponível</span>
                        <button onClick={() => handleDownloadDocument(doc)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                        {can("docs_write") && (
                          <button
                            onClick={() =>
                              setPendingDelete({
                                kind: "document",
                                id: doc.id,
                                title: "Excluir documento",
                                message:
                                  "Tem certeza que deseja excluir este documento? Essa ação é permanente e não poderá ser desfeita. O registro será removido e o arquivo físico pode permanecer no storage.",
                              })
                            }
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Excluir documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === "atividade" && (
          <div className="bg-card rounded-xl border p-6 animate-fade-in">
            <h2 className="font-heading font-bold text-foreground mb-5">Histórico de Atividade</h2>
            {can("cases_write") && (
              <div className="flex gap-2 mb-5 pb-5 border-b">
                <input
                  value={newUpdateText}
                  onChange={(e) => setNewUpdateText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUpdate()}
                  placeholder="Registrar nova atividade..."
                  className="input-field flex-1 text-sm"
                />
                <button onClick={handleAddUpdate} className="btn-gold px-4 py-2 text-sm">Registrar</button>
              </div>
            )}
            <div className="space-y-4">
              {caseData.updates.map((u) => (
                <div key={u.id} className="flex gap-3">
                  <div className="w-2 h-2 rounded-full bg-gold mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{u.text}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span>{u.date}</span>
                      {u.author && <><span>·</span><span>{u.author}</span></>}
                      {u.internal && <span className="text-destructive">(interno)</span>}
                    </div>
                  </div>
                  {can("cases_write") && (
                    <button
                      onClick={() =>
                        setPendingDelete({
                          kind: "update",
                          id: u.id,
                          title: "Excluir atualizacao",
                          message: "Tem certeza que deseja excluir esta atualizacao? Essa acao e permanente e nao podera ser desfeita.",
                        })
                      }
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir atualizacao"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "estruturacao" && (
          <div className="bg-card rounded-xl border p-6 animate-fade-in">
            <PatrimonyBuilder caseId={caseData.id} userId={user!.id} canWrite={can("cases_write")} />
          </div>
        )}

        {activeTab === "portal" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-card rounded-xl border p-6">
              <h2 className="font-heading font-bold text-foreground mb-2">Configuração do Portal</h2>
              <p className="text-sm text-muted-foreground mb-5">Gerencie o que o cliente visualiza no portal externo.</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border">
                  <h3 className="text-sm font-medium text-foreground mb-1">Status do portal</h3>
                  <p className="text-xs text-muted-foreground mb-3">{activeLink ? "O portal está ativo e acessível pelo cliente." : "O portal está desativado."}</p>
                  <span className={`status-badge ${activeLink ? "status-complete" : "status-waiting"}`}>
                    {activeLink ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <div className="p-4 rounded-lg border">
                  <h3 className="text-sm font-medium text-foreground mb-1">Link temporário</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {activeLink ? `Expira em ${new Date(activeLink.expiresAt).toLocaleDateString("pt-BR")}` : "Nenhum link ativo"}
                  </p>
                  <div className="flex gap-2">
                    {can("portal_manage") && (
                      <button onClick={handleGenerateLink} className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> {activeLink ? "Renovar link" : "Gerar link"}
                      </button>
                    )}
                    {activeLink && can("portal_manage") && (
                      <button onClick={() => handleRevokeLink()} className="px-3 py-1.5 text-xs border rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                        Revogar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {portalLinks.length > 0 && (
              <div className="bg-card rounded-xl border p-6">
                <h3 className="text-sm font-medium text-foreground mb-3">Histórico de links</h3>
                <div className="space-y-2">
                  {portalLinks.map((l) => (
                    <div key={l.id} className="flex items-center justify-between p-3 rounded-lg border text-xs">
                      <div>
                        <span className="font-mono text-muted-foreground">{(l.url ?? "Link ativo").slice(0, 32)}...</span>
                        <span className="ml-2 text-muted-foreground">Criado: {new Date(l.createdAt).toLocaleDateString("pt-BR")}</span>
                      </div>
                      <span className={`status-badge ${l.active && new Date(l.expiresAt) > new Date() ? "status-complete" : "status-risk"}`}>
                        {l.active && new Date(l.expiresAt) > new Date() ? "Ativo" : l.revokedAt ? "Revogado" : "Expirado"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-medium text-foreground mb-3">Resumo para o cliente</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {caseData.subtitle}. Atualmente na etapa de <strong className="text-foreground">{caseData.stages[caseData.currentStage]?.name}</strong>.
                {caseData.pendingClient > 0 && ` Existem ${caseData.pendingClient} pendência(s) aguardando ação do cliente.`}
              </p>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.title ?? "Confirmar exclusao"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.message ?? "Tem certeza que deseja excluir este registro?"}
              <br />
              Essa acao e permanente e nao podera ser desfeita.
              <br />
              Dependendo do item, dados relacionados tambem poderao ser removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CaseDetail;
