import type { CaseData, CasePriority, CaseStatus, Client, Partner, User, UserRole } from "@/types";
import { apiRequest, getApiBaseUrl } from "./apiClient";

type BackendRole = "ADMINISTRADOR" | "GESTOR" | "ESTAGIARIO";
type BackendCaseStatus = "OPEN" | "IN_PROGRESS" | "WAITING_CLIENT" | "CLOSED";
type BackendCasePriority = "LOW" | "MEDIUM" | "HIGH";

type AuthResponse = {
  accessToken: string;
  userId: string;
  name: string;
  email: string;
  role: BackendRole;
};

type MeResponse = {
  id: string;
  name: string;
  email: string;
  role: BackendRole;
};

type UserResponse = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: BackendRole;
  active: boolean;
};

type UserDeleteResponse = {
  deleted: boolean;
  message: string;
};

type ClientResponse = {
  id: string;
  name: string;
  cpfLast3?: string;
  email?: string;
  phone?: string;
  createdAt: string;
};

type ClientDeleteResponse = {
  deleted: boolean;
  deletedCasesCount: number;
  message: string;
};

type PartnerResponse = {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

type PartnerDeleteResponse = {
  deleted: boolean;
  message: string;
};

type CaseResponse = {
  id: string;
  clientId: string;
  clientName: string;
  partnerId?: string | null;
  partnerName?: string | null;
  title: string;
  caseNumber?: string;
  area?: string;
  status: BackendCaseStatus;
  priority: BackendCasePriority;
  createdAt: string;
  updatedAt: string;
};

type CaseDeleteResponse = {
  deleted: boolean;
  message: string;
};

export type CaseMemberResponse = {
  userId: string;
  userName: string;
  userEmail: string;
  permission: "OWNER" | "EDITOR" | "VIEWER";
};

type UpdateVisibility = "INTERNAL_ONLY" | "CLIENT_VISIBLE";
type CaseUpdateResponse = {
  id: string;
  caseId: string;
  visibility: UpdateVisibility;
  type: string;
  content: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
};

type DocumentVisibility = "INTERNAL_ONLY" | "CLIENT_VISIBLE";
type DocumentResponse = {
  id: string;
  caseId: string;
  visibility: DocumentVisibility;
  status: "AVAILABLE" | "PENDING";
  originalName: string;
  mimeType?: string;
  sizeBytes: number;
  storageKey?: string;
  checksum?: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
};

type DocumentPresignResponse = {
  uploadUrl: string;
  storageKey: string;
  method: string;
  contentType: string;
  expiresAt: string;
};

type DocumentDownloadLinkResponse = {
  url: string;
  expiresAt: string;
};

type DocumentDeleteResponse = {
  deleted: boolean;
  storageObjectDeleted: boolean;
  message: string;
};

type PortalLinkStatus = "ACTIVE" | "REVOKED" | "EXPIRED";
type PortalLinkResponse = {
  id: string | null;
  caseId: string;
  status: PortalLinkStatus | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessAt: string | null;
  url: string | null;
};

type ClientPortalSessionResponse = {
  ok: boolean;
  sessionToken: string;
  expiresAt: string;
};

type ClientPortalMeResponse = {
  clientName: string;
  caseId: string;
  caseTitle: string;
  caseStatus: BackendCaseStatus;
  casePriority: BackendCasePriority;
};

type ClientPortalCaseResponse = {
  caseId: string;
  title: string;
  caseNumber?: string;
  area?: string;
  status: BackendCaseStatus;
  priority: BackendCasePriority;
  updatedAt: string;
  closedAt?: string;
  clientId: string;
  clientName: string;
  responsibleName?: string;
  responsiblePhone?: string;
};

type ClientPortalStageResponse = {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: "PENDING" | "ACTIVE" | "DONE";
  updatedAt: string;
  substeps?: {
    id: string;
    title: string;
    description?: string;
    position: number;
    status: "PENDING" | "IN_PROGRESS" | "DONE";
    updatedAt: string;
  }[];
};

type ClientPortalPatrimonyNodeResponse = {
  id: string;
  parentId: string | null;
  type: "PERSON" | "HOLDING" | "OPERATING_COMPANY" | "OFFSHORE" | "REAL_ESTATE_URBAN" | "REAL_ESTATE_RURAL" | "OTHER_ASSET" | "NOTE";
  label: string;
  subtitle?: string;
  description?: string;
  value?: string;
  percentage?: string;
  location?: string;
  sortOrder: number;
};

type ClientPortalPatrimonyResponse = {
  structureId: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  nodes: ClientPortalPatrimonyNodeResponse[];
} | null;

type ClientPortalPatrimonyOriginalDocumentResponse = {
  url: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
};

type CaseStageResponse = {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  position: number;
  status: "PENDING" | "ACTIVE" | "DONE";
  createdAt: string;
  updatedAt: string;
};

type CaseStageSubstepResponse = {
  id: string;
  stageId: string;
  title: string;
  description?: string;
  position: number;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  visibleToClient: boolean;
  createdAt: string;
  updatedAt: string;
};

type CaseTaskResponse = {
  id: string;
  caseId: string;
  stageId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "TODO" | "DOING" | "DONE" | "BLOCKED";
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

const toFrontendRole = (role: BackendRole): UserRole => {
  if (role === "ADMINISTRADOR") return "administrador";
  if (role === "ESTAGIARIO") return "estagiario";
  return "gestor";
};

const toBackendRole = (role: UserRole): BackendRole => {
  if (role === "administrador") return "ADMINISTRADOR";
  if (role === "estagiario") return "ESTAGIARIO";
  return "GESTOR";
};

const toFrontendCaseStatus = (status: BackendCaseStatus): CaseStatus => {
  if (status === "CLOSED") return "concluido";
  if (status === "WAITING_CLIENT") return "aguardando_cliente";
  return "em_andamento";
};

const toBackendCaseStatus = (status: CaseStatus): BackendCaseStatus => {
  if (status === "concluido") return "CLOSED";
  if (status === "aguardando_cliente") return "WAITING_CLIENT";
  return "IN_PROGRESS";
};

const toFrontendCasePriority = (priority: BackendCasePriority): CasePriority => {
  if (priority === "HIGH") return "alta";
  if (priority === "LOW") return "baixa";
  return "media";
};

const toBackendCasePriority = (priority: CasePriority): BackendCasePriority => {
  if (priority === "alta") return "HIGH";
  if (priority === "baixa") return "LOW";
  return "MEDIUM";
};

const toBackendVisibility = (visibility: "interno" | "cliente"): DocumentVisibility => {
  return visibility === "cliente" ? "CLIENT_VISIBLE" : "INTERNAL_ONLY";
};

export type LoginResult = {
  token: string;
  user: User;
};

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });

  return {
    token: response.accessToken,
    user: {
      id: response.userId,
      name: response.name,
      email: response.email,
      role: toFrontendRole(response.role),
      active: true,
    },
  };
}

export async function meRequest(): Promise<User> {
  const response = await apiRequest<MeResponse>("/auth/me", { auth: true });
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    role: toFrontendRole(response.role),
    active: true,
  };
}

export async function listUsersRequest(): Promise<User[]> {
  const response = await apiRequest<UserResponse[]>("/users", { auth: true });
  return response.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
    role: toFrontendRole(item.role),
    active: item.active,
  }));
}

export async function createUserRequest(data: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  active: boolean;
}): Promise<User> {
  const response = await apiRequest<UserResponse>("/users", {
    method: "POST",
    auth: true,
    body: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      password: data.password,
      role: toBackendRole(data.role),
      active: data.active,
    },
  });
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone,
    role: toFrontendRole(response.role),
    active: response.active,
  };
}

export async function updateUserRequest(
  id: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    role: UserRole;
    active: boolean;
  },
): Promise<User> {
  const response = await apiRequest<UserResponse>(`/users/${id}`, {
    method: "PATCH",
    auth: true,
    body: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      password: data.password || null,
      role: toBackendRole(data.role),
      active: data.active,
    },
  });
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone,
    role: toFrontendRole(response.role),
    active: response.active,
  };
}

export async function deleteUserRequest(id: string): Promise<UserDeleteResponse> {
  return apiRequest<UserDeleteResponse>(`/users/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listClientsRequest(search?: string): Promise<Client[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await apiRequest<ClientResponse[]>(`/clients${query}`, { auth: true });
  return response.map((item) => ({
    id: item.id,
    name: item.name,
    type: "Pessoa Física",
    cpf: item.cpfLast3,
    email: item.email,
    phone: item.phone,
    createdAt: item.createdAt,
    createdBy: "",
  }));
}

export async function createClientRequest(data: {
  name: string;
  cpfLast3?: string;
  email?: string;
  phone?: string;
}): Promise<Client> {
  const response = await apiRequest<ClientResponse>("/clients", {
    method: "POST",
    auth: true,
    body: {
      name: data.name,
      cpfEncrypted: null,
      cpfLast3: data.cpfLast3 || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: null,
    },
  });
  return {
    id: response.id,
    name: response.name,
    type: "Pessoa Física",
    cpf: response.cpfLast3,
    email: response.email,
    phone: response.phone,
    createdAt: response.createdAt,
    createdBy: "",
  };
}

export async function updateClientRequest(
  id: string,
  data: {
    name: string;
    cpfLast3?: string;
    email?: string;
    phone?: string;
  },
): Promise<Client> {
  const response = await apiRequest<ClientResponse>(`/clients/${id}`, {
    method: "PATCH",
    auth: true,
    body: {
      name: data.name,
      cpfEncrypted: null,
      cpfLast3: data.cpfLast3 || null,
      email: data.email || null,
      phone: data.phone || null,
      notes: null,
    },
  });
  return {
    id: response.id,
    name: response.name,
    type: "Pessoa Física",
    cpf: response.cpfLast3,
    email: response.email,
    phone: response.phone,
    createdAt: response.createdAt,
    createdBy: "",
  };
}

export async function deleteClientRequest(id: string): Promise<ClientDeleteResponse> {
  return apiRequest<ClientDeleteResponse>(`/clients/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listPartnersRequest(): Promise<Partner[]> {
  const response = await apiRequest<PartnerResponse[]>("/partners", { auth: true });
  return response.map((item) => ({
    id: item.id,
    name: item.name,
    email: item.email,
    phone: item.phone,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function getPartnerRequest(id: string): Promise<Partner> {
  const response = await apiRequest<PartnerResponse>(`/partners/${id}`, { auth: true });
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

export async function createPartnerRequest(data: {
  name: string;
  email: string;
  phone: string;
}): Promise<Partner> {
  const response = await apiRequest<PartnerResponse>("/partners", {
    method: "POST",
    auth: true,
    body: {
      name: data.name,
      email: data.email,
      phone: data.phone,
    },
  });
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

export async function updatePartnerRequest(
  id: string,
  data: {
    name: string;
    email: string;
    phone: string;
  },
): Promise<Partner> {
  const response = await apiRequest<PartnerResponse>(`/partners/${id}`, {
    method: "PUT",
    auth: true,
    body: {
      name: data.name,
      email: data.email,
      phone: data.phone,
    },
  });
  return {
    id: response.id,
    name: response.name,
    email: response.email,
    phone: response.phone,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

export async function deletePartnerRequest(id: string): Promise<PartnerDeleteResponse> {
  return apiRequest<PartnerDeleteResponse>(`/partners/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listCasesRequest(search?: string): Promise<CaseData[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await apiRequest<CaseResponse[]>(`/cases${query}`, { auth: true });
  return response.map((item) => {
    const status = toFrontendCaseStatus(item.status);
    return {
      id: item.id,
      code: item.caseNumber || item.id.slice(0, 8).toUpperCase(),
      title: item.title,
      subtitle: item.area || "",
      clientId: item.clientId,
      partnerId: item.partnerId || undefined,
      partnerName: item.partnerName || undefined,
      status,
      priority: toFrontendCasePriority(item.priority),
      responsible: "Não definido",
      team: [],
      currentStage: 0,
      nextAction: status === "concluido" ? "Caso encerrado" : "Aguardando atualização",
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  });
}

export async function createCaseRequest(data: {
  clientId: string;
  partnerId?: string;
  title: string;
  caseNumber?: string;
  area?: string;
  status: CaseStatus;
  priority: CasePriority;
  responsibleUserId?: string;
}): Promise<CaseData> {
  const response = await apiRequest<CaseResponse>("/cases", {
    method: "POST",
    auth: true,
    body: {
      clientId: data.clientId,
      partnerId: data.partnerId || null,
      title: data.title,
      caseNumber: data.caseNumber || null,
      area: data.area || null,
      status: toBackendCaseStatus(data.status),
      priority: toBackendCasePriority(data.priority),
      responsibleUserId: data.responsibleUserId || null,
    },
  });
  const status = toFrontendCaseStatus(response.status);
  return {
    id: response.id,
    code: response.caseNumber || response.id.slice(0, 8).toUpperCase(),
    title: response.title,
    subtitle: response.area || "",
    clientId: response.clientId,
    partnerId: response.partnerId || undefined,
    partnerName: response.partnerName || undefined,
    status,
    priority: toFrontendCasePriority(response.priority),
    responsible: "Não definido",
    team: [],
    currentStage: 0,
    nextAction: status === "concluido" ? "Caso encerrado" : "Aguardando atualização",
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
  };
}

export async function deleteCaseRequest(caseId: string): Promise<CaseDeleteResponse> {
  return apiRequest<CaseDeleteResponse>(`/cases/${caseId}`, {
    method: "DELETE",
    auth: true,
  });
}

export type CaseDetailPayload = {
  caseData: CaseData;
  clientName: string;
  members: CaseMemberResponse[];
};

export async function listCaseMembersRequest(caseId: string): Promise<CaseMemberResponse[]> {
  return apiRequest<CaseMemberResponse[]>(`/cases/${caseId}/members`, { auth: true });
}

export async function getCaseDetailRequest(caseId: string): Promise<CaseDetailPayload> {
  const [caseResponse, members] = await Promise.all([
    apiRequest<CaseResponse>(`/cases/${caseId}`, { auth: true }),
    listCaseMembersRequest(caseId),
  ]);

  const status = toFrontendCaseStatus(caseResponse.status);
  const owner = members.find((member) => member.permission === "OWNER");
  const responsibleName = owner?.userName ?? "Não definido";
  const team = members
    .filter((member) => member.permission !== "OWNER")
    .map((member) => member.userName);

  return {
    caseData: {
      id: caseResponse.id,
      code: caseResponse.caseNumber || caseResponse.id.slice(0, 8).toUpperCase(),
      title: caseResponse.title,
      subtitle: caseResponse.area || "",
      clientId: caseResponse.clientId,
      partnerId: caseResponse.partnerId || undefined,
      partnerName: caseResponse.partnerName || undefined,
      status,
      priority: toFrontendCasePriority(caseResponse.priority),
      responsible: responsibleName,
      team,
      currentStage: 0,
      nextAction: status === "concluido" ? "Caso encerrado" : "Aguardando atualização",
      createdAt: caseResponse.createdAt,
      updatedAt: caseResponse.updatedAt,
    },
    clientName: caseResponse.clientName,
    members,
  };
}

export type StaffUpdate = {
  id: string;
  content: string;
  createdAt: string;
  author: string;
  internal: boolean;
};

export async function listCaseUpdatesRequest(caseId: string): Promise<StaffUpdate[]> {
  const response = await apiRequest<CaseUpdateResponse[]>(`/cases/${caseId}/updates`, { auth: true });
  return response.map((item) => ({
    id: item.id,
    content: item.content,
    createdAt: item.createdAt,
    author: item.createdByName,
    internal: item.visibility === "INTERNAL_ONLY",
  }));
}

export async function createCaseUpdateRequest(caseId: string, content: string, internal = false): Promise<void> {
  await apiRequest<CaseUpdateResponse>(`/cases/${caseId}/updates`, {
    method: "POST",
    auth: true,
    body: {
      visibility: internal ? "INTERNAL_ONLY" : "CLIENT_VISIBLE",
      type: "TEXT",
      content,
    },
  });
}

export async function deleteCaseUpdateRequest(caseId: string, updateId: string): Promise<void> {
  await apiRequest<void>(`/cases/${caseId}/updates/${updateId}`, {
    method: "DELETE",
    auth: true,
  });
}

export type StaffDocument = {
  id: string;
  name: string;
  type: string;
  date: string;
  visibility: "interno" | "cliente";
  status: "disponivel" | "pendente";
  sizeBytes: number;
};

export type ClientPortalDocument = {
  id: string;
  name: string;
  type: string;
  date: string;
  status: "disponivel" | "pendente";
  sizeBytes: number;
};

export type StageDto = {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  position: number;
  status: "PENDING" | "ACTIVE" | "DONE";
  createdAt: string;
  updatedAt: string;
};

export type StageSubstepDto = {
  id: string;
  stageId: string;
  title: string;
  description?: string;
  position: number;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  visibleToClient: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TaskDto = {
  id: string;
  caseId: string;
  stageId?: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: "TODO" | "DOING" | "DONE" | "BLOCKED";
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type PatrimonyStructureDto = {
  id: string;
  caseId: string;
  title: string;
  status: "draft" | "published";
  version: number;
  notesInternal?: string;
  notesClient?: string;
  originalDocumentName?: string;
  originalDocumentMimeType?: string;
  originalDocumentSizeBytes?: number;
  originalDocumentStorageKey?: string;
  originalDocumentVisibleToClient?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PatrimonyNodeDto = {
  id: string;
  structureId: string;
  type: "person" | "holding" | "operating_company" | "offshore" | "real_estate_urban" | "real_estate_rural" | "other_asset" | "note";
  label: string;
  subtitle?: string;
  description?: string;
  value?: string;
  percentage?: string;
  location?: string;
  parentId: string | null;
  sortOrder: number;
  isVisibleToClient: boolean;
  metadata?: Record<string, string>;
};

export async function listCaseDocumentsRequest(caseId: string): Promise<StaffDocument[]> {
  const response = await apiRequest<DocumentResponse[]>(`/cases/${caseId}/documents`, { auth: true });
  return response.map((item) => ({
    id: item.id,
    name: item.originalName,
    type: item.mimeType || "ARQUIVO",
    date: item.createdAt,
    visibility: item.visibility === "CLIENT_VISIBLE" ? "cliente" : "interno",
    status: item.status === "PENDING" ? "pendente" : "disponivel",
    sizeBytes: item.sizeBytes,
  }));
}

export async function createCaseDocumentRequest(
  caseId: string,
  payload: {
    file?: File;
    name: string;
    visibility: "interno" | "cliente";
    status: "disponivel" | "pendente";
    checksum?: string;
  },
): Promise<void> {
  if (payload.status === "pendente") {
    await apiRequest<DocumentResponse>(`/cases/${caseId}/documents`, {
      method: "POST",
      auth: true,
      body: {
        visibility: toBackendVisibility(payload.visibility),
        status: "PENDING",
        originalName: payload.name,
        mimeType: null,
        sizeBytes: 0,
        storageKey: null,
        checksum: null,
      },
    });
    return;
  }

  if (!payload.file) {
    throw new Error("Arquivo é obrigatório para documento disponível.");
  }

  const presign = await apiRequest<DocumentPresignResponse>(`/cases/${caseId}/documents/presign`, {
    method: "POST",
    auth: true,
    body: {
      originalName: payload.file.name,
      mimeType: payload.file.type || "application/octet-stream",
      sizeBytes: payload.file.size,
    },
  });

  const uploadResponse = await fetch(presign.uploadUrl, {
    method: presign.method || "PUT",
    headers: {
      "Content-Type": payload.file.type || "application/octet-stream",
    },
    body: payload.file,
  });
  if (!uploadResponse.ok) {
    throw new Error("Falha ao enviar arquivo para storage.");
  }

  await apiRequest<DocumentResponse>(`/cases/${caseId}/documents/confirm`, {
    method: "POST",
    auth: true,
    body: {
      visibility: toBackendVisibility(payload.visibility),
      status: "AVAILABLE",
      originalName: payload.name || payload.file.name,
      mimeType: payload.file.type || "application/octet-stream",
      sizeBytes: payload.file.size,
      storageKey: presign.storageKey,
      checksum: payload.checksum || null,
    },
  });
}

export async function getCaseDocumentDownloadUrlRequest(caseId: string, documentId: string): Promise<string> {
  const link = await apiRequest<DocumentDownloadLinkResponse>(`/cases/${caseId}/documents/${documentId}/download-link`, {
    method: "POST",
    auth: true,
  });
  return link.url.startsWith("http") ? link.url : `${getApiBaseUrl()}${link.url}`;
}

export async function deleteCaseDocumentRequest(caseId: string, documentId: string): Promise<DocumentDeleteResponse> {
  return apiRequest<DocumentDeleteResponse>(`/cases/${caseId}/documents/${documentId}`, {
    method: "DELETE",
    auth: true,
  });
}

export type ClientPortalSessionResult = {
  ok: boolean;
  sessionToken: string;
  expiresAt: string;
};

export async function createClientPortalSessionRequest(token: string, cpfLast3: string): Promise<ClientPortalSessionResult> {
  const response = await apiRequest<ClientPortalSessionResponse>("/client-portal/session", {
    method: "POST",
    includeCredentials: true,
    body: { token, cpfLast3 },
  });
  return {
    ok: response.ok,
    sessionToken: response.sessionToken,
    expiresAt: response.expiresAt,
  };
}

export type ClientPortalMe = {
  clientName: string;
  caseId: string;
  caseTitle: string;
  caseStatus: CaseStatus;
  casePriority: CasePriority;
};

export async function getClientPortalMeRequest(sessionToken?: string): Promise<ClientPortalMe> {
  const response = await apiRequest<ClientPortalMeResponse>("/client-portal/me", {
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  return {
    clientName: response.clientName,
    caseId: response.caseId,
    caseTitle: response.caseTitle,
    caseStatus: toFrontendCaseStatus(response.caseStatus),
    casePriority: toFrontendCasePriority(response.casePriority),
  };
}

export type ClientPortalCase = {
  caseId: string;
  title: string;
  caseNumber?: string;
  area?: string;
  status: CaseStatus;
  priority: CasePriority;
  updatedAt: string;
  closedAt?: string;
  clientId: string;
  clientName: string;
  responsibleName?: string;
  responsiblePhone?: string;
};

export type ClientPortalStage = {
  id: string;
  title: string;
  description?: string;
  position: number;
  status: "pendente" | "em_andamento" | "concluido";
  updatedAt: string;
  substeps: {
    id: string;
    title: string;
    description?: string;
    position: number;
    status: "pendente" | "em_andamento" | "concluido";
    updatedAt: string;
  }[];
};

export type ClientPortalPatrimony = {
  structureId: string;
  title: string;
  status: "draft" | "published";
  nodes: PatrimonyNodeDto[];
} | null;

export type ClientPortalPatrimonyOriginalDocument = {
  url: string;
  name?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export async function getClientPortalCaseRequest(sessionToken?: string): Promise<ClientPortalCase> {
  const response = await apiRequest<ClientPortalCaseResponse>("/client-portal/case", {
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  return {
    caseId: response.caseId,
    title: response.title,
    caseNumber: response.caseNumber,
    area: response.area,
    status: toFrontendCaseStatus(response.status),
    priority: toFrontendCasePriority(response.priority),
    updatedAt: response.updatedAt,
    closedAt: response.closedAt,
    clientId: response.clientId,
    clientName: response.clientName,
    responsibleName: response.responsibleName,
    responsiblePhone: response.responsiblePhone,
  };
}

export async function listClientPortalUpdatesRequest(sessionToken?: string): Promise<StaffUpdate[]> {
  const response = await apiRequest<CaseUpdateResponse[]>("/client-portal/updates", {
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  return response.map((item) => ({
    id: item.id,
    content: item.content,
    createdAt: item.createdAt,
    author: item.createdByName,
    internal: false,
  }));
}

export async function listClientPortalStagesRequest(sessionToken?: string): Promise<ClientPortalStage[]> {
  const response = await apiRequest<ClientPortalStageResponse[]>("/client-portal/stages", {
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  return response
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      position: item.position,
      status: item.status === "DONE" ? "concluido" : item.status === "ACTIVE" ? "em_andamento" : "pendente",
      updatedAt: item.updatedAt,
      substeps: (item.substeps ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((substep) => ({
          id: substep.id,
          title: substep.title,
          description: substep.description,
          position: substep.position,
          status: substep.status === "DONE" ? "concluido" : substep.status === "IN_PROGRESS" ? "em_andamento" : "pendente",
          updatedAt: substep.updatedAt,
        })),
    }));
}

export async function getClientPortalPatrimonyRequest(sessionToken?: string): Promise<ClientPortalPatrimony> {
  const response = await apiRequest<ClientPortalPatrimonyResponse>("/client-portal/patrimony", {
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  if (!response) return null;
  return {
    structureId: response.structureId,
    title: response.title,
    status: toFrontendPatrimonyStatus(response.status),
    nodes: response.nodes.map((node) => ({
      id: node.id,
      structureId: response.structureId,
      type: toFrontendNodeType(node.type),
      label: node.label,
      subtitle: node.subtitle,
      description: node.description,
      value: node.value,
      percentage: node.percentage,
      location: node.location,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      isVisibleToClient: true,
    })),
  };
}

export async function getClientPortalPatrimonyOriginalDocumentDownloadRequest(
  sessionToken?: string,
): Promise<ClientPortalPatrimonyOriginalDocument> {
  const response = await apiRequest<ClientPortalPatrimonyOriginalDocumentResponse>(
    "/client-portal/patrimony/original-document/download-link",
    {
      method: "POST",
      includeCredentials: true,
      headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
    },
  );
  return {
    url: response.url,
    name: response.name,
    mimeType: response.mimeType,
    sizeBytes: response.sizeBytes,
  };
}

export async function listClientPortalDocumentsRequest(sessionToken?: string): Promise<ClientPortalDocument[]> {
  const response = await apiRequest<DocumentResponse[]>("/client-portal/documents", {
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  return response.map((item) => ({
    id: item.id,
    name: item.originalName,
    type: item.mimeType || "ARQUIVO",
    date: item.createdAt,
    status: item.status === "PENDING" ? "pendente" : "disponivel",
    sizeBytes: item.sizeBytes,
  }));
}

export async function getClientPortalDocumentDownloadUrlRequest(documentId: string, sessionToken?: string): Promise<string> {
  const link = await apiRequest<DocumentDownloadLinkResponse>(`/client-portal/documents/${documentId}/download-link`, {
    method: "POST",
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
  return link.url.startsWith("http") ? link.url : `${getApiBaseUrl()}${link.url}`;
}

export async function clientPortalLogoutRequest(sessionToken?: string): Promise<void> {
  await apiRequest<void>("/client-portal/logout", {
    method: "POST",
    includeCredentials: true,
    headers: sessionToken ? { "X-Client-Session": sessionToken } : undefined,
  });
}

export async function listCaseStagesRequest(caseId: string): Promise<StageDto[]> {
  const response = await apiRequest<CaseStageResponse[]>(`/cases/${caseId}/stages`, { auth: true });
  return response.map((item) => ({
    id: item.id,
    caseId: item.caseId,
    title: item.title,
    description: item.description,
    position: item.position,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }));
}

export async function createCaseStageRequest(
  caseId: string,
  payload: { title: string; description?: string; position: number; status: "PENDING" | "ACTIVE" | "DONE" },
): Promise<StageDto> {
  const item = await apiRequest<CaseStageResponse>(`/cases/${caseId}/stages`, {
    method: "POST",
    auth: true,
    body: payload,
  });
  return {
    id: item.id,
    caseId: item.caseId,
    title: item.title,
    description: item.description,
    position: item.position,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function updateCaseStageRequest(
  stageId: string,
  payload: { title: string; description?: string; position: number; status: "PENDING" | "ACTIVE" | "DONE" },
): Promise<StageDto> {
  const item = await apiRequest<CaseStageResponse>(`/stages/${stageId}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
  return {
    id: item.id,
    caseId: item.caseId,
    title: item.title,
    description: item.description,
    position: item.position,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function deleteCaseStageRequest(stageId: string): Promise<void> {
  await apiRequest<void>(`/stages/${stageId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listStageSubstepsRequest(stageId: string): Promise<StageSubstepDto[]> {
  const response = await apiRequest<CaseStageSubstepResponse[]>(`/stages/${stageId}/substeps`, { auth: true });
  return response
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      stageId: item.stageId,
      title: item.title,
      description: item.description,
      position: item.position,
      status: item.status,
      visibleToClient: item.visibleToClient,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));
}

export async function createStageSubstepRequest(
  stageId: string,
  payload: {
    title: string;
    description?: string;
    position: number;
    status: "PENDING" | "IN_PROGRESS" | "DONE";
    visibleToClient?: boolean;
  },
): Promise<StageSubstepDto> {
  const item = await apiRequest<CaseStageSubstepResponse>(`/stages/${stageId}/substeps`, {
    method: "POST",
    auth: true,
    body: payload,
  });
  return {
    id: item.id,
    stageId: item.stageId,
    title: item.title,
    description: item.description,
    position: item.position,
    status: item.status,
    visibleToClient: item.visibleToClient,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function updateStageSubstepRequest(
  substepId: string,
  payload: {
    title: string;
    description?: string;
    position: number;
    status: "PENDING" | "IN_PROGRESS" | "DONE";
    visibleToClient?: boolean;
  },
): Promise<StageSubstepDto> {
  const item = await apiRequest<CaseStageSubstepResponse>(`/substeps/${substepId}`, {
    method: "PATCH",
    auth: true,
    body: payload,
  });
  return {
    id: item.id,
    stageId: item.stageId,
    title: item.title,
    description: item.description,
    position: item.position,
    status: item.status,
    visibleToClient: item.visibleToClient,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export async function deleteStageSubstepRequest(substepId: string): Promise<void> {
  await apiRequest<void>(`/substeps/${substepId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function listCaseTasksRequest(caseId: string): Promise<TaskDto[]> {
  const response = await apiRequest<CaseTaskResponse[]>(`/cases/${caseId}/tasks`, { auth: true });
  return response.map((item) => ({
    id: item.id,
    caseId: item.caseId,
    stageId: item.stageId,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    status: item.status,
    assignedTo: item.assignedTo,
    assignedToName: item.assignedToName,
    createdBy: item.createdBy,
    createdByName: item.createdByName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
  }));
}

export async function createCaseTaskRequest(
  caseId: string,
  payload: {
    stageId?: string;
    title: string;
    description?: string;
    dueDate?: string;
    status: "TODO" | "DOING" | "DONE" | "BLOCKED";
    assignedTo?: string;
  },
): Promise<TaskDto> {
  const item = await apiRequest<CaseTaskResponse>(`/cases/${caseId}/tasks`, {
    method: "POST",
    auth: true,
    body: {
      stageId: payload.stageId || null,
      title: payload.title,
      description: payload.description || null,
      dueDate: payload.dueDate || null,
      status: payload.status,
      assignedTo: payload.assignedTo || null,
    },
  });
  return {
    id: item.id,
    caseId: item.caseId,
    stageId: item.stageId,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    status: item.status,
    assignedTo: item.assignedTo,
    assignedToName: item.assignedToName,
    createdBy: item.createdBy,
    createdByName: item.createdByName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
  };
}

export async function updateCaseTaskRequest(
  taskId: string,
  payload: {
    stageId?: string;
    title: string;
    description?: string;
    dueDate?: string;
    status: "TODO" | "DOING" | "DONE" | "BLOCKED";
    assignedTo?: string;
  },
): Promise<TaskDto> {
  const item = await apiRequest<CaseTaskResponse>(`/tasks/${taskId}`, {
    method: "PATCH",
    auth: true,
    body: {
      stageId: payload.stageId || null,
      title: payload.title,
      description: payload.description || null,
      dueDate: payload.dueDate || null,
      status: payload.status,
      assignedTo: payload.assignedTo || null,
    },
  });
  return {
    id: item.id,
    caseId: item.caseId,
    stageId: item.stageId,
    title: item.title,
    description: item.description,
    dueDate: item.dueDate,
    status: item.status,
    assignedTo: item.assignedTo,
    assignedToName: item.assignedToName,
    createdBy: item.createdBy,
    createdByName: item.createdByName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
  };
}

export async function deleteCaseTaskRequest(taskId: string): Promise<void> {
  await apiRequest<void>(`/tasks/${taskId}`, {
    method: "DELETE",
    auth: true,
  });
}

type PatrimonyStructureResponse = {
  id: string;
  caseId: string;
  title: string;
  status: "DRAFT" | "PUBLISHED";
  version: number;
  notesInternal?: string;
  notesClient?: string;
  originalDocumentName?: string;
  originalDocumentMimeType?: string;
  originalDocumentSizeBytes?: number;
  originalDocumentStorageKey?: string;
  originalDocumentVisibleToClient: boolean;
  createdAt: string;
  updatedAt: string;
} | null;

type PatrimonyNodeResponse = {
  id: string;
  structureId: string;
  type: "PERSON" | "HOLDING" | "OPERATING_COMPANY" | "OFFSHORE" | "REAL_ESTATE_URBAN" | "REAL_ESTATE_RURAL" | "OTHER_ASSET" | "NOTE";
  label: string;
  subtitle?: string;
  description?: string;
  value?: string;
  percentage?: string;
  location?: string;
  parentId: string | null;
  sortOrder: number;
  isVisibleToClient: boolean;
  metadataJson?: string;
  createdAt: string;
  updatedAt: string;
};

const toFrontendPatrimonyStatus = (status: "DRAFT" | "PUBLISHED"): "draft" | "published" => (status === "PUBLISHED" ? "published" : "draft");
const toBackendPatrimonyStatus = (status: "draft" | "published"): "DRAFT" | "PUBLISHED" => (status === "published" ? "PUBLISHED" : "DRAFT");
const toFrontendNodeType = (type: PatrimonyNodeResponse["type"]): PatrimonyNodeDto["type"] => {
  switch (type) {
    case "PERSON": return "person";
    case "HOLDING": return "holding";
    case "OPERATING_COMPANY": return "operating_company";
    case "OFFSHORE": return "offshore";
    case "REAL_ESTATE_URBAN": return "real_estate_urban";
    case "REAL_ESTATE_RURAL": return "real_estate_rural";
    case "OTHER_ASSET": return "other_asset";
    case "NOTE": return "note";
  }
};
const toBackendNodeType = (type: PatrimonyNodeDto["type"]): PatrimonyNodeResponse["type"] => {
  switch (type) {
    case "person": return "PERSON";
    case "holding": return "HOLDING";
    case "operating_company": return "OPERATING_COMPANY";
    case "offshore": return "OFFSHORE";
    case "real_estate_urban": return "REAL_ESTATE_URBAN";
    case "real_estate_rural": return "REAL_ESTATE_RURAL";
    case "other_asset": return "OTHER_ASSET";
    case "note": return "NOTE";
  }
};

function parseMetadata(json?: string): Record<string, string> | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as Record<string, string>;
  } catch {
    return undefined;
  }
}

function toStructureDto(item: Exclude<PatrimonyStructureResponse, null>): PatrimonyStructureDto {
  return {
    id: item.id,
    caseId: item.caseId,
    title: item.title,
    status: toFrontendPatrimonyStatus(item.status),
    version: item.version,
    notesInternal: item.notesInternal,
    notesClient: item.notesClient,
    originalDocumentName: item.originalDocumentName,
    originalDocumentMimeType: item.originalDocumentMimeType,
    originalDocumentSizeBytes: item.originalDocumentSizeBytes,
    originalDocumentStorageKey: item.originalDocumentStorageKey,
    originalDocumentVisibleToClient: item.originalDocumentVisibleToClient,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function toNodeDto(item: PatrimonyNodeResponse): PatrimonyNodeDto {
  return {
    id: item.id,
    structureId: item.structureId,
    type: toFrontendNodeType(item.type),
    label: item.label,
    subtitle: item.subtitle,
    description: item.description,
    value: item.value,
    percentage: item.percentage,
    location: item.location,
    parentId: item.parentId,
    sortOrder: item.sortOrder,
    isVisibleToClient: item.isVisibleToClient,
    metadata: parseMetadata(item.metadataJson),
  };
}

export async function getCasePatrimonyStructureRequest(caseId: string): Promise<PatrimonyStructureDto | null> {
  const response = await apiRequest<PatrimonyStructureResponse>(`/cases/${caseId}/patrimony/structure`, { auth: true });
  if (!response) return null;
  return toStructureDto(response);
}

export async function createCasePatrimonyStructureRequest(caseId: string, title: string): Promise<PatrimonyStructureDto> {
  const response = await apiRequest<Exclude<PatrimonyStructureResponse, null>>(`/cases/${caseId}/patrimony/structure`, {
    method: "POST",
    auth: true,
    body: { title },
  });
  return toStructureDto(response);
}

export async function updatePatrimonyStructureRequest(
  structureId: string,
  payload: Partial<{
    title: string;
    status: "draft" | "published";
    version: number;
    notesInternal: string;
    notesClient: string;
    originalDocumentName: string;
    originalDocumentMimeType: string;
    originalDocumentSizeBytes: number;
    originalDocumentStorageKey: string;
    originalDocumentVisibleToClient: boolean;
  }>,
): Promise<PatrimonyStructureDto> {
  const response = await apiRequest<Exclude<PatrimonyStructureResponse, null>>(`/patrimony/structures/${structureId}`, {
    method: "PATCH",
    auth: true,
    body: {
      title: payload.title,
      status: payload.status ? toBackendPatrimonyStatus(payload.status) : undefined,
      version: payload.version,
      notesInternal: payload.notesInternal,
      notesClient: payload.notesClient,
      originalDocumentName: payload.originalDocumentName,
      originalDocumentMimeType: payload.originalDocumentMimeType,
      originalDocumentSizeBytes: payload.originalDocumentSizeBytes,
      originalDocumentStorageKey: payload.originalDocumentStorageKey,
      originalDocumentVisibleToClient: payload.originalDocumentVisibleToClient,
    },
  });
  return toStructureDto(response);
}

export async function listPatrimonyNodesRequest(structureId: string): Promise<PatrimonyNodeDto[]> {
  const response = await apiRequest<PatrimonyNodeResponse[]>(`/patrimony/structures/${structureId}/nodes`, { auth: true });
  return response.map(toNodeDto);
}

export async function createPatrimonyNodeRequest(
  structureId: string,
  payload: Omit<PatrimonyNodeDto, "id">,
): Promise<PatrimonyNodeDto> {
  const response = await apiRequest<PatrimonyNodeResponse>(`/patrimony/structures/${structureId}/nodes`, {
    method: "POST",
    auth: true,
    body: {
      type: toBackendNodeType(payload.type),
      label: payload.label,
      subtitle: payload.subtitle || null,
      description: payload.description || null,
      value: payload.value || null,
      percentage: payload.percentage || null,
      location: payload.location || null,
      parentId: payload.parentId || null,
      sortOrder: payload.sortOrder,
      isVisibleToClient: payload.isVisibleToClient,
      metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : null,
    },
  });
  return toNodeDto(response);
}

export async function updatePatrimonyNodeRequest(
  nodeId: string,
  payload: Omit<PatrimonyNodeDto, "id">,
): Promise<PatrimonyNodeDto> {
  const response = await apiRequest<PatrimonyNodeResponse>(`/patrimony/nodes/${nodeId}`, {
    method: "PATCH",
    auth: true,
    body: {
      type: toBackendNodeType(payload.type),
      label: payload.label,
      subtitle: payload.subtitle || null,
      description: payload.description || null,
      value: payload.value || null,
      percentage: payload.percentage || null,
      location: payload.location || null,
      parentId: payload.parentId || null,
      sortOrder: payload.sortOrder,
      isVisibleToClient: payload.isVisibleToClient,
      metadataJson: payload.metadata ? JSON.stringify(payload.metadata) : null,
    },
  });
  return toNodeDto(response);
}

export async function deletePatrimonyNodeRequest(nodeId: string): Promise<void> {
  await apiRequest<void>(`/patrimony/nodes/${nodeId}`, { method: "DELETE", auth: true });
}

export async function uploadPatrimonyOriginalDocumentRequest(
  structureId: string,
  file: File,
): Promise<{ storageKey: string }> {
  const presign = await apiRequest<DocumentPresignResponse>(`/patrimony/structures/${structureId}/original-document/presign`, {
    method: "POST",
    auth: true,
    body: {
      originalName: file.name,
      mimeType: file.type || "application/pdf",
      sizeBytes: file.size,
    },
  });
  const uploadResponse = await fetch(presign.uploadUrl, {
    method: presign.method || "PUT",
    headers: { "Content-Type": file.type || "application/pdf" },
    body: file,
  });
  if (!uploadResponse.ok) throw new Error("Falha ao enviar PDF para storage.");
  return { storageKey: presign.storageKey };
}

export async function getPatrimonyOriginalDocumentDownloadUrlRequest(structureId: string): Promise<string> {
  const response = await apiRequest<{ url: string }>(`/patrimony/structures/${structureId}/original-document/download-link`, {
    method: "POST",
    auth: true,
  });
  return response.url;
}

export type PortalLinkState = {
  id: string | null;
  status: PortalLinkStatus | null;
  expiresAt: string | null;
  revokedAt: string | null;
  lastAccessAt: string | null;
  url: string | null;
};

export async function getCasePortalLinkStatusRequest(caseId: string): Promise<PortalLinkState> {
  const response = await apiRequest<PortalLinkResponse>(`/cases/${caseId}/portal-link`, { auth: true });
  return {
    id: response.id,
    status: response.status,
    expiresAt: response.expiresAt,
    revokedAt: response.revokedAt,
    lastAccessAt: response.lastAccessAt,
    url: response.url,
  };
}

export async function activateCasePortalLinkRequest(caseId: string, ttlMinutes = 10080): Promise<PortalLinkState> {
  const response = await apiRequest<PortalLinkResponse>(`/cases/${caseId}/portal-link/activate`, {
    method: "POST",
    auth: true,
    body: { ttlMinutes },
  });
  return {
    id: response.id,
    status: response.status,
    expiresAt: response.expiresAt,
    revokedAt: response.revokedAt,
    lastAccessAt: response.lastAccessAt,
    url: response.url,
  };
}

export async function revokeCasePortalLinkRequest(caseId: string): Promise<PortalLinkState> {
  const response = await apiRequest<PortalLinkResponse>(`/cases/${caseId}/portal-link/revoke`, {
    method: "POST",
    auth: true,
  });
  return {
    id: response.id,
    status: response.status,
    expiresAt: response.expiresAt,
    revokedAt: response.revokedAt,
    lastAccessAt: response.lastAccessAt,
    url: response.url,
  };
}
