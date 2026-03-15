export type UserRole = "administrador" | "gestor" | "estagiario";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  password?: string; // plaintext only when using mock fallback
  role: UserRole;
  active: boolean;
}

export interface OfficeSettings {
  name: string;
  tagline: string;
  initials: string;
  domain: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
}

export interface Client {
  id: string;
  name: string;
  type: "Pessoa Física" | "Pessoa Jurídica";
  cpf?: string; // first 3 digits for portal verification
  email?: string;
  phone?: string;
  caseCount: number;
  createdAt: string;
  createdBy: string;
}

export interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus = "em_andamento" | "aguardando_cliente" | "concluido" | "risco";
export type CasePriority = "alta" | "media" | "baixa";

export interface CaseData {
  id: string;
  code: string;
  caseNumber?: string;
  title: string;
  subtitle: string;
  currentStatus?: string;
  clientId: string;
  partnerId?: string;
  partnerName?: string;
  status: CaseStatus;
  priority: CasePriority;
  responsible: string;
  team: string[];
  currentStage: number;
  nextAction: string;
  createdAt: string;
  updatedAt: string;
}

export type StageStatus = "concluido" | "em_andamento" | "pendente";
export type StageSubstepStatus = "pendente" | "em_andamento" | "concluido";

export interface CaseStageSubstep {
  id: string;
  stageId: string;
  title: string;
  description?: string;
  date?: string;
  status: StageSubstepStatus;
  order: number;
  visibleToClient: boolean;
}

export interface CaseStage {
  id: string;
  caseId: string;
  name: string;
  status: StageStatus;
  date?: string;
  description: string;
  visibleToClient: boolean;
  order: number;
  substeps?: CaseStageSubstep[];
}

export interface CaseTask {
  id: string;
  caseId: string;
  label: string;
  done: boolean;
  responsible?: string;
  createdAt: string;
}

export type DocVisibility = "interno" | "cliente";
export type DocStatus = "disponivel" | "pendente";

export interface CaseDocument {
  id: string;
  caseId: string;
  name: string;
  type: string;
  date: string;
  visibility: DocVisibility;
  status: DocStatus;
  storageKey?: string;
  fileDataUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export interface CaseUpdate {
  id: string;
  caseId: string;
  date: string;
  text: string;
  author: string;
  internal: boolean;
}

export interface PortalLink {
  id: string;
  caseId: string;
  token: string;
  active: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
  createdBy: string;
}

export interface PortalAccessLog {
  id: string;
  portalLinkId: string;
  caseId: string;
  timestamp: string;
  success: boolean;
  cpfProvided: string;
}

export type AuditAction =
  | "login" | "logout"
  | "user_created" | "user_updated"
  | "client_created" | "client_updated"
  | "case_created" | "case_updated" | "case_status_changed"
  | "stage_updated"
  | "task_created" | "task_toggled"
  | "document_added"
  | "portal_link_generated" | "portal_link_revoked"
  | "portal_access_success" | "portal_access_failed"
  | "update_added";

export interface AuditLog {
  id: string;
  action: AuditAction;
  userId?: string;
  details: string;
  timestamp: string;
  entityType?: string;
  entityId?: string;
}

// Computed helpers
export interface CaseWithComputed extends CaseData {
  clientName: string;
  clientType: string;
  progress: number;
  pendingClient: number;
  portalActive: boolean;
  portalExpiry?: string;
  lastUpdate: string;
  stages: CaseStage[];
  documents: CaseDocument[];
  updates: CaseUpdate[];
  checklist: CaseTask[];
}

export interface PatrimonyNode {
  label: string;
  detail?: string;
  type: "holding" | "empresa" | "imovel" | "pessoa";
  children?: PatrimonyNode[];
}

export interface PatrimonyStructure {
  root: PatrimonyNode;
  children: PatrimonyNode[];
}

export type PatrimonyNodeType =
  | "person"
  | "holding"
  | "operating_company"
  | "offshore"
  | "real_estate_urban"
  | "real_estate_rural"
  | "other_asset"
  | "note";

export type PatrimonyStatus = "draft" | "published";

export interface PatrimonyNodeData {
  id: string;
  structureId: string;
  type: PatrimonyNodeType;
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
}

export interface PatrimonyStructureData {
  id: string;
  caseId: string;
  title: string;
  status: PatrimonyStatus;
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
}

// Permissions matrix
export const PERMISSIONS: Record<UserRole, Record<string, boolean>> = {
  administrador: {
    dashboard: true,
    clients_read: true, clients_write: true,
    cases_read: true, cases_write: true,
    stages_write: true, tasks_write: true, docs_write: true,
    portal_manage: true, audit_read: true,
    users_manage: true, settings_manage: true,
  },
  gestor: {
    dashboard: true,
    clients_read: true, clients_write: true,
    cases_read: true, cases_write: true,
    stages_write: true, tasks_write: true, docs_write: true,
    portal_manage: true, audit_read: false,
    users_manage: false, settings_manage: false,
  },
  estagiario: {
    dashboard: true,
    clients_read: true, clients_write: false,
    cases_read: true, cases_write: false,
    stages_write: false, tasks_write: false, docs_write: false,
    portal_manage: false, audit_read: false,
    users_manage: false, settings_manage: false,
  },
};
