import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CaseDocument, CaseStage, CaseStageSubstep, CaseTask, CaseUpdate, CaseWithComputed, User } from "@/types";
import {
  activateCasePortalLinkRequest,
  createCaseStageRequest,
  createStageSubstepRequest,
  createCaseTaskRequest,
  createCaseDocumentRequest,
  createCaseUpdateRequest,
  deleteCaseDocumentRequest,
  deleteCaseStageRequest,
  deleteStageSubstepRequest,
  deleteCaseTaskRequest,
  deleteCaseUpdateRequest,
  getCaseDetailRequest,
  getCaseSummaryRequest,
  getCaseDocumentDownloadUrlRequest,
  getCasePortalLinkStatusRequest,
  listStageSubstepsRequest,
  listCaseDocumentsRequest,
  listCaseStagesRequest,
  listCaseTasksRequest,
  listCaseUpdatesRequest,
  markCaseDocumentReceivedRequest,
  revokeCasePortalLinkRequest,
  updateStageSubstepRequest,
  updateCaseStageRequest,
  updateCaseTaskRequest,
  type CaseMemberResponse,
  type CaseSummaryPayload,
  type PortalLinkState,
  type StageDto,
  type StageSubstepDto,
  type StaffDocument,
  type StaffUpdate,
  type TaskDto,
} from "@/services/backend";

type PermissionChecker = (permission: string) => boolean;

type UseCaseDetailParams = {
  caseId?: string;
  user: User | null;
  can: PermissionChecker;
};

type UiPortalLink = {
  id: string;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  active: boolean;
  expiresAt: string;
  revokedAt?: string;
  lastAccessAt?: string;
  url?: string;
  createdAt: string;
};

const CASE_DETAIL_QUERY_STALE_TIME = 30 * 1000;

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (!navigator?.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function progressFromStatus(status: CaseWithComputed["status"]): number {
  if (status === "concluido") return 100;
  if (status === "aguardando_cliente") return 60;
  if (status === "risco") return 40;
  return 0;
}

function progressFromStages(stages: CaseStage[]): number | null {
  const totalUnits = stages.reduce((count, stage) => count + (stage.substeps?.length ? stage.substeps.length : 1), 0);
  if (totalUnits === 0) return null;

  const completedUnits = stages.reduce((count, stage) => {
    if (stage.substeps?.length) {
      return count + stage.substeps.filter((substep) => substep.status === "concluido").length;
    }
    return count + (stage.status === "concluido" ? 1 : 0);
  }, 0);

  return Math.round((completedUnits / totalUnits) * 100);
}

function mapUpdates(items: StaffUpdate[]): CaseUpdate[] {
  return items.map((item) => ({
    id: item.id,
    caseId: "",
    date: formatDate(item.createdAt),
    text: item.content,
    author: item.author,
    internal: item.internal,
  }));
}

function mapDocuments(items: StaffDocument[], caseId: string): CaseDocument[] {
  return items.map((item) => ({
    id: item.id,
    caseId,
    name: item.name,
    type: item.type,
    date: formatDate(item.date),
    visibility: item.visibility,
    status: item.status,
    storageKey: item.storageKey,
    sizeBytes: item.sizeBytes,
  }));
}

function mapStages(items: StageDto[]): CaseStage[] {
  return items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      caseId: item.caseId,
      name: item.title,
      status: item.status === "DONE" ? "concluido" : item.status === "ACTIVE" ? "em_andamento" : "pendente",
      date: item.status === "PENDING" ? undefined : formatDate(item.updatedAt),
      description: item.description || "",
      visibleToClient: true,
      order: item.position,
      substeps: [],
    }));
}

function mapSubsteps(items: StageSubstepDto[]): CaseStageSubstep[] {
  return items
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      stageId: item.stageId,
      title: item.title,
      description: item.description || "",
      date: item.status === "PENDING" ? undefined : formatDate(item.updatedAt),
      order: item.position,
      status: item.status === "DONE" ? "concluido" : item.status === "IN_PROGRESS" ? "em_andamento" : "pendente",
      visibleToClient: item.visibleToClient,
    }));
}

function toBackendSubstepStatus(status: CaseStageSubstep["status"]): "PENDING" | "IN_PROGRESS" | "DONE" {
  if (status === "concluido") return "DONE";
  if (status === "em_andamento") return "IN_PROGRESS";
  return "PENDING";
}

function mapTasks(items: TaskDto[]): CaseTask[] {
  return items.map((item) => ({
    id: item.id,
    caseId: item.caseId,
    label: item.title,
    done: item.status === "DONE",
    responsible: item.assignedToName || item.createdByName,
    createdAt: item.createdAt,
  }));
}

function mapPortal(state: PortalLinkState | null): UiPortalLink[] {
  if (!state || !state.id || !state.status || !state.expiresAt) return [];
  return [
    {
      id: state.id,
      status: state.status,
      active: state.status === "ACTIVE",
      expiresAt: state.expiresAt,
      revokedAt: state.revokedAt ?? undefined,
      lastAccessAt: state.lastAccessAt ?? undefined,
      url: state.url ?? undefined,
      createdAt: state.expiresAt,
    },
  ];
}

function buildComputedCase(
  summary: CaseSummaryPayload,
  previous: CaseWithComputed | null,
  overrides: {
    stages?: CaseStage[];
    documents?: CaseDocument[];
    updates?: CaseUpdate[];
    checklist?: CaseTask[];
    portalState?: PortalLinkState | null;
  } = {},
): CaseWithComputed {
  const stages = overrides.stages ?? previous?.stages ?? [];
  const documents = overrides.documents ?? previous?.documents ?? [];
  const updates = overrides.updates ?? previous?.updates ?? [];
  const checklist = overrides.checklist ?? previous?.checklist ?? [];
  const computedProgress = progressFromStages(stages);
  const pendingClient = documents.filter((item) => item.visibility === "cliente" && item.status === "pendente").length;
  const currentStage = Math.max(
    stages.findIndex((stage) => stage.status === "em_andamento"),
    0,
  );
  const portalState = overrides.portalState;

  return {
    ...summary.caseData,
    clientName: summary.clientName,
    clientType: previous?.clientType ?? "Pessoa Física",
    responsible: previous?.responsible ?? summary.caseData.responsible,
    team: previous?.team ?? summary.caseData.team,
    progress: computedProgress ?? progressFromStatus(summary.caseData.status),
    pendingClient,
    portalActive: portalState ? portalState.status === "ACTIVE" : (previous?.portalActive ?? false),
    portalExpiry: portalState?.expiresAt
      ? formatDate(portalState.expiresAt)
      : (portalState ? undefined : previous?.portalExpiry),
    lastUpdate: updates[0]?.date ?? formatDate(summary.caseData.updatedAt),
    currentStage,
    stages,
    documents,
    updates,
    checklist,
  };
}

export function useCaseDetail({ caseId, user, can }: UseCaseDetailParams) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("andamento");
  const [loading, setLoading] = useState(true);
  const [newStageName, setNewStageName] = useState("");
  const [newStageDescription, setNewStageDescription] = useState("");
  const [newSubstepTitles, setNewSubstepTitles] = useState<Record<string, string>>({});
  const [newSubstepDescriptions, setNewSubstepDescriptions] = useState<Record<string, string>>({});
  const [newSubstepVisibleToClient, setNewSubstepVisibleToClient] = useState<Record<string, boolean>>({});
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newUpdateText, setNewUpdateText] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocVisibility, setNewDocVisibility] = useState<CaseDocument["visibility"]>("interno");
  const [newDocStatus, setNewDocStatus] = useState<CaseDocument["status"]>("disponivel");
  const [newDocFile, setNewDocFile] = useState<File | null>(null);
  const [caseData, setCaseData] = useState<CaseWithComputed | null>(null);
  const [caseMembers, setCaseMembers] = useState<CaseMemberResponse[]>([]);
  const [stageSubsteps, setStageSubsteps] = useState<Record<string, CaseStageSubstep[]>>({});
  const [portalState, setPortalState] = useState<PortalLinkState | null>(null);
  const [generatedPortalUrl, setGeneratedPortalUrl] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  const loadCaseSummary = useCallback(async () => {
    if (!caseId) return null;

    return queryClient.fetchQuery({
      queryKey: ["case-summary", caseId],
      queryFn: () => getCaseSummaryRequest(caseId),
      staleTime: CASE_DETAIL_QUERY_STALE_TIME,
    });
  }, [caseId, queryClient]);

  const loadStagesBlock = useCallback(async () => {
    if (!caseId) return { stagesWithSubsteps: [] as CaseStage[], substepsByStage: {} as Record<string, CaseStageSubstep[]> };

    const stages = await queryClient.fetchQuery({
      queryKey: ["case-stages", caseId],
      queryFn: () => listCaseStagesRequest(caseId),
      staleTime: CASE_DETAIL_QUERY_STALE_TIME,
    });
    const mappedStages = mapStages(stages);
    const substepsByStageEntries = await Promise.all(
      mappedStages.map(async (stage) => {
        try {
          const substeps = await queryClient.fetchQuery({
            queryKey: ["stage-substeps", stage.id],
            queryFn: () => listStageSubstepsRequest(stage.id),
            staleTime: CASE_DETAIL_QUERY_STALE_TIME,
          });
          return [stage.id, mapSubsteps(substeps)] as const;
        } catch {
          return [stage.id, []] as const;
        }
      }),
    );
    const substepsByStage = Object.fromEntries(substepsByStageEntries);

    return {
      stagesWithSubsteps: mappedStages.map((stage) => ({
        ...stage,
        substeps: substepsByStage[stage.id] ?? [],
      })),
      substepsByStage,
    };
  }, [caseId, queryClient]);

  const loadTasksBlock = useCallback(async () => {
    if (!caseId) return [] as CaseTask[];

    const tasks = await queryClient.fetchQuery({
      queryKey: ["case-tasks", caseId],
      queryFn: () => listCaseTasksRequest(caseId),
      staleTime: CASE_DETAIL_QUERY_STALE_TIME,
    });

    return mapTasks(tasks);
  }, [caseId, queryClient]);

  const loadUpdatesBlock = useCallback(async (resolvedCaseId?: string) => {
    if (!caseId) return [] as CaseUpdate[];

    const updates = await queryClient.fetchQuery({
      queryKey: ["case-updates", caseId],
      queryFn: () => listCaseUpdatesRequest(caseId),
      staleTime: CASE_DETAIL_QUERY_STALE_TIME,
    });

    return mapUpdates(updates).map((item) => ({ ...item, caseId: resolvedCaseId ?? caseId }));
  }, [caseId, queryClient]);

  const loadDocumentsBlock = useCallback(async (resolvedCaseId?: string) => {
    if (!caseId) return [] as CaseDocument[];

    const documents = await queryClient.fetchQuery({
      queryKey: ["case-documents", caseId],
      queryFn: () => listCaseDocumentsRequest(caseId),
      staleTime: CASE_DETAIL_QUERY_STALE_TIME,
    });

    return mapDocuments(documents, resolvedCaseId ?? caseId);
  }, [caseId, queryClient]);

  const refreshStagesBlock = useCallback(async () => {
    if (!caseId) return;

    const previousStageIds = caseData?.stages.map((stage) => stage.id) ?? [];
    await queryClient.invalidateQueries({ queryKey: ["case-summary", caseId] });
    await queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] });
    await queryClient.invalidateQueries({ queryKey: ["case-stages", caseId] });
    await Promise.all(
      previousStageIds.map((stageId) => queryClient.invalidateQueries({ queryKey: ["stage-substeps", stageId] })),
    );

    const [summary, { stagesWithSubsteps, substepsByStage }] = await Promise.all([
      loadCaseSummary(),
      loadStagesBlock(),
    ]);
    if (!summary) return;

    setStageSubsteps(substepsByStage);
    setCaseData((prev) => buildComputedCase(summary, prev, { stages: stagesWithSubsteps }));
  }, [caseData?.stages, caseId, loadCaseSummary, loadStagesBlock, queryClient]);

  const refreshTasksBlock = useCallback(async () => {
    if (!caseId) return;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["case-summary", caseId] }),
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] }),
      queryClient.invalidateQueries({ queryKey: ["case-tasks", caseId] }),
    ]);

    const [summary, checklist] = await Promise.all([loadCaseSummary(), loadTasksBlock()]);
    if (!summary) return;

    setCaseData((prev) => buildComputedCase(summary, prev, { checklist }));
  }, [caseId, loadCaseSummary, loadTasksBlock, queryClient]);

  const refreshUpdatesBlock = useCallback(async () => {
    if (!caseId) return;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["case-summary", caseId] }),
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] }),
      queryClient.invalidateQueries({ queryKey: ["case-updates", caseId] }),
    ]);

    const summary = await loadCaseSummary();
    if (!summary) return;
    const updates = await loadUpdatesBlock(summary.caseData.id);

    setCaseData((prev) => buildComputedCase(summary, prev, { updates }));
  }, [caseId, loadCaseSummary, loadUpdatesBlock, queryClient]);

  const refreshDocumentsBlock = useCallback(async () => {
    if (!caseId) return;

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["case-summary", caseId] }),
      queryClient.invalidateQueries({ queryKey: ["case-detail", caseId] }),
      queryClient.invalidateQueries({ queryKey: ["case-documents", caseId] }),
    ]);

    const summary = await loadCaseSummary();
    if (!summary) return;
    const documents = await loadDocumentsBlock(summary.caseData.id);

    setCaseData((prev) => buildComputedCase(summary, prev, { documents }));
  }, [caseId, loadCaseSummary, loadDocumentsBlock, queryClient]);

  useEffect(() => {
    if (!caseId || !user) {
      setCaseData(null);
      setCaseMembers([]);
      setPortalState(null);
      setLoading(false);
      return;
    }

    setPortalState(null);
    setLoading(true);
    Promise.all([
      queryClient.fetchQuery({
        queryKey: ["case-detail", caseId],
        queryFn: () => getCaseDetailRequest(caseId),
        staleTime: CASE_DETAIL_QUERY_STALE_TIME,
      }),
      loadStagesBlock(),
      loadTasksBlock(),
    ])
      .then(async ([detail, { stagesWithSubsteps, substepsByStage }, mappedTasks]) => {
        const [mappedUpdates, mappedDocuments] = await Promise.all([
          loadUpdatesBlock(detail.caseData.id),
          loadDocumentsBlock(detail.caseData.id),
        ]);

        setCaseData(buildComputedCase(detail, null, {
          stages: stagesWithSubsteps,
          updates: mappedUpdates,
          documents: mappedDocuments,
          checklist: mappedTasks,
        }));
        setCaseMembers(detail.members);
        setStageSubsteps(substepsByStage);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar detalhes do caso.");
        setCaseData(null);
        setCaseMembers([]);
      })
      .finally(() => setLoading(false));
  }, [caseId, loadDocumentsBlock, loadStagesBlock, loadTasksBlock, loadUpdatesBlock, queryClient, user]);

  useEffect(() => {
    if (!caseId || !user || activeTab !== "portal") return;

    queryClient.fetchQuery({
      queryKey: ["case-portal-link", caseId],
      queryFn: () => getCasePortalLinkStatusRequest(caseId),
      staleTime: CASE_DETAIL_QUERY_STALE_TIME,
    })
      .then((portal) => {
        setPortalState(portal);
      })
      .catch(() => {
        setPortalState(null);
      });
  }, [activeTab, caseId, queryClient, user]);

  useEffect(() => {
    setCaseData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        portalActive: portalState?.status === "ACTIVE",
        portalExpiry: portalState?.expiresAt ? formatDate(portalState.expiresAt) : undefined,
      };
    });
  }, [portalState]);

  const portalLinks = useMemo(() => mapPortal(portalState), [portalState]);
  const activeLink = useMemo(() => portalLinks.find((l) => l.active), [portalLinks]);
  const canReorderStages = useMemo(() => {
    if (!user || !can("stages_write")) return false;
    if (user.role === "administrador") return true;
    const currentMember = caseMembers.find((member) => member.userId === user.id);
    return currentMember?.permission === "OWNER" || currentMember?.permission === "EDITOR";
  }, [can, caseMembers, user]);

  const handleStageClick = useCallback(
    async (stage: CaseStage) => {
      if (!can("stages_write")) return;
      const nextStatus = stage.status === "pendente" ? "ACTIVE" : stage.status === "em_andamento" ? "DONE" : "PENDING";
      try {
        await updateCaseStageRequest(stage.id, {
          title: stage.name,
          description: stage.description,
          position: stage.order,
          status: nextStatus,
        });
        toast.success("Etapa atualizada");
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao atualizar etapa.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleAddStage = useCallback(async () => {
    if (!caseId || !can("stages_write") || !newStageName.trim()) return;
    try {
      await createCaseStageRequest(caseId, {
        title: newStageName.trim(),
        description: newStageDescription.trim() || undefined,
        position: caseData?.stages.length ?? 0,
        status: (caseData?.stages.length ?? 0) === 0 ? "ACTIVE" : "PENDING",
      });
      setNewStageName("");
      setNewStageDescription("");
      toast.success("Etapa adicionada");
      await refreshStagesBlock();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar etapa.");
    }
  }, [can, caseData?.stages.length, caseId, newStageDescription, newStageName, refreshStagesBlock]);

  const setNewSubstepTitle = useCallback((stageId: string, value: string) => {
    setNewSubstepTitles((prev) => ({ ...prev, [stageId]: value }));
  }, []);

  const setNewSubstepDescription = useCallback((stageId: string, value: string) => {
    setNewSubstepDescriptions((prev) => ({ ...prev, [stageId]: value }));
  }, []);

  const setNewSubstepVisibility = useCallback((stageId: string, value: boolean) => {
    setNewSubstepVisibleToClient((prev) => ({ ...prev, [stageId]: value }));
  }, []);

  const handleAddSubstep = useCallback(
    async (stageId: string) => {
      if (!can("stages_write")) return;
      const title = (newSubstepTitles[stageId] ?? "").trim();
      const description = (newSubstepDescriptions[stageId] ?? "").trim();
      if (!title) return;
      const nextPosition = (stageSubsteps[stageId]?.length ?? 0) + 1;
      try {
        await createStageSubstepRequest(stageId, {
          title,
          description: description || undefined,
          position: nextPosition,
          status: "PENDING",
          visibleToClient: newSubstepVisibleToClient[stageId] ?? false,
        });
        setNewSubstepTitles((prev) => ({ ...prev, [stageId]: "" }));
        setNewSubstepDescriptions((prev) => ({ ...prev, [stageId]: "" }));
        setNewSubstepVisibleToClient((prev) => ({ ...prev, [stageId]: false }));
        toast.success("Subprocesso adicionado");
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao criar subprocesso.");
      }
    },
    [can, newSubstepDescriptions, newSubstepTitles, newSubstepVisibleToClient, refreshStagesBlock, stageSubsteps],
  );

  const handleSubstepStatusChange = useCallback(
    async (substep: CaseStageSubstep, status: CaseStageSubstep["status"]) => {
      if (!can("stages_write")) return;
      try {
        await updateStageSubstepRequest(substep.id, {
          title: substep.title,
          description: substep.description || undefined,
          position: substep.order,
          status: toBackendSubstepStatus(status),
          visibleToClient: substep.visibleToClient,
        });
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao atualizar subprocesso.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleStageReorder = useCallback(
    async (stage: CaseStage, direction: "up" | "down") => {
      if (!canReorderStages || !caseData || isReordering) return;
      const stages = caseData.stages.slice().sort((a, b) => a.order - b.order);
      const currentIndex = stages.findIndex((item) => item.id === stage.id);
      if (currentIndex < 0) return;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= stages.length) return;

      const swapStage = stages[targetIndex];

      try {
        setIsReordering(true);
        await updateCaseStageRequest(swapStage.id, {
          title: swapStage.name,
          description: swapStage.description,
          position: stage.order,
          status: swapStage.status === "concluido" ? "DONE" : swapStage.status === "em_andamento" ? "ACTIVE" : "PENDING",
        });
        await updateCaseStageRequest(stage.id, {
          title: stage.name,
          description: stage.description,
          position: swapStage.order,
          status: stage.status === "concluido" ? "DONE" : stage.status === "em_andamento" ? "ACTIVE" : "PENDING",
        });
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao reordenar etapa.");
      } finally {
        setIsReordering(false);
      }
    },
    [canReorderStages, caseData, isReordering, refreshStagesBlock],
  );

  const handleStageUpdate = useCallback(
    async (stage: CaseStage, payload: { name: string; description: string }) => {
      if (!can("stages_write")) return;
      await updateCaseStageRequest(stage.id, {
        title: payload.name.trim(),
        description: payload.description.trim() || undefined,
        position: stage.order,
        status: stage.status === "concluido" ? "DONE" : stage.status === "em_andamento" ? "ACTIVE" : "PENDING",
      });
      await refreshStagesBlock();
    },
    [can, refreshStagesBlock],
  );

  const handleSubstepOrderChange = useCallback(
    async (substep: CaseStageSubstep, order: number) => {
      if (!can("stages_write")) return;
      if (!Number.isFinite(order) || order < 1) return;
      try {
        await updateStageSubstepRequest(substep.id, {
          title: substep.title,
          description: substep.description || undefined,
          position: Math.floor(order),
          status: toBackendSubstepStatus(substep.status),
          visibleToClient: substep.visibleToClient,
        });
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao reordenar subprocesso.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleSubstepReorder = useCallback(
    async (stageId: string, substep: CaseStageSubstep, direction: "up" | "down") => {
      if (!canReorderStages || !caseData || isReordering) return;
      const stage = caseData.stages.find((item) => item.id === stageId);
      if (!stage?.substeps?.length) return;

      const substeps = stage.substeps.slice().sort((a, b) => a.order - b.order);
      const currentIndex = substeps.findIndex((item) => item.id === substep.id);
      if (currentIndex < 0) return;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= substeps.length) return;

      const swapSubstep = substeps[targetIndex];

      try {
        setIsReordering(true);
        await updateStageSubstepRequest(substep.id, {
          title: substep.title,
          description: substep.description || undefined,
          position: swapSubstep.order,
          status: toBackendSubstepStatus(substep.status),
          visibleToClient: substep.visibleToClient,
        });
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao reordenar subprocesso.");
      } finally {
        setIsReordering(false);
      }
    },
    [canReorderStages, caseData, isReordering, refreshStagesBlock],
  );

  const handleSubstepVisibilityChange = useCallback(
    async (substep: CaseStageSubstep, visibleToClient: boolean) => {
      if (!can("stages_write")) return;
      try {
        await updateStageSubstepRequest(substep.id, {
          title: substep.title,
          description: substep.description || undefined,
          position: substep.order,
          status: toBackendSubstepStatus(substep.status),
          visibleToClient,
        });
        toast.success("Visibilidade do subprocesso atualizada");
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao atualizar visibilidade do subprocesso.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleSubstepDescriptionChange = useCallback(
    async (substep: CaseStageSubstep, description: string) => {
      if (!can("stages_write")) return;
      try {
        await updateStageSubstepRequest(substep.id, {
          title: substep.title,
          description: description.trim() || undefined,
          position: substep.order,
          status: toBackendSubstepStatus(substep.status),
          visibleToClient: substep.visibleToClient,
        });
        toast.success("Descrição da subetapa atualizada");
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao atualizar descrição da subetapa.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleSubstepUpdate = useCallback(
    async (substep: CaseStageSubstep, payload: { title: string; description: string; visibleToClient: boolean }) => {
      if (!can("stages_write")) return;
      await updateStageSubstepRequest(substep.id, {
        title: payload.title.trim(),
        description: payload.description.trim() || undefined,
        position: substep.order,
        status: toBackendSubstepStatus(substep.status),
        visibleToClient: payload.visibleToClient,
      });
      await refreshStagesBlock();
    },
    [can, refreshStagesBlock],
  );

  const handleDeleteSubstep = useCallback(
    async (substepId: string) => {
      if (!can("stages_write")) return;
      try {
        await deleteStageSubstepRequest(substepId);
        toast.success("Subprocesso excluido");
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao excluir subprocesso.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleToggleTask = useCallback(
    async (taskId: string) => {
      if (!can("tasks_write") || !caseData) return;
      const task = caseData.checklist.find((item) => item.id === taskId);
      if (!task) return;
      try {
        await updateCaseTaskRequest(taskId, {
          title: task.label,
          status: task.done ? "TODO" : "DONE",
          description: undefined,
          dueDate: undefined,
          stageId: undefined,
          assignedTo: undefined,
        });
        await refreshTasksBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao atualizar tarefa.");
      }
    },
    [can, caseData, refreshTasksBlock],
  );

  const handleAddTask = useCallback(async () => {
    if (!caseId || !can("tasks_write") || !newTaskLabel.trim()) return;
    try {
      await createCaseTaskRequest(caseId, {
        title: newTaskLabel.trim(),
        status: "TODO",
      });
      setNewTaskLabel("");
      toast.success("Tarefa adicionada");
      await refreshTasksBlock();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar tarefa.");
    }
  }, [can, caseId, newTaskLabel, refreshTasksBlock]);

  const handleAddUpdate = useCallback(async () => {
    if (!caseId || !user || !can("cases_write") || !newUpdateText.trim()) return;
    try {
      await createCaseUpdateRequest(caseId, newUpdateText.trim(), false);
      setNewUpdateText("");
      toast.success("Atividade registrada");
      await refreshUpdatesBlock();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao registrar atividade.");
    }
  }, [can, caseId, newUpdateText, refreshUpdatesBlock, user]);

  const handleSetNewDocFile = useCallback(
    (file: File | null) => {
      setNewDocFile(file);
      if (file && !newDocName.trim()) {
        setNewDocName(file.name);
      }
    },
    [newDocName],
  );

  const handleAddDocument = useCallback(async () => {
    if (!caseId || !user || !can("docs_write")) return;
    if (!newDocName.trim()) {
      toast.error("Informe o nome do documento.");
      return;
    }
    if (newDocStatus === "disponivel" && !newDocFile) {
      toast.error("Selecione um arquivo para upload.");
      return;
    }

    try {
      await createCaseDocumentRequest(caseId, {
        file: newDocFile ?? undefined,
        name: newDocName.trim(),
        visibility: newDocVisibility,
        status: newDocStatus,
      });
      setNewDocName("");
      setNewDocVisibility("interno");
      setNewDocStatus("disponivel");
      setNewDocFile(null);
      toast.success("Documento enviado");
      await refreshDocumentsBlock();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar documento.");
    }
  }, [can, caseId, newDocFile, newDocStatus, newDocVisibility, refreshDocumentsBlock, user]);

  const handleResolvePendingDocument = useCallback(
    async (docId: string) => {
      if (!caseId || !can("docs_write")) return;
      try {
        await markCaseDocumentReceivedRequest(caseId, docId);
        toast.success("Documento marcado como recebido.");
        await refreshDocumentsBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao marcar documento como recebido.");
      }
    },
    [can, caseId, refreshDocumentsBlock],
  );

  const handleDeleteStage = useCallback(
    async (stageId: string) => {
      if (!can("stages_write")) return;
      try {
        await deleteCaseStageRequest(stageId);
        toast.success("Etapa excluida");
        await refreshStagesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao excluir etapa.");
      }
    },
    [can, refreshStagesBlock],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!can("tasks_write")) return;
      try {
        await deleteCaseTaskRequest(taskId);
        toast.success("Tarefa excluida");
        await refreshTasksBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao excluir tarefa.");
      }
    },
    [can, refreshTasksBlock],
  );

  const handleDeleteUpdate = useCallback(
    async (updateId: string) => {
      if (!caseId || !can("cases_write")) return;
      try {
        await deleteCaseUpdateRequest(caseId, updateId);
        toast.success("Atualização excluída");
        await refreshUpdatesBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao excluir atualização.");
      }
    },
    [can, caseId, refreshUpdatesBlock],
  );

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      if (!caseId || !can("docs_write")) return;
      try {
        const result = await deleteCaseDocumentRequest(caseId, documentId);
        toast.success(result.message);
        await refreshDocumentsBlock();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao excluir documento.");
      }
    },
    [can, caseId, refreshDocumentsBlock],
  );

  const handleDownloadDocument = useCallback(
    async (doc: CaseDocument) => {
      if (!caseId) return;
      if (doc.status === "pendente") {
        toast.error("Documento pendente ainda não possui arquivo para download.");
        return;
      }
      try {
        const resolveUrl = await getCaseDocumentDownloadUrlRequest(caseId, doc.id);
        const resolveResponse = await fetch(resolveUrl);
        if (!resolveResponse.ok) {
          throw new Error("Falha ao resolver URL de download.");
        }
        const resolved = (await resolveResponse.json()) as { downloadUrl?: string };
        if (!resolved.downloadUrl) {
          throw new Error("URL de download não retornada.");
        }
        window.open(resolved.downloadUrl, "_blank", "noopener,noreferrer");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao baixar documento.");
      }
    },
    [caseId],
  );

  const handleGenerateLink = useCallback(async () => {
    if (!caseId || !user || !can("portal_manage")) return;
    try {
      const link = await activateCasePortalLinkRequest(caseId, 10080);
      queryClient.setQueryData(["case-portal-link", caseId], link);
      setPortalState(link);
      const url = link.url || generatedPortalUrl;
      if (url) {
        setGeneratedPortalUrl(url);
        const copied = await copyToClipboard(url);
        if (copied) {
          toast.success("Link gerado e copiado!");
        } else {
          toast.success("Link gerado.");
          window.prompt("Copie o link do portal:", url);
        }
      } else {
        toast.success("Link gerado.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar link.");
    }
  }, [can, caseId, generatedPortalUrl, queryClient, user]);

  const handleRevokeLink = useCallback(async () => {
    if (!caseId || !user || !can("portal_manage")) return;
    try {
      const link = await revokeCasePortalLinkRequest(caseId);
      queryClient.setQueryData(["case-portal-link", caseId], link);
      setPortalState(link);
      toast.success("Link revogado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao revogar link.");
    }
  }, [can, caseId, queryClient, user]);

  const handleCopyLink = useCallback(async () => {
    const url = activeLink?.url || generatedPortalUrl;
    if (!url) {
      toast.error("URL do link não está disponível. Gere um novo link.");
      return;
    }
    const copied = await copyToClipboard(url);
    if (copied) {
      toast.success("Link copiado!");
    } else {
      toast.success("Link disponível para copiar.");
      window.prompt("Copie o link do portal:", url);
    }
  }, [activeLink?.url, generatedPortalUrl]);

  const handleOpenLink = useCallback(() => {
    const url = activeLink?.url || generatedPortalUrl;
    if (!url) {
      toast.error("URL do link não está disponível. Gere um novo link.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, [activeLink?.url, generatedPortalUrl]);

  return {
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
    handleSubstepOrderChange,
    handleSubstepReorder,
    handleSubstepDescriptionChange,
    handleSubstepUpdate,
    handleSubstepVisibilityChange,
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
  };
}
