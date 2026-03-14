import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, AlertCircle, ExternalLink,
  FileText, Copy, Bell, RefreshCw, Download, Eye, Plus,
  CircleDot, Circle, Check, User, Users, Calendar, Trash2, Handshake,
  ChevronDown, ChevronRight, ArrowUp, ArrowDown, Pencil
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { CaseWithComputed, CaseStage } from "@/types";
import { useCaseDetail } from "@/hooks/use-case-detail";
import { updateCaseRequest } from "@/services/backend";
import PatrimonyBuilder from "@/components/patrimony/PatrimonyBuilder";
import { toast } from "sonner";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

const subStageIcon = (status: CaseStage["status"]) => {
  if (status === "concluido") return <CheckCircle2 className="w-3.5 h-3.5 text-[hsl(152_55%_39%)]" />;
  if (status === "em_andamento") return <CircleDot className="w-3.5 h-3.5 text-gold" />;
  return <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />;
};

const tabs = [
  { key: "andamento", label: "Andamento" },
  { key: "tarefas", label: "Tarefas" },
  { key: "documentos", label: "Documentos" },
  { key: "atividade", label: "Atividade" },
  { key: "estruturacao", label: "Estruturação" },
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
    newSubstepDescriptions,
    setNewSubstepDescription,
    newSubstepVisibleToClient,
    setNewSubstepVisibility,
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
    canReorderStages,
    isReordering,
    handleAddStage,
    handleAddSubstep,
    handleSubstepStatusChange,
    handleSubstepReorder,
    handleSubstepUpdate,
    handleDeleteSubstep,
    handleStageClick,
    handleStageReorder,
    handleStageUpdate,
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
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [stageNameDrafts, setStageNameDrafts] = useState<Record<string, string>>({});
  const [stageDescriptionDrafts, setStageDescriptionDrafts] = useState<Record<string, string>>({});
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [savingStageId, setSavingStageId] = useState<string | null>(null);
  const [substepDescriptionDrafts, setSubstepDescriptionDrafts] = useState<Record<string, string>>({});
  const [substepTitleDrafts, setSubstepTitleDrafts] = useState<Record<string, string>>({});
  const [substepVisibilityDrafts, setSubstepVisibilityDrafts] = useState<Record<string, boolean>>({});
  const [currentStatusDraft, setCurrentStatusDraft] = useState("");
  const [savingCurrentStatus, setSavingCurrentStatus] = useState(false);
  const [editingSubstepId, setEditingSubstepId] = useState<string | null>(null);
  const [savingSubstepId, setSavingSubstepId] = useState<string | null>(null);
  const [createStageDialogOpen, setCreateStageDialogOpen] = useState(false);
  const [createStageParentId, setCreateStageParentId] = useState<string | null>(null);
  const [stageDialogMode, setStageDialogMode] = useState<"create-stage" | "edit-stage" | "create-substep" | "edit-substep">("create-stage");

  useEffect(() => {
    if (!caseData?.stages) return;
    const nextStageNames: Record<string, string> = {};
    const nextStageDescriptions: Record<string, string> = {};
    const nextDrafts: Record<string, string> = {};
    const nextTitles: Record<string, string> = {};
    const nextVisibility: Record<string, boolean> = {};
    caseData.stages.forEach((stage) => {
      nextStageNames[stage.id] = stage.name;
      nextStageDescriptions[stage.id] = stage.description ?? "";
      stage.substeps?.forEach((substep) => {
        nextDrafts[substep.id] = substep.description ?? "";
        nextTitles[substep.id] = substep.title;
        nextVisibility[substep.id] = substep.visibleToClient;
      });
    });
    setStageNameDrafts(nextStageNames);
    setStageDescriptionDrafts(nextStageDescriptions);
    setSubstepDescriptionDrafts(nextDrafts);
    setSubstepTitleDrafts(nextTitles);
    setSubstepVisibilityDrafts(nextVisibility);
  }, [caseData]);

  useEffect(() => {
    setCurrentStatusDraft(caseData?.currentStatus ?? "");
  }, [caseData?.currentStatus]);

  const cancelEditingStage = (stageId: string, name: string, description?: string) => {
    setStageNameDrafts((prev) => ({ ...prev, [stageId]: name }));
    setStageDescriptionDrafts((prev) => ({ ...prev, [stageId]: description ?? "" }));
    setEditingStageId((current) => (current === stageId ? null : current));
  };

  const saveEditingStage = async (stage: CaseStage) => {
    try {
      setSavingStageId(stage.id);
      await handleStageUpdate(stage, {
        name: stageNameDrafts[stage.id] ?? stage.name,
        description: stageDescriptionDrafts[stage.id] ?? stage.description ?? "",
      });
      setEditingStageId((current) => (current === stage.id ? null : current));
    } catch (error) {
      console.error(error);
    } finally {
      setSavingStageId(null);
    }
  };

  const cancelEditingSubstep = (substepId: string, title: string, description?: string, visibleToClient?: boolean) => {
    setSubstepTitleDrafts((prev) => ({ ...prev, [substepId]: title }));
    setSubstepDescriptionDrafts((prev) => ({ ...prev, [substepId]: description ?? "" }));
    setSubstepVisibilityDrafts((prev) => ({ ...prev, [substepId]: !!visibleToClient }));
    setEditingSubstepId((current) => (current === substepId ? null : current));
  };

  const saveEditingSubstep = async (substep: NonNullable<CaseStage["substeps"]>[number]) => {
    try {
      setSavingSubstepId(substep.id);
      await handleSubstepUpdate(substep, {
        title: substepTitleDrafts[substep.id] ?? substep.title,
        description: substepDescriptionDrafts[substep.id] ?? substep.description ?? "",
        visibleToClient: substepVisibilityDrafts[substep.id] ?? substep.visibleToClient,
      });
      setEditingSubstepId((current) => (current === substep.id ? null : current));
    } catch (error) {
      console.error(error);
    } finally {
      setSavingSubstepId(null);
    }
  };

  const toggleExpand = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  const openCreateStageDialog = (stageId?: string) => {
    setStageDialogMode(stageId ? "create-substep" : "create-stage");
    setEditingStageId(null);
    setEditingSubstepId(null);
    setCreateStageParentId(stageId ?? null);
    if (stageId) {
      setNewSubstepVisibility(stageId, newSubstepVisibleToClient[stageId] ?? false);
    }
    setCreateStageDialogOpen(true);
  };

  const openEditStageDialog = (stage: CaseStage) => {
    setStageDialogMode("edit-stage");
    setEditingSubstepId(null);
    setEditingStageId(stage.id);
    setStageNameDrafts((prev) => ({ ...prev, [stage.id]: stage.name }));
    setStageDescriptionDrafts((prev) => ({ ...prev, [stage.id]: stage.description ?? "" }));
    setCreateStageParentId(null);
    setCreateStageDialogOpen(true);
  };

  const openEditSubstepDialog = (stageId: string, substep: NonNullable<CaseStage["substeps"]>[number]) => {
    setStageDialogMode("edit-substep");
    setEditingStageId(null);
    setEditingSubstepId(substep.id);
    setCreateStageParentId(stageId);
    setSubstepTitleDrafts((prev) => ({ ...prev, [substep.id]: substep.title }));
    setSubstepDescriptionDrafts((prev) => ({ ...prev, [substep.id]: substep.description ?? "" }));
    setSubstepVisibilityDrafts((prev) => ({ ...prev, [substep.id]: substep.visibleToClient }));
    setCreateStageDialogOpen(true);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateStageDialogOpen(open);
    if (!open) {
      if (editingStageId && caseData) {
        const stage = caseData.stages.find((item) => item.id === editingStageId);
        if (stage) {
          cancelEditingStage(stage.id, stage.name, stage.description);
        } else {
          setEditingStageId(null);
        }
      }
      if (editingSubstepId && caseData) {
        const substep = caseData.stages.flatMap((stage) => stage.substeps ?? []).find((item) => item.id === editingSubstepId);
        if (substep) {
          cancelEditingSubstep(substep.id, substep.title, substep.description, substep.visibleToClient);
        } else {
          setEditingSubstepId(null);
        }
      }
      setCreateStageParentId(null);
      setStageDialogMode("create-stage");
    }
  };

  const handleSubmitCreateStage = async () => {
    if (stageDialogMode === "edit-stage" && editingStageId && caseData) {
      const stage = caseData.stages.find((item) => item.id === editingStageId);
      if (!stage || !(stageNameDrafts[stage.id] ?? "").trim()) return;
      await saveEditingStage(stage);
      handleCreateDialogOpenChange(false);
      return;
    }

    if (stageDialogMode === "edit-substep" && editingSubstepId && caseData) {
      const substep = caseData.stages.flatMap((stage) => stage.substeps ?? []).find((item) => item.id === editingSubstepId);
      if (!substep || !(substepTitleDrafts[substep.id] ?? "").trim()) return;
      await saveEditingSubstep(substep);
      handleCreateDialogOpenChange(false);
      return;
    }

    if (createStageParentId) {
      await handleAddSubstep(createStageParentId);
      if ((newSubstepTitles[createStageParentId] ?? "").trim()) {
        handleCreateDialogOpenChange(false);
      }
      return;
    }

    await handleAddStage();
    if (newStageName.trim()) {
      handleCreateDialogOpenChange(false);
    }
  };

  const handleSaveCurrentStatus = async () => {
    if (!caseData || savingCurrentStatus) return;
    setSavingCurrentStatus(true);
    try {
      await updateCaseRequest(caseData.id, {
        clientId: caseData.clientId,
        partnerId: caseData.partnerId,
        title: caseData.title,
        caseNumber: caseData.caseNumber,
        area: caseData.subtitle || undefined,
        currentStatus: currentStatusDraft.trim() || undefined,
        status: caseData.status,
        priority: caseData.priority,
      });
      toast.success("Status atual salvo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar status atual.");
    } finally {
      setSavingCurrentStatus(false);
    }
  };

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
  const editingStage = editingStageId ? caseData.stages.find((stage) => stage.id === editingStageId) ?? null : null;
  const editingSubstep = editingSubstepId
    ? caseData.stages.flatMap((stage) => stage.substeps ?? []).find((substep) => substep.id === editingSubstepId) ?? null
    : null;
  const isSubstepDialog = stageDialogMode === "create-substep" || stageDialogMode === "edit-substep";
  const isEditingDialog = stageDialogMode === "edit-stage" || stageDialogMode === "edit-substep";

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
              <p className="text-sm text-muted-foreground mt-0.5">{caseData.clientName} • {caseData.clientType}</p>
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
              <div className="space-y-0">
                {caseData.stages.map((stage, i) => {
                  const hasSubsteps = !!stage.substeps?.length;
                  const isExpanded = !hasSubsteps || expandedStages.has(stage.id);
                  const completedSubsteps = stage.substeps?.filter((substep) => substep.status === "concluido").length ?? 0;
                  return (
                    <div key={stage.id} className="group/stage">
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center pt-0.5">
                          <button
                            onClick={() => handleStageClick(stage)}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border bg-background transition ${
                              stage.status === "concluido"
                                ? "border-[hsl(152_55%_39%/0.25)]"
                                : stage.status === "em_andamento"
                                  ? "border-gold/35"
                                  : "border-border/80"
                            } ${
                              can("stages_write") ? "cursor-pointer hover:scale-105 hover:border-gold/50" : "cursor-default"
                            }`}
                            title={can("stages_write") ? "Clique para alterar status" : undefined}
                          >
                            {stageIcon(stage.status)}
                          </button>
                          {(i < caseData.stages.length - 1 || (hasSubsteps && isExpanded)) && (
                            <div
                              className={`mt-3 w-px flex-1 ${
                                stage.status === "concluido" ? "bg-[hsl(152_55%_39%/0.22)]" : "bg-border/70"
                              }`}
                            />
                          )}
                        </div>
                        <div className={`pb-4 min-w-0 flex-1 ${stage.status === "pendente" ? "opacity-60" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <h3 className={`text-sm font-heading font-semibold tracking-[-0.02em] ${
                                  stage.status === "em_andamento"
                                    ? "text-gold"
                                    : stage.status === "pendente"
                                      ? "text-foreground/65"
                                      : "text-foreground"
                                }`}>
                                  {stage.name}
                                </h3>
                                {hasSubsteps && (
                                  <button
                                    onClick={() => toggleExpand(stage.id)}
                                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded-md hover:bg-muted"
                                  >
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    <span>
                                      {completedSubsteps}/{stage.substeps?.length} sub-etapas
                                    </span>
                                  </button>
                                )}
                              </div>
                              {stage.description && (
                                <p className="mt-1.5 max-w-3xl text-xs leading-6 text-muted-foreground">
                                  {stage.description}
                                </p>
                              )}
                            </div>
                            {can("stages_write") && (
                              <div className="flex items-center gap-1 shrink-0">
                                {stage.date && <span className="text-xs text-muted-foreground mr-1">{stage.date}</span>}
                                <div className={`flex items-center gap-0.5 opacity-0 group-hover/stage:opacity-100 transition-opacity ${
                                  canReorderStages ? "" : "opacity-30"
                                }`}>
                                  <button
                                    onClick={() => {
                                      setExpandedStages((prev) => new Set(prev).add(stage.id));
                                      openCreateStageDialog(stage.id);
                                    }}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-gold transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Adicionar sub-etapa"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStageReorder(stage, "up")}
                                    disabled={!canReorderStages || isReordering || i === 0}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Mover para cima"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStageReorder(stage, "down")}
                                    disabled={!canReorderStages || isReordering || i === caseData.stages.length - 1}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <button
                                  onClick={() => openEditStageDialog(stage)}
                                  className="rounded-full p-1 text-muted-foreground/70 transition hover:text-foreground"
                                  title="Editar etapa"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() =>
                                    setPendingDelete({
                                      kind: "stage",
                                      id: stage.id,
                                      title: "Excluir etapa",
                                      message: "Tem certeza que deseja excluir esta etapa?",
                                    })
                                  }
                                  className="rounded-full p-1 text-muted-foreground/70 transition hover:text-destructive"
                                  title="Excluir etapa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>

                          {hasSubsteps && isExpanded && (
                            <div className="ml-10 mt-4 border-l border-border/60 pl-8">
                              {hasSubsteps ? (
                                <div className="space-y-5">
                                  {stage.substeps?.map((substep, substepIndex) => (
                                    <div key={substep.id} className={`group/sub ${substep.status === "pendente" ? "opacity-70" : ""}`}>
                                      <div className="flex gap-3">
                                        <button
                                          onClick={() =>
                                            handleSubstepStatusChange(
                                              substep,
                                              substep.status === "pendente"
                                                ? "em_andamento"
                                                : substep.status === "em_andamento"
                                                  ? "concluido"
                                                  : "pendente",
                                            )
                                          }
                                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-background transition ${
                                            substep.status === "concluido"
                                              ? "border-[hsl(152_55%_39%/0.2)]"
                                              : substep.status === "em_andamento"
                                                ? "border-gold/35"
                                                : "border-border/70"
                                          } ${
                                            can("stages_write") ? "cursor-pointer hover:border-gold/50" : "cursor-default"
                                          }`}
                                          title={can("stages_write") ? "Clique para alterar status" : undefined}
                                        >
                                          {subStageIcon(substep.status)}
                                        </button>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="min-w-0 flex-1">
                                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                <h4 className={`text-sm font-medium ${
                                                  substep.status === "em_andamento"
                                                    ? "text-foreground"
                                                    : substep.status === "pendente"
                                                      ? "text-foreground/75"
                                                      : "text-foreground"
                                                }`}>
                                                  {substep.title}
                                                </h4>
                                                <span className="text-xs text-muted-foreground">
                                                  #{substep.order}
                                                </span>
                                                {substep.date && (
                                                  <span className="text-xs text-muted-foreground">
                                                    {substep.date}
                                                  </span>
                                                )}
                                              </div>
                                              {substep.description && (
                                                <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
                                                  {substep.description}
                                                </p>
                                              )}
                                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-1.5 text-[11px] text-muted-foreground">
                                                  {substep.visibleToClient ? "Visível ao cliente" : "Interno"}
                                                </span>
                                              </div>
                                            </div>
                                            {can("stages_write") && (
                                              <div className={`flex items-center gap-1 transition duration-200 ${
                                                canReorderStages ? "opacity-0 group-hover/sub:opacity-100" : "opacity-30"
                                              }`}>
                                                <button
                                                  onClick={() => openEditSubstepDialog(stage.id, substep)}
                                                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                                                  title="Editar subetapa"
                                                >
                                                  <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={() => handleSubstepReorder(stage.id, substep, "up")}
                                                  disabled={!canReorderStages || isReordering || substepIndex === 0}
                                                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                                                  title="Mover para cima"
                                                >
                                                  <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleSubstepReorder(stage.id, substep, "down")}
                                                  disabled={!canReorderStages || isReordering || substepIndex === (stage.substeps?.length ?? 0) - 1}
                                                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                                                  title="Mover para baixo"
                                                >
                                                  <ArrowDown className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    setPendingDelete({
                                                      kind: "substep",
                                                      id: substep.id,
                                                      title: "Excluir subetapa",
                                                      message: "Tem certeza que deseja excluir esta subetapa?",
                                                    })
                                                  }
                                                  className="rounded-full p-1.5 text-muted-foreground transition hover:text-destructive"
                                                  title="Excluir subetapa"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="py-2 text-sm text-muted-foreground">Sem subetapas nesta etapa.</p>
                              )}

                              {can("stages_write") && (
                                <div className="mt-5 flex justify-start">
                                  <button
                                    onClick={() => openCreateStageDialog(stage.id)}
                                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-gold transition-colors py-2 pl-1"
                                  >
                                    <Plus className="w-3 h-3" /> Adicionar sub-etapa
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {caseData.stages.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    Nenhuma etapa cadastrada ainda.
                  </div>
                )}
                {can("stages_write") && (
                  <button
                    onClick={() => openCreateStageDialog()}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-border hover:border-gold/50 text-sm text-muted-foreground hover:text-gold transition-all"
                  >
                    <Plus className="w-4 h-4" /> Nova etapa
                  </button>
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
                    <Handshake className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><dt className="text-xs text-muted-foreground">Parceiro</dt><dd className="text-foreground">{caseData.partnerName || "Sem parceiro vinculado"}</dd></div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div><dt className="text-xs text-muted-foreground">Última atualização</dt><dd className="text-foreground">{caseData.lastUpdate}</dd></div>
                  </div>
                </dl>
              </div>

              <div className="bg-card rounded-xl border p-5">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Status Atual</h3>
                <div className="space-y-3">
                  <textarea
                    value={currentStatusDraft}
                    onChange={(e) => setCurrentStatusDraft(e.target.value)}
                    placeholder="Resumo breve do momento atual do caso para o cliente."
                    className="w-full min-h-[132px] rounded-lg border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-gold/50"
                    maxLength={2000}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-muted-foreground">
                      Esse texto aparece no painel do cliente somente quando estiver preenchido.
                    </p>
                    <button
                      onClick={() => void handleSaveCurrentStatus()}
                      disabled={savingCurrentStatus}
                      className="btn-gold px-4 py-2 text-sm disabled:opacity-60"
                    >
                      {savingCurrentStatus ? "Salvando..." : "Salvar"}
                    </button>
                  </div>
                </div>
              </div>

              {caseData.pendingClient > 0 && (
                <div className="bg-gold/10 rounded-xl border border-gold/20 p-5">
                  <h3 className="text-sm font-medium text-foreground mb-1">Pendências do cliente</h3>
                  <p className="text-xs text-muted-foreground">{caseData.nextAction}</p>
                  <p className="text-lg font-bold text-gold mt-2">{caseData.pendingClient} {caseData.pendingClient === 1 ? "item" : "itens"}</p>
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
                  <label className="input-field text-sm h-[42px] flex items-center justify-between gap-2 cursor-pointer">
                    <span className="truncate text-muted-foreground">Selecionar arquivo</span>
                    <span className="px-2 py-1 text-xs rounded-md border text-muted-foreground">Escolher</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={(e) => handleSetNewDocFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  O arquivo selecionado será enviado ao adicionar o documento.
                </p>
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
                          <span>•</span>
                          <span>{doc.date}</span>
                          <span>•</span>
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
                          <span>•</span>
                          <span>{doc.date}</span>
                          <span>•</span>
                          <span className={`${doc.visibility === "cliente" ? "text-gold" : "text-muted-foreground"}`}>
                            {doc.visibility === "cliente" ? "Disponível ao cliente" : "Interno"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="status-badge status-complete">Disponível</span>
                        {doc.storageKey && (
                          <button onClick={() => handleDownloadDocument(doc)} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
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
                      {u.author && <><span>•</span><span>{u.author}</span></>}
                      {u.internal && <span className="text-destructive">(interno)</span>}
                    </div>
                  </div>
                  {can("cases_write") && (
                    <button
                      onClick={() =>
                        setPendingDelete({
                          kind: "update",
                          id: u.id,
                          title: "Excluir atualização",
                          message: "Tem certeza que deseja excluir esta atualização? Essa ação é permanente e não poderá ser desfeita.",
                        })
                      }
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      title="Excluir atualização"
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

      <Dialog open={createStageDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {stageDialogMode === "edit-substep"
                ? "Editar Sub-etapa"
                : stageDialogMode === "edit-stage"
                  ? "Editar Etapa"
                  : stageDialogMode === "create-substep"
                    ? "Nova Sub-etapa"
                    : "Nova Etapa"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {stageDialogMode === "edit-substep"
                ? "Atualize a sub-etapa selecionada."
                : stageDialogMode === "edit-stage"
                  ? "Atualize a etapa selecionada."
                  : stageDialogMode === "create-substep"
                    ? "Adicione uma sub-etapa dentro da etapa selecionada."
                    : "Adicione uma nova etapa ao processo."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {isSubstepDialog ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stage-name">Nome *</Label>
                  <Input
                    id="stage-name"
                    value={
                      stageDialogMode === "edit-substep" && editingSubstepId
                        ? (substepTitleDrafts[editingSubstepId] ?? editingSubstep?.title ?? "")
                        : (createStageParentId ? (newSubstepTitles[createStageParentId] ?? "") : "")
                    }
                    onChange={(e) => {
                      if (stageDialogMode === "edit-substep" && editingSubstepId) {
                        setSubstepTitleDrafts((prev) => ({ ...prev, [editingSubstepId]: e.target.value }));
                        return;
                      }
                      if (createStageParentId) {
                        setNewSubstepTitle(createStageParentId, e.target.value);
                      }
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void handleSubmitCreateStage()}
                    placeholder="Ex: Conferência de documentos"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-desc">Descrição</Label>
                  <textarea
                    id="stage-desc"
                    value={
                      stageDialogMode === "edit-substep" && editingSubstepId
                        ? (substepDescriptionDrafts[editingSubstepId] ?? editingSubstep?.description ?? "")
                        : (createStageParentId ? (newSubstepDescriptions[createStageParentId] ?? "") : "")
                    }
                    onChange={(e) => {
                      if (stageDialogMode === "edit-substep" && editingSubstepId) {
                        setSubstepDescriptionDrafts((prev) => ({ ...prev, [editingSubstepId]: e.target.value }));
                        return;
                      }
                      if (createStageParentId) {
                        setNewSubstepDescription(createStageParentId, e.target.value);
                      }
                    }}
                    placeholder="Descreva brevemente esta subetapa..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="stage-visible" className="text-sm">Visível ao cliente</Label>
                    <p className="text-[11px] text-muted-foreground">Aparecerá no portal do cliente</p>
                  </div>
                  <Switch
                    id="stage-visible"
                    checked={
                      stageDialogMode === "edit-substep" && editingSubstepId
                        ? (substepVisibilityDrafts[editingSubstepId] ?? editingSubstep?.visibleToClient ?? false)
                        : (createStageParentId ? (newSubstepVisibleToClient[createStageParentId] ?? false) : false)
                    }
                    onCheckedChange={(checked) => {
                      if (stageDialogMode === "edit-substep" && editingSubstepId) {
                        setSubstepVisibilityDrafts((prev) => ({ ...prev, [editingSubstepId]: checked }));
                        return;
                      }
                      if (createStageParentId) {
                        setNewSubstepVisibility(createStageParentId, checked);
                      }
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="stage-name">Nome *</Label>
                  <Input
                    id="stage-name"
                    value={stageDialogMode === "edit-stage" && editingStageId ? (stageNameDrafts[editingStageId] ?? editingStage?.name ?? "") : newStageName}
                    onChange={(e) => {
                      if (stageDialogMode === "edit-stage" && editingStageId) {
                        setStageNameDrafts((prev) => ({ ...prev, [editingStageId]: e.target.value }));
                        return;
                      }
                      setNewStageName(e.target.value);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void handleSubmitCreateStage()}
                    placeholder="Ex: Registro na Junta Comercial"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-desc">Descrição</Label>
                  <textarea
                    id="stage-desc"
                    value={
                      stageDialogMode === "edit-stage" && editingStageId
                        ? (stageDescriptionDrafts[editingStageId] ?? editingStage?.description ?? "")
                        : newStageDescription
                    }
                    onChange={(e) => {
                      if (stageDialogMode === "edit-stage" && editingStageId) {
                        setStageDescriptionDrafts((prev) => ({ ...prev, [editingStageId]: e.target.value }));
                        return;
                      }
                      setNewStageDescription(e.target.value);
                    }}
                    placeholder="Descreva brevemente esta etapa..."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
                    rows={2}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => handleCreateDialogOpenChange(false)}
              className="px-4 py-2 text-sm border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleSubmitCreateStage()}
              disabled={
                isSubstepDialog
                  ? (stageDialogMode === "edit-substep"
                    ? !(editingSubstepId ? (substepTitleDrafts[editingSubstepId] ?? "").trim() : "")
                    : !(createStageParentId ? (newSubstepTitles[createStageParentId] ?? "").trim() : ""))
                  : (stageDialogMode === "edit-stage"
                    ? !(editingStageId ? (stageNameDrafts[editingStageId] ?? "").trim() : "")
                    : !newStageName.trim())
              }
              className="btn-gold px-4 py-2 text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isEditingDialog && <Plus className="w-4 h-4" />}
              {isEditingDialog ? "Salvar" : `Criar ${isSubstepDialog ? "sub-etapa" : "etapa"}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDelete?.title ?? "Confirmar exclusão"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.message ?? "Tem certeza que deseja excluir este registro?"}
              <br />
              Essa ação é permanente e não poderá ser desfeita.
              <br />
              Dependendo do item, dados relacionados também poderão ser removidos.
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
