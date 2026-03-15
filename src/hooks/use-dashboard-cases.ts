import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CaseWithComputed, User } from "@/types";
import {
  createCaseRequest,
  listCaseMembersRequest,
  listClientsRequest,
  listDashboardCasesRequest,
  listPartnersRequest,
  listUsersRequest,
  updateCaseRequest,
} from "@/services/backend";

type UseDashboardCasesParams = {
  officeInitials?: string;
  user: User | null;
  can: (permission: string) => boolean;
};

const DASHBOARD_QUERY_STALE_TIME = 30 * 1000;
const DIALOG_OPTIONS_QUERY_STALE_TIME = 5 * 60 * 1000;

const DASHBOARD_DIALOG_PAGE_SIZE = 1000;

function formatDashboardDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function baseProgressForStatus(status: CaseWithComputed["status"]): number {
  if (status === "concluido") return 100;
  if (status === "aguardando_cliente") return 60;
  return 0;
}

export function useDashboardCases({ user }: UseDashboardCasesParams) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
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

  const applyDashboardCases = useCallback((updater: (current: CaseWithComputed[]) => CaseWithComputed[]) => {
    setAllCases((current) => {
      const next = updater(current);
      queryClient.setQueryData<CaseWithComputed[]>(["dashboard-cases"], next);
      return next;
    });
  }, [queryClient]);

  const loadDialogOptions = useCallback(async () => {
    const [clientsData, partnersData, usersData] = await Promise.all([
      queryClient.fetchQuery({
        queryKey: ["clients", "dialog-options"],
        queryFn: () => listClientsRequest({ page: 0, size: DASHBOARD_DIALOG_PAGE_SIZE }),
        staleTime: DIALOG_OPTIONS_QUERY_STALE_TIME,
      }),
      queryClient.fetchQuery({
        queryKey: ["partners", "dialog-options"],
        queryFn: () => listPartnersRequest({ page: 0, size: DASHBOARD_DIALOG_PAGE_SIZE }),
        staleTime: DIALOG_OPTIONS_QUERY_STALE_TIME,
      }),
      queryClient.fetchQuery({
        queryKey: ["users", "dialog-options"],
        queryFn: () => listUsersRequest({ page: 0, size: DASHBOARD_DIALOG_PAGE_SIZE }),
        staleTime: DIALOG_OPTIONS_QUERY_STALE_TIME,
      }),
    ]);

    setClients(clientsData.items.map((client) => ({ id: client.id, name: client.name })));
    setPartners(partnersData.items.map((partner) => ({ id: partner.id, name: partner.name })));
    setUsers(usersData.items.filter((staff) => staff.active));
  }, [queryClient]);

  useEffect(() => {
    if (!user) return;

    queryClient.fetchQuery({
      queryKey: ["dashboard-cases"],
      queryFn: () => listDashboardCasesRequest(),
      staleTime: DASHBOARD_QUERY_STALE_TIME,
    })
      .then((casesData) => {
        setAllCases(casesData);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar casos.");
      });
  }, [queryClient, user]);

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
      if (open) {
        void loadDialogOptions().catch((error) => {
          toast.error(error instanceof Error ? error.message : "Falha ao carregar dados auxiliares.");
        });
        return;
      }
      resetCreateForm();
    },
    [loadDialogOptions, resetCreateForm],
  );

  const handleStartEditingCase = useCallback(
    async (caseItem: CaseWithComputed) => {
      try {
        const [members] = await Promise.all([
          queryClient.fetchQuery({
            queryKey: ["case-members", caseItem.id],
            queryFn: () => listCaseMembersRequest(caseItem.id),
            staleTime: DASHBOARD_QUERY_STALE_TIME,
          }),
          loadDialogOptions(),
        ]);
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
    [loadDialogOptions, queryClient],
  );

  const handleCreateCase = useCallback(async () => {
    if (!user || !newCaseTitle.trim() || !newCaseClientId) return;

    try {
      if (editingCaseId) {
        const updatedCase = await updateCaseRequest(editingCaseId, {
          clientId: newCaseClientId,
          partnerId: newCasePartnerId || undefined,
          title: newCaseTitle.trim(),
          caseNumber: undefined,
          area: undefined,
          status: editingCaseStatus ?? "em_andamento",
          priority: newCasePriority,
          responsibleUserId: newCaseResponsible || undefined,
        });
        const members = await queryClient.fetchQuery({
          queryKey: ["case-members", editingCaseId],
          queryFn: () => listCaseMembersRequest(editingCaseId),
          staleTime: DASHBOARD_QUERY_STALE_TIME,
        });
        const owner = members.find((member) => member.permission === "OWNER");
        const teamNames = members
          .filter((member) => member.permission !== "OWNER")
          .map((member) => member.userName);

        applyDashboardCases((current) =>
          current.map((item) =>
            item.id === editingCaseId
              ? {
                  ...item,
                  ...updatedCase,
                  clientName: clients.find((client) => client.id === updatedCase.clientId)?.name ?? item.clientName,
                  partnerName: updatedCase.partnerId
                    ? (partners.find((partner) => partner.id === updatedCase.partnerId)?.name ?? item.partnerName)
                    : undefined,
                  responsible: owner?.userName ?? item.responsible,
                  team: teamNames,
                  lastUpdate: formatDashboardDate(updatedCase.updatedAt),
                }
              : item,
          ),
        );
        await queryClient.invalidateQueries({ queryKey: ["case-members", editingCaseId], refetchType: "none" });
        toast.success("Caso atualizado com sucesso");
      } else {
        const createdCase = await createCaseRequest({
          clientId: newCaseClientId,
          partnerId: newCasePartnerId || undefined,
          title: newCaseTitle.trim(),
          caseNumber: undefined,
          area: undefined,
          status: "em_andamento",
          priority: newCasePriority,
          responsibleUserId: newCaseResponsible || undefined,
        });
        const responsible = users.find((staff) => staff.id === newCaseResponsible)?.name ?? "Não definido";
        const team = newCaseResponsible && newCaseResponsible !== user.id ? [user.name] : [];
        applyDashboardCases((current) => [
          {
            ...createdCase,
            clientName: clients.find((client) => client.id === createdCase.clientId)?.name ?? "",
            clientType: "Pessoa Física",
            partnerName: createdCase.partnerId
              ? (partners.find((partner) => partner.id === createdCase.partnerId)?.name ?? undefined)
              : undefined,
            responsible,
            team,
            progress: baseProgressForStatus(createdCase.status),
            pendingClient: 0,
            portalActive: false,
            portalExpiry: undefined,
            lastUpdate: formatDashboardDate(createdCase.updatedAt),
            stages: [],
            documents: [],
            updates: [],
            checklist: [],
          },
          ...current,
        ]);
        toast.success("Caso criado com sucesso");
      }

      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar caso.");
    }
  }, [
    applyDashboardCases,
    clients,
    editingCaseId,
    editingCaseStatus,
    newCaseClientId,
    newCasePartnerId,
    newCasePriority,
    newCaseResponsible,
    newCaseTitle,
    partners,
    queryClient,
    resetCreateForm,
    user,
    users,
  ]);

  const handleRemoveCase = useCallback((caseId: string) => {
    setAllCases((prev) => prev.filter((item) => item.id !== caseId));
    queryClient.setQueryData<CaseWithComputed[]>(["dashboard-cases"], (prev = []) => prev.filter((item) => item.id !== caseId));
  }, [queryClient]);

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
    handleRemoveCase,
    handleStartEditingCase,
    handleCreateDialogOpenChange,
  };
}
