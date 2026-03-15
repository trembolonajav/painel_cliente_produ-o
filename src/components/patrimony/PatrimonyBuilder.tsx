import { useEffect, useMemo, useState } from "react";
import {
  Building,
  Eye,
  FileText,
  FileUp,
  Globe,
  Home,
  Landmark,
  Package,
  Pencil,
  Plus,
  Save,
  Send,
  StickyNote,
  TreePine,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { PatrimonyNodeData, PatrimonyNodeType, PatrimonyStructureData } from "@/types";
import {
  createNode,
  createStructure,
  deleteOriginalDocument,
  getNodes,
  getStructures,
  getOriginalDocumentDownloadUrl,
  publishStructure,
  unpublishStructure,
  updateStructure,
  uploadOriginalDocument,
} from "@/services/patrimony";
import PatrimonyNodeForm from "./PatrimonyNodeForm";
import PatrimonyPreview from "./PatrimonyPreview";

const addButtons: { type: PatrimonyNodeType; label: string; icon: typeof Landmark }[] = [
  { type: "person", label: "Pessoa", icon: Users },
  { type: "holding", label: "Holding", icon: Landmark },
  { type: "operating_company", label: "Empresa", icon: Building },
  { type: "offshore", label: "Offshore", icon: Globe },
  { type: "real_estate_urban", label: "Imovel urbano", icon: Home },
  { type: "real_estate_rural", label: "Imovel rural", icon: TreePine },
  { type: "other_asset", label: "Outro ativo", icon: Package },
  { type: "note", label: "Observacao", icon: StickyNote },
];

type Props = {
  caseId: string;
  userId: string;
  canWrite: boolean;
};

export default function PatrimonyBuilder({ caseId, userId, canWrite }: Props) {
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [subTab, setSubTab] = useState<"editor" | "preview" | "document">("editor");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [structure, setStructure] = useState<PatrimonyStructureData | null>(null);
  const [nodes, setNodes] = useState<PatrimonyNodeData[]>([]);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getStructures(caseId),
    ])
      .then(async ([structures]) => {
        const current = structures[0] ?? null;
        setStructure(current);
        if (current) {
          const loadedNodes = await getNodes(current.id);
          setNodes(loadedNodes);
        } else {
          setNodes([]);
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "Falha ao carregar estrutura patrimonial");
      })
      .finally(() => setLoading(false));
  }, [caseId, tick]);

  const selectedNode = useMemo(() => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null), [nodes, selectedNodeId]);

  const handleCreateStructure = async () => {
    try {
      await createStructure(caseId, "Estruturacao Patrimonial", userId);
      toast.success("Estrutura criada");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar estrutura");
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando estrutura patrimonial...</div>;
  }

  if (!structure && !canWrite) {
    return (
      <div className="flex items-center justify-center p-10 text-center">
        <div>
          <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhuma estrutura patrimonial cadastrada.</p>
        </div>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="flex items-center justify-center p-10 text-center">
        <div>
          <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">Nenhuma estrutura patrimonial ainda.</p>
          <button onClick={handleCreateStructure} className="btn-gold px-5 py-2 text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Criar estrutura
          </button>
        </div>
      </div>
    );
  }

  const handleAddNode = async (type: PatrimonyNodeType) => {
    try {
      const newNode = await createNode(
        {
          structureId: structure.id,
          type,
          label: addButtons.find((button) => button.type === type)?.label ?? "No",
          parentId: selectedNodeId,
          sortOrder: nodes.length,
          isVisibleToClient: true,
        },
        userId,
      );
      setSelectedNodeId(newNode.id);
      toast.success("No adicionado");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao adicionar no");
    }
  };

  const handlePublish = async () => {
    try {
      if (structure.status === "published") {
        await unpublishStructure(structure.id, userId);
        toast.success("Estrutura voltou para rascunho");
      } else {
        await publishStructure(structure.id, userId);
        toast.success("Estrutura publicada");
      }
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atualizar status");
    }
  };

  const handleSaveDraft = async () => {
    try {
      await updateStructure(structure.id, {}, userId);
      toast.success("Rascunho salvo");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar rascunho");
    }
  };

  const handleAttachDocFile = async (file: File | null) => {
    if (!file) return;
    try {
      const { storageKey } = await uploadOriginalDocument(structure.id, file);
      await updateStructure(
        structure.id,
        {
          originalDocumentName: file.name,
          originalDocumentMimeType: file.type || "application/pdf",
          originalDocumentSizeBytes: file.size,
          originalDocumentStorageKey: storageKey,
        },
        userId,
      );
      toast.success("Documento original anexado");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel anexar o documento");
    }
  };

  const handleOpenOriginal = async () => {
    try {
      const url = await getOriginalDocumentDownloadUrl(structure.id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir PDF original");
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-heading font-bold text-foreground">{structure.title}</h2>
          <span className={`status-badge ${structure.status === "published" ? "status-complete" : "status-waiting"}`}>
            {structure.status === "published" ? "Publicado" : "Rascunho"}
          </span>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveDraft}
              className="px-3 py-1.5 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Save className="w-3 h-3" /> Salvar
            </button>
            <button onClick={handlePublish} className="btn-gold px-3 py-1.5 text-xs flex items-center gap-1">
              <Send className="w-3 h-3" /> {structure.status === "published" ? "Despublicar" : "Publicar"}
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => setSubTab("editor")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "editor" ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="w-3.5 h-3.5" /> Editor
        </button>
        <button
          onClick={() => setSubTab("preview")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "preview" ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Preview
        </button>
        <button
          onClick={() => setSubTab("document")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            subTab === "document" ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> Documento original
        </button>
      </div>

      {subTab === "editor" && (
        <div className="flex gap-0 border rounded-xl overflow-hidden bg-card min-h-[500px]">
          {canWrite && (
            <div className="w-48 border-r p-3 space-y-1.5 shrink-0 bg-muted/30">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Adicionar</p>
              {addButtons.map((button) => (
                <button
                  key={button.type}
                  onClick={() => handleAddNode(button.type)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-left"
                >
                  <button.icon className="w-3.5 h-3.5 shrink-0" />
                  {button.label}
                </button>
              ))}

              {selectedNodeId && <p className="text-[10px] text-gold mt-3 px-1">Novo no sera filho do no selecionado</p>}
            </div>
          )}

          <PatrimonyPreview
            nodes={nodes}
            selectedId={selectedNodeId ?? undefined}
            onSelect={(node) => setSelectedNodeId(selectedNodeId === node.id ? null : node.id)}
          />

          {selectedNode && canWrite && (
            <PatrimonyNodeForm
              node={selectedNode}
              allNodes={nodes}
              userId={userId}
              onClose={() => setSelectedNodeId(null)}
              onSaved={refresh}
            />
          )}
        </div>
      )}

      {subTab === "preview" && (
        <div className="border rounded-xl bg-card p-6 min-h-[400px]">
          <p className="text-xs text-muted-foreground mb-4">
            Esta e a visualizacao do cliente, mostrando apenas os nos marcados como visiveis.
          </p>
          <PatrimonyPreview nodes={nodes.filter((node) => node.isVisibleToClient)} title={structure.title} />
        </div>
      )}

      {subTab === "document" && (
        <div className="border rounded-xl bg-card p-6 min-h-[300px]">
          <h3 className="font-heading font-bold text-foreground text-sm mb-2">Documento original</h3>
          <p className="text-xs text-muted-foreground mb-5">
            O PDF original e um complemento da estrutura visual e nao substitui o builder.
          </p>

          {structure.originalDocumentName ? (
            <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
              <FileText className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-foreground">{structure.originalDocumentName}</p>
                <p className="text-xs text-muted-foreground">
                  {(structure.originalDocumentSizeBytes || 0) > 0
                    ? `${Math.max(1, Math.round((structure.originalDocumentSizeBytes || 0) / 1024))} KB`
                    : "PDF anexado"}
                </p>
              </div>
              {structure.originalDocumentStorageKey && (
                <button onClick={handleOpenOriginal} className="text-xs px-3 py-2 border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                  Abrir PDF
                </button>
              )}
              {canWrite && (
                <div className="flex items-center gap-2">
                  <label className="text-xs px-3 py-2 border rounded-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    Trocar PDF
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        handleAttachDocFile(e.target.files?.[0] ?? null);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={async () => {
                      await deleteOriginalDocument(structure.id);
                      toast.success("Documento original removido");
                      refresh();
                    }}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-xl text-center">
              <FileUp className="w-8 h-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground mb-3">Nenhum documento anexado</p>
              {canWrite && (
                <label className="btn-gold px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer">
                  <FileUp className="w-3.5 h-3.5" /> Anexar PDF original
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      handleAttachDocFile(e.target.files?.[0] ?? null);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {canWrite && (
            <div className="mt-4 flex items-center gap-2">
              <input
                id="original-visible-client"
                type="checkbox"
                className="rounded border-border"
                checked={!!structure.originalDocumentVisibleToClient}
                onChange={async (e) => {
                  await updateStructure(structure.id, { originalDocumentVisibleToClient: e.target.checked }, userId);
                  refresh();
                }}
              />
              <label htmlFor="original-visible-client" className="text-xs text-muted-foreground">
                Visivel ao cliente no portal
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
