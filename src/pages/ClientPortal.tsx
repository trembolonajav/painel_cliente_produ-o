import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Circle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Mail,
  Phone,
  Shield,
} from "lucide-react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { usePortal } from "@/context/PortalContext";
import {
  getClientPortalBootstrapRequest,
  getClientPortalDocumentDownloadUrlRequest,
  type ClientPortalCase,
  type ClientPortalDocument,
  type ClientPortalMe,
  type ClientPortalPatrimony,
  type ClientPortalPatrimonyOriginalDocument,
  type ClientPortalStage,
  type StaffUpdate,
} from "@/services/backend";
import { getItem } from "@/services/storage";
import type { OfficeSettings } from "@/types";
import abrLogo from "@/assets/abr-logo.png";
import PatrimonyPreview from "@/components/patrimony/PatrimonyPreview";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const statusLabel: Record<string, string> = {
  em_andamento: "Em andamento",
  aguardando_cliente: "Aguardando cliente",
  concluido: "Concluido",
  risco: "Atencao",
};

const progressFromStatus = (status: string): number => {
  if (status === "concluido") return 100;
  if (status === "aguardando_cliente") return 60;
  if (status === "risco") return 40;
  return 50;
};

const progressFromStages = (stages: ClientPortalStage[]): number | null => {
  if (stages.length === 0) return null;
  const done = stages.filter((stage) => stage.status === "concluido").length;
  return Math.round((done / stages.length) * 100);
};

const stageColorClass = (status: ClientPortalStage["status"]): string => {
  if (status === "concluido") return "text-[hsl(152_55%_39%)]";
  if (status === "em_andamento") return "text-gold";
  return "text-muted-foreground";
};

const stageStatusLabel = (status: ClientPortalStage["status"]): string => {
  if (status === "concluido") return "Concluido";
  if (status === "em_andamento") return "Em andamento";
  return "Pendente";
};

const formatShortDate = (dateValue: string): string =>
  new Date(dateValue).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const OFFICE_WHATSAPP = "5562993837928";
const OFFICE_EMAIL = "contato@abradvogados.com.br";

const ClientPortal = () => {
  const navigate = useNavigate();
  const { session, clearSession } = usePortal();
  const [activeSection, setActiveSection] = useState("andamento");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [me, setMe] = useState<ClientPortalMe | null>(null);
  const [caseData, setCaseData] = useState<ClientPortalCase | null>(null);
  const [docs, setDocs] = useState<ClientPortalDocument[]>([]);
  const [updates, setUpdates] = useState<StaffUpdate[]>([]);
  const [stages, setStages] = useState<ClientPortalStage[]>([]);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [patrimony, setPatrimony] = useState<ClientPortalPatrimony>(null);
  const [patrimonyOriginalDoc, setPatrimonyOriginalDoc] = useState<ClientPortalPatrimonyOriginalDocument | null>(null);
  const [currentStructurePage, setCurrentStructurePage] = useState(1);
  const [structureZoom, setStructureZoom] = useState(() => (typeof window !== "undefined" && window.innerWidth < 768 ? 2.2 : 1.7));
  const [structurePdf, setStructurePdf] = useState<PDFDocumentProxy | null>(null);
  const [structurePageCount, setStructurePageCount] = useState(1);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const office = getItem<OfficeSettings>("office_settings");

  useEffect(() => {
    if (!session?.sessionToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getClientPortalBootstrapRequest(session.sessionToken)
      .then((bootstrap) => {
        setMe(bootstrap.me);
        setCaseData(bootstrap.caseData);
        setDocs(bootstrap.documents);
        setUpdates(bootstrap.updates);
        setStages(bootstrap.stages);
        setPatrimony(bootstrap.patrimony);
        setPatrimonyOriginalDoc(bootstrap.patrimonyOriginalDocument);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Falha ao carregar o portal.");
      })
      .finally(() => setLoading(false));
  }, [session?.sessionToken]);

  const progress = useMemo(() => {
    const byStages = progressFromStages(stages);
    if (byStages !== null) return byStages;
    return progressFromStatus(caseData?.status ?? "em_andamento");
  }, [caseData?.status, stages]);

  const currentStage = useMemo(
    () => stages.find((stage) => stage.status === "em_andamento") ?? stages.find((stage) => stage.status === "pendente") ?? stages[0],
    [stages],
  );
  const pendingDocs = useMemo(() => docs.filter((doc) => doc.status === "pendente"), [docs]);
  const currentStatus = caseData?.currentStatus?.trim() || "";
  const availableDocs = useMemo(() => docs.filter((doc) => doc.status === "disponivel"), [docs]);
  const whatsappMessage = useMemo(() => {
    return `Olá, estou entrando em contato pois tenho dúvidas sobre o meu caso ${caseData?.title ?? ""}.`;
  }, [caseData?.title]);
  const whatsappUrl = useMemo(() => {
    return `https://wa.me/${OFFICE_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`;
  }, [whatsappMessage]);
  const emailUrl = useMemo(() => {
    const subject = `Dúvidas sobre o caso ${caseData?.title ?? ""}`;
    const body = [
      "Olá,",
      "",
      `Tenho dúvidas sobre o caso ${caseData?.title ?? ""}.`,
      "",
      "Aguardo retorno.",
    ].join("\n");
    return `mailto:${OFFICE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [caseData?.title]);

  useEffect(() => {
    setCurrentStructurePage(1);
  }, [patrimonyOriginalDoc?.url]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!patrimonyOriginalDoc?.url) {
        setStructurePdf(null);
        setStructurePageCount(1);
        setStructureLoading(false);
        setStructureError("");
        return;
      }
      setStructureLoading(true);
      setStructureError("");
      try {
        const pdf = await getDocument({ url: patrimonyOriginalDoc.url }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }
        setStructurePdf(pdf);
        setStructurePageCount(pdf.numPages || 1);
      } catch {
        if (!cancelled) {
          setStructurePdf(null);
          setStructurePageCount(1);
          setStructureError("Nao foi possivel carregar o PDF.");
        }
      } finally {
        if (!cancelled) setStructureLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [patrimonyOriginalDoc?.url]);

  useEffect(() => {
    if (currentStructurePage > structurePageCount) {
      setCurrentStructurePage(structurePageCount);
    }
  }, [currentStructurePage, structurePageCount]);

  useEffect(() => {
    let cancelled = false;
    const render = async () => {
      if (!structurePdf || !canvasRef.current || !canvasWrapRef.current) return;
      const page = await structurePdf.getPage(currentStructurePage);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: 1 });
      const targetWidth = Math.max(canvasWrapRef.current.clientWidth - 16, 320);
      const cssScale = (targetWidth / viewport.width) * structureZoom;
      const cssViewport = page.getViewport({ scale: cssScale });
      const pixelRatio = Math.max(window.devicePixelRatio || 1, 1);
      const renderViewport = page.getViewport({ scale: cssScale * pixelRatio });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${Math.floor(cssViewport.width)}px`;
      canvas.style.height = `${Math.floor(cssViewport.height)}px`;
      context.setTransform(1, 0, 0, 1, 0, 0);
      await page.render({ canvasContext: context, viewport: renderViewport }).promise;
    };
    render();
    return () => {
      cancelled = true;
    };
  }, [structurePdf, currentStructurePage, structureZoom]);

  const handleDownloadDocument = async (doc: ClientPortalDocument) => {
    if (!session?.sessionToken) return;
    try {
      const resolveUrl = await getClientPortalDocumentDownloadUrlRequest(doc.id, session.sessionToken);
      const resolveResponse = await fetch(resolveUrl);
      if (!resolveResponse.ok) {
        throw new Error("Falha ao resolver download.");
      }
      const resolved = (await resolveResponse.json()) as { downloadUrl?: string };
      if (!resolved.downloadUrl) {
        throw new Error("URL de download invalida.");
      }
      window.open(resolved.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao baixar documento.");
    }
  };

  const handleOpenStructureOriginal = () => {
    if (!patrimonyOriginalDoc?.url) return;
    window.open(patrimonyOriginalDoc.url, "_blank", "noopener,noreferrer");
  };

  const toggleExpand = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  };

  if (!session?.sessionToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-heading font-bold text-foreground mb-2">Acesso nao autorizado</h1>
          <p className="text-sm text-muted-foreground mb-4">Voce precisa acessar por um link valido fornecido pelo escritorio.</p>
          <button onClick={() => navigate("/portal/verificar")} className="btn-gold px-6 py-2 text-sm">Voltar</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-3">{error}</p>
          <button
            onClick={() => {
              clearSession();
              navigate("/portal/verificar");
            }}
            className="btn-gold px-6 py-2 text-sm"
          >
            Acessar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!caseData || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Dados do caso indisponiveis.</p>
      </div>
    );
  }

  const sections = [
    { key: "andamento", label: "Andamento" },
    { key: "documentos", label: "Documentos" },
    { key: "estrutura", label: "Estrutura" },
    { key: "historico", label: "Historico" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex items-center gap-3 mb-5">
            <img src={abrLogo} alt={office?.name} className="h-10 object-contain brightness-0 invert" />
          </div>

          <div className="mb-4">
            <p className="text-primary-foreground/60 text-xs mb-0.5">Seu caso</p>
            <h2 className="font-heading text-lg font-bold">{caseData.title}</h2>
            <p className="text-primary-foreground/60 text-sm mt-0.5">{me.clientName}</p>
          </div>

          <div className="bg-primary-foreground/10 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-primary-foreground/70">Progresso geral</span>
              <span className="font-bold text-gold">{progress}%</span>
            </div>
            <div className="h-2 bg-primary-foreground/10 rounded-full overflow-hidden">
              <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
            {currentStage && (
              <div className="mt-3 flex items-center gap-2 text-xs text-primary-foreground/60">
                <Clock className="w-3 h-3" />
                <span>Etapa atual: <strong className="text-primary-foreground">{currentStage.title ?? statusLabel[caseData.status]}</strong></span>
              </div>
            )}
            {currentStatus && (
              <p className="mt-2 text-sm leading-6 text-primary-foreground/78 whitespace-pre-wrap">
                {currentStatus}
              </p>
            )}
          </div>
        </div>
      </header>

      {pendingDocs.length > 0 && (
        <div className="max-w-3xl mx-auto px-5">
          <div className="bg-gold/10 border border-gold/20 rounded-xl p-4 mt-4">
            <h3 className="text-sm font-medium text-foreground mb-1">Documentos pendentes</h3>
            <p className="text-xs text-muted-foreground mb-2">Para avancar no caso, precisamos destes documentos:</p>
            <ul className="space-y-1">
              {pendingDocs.map((doc) => (
                <li key={doc.id} className="text-xs text-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  {doc.name}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <button
                onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
                className="btn-gold px-4 py-2 text-xs sm:text-sm"
              >
                Enviar documentacao pendente
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-5 mt-5">
        <div className="flex gap-1 border-b overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeSection === section.key ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-6">

        {activeSection === "andamento" && (
          <div className="animate-fade-in space-y-0">
            {stages.length === 0 ? (
              <div className="bg-card rounded-xl border p-4 text-sm text-muted-foreground">Nenhuma etapa cadastrada.</div>
            ) : (
              <>
                {stages.map((stage, index, arr) => {
                  const isDone = stage.status === "concluido";
                  const isCurrent = stage.status === "em_andamento";
                  const hasSubsteps = stage.substeps.length > 0;
                  const isExpanded = expandedStages.has(stage.id);
                  const completedSubsteps = stage.substeps.filter((substep) => substep.status === "concluido").length;

                  return (
                    <div key={stage.id}>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isDone ? "bg-[hsl(152_55%_39%)] text-card" :
                            isCurrent ? "bg-gold text-gold-foreground ring-4 ring-gold/20" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {isDone ? <CheckCircle2 className="w-4 h-4" /> :
                             isCurrent ? <Clock className="w-4 h-4" /> :
                             <span className="text-xs font-medium">{index + 1}</span>}
                          </div>
                          {(index < arr.length - 1 || (hasSubsteps && isExpanded)) && (
                            <div className={`w-px flex-1 my-1 min-h-[24px] ${isDone ? "bg-[hsl(152_55%_39%/0.3)]" : "bg-border"}`} />
                          )}
                        </div>
                        <div className={`pb-4 flex-1 ${stage.status === "pendente" ? "opacity-50" : ""}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className={`font-medium text-sm ${isCurrent ? "text-gold" : "text-foreground"}`}>{stage.title}</h3>
                            {isDone && <span className="text-[10px] text-[hsl(152_55%_39%)] font-medium">✓ Concluído</span>}
                            {isCurrent && <span className="text-[10px] text-gold font-medium">Em andamento</span>}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{stage.description || "Sem descricao"}</p>
                          <p className="text-[11px] text-muted-foreground/60 mt-1">{formatShortDate(stage.updatedAt)}</p>
                          {hasSubsteps && (
                            <button
                              onClick={() => toggleExpand(stage.id)}
                              className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              <span>Ver {completedSubsteps}/{stage.substeps.length} sub-etapas</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {hasSubsteps && isExpanded && (
                        <div className="ml-8 pl-4 border-l-2 border-dashed border-border/60 mb-3 space-y-2 animate-fade-in">
                          {stage.substeps.map((substep) => {
                            const subDone = substep.status === "concluido";
                            const subCurrent = substep.status === "em_andamento";

                            return (
                              <div key={substep.id} className="flex gap-3 py-1.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                  subDone ? "bg-[hsl(152_55%_39%)] text-card" :
                                  subCurrent ? "bg-gold text-gold-foreground" :
                                  "bg-muted text-muted-foreground"
                                }`}>
                                  {subDone ? <CheckCircle2 className="w-3 h-3" /> :
                                   subCurrent ? <Clock className="w-3 h-3" /> :
                                   <Circle className="w-3 h-3" />}
                                </div>
                                <div className={`flex-1 ${substep.status === "pendente" ? "opacity-50" : ""}`}>
                                  <div className="flex items-center gap-2">
                                    <h4 className={`text-xs font-medium ${subCurrent ? "text-gold" : "text-foreground"}`}>
                                      {substep.title}
                                    </h4>
                                    {subDone && <span className="text-[10px] text-[hsl(152_55%_39%)]">✓</span>}
                                  </div>
                                  {substep.description && (
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{substep.description}</p>
                                  )}
                                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{formatShortDate(substep.updatedAt)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {activeSection === "documentos" && (
          <div className="animate-fade-in space-y-5">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">Documentos pendentes</h3>
                <span className="text-xs text-muted-foreground">Pendente = aguardando envio</span>
              </div>
              <div className="space-y-3">
                {pendingDocs.length === 0 && (
                  <p className="text-sm text-muted-foreground">Você não possui documentos pendentes no momento.</p>
                )}
                {pendingDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-4 rounded-xl border border-gold/30 bg-gold/5">
                    <FileText className="w-5 h-5 shrink-0 text-gold" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type} - {formatShortDate(doc.date)}</p>
                    </div>
                    <span className="status-badge status-waiting text-[11px]">Pendente</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-foreground">Documentos recebidos</h3>
                <span className="text-xs text-muted-foreground">Disponível = já recebido / acessível</span>
              </div>
              <div className="space-y-3">
                {availableDocs.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum documento disponível no momento.</p>
                )}
                {availableDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-4 rounded-xl border bg-card">
                    <FileText className="w-5 h-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type} - {formatShortDate(doc.date)}</p>
                    </div>
                    <button onClick={() => handleDownloadDocument(doc)} className="p-2 text-muted-foreground hover:text-gold transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeSection === "estrutura" && (
          <div className="animate-fade-in">
            {!!patrimonyOriginalDoc?.url && (
              <div className="bg-card rounded-xl border p-4 mb-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-sm font-medium text-foreground truncate">{patrimonyOriginalDoc.name || "Documento original"}</p>
                  <button
                    onClick={handleOpenStructureOriginal}
                    className="px-3 py-1.5 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Abrir PDF
                  </button>
                </div>

                <div ref={canvasWrapRef} className="rounded-lg border overflow-auto bg-muted/20 p-2">
                  {structureLoading && <p className="text-xs text-muted-foreground p-3">Carregando PDF...</p>}
                  {structureError && <p className="text-xs text-destructive p-3">{structureError}</p>}
                  {!structureLoading && !structureError && <canvas ref={canvasRef} className="mx-auto block bg-background" />}
                </div>

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => setCurrentStructurePage((page) => Math.max(1, page - 1))}
                    disabled={currentStructurePage <= 1}
                    className="px-3 py-1.5 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-3 h-3" /> Pagina anterior
                  </button>
                  <span className="text-xs text-muted-foreground">Pagina {currentStructurePage}</span>
                  <button
                    onClick={() => setCurrentStructurePage((page) => Math.min(structurePageCount, page + 1))}
                    disabled={currentStructurePage >= structurePageCount}
                    className="px-3 py-1.5 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    Proxima pagina <ChevronRight className="w-3 h-3" />
                  </button>
                  <span className="text-xs text-muted-foreground">de {structurePageCount}</span>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={() => setStructureZoom((zoom) => Math.max(0.7, Number((zoom - 0.15).toFixed(2))))}
                    className="px-2.5 py-1.5 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    A-
                  </button>
                  <span className="text-xs text-muted-foreground">{Math.round(structureZoom * 100)}%</span>
                  <button
                    onClick={() => setStructureZoom((zoom) => Math.min(2.8, Number((zoom + 0.15).toFixed(2))))}
                    className="px-2.5 py-1.5 text-xs border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    A+
                  </button>
                </div>
              </div>
            )}

            {!patrimonyOriginalDoc?.url && (!patrimony || patrimony.nodes.length === 0) && (
              <div className="bg-card rounded-xl border p-4 mb-6 text-sm text-muted-foreground">
                Nenhum PDF de estruturacao disponivel no momento.
              </div>
            )}

            {patrimony && patrimony.nodes.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Visao geral da estrutura patrimonial planejada para o seu caso.
                </p>
                <div className="bg-card rounded-xl border p-4">
                  <PatrimonyPreview nodes={patrimony.nodes} title={patrimony.title} />
                </div>
              </>
            )}
          </div>
        )}

        {activeSection === "historico" && (
          <div className="animate-fade-in space-y-4">
            <p className="text-sm text-muted-foreground mb-4">Atualizacoes relevantes sobre o andamento do seu caso.</p>
            {updates.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atualizacao visivel no momento.</p>}
            {updates.map((update) => (
              <div key={update.id} className="flex gap-3 p-4 bg-card rounded-xl border">
                <div className="w-2 h-2 rounded-full bg-gold mt-2 shrink-0" />
                <div>
                  <p className="text-sm text-foreground leading-relaxed">{update.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatShortDate(update.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-5 pb-8">
        <div className="bg-card rounded-xl border p-5 text-center">
          <h3 className="font-heading font-bold text-foreground mb-1">Precisa de ajuda?</h3>
          <p className="text-xs text-muted-foreground mb-4">Entre em contato com o escritorio para esclarecer duvidas sobre o seu caso.</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={() => window.open(whatsappUrl, "_blank", "noopener,noreferrer")}
              className="btn-gold px-5 py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" /> Falar com o escritorio
            </button>
            <button
              onClick={() => { window.location.href = emailUrl; }}
              className="px-5 py-2.5 text-sm border rounded-lg text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" /> Enviar mensagem
            </button>
          </div>
        </div>
      </div>

      <footer className="border-t py-4 px-5">
        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Acesso seguro e confidencial · Link temporario · {office?.name}</span>
        </div>
      </footer>
    </div>
  );
};

export default ClientPortal;
