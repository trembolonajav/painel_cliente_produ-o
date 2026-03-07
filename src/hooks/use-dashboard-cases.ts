import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CaseDocument, CaseWithComputed, User } from "@/types";
import { createCaseRequest, listCasesRequest, listClientsRequest, listUsersRequest } from "@/services/backend";
import { generateId } from "@/lib/id";

type NewCaseDocInput = {
  id: string;
  name: string;
  type: string;
  visibility: CaseDocument["visibility"];
  status: CaseDocument["status"];
  file?: File;
};

type UseDashboardCasesParams = {
  officeInitials?: string;
  user: User | null;
};

function inferDocType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toUpperCase();
  return ext || "ARQUIVO";
}

const progressForStatus = (status: CaseWithComputed["status"]): number => {
  if (status === "concluido") return 100;
  if (status === "aguardando_cliente") return 60;
  if (status === "risco") return 40;
  return 50;
};

export function useDashboardCases({ user }: UseDashboardCasesParams) {
  const [filter, setFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCaseTitle, setNewCaseTitle] = useState("");
  const [newCaseClientId, setNewCaseClientId] = useState("");
  const [newCasePriority, setNewCasePriority] = useState<CaseWithComputed["priority"]>("media");
  const [newCaseResponsible, setNewCaseResponsible] = useState("");
  const [newCaseDocs, setNewCaseDocs] = useState<NewCaseDocInput[]>([]);
  const [allCases, setAllCases] = useState<CaseWithComputed[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [users, setUsers] = useState<User[]>([]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!user) return;
    Promise.allSettled([listCasesRequest(), listClientsRequest(), listUsersRequest()])
      .then((results) => {
        const casesResult = results[0];
        const clientsResult = results[1];
        const usersResult = results[2];

        if (casesResult.status !== "fulfilled" || clientsResult.status !== "fulfilled") {
          throw new Error("Falha ao carregar dados principais.");
        }

        const casesData = casesResult.value;
        const clientsData = clientsResult.value;
        const usersData = usersResult.status === "fulfilled" ? usersResult.value : [];
        const clientsMap = new Map(clientsData.map((client) => [client.id, client.name]));
        const mappedCases: CaseWithComputed[] = casesData.map((item) => ({
          ...item,
          clientName: clientsMap.get(item.clientId) ?? "Cliente",
          clientType: "Pessoa Física",
          progress: progressForStatus(item.status),
          pendingClient: 0,
          portalActive: false,
          portalExpiry: undefined,
          lastUpdate: new Date(item.updatedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }),
          stages: [],
          documents: [],
          updates: [],
          checklist: [],
        }));
        setAllCases(mappedCases);
        setClients(clientsData.map((client) => ({ id: client.id, name: client.name })));
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
        if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase()) && !c.clientName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
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
    setNewCaseTitle("");
    setNewCaseClientId("");
    setNewCasePriority("media");
    setNewCaseResponsible("");
    setNewCaseDocs([]);
  }, []);

  const handleCreateDialogOpenChange = useCallback(
    (open: boolean) => {
      setIsCreateDialogOpen(open);
      if (!open) resetCreateForm();
    },
    [resetCreateForm],
  );

  const handleAddFilesToNewCase = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const next = Array.from(files).map((file) => ({
      id: generateId(),
      name: file.name,
      type: inferDocType(file.name),
      visibility: "interno" as const,
      status: "disponivel" as const,
      file,
    }));
    setNewCaseDocs((prev) => [...prev, ...next]);
  }, []);

  const handleAddPendingClientDoc = useCallback(() => {
    setNewCaseDocs((prev) => [
      ...prev,
      {
        id: generateId(),
        name: "",
        type: "PDF",
        visibility: "cliente",
        status: "pendente",
      },
    ]);
  }, []);

  const handleUpdateNewCaseDoc = useCallback((id: string, patch: Partial<NewCaseDocInput>) => {
    setNewCaseDocs((prev) => prev.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc)));
  }, []);

  const handleRemoveNewCaseDoc = useCallback((id: string) => {
    setNewCaseDocs((prev) => prev.filter((doc) => doc.id !== id));
  }, []);

  const handleCreateCase = useCallback(async () => {
    if (!user || !newCaseTitle.trim() || !newCaseClientId) return;

    try {
      await createCaseRequest({
        clientId: newCaseClientId,
        title: newCaseTitle.trim(),
        caseNumber: undefined,
        area: undefined,
        status: "em_andamento",
        priority: newCasePriority,
        responsibleUserId: newCaseResponsible || undefined,
      });

      if (newCaseDocs.length > 0) {
        toast.info("Caso criado. Upload de documentos nesta etapa ainda será conectado ao fluxo presign.");
      } else {
        toast.success("Caso criado com sucesso");
      }

      setIsCreateDialogOpen(false);
      resetCreateForm();
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar caso.");
    }
  }, [newCaseClientId, newCaseDocs.length, newCasePriority, newCaseResponsible, newCaseTitle, refresh, resetCreateForm, user]);

  return {
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    filtered,
    stats,
    isCreateDialogOpen,
    newCaseTitle,
    setNewCaseTitle,
    newCaseClientId,
    setNewCaseClientId,
    newCasePriority,
    setNewCasePriority,
    newCaseResponsible,
    setNewCaseResponsible,
    newCaseDocs,
    clients,
    users,
    handleCreateCase,
    handleCreateDialogOpenChange,
    handleAddFilesToNewCase,
    handleAddPendingClientDoc,
    handleUpdateNewCaseDoc,
    handleRemoveNewCaseDoc,
  };
}

