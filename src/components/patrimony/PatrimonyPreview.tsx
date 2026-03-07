import { Building, Globe, Home, Landmark, Package, StickyNote, TreePine, Users } from "lucide-react";
import type { PatrimonyNodeData, PatrimonyNodeType } from "@/types";
import { buildTree } from "@/services/patrimony";

type TreeNode = PatrimonyNodeData & { children: TreeNode[] };

const nodeConfig: Record<PatrimonyNodeType, { icon: typeof Landmark; bgClass: string }> = {
  holding: { icon: Landmark, bgClass: "bg-primary text-primary-foreground" },
  person: { icon: Users, bgClass: "bg-gold/15 text-gold border border-gold/30" },
  operating_company: { icon: Building, bgClass: "bg-muted text-foreground border" },
  offshore: { icon: Globe, bgClass: "bg-muted text-foreground border" },
  real_estate_urban: { icon: Home, bgClass: "bg-muted text-foreground border" },
  real_estate_rural: { icon: TreePine, bgClass: "bg-muted text-foreground border" },
  other_asset: { icon: Package, bgClass: "bg-muted text-foreground border" },
  note: { icon: StickyNote, bgClass: "bg-gold/10 text-gold border border-gold/20" },
};

function NodeCard({
  node,
  onSelect,
  selectedId,
}: {
  node: TreeNode;
  onSelect?: (node: PatrimonyNodeData) => void;
  selectedId?: string;
}) {
  const cfg = nodeConfig[node.type];
  const Icon = cfg.icon;
  const isSelected = selectedId === node.id;

  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect?.(node)}
        className={`rounded-xl px-4 py-3 text-center min-w-[140px] max-w-[200px] transition-all ${cfg.bgClass} ${
          onSelect ? "cursor-pointer hover:ring-2 hover:ring-gold/40" : ""
        } ${isSelected ? "ring-2 ring-gold" : ""}`}
      >
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Icon className="w-4 h-4 shrink-0" />
          <span className="font-medium text-xs leading-tight">{node.label}</span>
        </div>
        {node.subtitle && <p className="text-[10px] opacity-70 leading-tight">{node.subtitle}</p>}
        {node.value && <p className="text-[10px] font-semibold mt-0.5">{node.value}</p>}
        {node.percentage && <p className="text-[10px] opacity-70">{node.percentage}</p>}
      </div>

      {node.children.length > 0 && (
        <>
          <div className="w-px h-5 bg-border" />
          {node.children.length === 1 ? (
            <NodeCard node={node.children[0]} onSelect={onSelect} selectedId={selectedId} />
          ) : (
            <div className="relative">
              <div
                className="absolute top-0 h-px bg-border"
                style={{ left: `${100 / (node.children.length * 2)}%`, right: `${100 / (node.children.length * 2)}%` }}
              />
              <div className="flex gap-4 items-start">
                {node.children.map((child) => (
                  <div key={child.id} className="flex flex-col items-center">
                    <div className="w-px h-5 bg-border" />
                    <NodeCard node={child} onSelect={onSelect} selectedId={selectedId} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NodeListItem({
  node,
  depth,
  onSelect,
  selectedId,
}: {
  node: TreeNode;
  depth: number;
  onSelect?: (node: PatrimonyNodeData) => void;
  selectedId?: string;
}) {
  const cfg = nodeConfig[node.type];
  const Icon = cfg.icon;

  return (
    <>
      <div
        onClick={() => onSelect?.(node)}
        className={`flex items-center gap-2.5 p-3 rounded-lg border transition-colors ${
          selectedId === node.id ? "border-gold bg-gold/5" : "hover:border-gold/30"
        } ${onSelect ? "cursor-pointer" : ""}`}
        style={{ marginLeft: depth * 20 }}
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bgClass}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground truncate">{node.label}</p>
          {(node.subtitle || node.value || node.percentage) && (
            <p className="text-[10px] text-muted-foreground truncate">
              {[node.subtitle, node.value, node.percentage].filter(Boolean).join(" - ")}
            </p>
          )}
        </div>
      </div>
      {node.children.map((child) => (
        <NodeListItem key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </>
  );
}

type Props = {
  nodes: PatrimonyNodeData[];
  onSelect?: (node: PatrimonyNodeData) => void;
  selectedId?: string;
  title?: string;
};

export default function PatrimonyPreview({ nodes, onSelect, selectedId, title }: Props) {
  const tree = buildTree(nodes) as TreeNode[];

  if (tree.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-10 text-center">
        <div>
          <Landmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum no adicionado ainda.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Use o painel lateral para adicionar elementos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      {title && <h3 className="font-heading font-bold text-foreground text-sm mb-4 px-1">{title}</h3>}

      <div className="hidden md:flex justify-center py-6 px-4 min-w-fit">
        <div className="flex flex-col items-center gap-0">
          {tree.map((root) => (
            <NodeCard key={root.id} node={root} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      </div>

      <div className="md:hidden space-y-1.5 p-2">
        {tree.map((root) => (
          <NodeListItem key={root.id} node={root} depth={0} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </div>
    </div>
  );
}
