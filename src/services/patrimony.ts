import type { PatrimonyNodeData, PatrimonyStatus, PatrimonyStructureData } from "@/types";
import {
  createCasePatrimonyStructureRequest,
  createPatrimonyNodeRequest,
  deletePatrimonyNodeRequest,
  getCasePatrimonyStructureRequest,
  listPatrimonyNodesRequest,
  updatePatrimonyNodeRequest,
  updatePatrimonyStructureRequest,
  uploadPatrimonyOriginalDocumentRequest,
  getPatrimonyOriginalDocumentDownloadUrlRequest,
} from "./backend";

export async function getStructures(caseId: string): Promise<PatrimonyStructureData[]> {
  const structure = await getCasePatrimonyStructureRequest(caseId);
  if (!structure) return [];
  return [
    {
      id: structure.id,
      caseId: structure.caseId,
      title: structure.title,
      status: structure.status,
      version: structure.version,
      notesInternal: structure.notesInternal,
      notesClient: structure.notesClient,
      originalDocumentName: structure.originalDocumentName,
      originalDocumentMimeType: structure.originalDocumentMimeType,
      originalDocumentSizeBytes: structure.originalDocumentSizeBytes,
      originalDocumentStorageKey: structure.originalDocumentStorageKey,
      originalDocumentVisibleToClient: structure.originalDocumentVisibleToClient,
      createdAt: structure.createdAt,
      updatedAt: structure.updatedAt,
    },
  ];
}

export async function createStructure(caseId: string, title: string, _userId: string): Promise<PatrimonyStructureData> {
  const structure = await createCasePatrimonyStructureRequest(caseId, title);
  return {
    id: structure.id,
    caseId: structure.caseId,
    title: structure.title,
    status: structure.status,
    version: structure.version,
    notesInternal: structure.notesInternal,
    notesClient: structure.notesClient,
    originalDocumentName: structure.originalDocumentName,
    originalDocumentMimeType: structure.originalDocumentMimeType,
    originalDocumentSizeBytes: structure.originalDocumentSizeBytes,
    originalDocumentStorageKey: structure.originalDocumentStorageKey,
    originalDocumentVisibleToClient: structure.originalDocumentVisibleToClient,
    createdAt: structure.createdAt,
    updatedAt: structure.updatedAt,
  };
}

export async function updateStructure(
  id: string,
  data: Partial<PatrimonyStructureData>,
  _userId: string,
): Promise<PatrimonyStructureData | null> {
  const structure = await updatePatrimonyStructureRequest(id, {
    title: data.title,
    status: data.status,
    version: data.version,
    notesInternal: data.notesInternal,
    notesClient: data.notesClient,
    originalDocumentName: data.originalDocumentName,
    originalDocumentMimeType: data.originalDocumentMimeType,
    originalDocumentSizeBytes: data.originalDocumentSizeBytes,
    originalDocumentStorageKey: data.originalDocumentStorageKey,
    originalDocumentVisibleToClient: data.originalDocumentVisibleToClient,
  });
  return {
    id: structure.id,
    caseId: structure.caseId,
    title: structure.title,
    status: structure.status,
    version: structure.version,
    notesInternal: structure.notesInternal,
    notesClient: structure.notesClient,
    originalDocumentName: structure.originalDocumentName,
    originalDocumentMimeType: structure.originalDocumentMimeType,
    originalDocumentSizeBytes: structure.originalDocumentSizeBytes,
    originalDocumentStorageKey: structure.originalDocumentStorageKey,
    originalDocumentVisibleToClient: structure.originalDocumentVisibleToClient,
    createdAt: structure.createdAt,
    updatedAt: structure.updatedAt,
  };
}

export async function publishStructure(id: string, userId: string): Promise<PatrimonyStructureData | null> {
  return updateStructure(id, { status: "published" as PatrimonyStatus }, userId);
}

export async function unpublishStructure(id: string, userId: string): Promise<PatrimonyStructureData | null> {
  return updateStructure(id, { status: "draft" as PatrimonyStatus }, userId);
}

export async function getNodes(structureId: string): Promise<PatrimonyNodeData[]> {
  const nodes = await listPatrimonyNodesRequest(structureId);
  return nodes
    .map((node) => ({
      id: node.id,
      structureId: node.structureId,
      type: node.type,
      label: node.label,
      subtitle: node.subtitle,
      description: node.description,
      value: node.value,
      percentage: node.percentage,
      location: node.location,
      parentId: node.parentId,
      sortOrder: node.sortOrder,
      isVisibleToClient: node.isVisibleToClient,
      metadata: node.metadata,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function createNode(data: Omit<PatrimonyNodeData, "id">, _userId: string): Promise<PatrimonyNodeData> {
  const node = await createPatrimonyNodeRequest(data.structureId, data);
  return {
    id: node.id,
    structureId: node.structureId,
    type: node.type,
    label: node.label,
    subtitle: node.subtitle,
    description: node.description,
    value: node.value,
    percentage: node.percentage,
    location: node.location,
    parentId: node.parentId,
    sortOrder: node.sortOrder,
    isVisibleToClient: node.isVisibleToClient,
    metadata: node.metadata,
  };
}

export async function updateNode(id: string, data: Partial<PatrimonyNodeData>, _userId: string): Promise<PatrimonyNodeData | null> {
  // API exige payload completo: primeiro carrega estado atual do nó
  if (!data.structureId) {
    throw new Error("structureId é obrigatório para atualizar nó.");
  }
  const nodes = await listPatrimonyNodesRequest(data.structureId);
  const current = nodes.find((n) => n.id === id);
  if (!current) return null;

  const next = {
    ...current,
    ...data,
    metadata: data.metadata ?? current.metadata,
  };
  const updated = await updatePatrimonyNodeRequest(id, next);
  return {
    id: updated.id,
    structureId: updated.structureId,
    type: updated.type,
    label: updated.label,
    subtitle: updated.subtitle,
    description: updated.description,
    value: updated.value,
    percentage: updated.percentage,
    location: updated.location,
    parentId: updated.parentId,
    sortOrder: updated.sortOrder,
    isVisibleToClient: updated.isVisibleToClient,
    metadata: updated.metadata,
  };
}

export async function deleteNode(id: string, _userId: string): Promise<boolean> {
  await deletePatrimonyNodeRequest(id);
  return true;
}

export async function uploadOriginalDocument(structureId: string, file: File): Promise<{ storageKey: string }> {
  return uploadPatrimonyOriginalDocumentRequest(structureId, file);
}

export async function getOriginalDocumentDownloadUrl(structureId: string): Promise<string> {
  return getPatrimonyOriginalDocumentDownloadUrlRequest(structureId);
}

export function buildTree(nodes: PatrimonyNodeData[]): (PatrimonyNodeData & { children: PatrimonyNodeData[] })[] {
  const grouped = new Map<string | null, PatrimonyNodeData[]>();

  nodes.forEach((node) => {
    const list = grouped.get(node.parentId) || [];
    list.push(node);
    grouped.set(node.parentId, list);
  });

  const attach = (parentId: string | null): (PatrimonyNodeData & { children: PatrimonyNodeData[] })[] => {
    return (grouped.get(parentId) || [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((node) => ({ ...node, children: attach(node.id) }));
  };

  return attach(null);
}
