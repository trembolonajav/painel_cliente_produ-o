import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CaseWithComputed, User } from "@/types";
import {
  createCaseRequest,
  getCasePortalLinkStatusRequest,
  listCaseDocumentsRequest,
  listCaseMembersRequest,
  listCaseStagesRequest,
  listStageSubstepsRequest,
  listCasesRequest,
  listClientsRequest,
  listPartnersRequest,
  listUsersRequest,
  updateCaseRequest,
} from "@/services/backend";

type UseDashboardCasesParams = {
  officeInitials?: string;
  user: User | null;
};

const progressForStatus = (status: CaseWithComputed["status"]): number => {
  if (status === "concluido") return 100;
  if (status === "aguardando_cliente") return 60;
  if (status === "risco") return 40;
  return 0;
};

const progressFromStages = (
  stages: Array<{ status: "PENDING" | "ACTIVE" | "DONE"; substeps?: Array<{ status: "PENDING" | "IN_PROGRESS" | "DONE" }> }>,
  fallbackStatus: CaseWithComputed["status"],
): number => {
  const totalUnits = stages.reduce((count, stage) => count + (stage.substeps?.length ? stage.substeps.length : 1), 0);
  if (totalUnits === 0) return progressForStatus(fallbackStatus);

  const completedUnits = stages.reduce((count, stage) => {
    if (stage.substeps?.length) {
      return count + stage.substeps.filter((substep) => substep.status === "DONE").length;
    }
    return count + (stage.status === "DONE" ? 1 : 0);
  }, 0);

  return Math.round((completedUnits / totalUnits) * 100);
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

export function useDashboardCases({ user }: UseDashboardCasesParams) {
  const [filter, setFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCaseId, setEditingCaseId] = useState<string | null>(null);
  const [editingCaseStatus, setEditingCaseStatus] = useState<CaseWithComputed["status"] | null>(null);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseClientId, setNewCaseClientId] = useState("");
  const [newCasePartnerId, setNewCasePartnerId] = useState("");
  const [newCasePriority, setNewCasePriority] = useState<CaseWithComputed["priority"]>("media");
  const [newCaseResponsible, setNewCaseResponsible] = useState("");
  const [allCases, setAllCases] = useState<CaseWithComputed[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<User[]>([]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([listCasesRequest(), listClientsRequest(), listPartnersRequest(), listUsersRequest()])
      .then(async (results) => {
        const casesResult = results[0];
        const clientsResult = results[1];
        const partnersResult = results[2];
        const usersResult = results[3];

        if (casesResult.status !== "fulfilled" || clientsResult.status !== "fulfilled") {
          throw new Error("Falha ao carregar dados principais.");
        }

        const casesData = casesResult.value;
        const clientsData = clientsResult.value;
        const partnersData = partnersResult.status === "fulfilled" ? partnersResult.value : [];
        const usersData = usersResult.status === "fulfilled" ? usersResult.value : [];
        const clientsMap = new Map(clientsData.map((client) => [client.id, client.name]));
        const metadataResults = await Promise.all(
          casesData.map(async (item) => {
            const [membersResult, stagesResult, docsResult, portalResult] = await Promise.allSettled([
              listCaseMembersRequest(item.id),
              listCaseStagesRequest(item.id),
              listCaseDocumentsRequest(item.id),
              getCasePortalLinkStatusRequest(item.id),
            ]);

            const members = membersResult.status === "fulfilled" ? membersResult.value : [];
            const stages = stagesResult.status === "fulfilled" ? stagesResult.value : [];
            const documents = docsResult.status === "fulfilled" ? docsResult.value : [];
            const portal = portalResult.status === "fulfilled" ? portalResult.value : null;

            const owner = members.find((member) => member.permission === "OWNER");
            const responsible = owner?.userName ?? "Não definido";
            const team = members
              .filter((member) => member.permission !== "OWNER")
              .map((member) => member.userName);
            const pendingClient = documents.filter((doc) => doc.visibility === "cliente" && doc.status === "pendente").length;
            const stagesWithSubsteps = await Promise.all(
              stages.map(async (stage) => ({
                ...stage,
                substeps: await listStageSubstepsRequest(stage.id)
                  .catch(() => []),
              })),
            );

            return {
              caseId: item.id,
              responsible,
              team,
              progress: progressFromStages(stagesWithSubsteps, item.status),
              pendingClient,
              portalActive: portal?.status === "ACTIVE",
              portalExpiry: portal?.expiresAt ? formatDate(portal.expiresAt) : undefined,
            };
          }),
        );
        const metadataMap = new Map(metadataResults.map((meta) => [meta.caseId, meta]));
        const mappedCases: CaseWithComputed[] = casesData.map((item) => {
          const meta = metadataMap.get(item.id);
          return {
            ...item,
            responsible: meta?.responsible ?? "Não definido",
            team: meta?.team ?? [],
            clientName: clientsMap.get(item.clientId) ?? "Cliente",
            clientType: "Pessoa Física",
            partnerName: item.partnerName,
            progress: meta?.progress ?? progressForStatus(item.status),
            pendingClient: meta?.pendingClient ?? 0,
            portalActive: meta?.portalActive ?? false,
            portalExpiry: meta?.portalExpiry,
            lastUpdate: formatDate(item.updatedAt),
            stages: [],
            documents: [],
            updates: [],
            checklist: [],
          };
        });
        setAllCases(mappedCases);
        setClients(clientsData.map((client) => ({ id: client.id, name: client.name })));
        setPartners(partnersData.map((partner) => ({ id: partner.id, name: partner.name })));
        setUsers(usersData.filter((staff) => staff.active));
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar casos.");
      });
  }, [tick, user]);

  const filtered = useMemo(
    () =>
      allCases.filter((c) => {
        if (filter !== "todos" && c.status !== filter) return false;
        if (
          searchQuery &&
          !c.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !c.clientName.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !(c.partnerName ?? "").toLowerCase().includes(searchQuery.toLowerCase())
        ) return false;
        return true;
      }),
    [allCases, filter, searchQuery],
  );

  const stats = useMemo(
    () => ({
      total: allCases.length,
      andamento: allCases.filter((c) => c.status === "em_andamento").length,
      aguardando: allCases.filter((c) => c.status === "aguardando_cliente").length,
      risco: allCases.filter((c) => c.status === "risco").length,
    }),
    [allCases],
  );

  const resetCreateForm = useCallback(() => {
    setEditingCaseId(null);
    setEditingCaseStatus(null);
    setNewCaseTitle("");
    setNewCaseClientId("");
    setNewCasePartnerId("");
    setNewCasePriority("media");
    setNewCaseResponsible("");
  }, []);

  const handleCreateDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsCreateDialogOpen(open);
      if (!open) resetCreateForm();
    },
    [resetCreateForm],
  );

  const handleStartEditingCase = useCallback(
    async (caseItem: CaseWithComputed) => {
      try {
        const members = await listCaseMembersRequest(caseItem.id);
        const owner = members.find((member) => member.permission === "OWNER");
        setEditingCaseId(caseItem.id);
        setEditingCaseStatus(caseItem.status);
        setNewCaseTitle(caseItem.title);
        setNewCaseClientId(caseItem.clientId);
        setNewCasePartnerId(caseItem.partnerId ?? "");
        setNewCasePriority(caseItem.priority);
        setNewCaseResponsible(owner?.userId ?? "");
        setIsCreateDialogOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar dados do caso.");
      }
    },
    [],
  );

  const handleCreateCase = useCallback(async () => {
    if (!user || !newCaseTitle.trim() || !newCaseClientId) return;

    try {
      if (editingCaseId) {
        await updateCaseRequest(editingCaseId, {
          clientId: newCaseClientId,
          partnerId: newCasePartnerId || undefined,
          title: newCaseTitle.trim(),
          caseNumber: undefined,
          area: undefined,
          status: editingCaseStatus ?? "em_andamento",
          priority: newCasePriority,
          responsibleUserId: newCaseResponsible || undefined,
        });
        toast.success("Caso atualizado com sucesso");
      } else {
        await createCaseRequest({
          clientId: newCaseClientId,
          partnerId: newCasePartnerId || undefined,
          title: newCaseTitle.trim(),
          caseNumber: undefined,
          area: undefined,
          status: "em_andamento",
          priority: newCasePriority,
          responsibleUserId: newCaseResponsible || undefined,
        });
        toast.success("Caso criado com sucesso");
      }

      setIsCreateDialogOpen(false);
      resetCreateForm();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar caso.");
    }
  }, [editingCaseId, editingCaseStatus, newCaseClientId, newCasePartnerId, newCasePriority, newCaseResponsible, newCaseTitle, refresh, resetCreateForm, user]);

  return {
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
    clients,
    partners,
    users,
    handleCreateCase,
    handleStartEditingCase,
    handleCreateDialogOpenChange,
  };
}

