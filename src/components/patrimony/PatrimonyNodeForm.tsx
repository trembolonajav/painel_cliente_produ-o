import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { PatrimonyNodeData, PatrimonyNodeType } from "@/types";
import { deleteNode, updateNode } from "@/services/patrimony";

const typeLabels: Record<PatrimonyNodeType, string> = {
  person: "Pessoa",
  holding: "Holding",
  operating_company: "Empresa",
  offshore: "Offshore",
  real_estate_urban: "Imovel urbano",
  real_estate_rural: "Imovel rural",
  other_asset: "Outro ativo",
  note: "Observacao",
};

type Props = {
  node: PatrimonyNodeData;
  allNodes: PatrimonyNodeData[];
  userId: string;
  onClose: () => void;
  onSaved: () => void;
};

export default function PatrimonyNodeForm({ node, allNodes, userId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({ ...node });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...node });
  }, [node.id]);

  const setField = <K extends keyof PatrimonyNodeData>(key: K, value: PatrimonyNodeData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const possibleParents = allNodes.filter((n) => n.id !== node.id);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNode(node.id, form, userId);
      toast.success("No atualizado");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar no");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteNode(node.id, userId);
      toast.success("No removido");
      onClose();
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao excluir no");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-card border-l h-full flex flex-col w-80 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-heading font-bold text-sm text-foreground">Editar no</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tipo</label>
          <select
            value={form.type}
            onChange={(e) => setField("type", e.target.value as PatrimonyNodeType)}
            className="input-field text-sm mt-1"
          >
            {Object.entries(typeLabels).map(([key, value]) => (
              <option key={key} value={key}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Nome</label>
          <input value={form.label} onChange={(e) => setField("label", e.target.value)} className="input-field text-sm mt-1" />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Subtitulo</label>
          <input
            value={form.subtitle || ""}
            onChange={(e) => setField("subtitle", e.target.value)}
            className="input-field text-sm mt-1"
            placeholder="Ex: CNPJ, CPF..."
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Descricao</label>
          <textarea
            value={form.description || ""}
            onChange={(e) => setField("description", e.target.value)}
            className="input-field text-sm mt-1 min-h-[60px] resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Valor</label>
            <input
              value={form.value || ""}
              onChange={(e) => setField("value", e.target.value)}
              className="input-field text-sm mt-1"
              placeholder="R$ 0"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Percentual</label>
            <input
              value={form.percentage || ""}
              onChange={(e) => setField("percentage", e.target.value)}
              className="input-field text-sm mt-1"
              placeholder="100%"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Localizacao</label>
          <input
            value={form.location || ""}
            onChange={(e) => setField("location", e.target.value)}
            className="input-field text-sm mt-1"
            placeholder="Cidade, Estado"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">No pai</label>
          <select
            value={form.parentId || ""}
            onChange={(e) => setField("parentId", e.target.value || null)}
            className="input-field text-sm mt-1"
          >
            <option value="">Raiz (sem pai)</option>
            {possibleParents.map((parent) => (
              <option key={parent.id} value={parent.id}>
                {parent.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="node-visible-client"
            type="checkbox"
            checked={form.isVisibleToClient}
            onChange={(e) => setField("isVisibleToClient", e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="node-visible-client" className="text-xs text-muted-foreground">
            Visivel para o cliente
          </label>
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        <button onClick={handleSave} className="btn-gold w-full py-2 text-sm" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alteracoes"}
        </button>
        <button onClick={handleDelete} className="w-full py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors" disabled={saving}>
          Excluir no
        </button>
      </div>
    </div>
  );
}
