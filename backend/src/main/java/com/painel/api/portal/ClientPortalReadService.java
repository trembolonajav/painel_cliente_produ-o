package com.painel.api.portal;

import com.painel.api.common.NotFoundException;
import com.painel.api.common.UnauthorizedException;
import com.painel.api.common.Visibility;
import com.painel.api.document.DocumentRepository;
import com.painel.api.document.DocumentResponse;
import com.painel.api.patrimony.PatrimonyNodeType;
import com.painel.api.patrimony.PatrimonyNode;
import com.painel.api.patrimony.PatrimonyNodeRepository;
import com.painel.api.patrimony.PatrimonyStatus;
import com.painel.api.patrimony.PatrimonyStructure;
import com.painel.api.patrimony.PatrimonyStructureRepository;
import com.painel.api.updates.CaseUpdate;
import com.painel.api.storage.StorageService;
import com.painel.api.updates.CaseUpdateRepository;
import com.painel.api.updates.CaseUpdateResponse;
import com.painel.api.workflow.CaseStage;
import com.painel.api.workflow.CaseStageSubstep;
import com.painel.api.workflow.CaseStageRepository;
import com.painel.api.workflow.CaseStageSubstepRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientPortalReadService {

    private final ClientPortalSessionService clientPortalSessionService;
    private final CaseUpdateRepository caseUpdateRepository;
    private final DocumentRepository documentRepository;
    private final CaseStageRepository caseStageRepository;
    private final CaseStageSubstepRepository caseStageSubstepRepository;
    private final PatrimonyStructureRepository patrimonyStructureRepository;
    private final PatrimonyNodeRepository patrimonyNodeRepository;
    private final StorageService storageService;

    public ClientPortalReadService(
            ClientPortalSessionService clientPortalSessionService,
            CaseUpdateRepository caseUpdateRepository,
            DocumentRepository documentRepository,
            CaseStageRepository caseStageRepository,
            CaseStageSubstepRepository caseStageSubstepRepository,
            PatrimonyStructureRepository patrimonyStructureRepository,
            PatrimonyNodeRepository patrimonyNodeRepository,
            StorageService storageService) {
        this.clientPortalSessionService = clientPortalSessionService;
        this.caseUpdateRepository = caseUpdateRepository;
        this.documentRepository = documentRepository;
        this.caseStageRepository = caseStageRepository;
        this.caseStageSubstepRepository = caseStageSubstepRepository;
        this.patrimonyStructureRepository = patrimonyStructureRepository;
        this.patrimonyNodeRepository = patrimonyNodeRepository;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public List<CaseUpdateResponse> listVisibleUpdates(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        return listVisibleUpdates(session);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listVisibleDocuments(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        return listVisibleDocuments(session);
    }

    @Transactional(readOnly = true)
    public List<ClientPortalStageResponse> listStages(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        return listStages(session);
    }

    @Transactional(readOnly = true)
    public ClientPortalPatrimonyResponse getVisiblePatrimony(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        return getVisiblePatrimony(session);
    }

    @Transactional(readOnly = true)
    public ClientPortalBootstrapResponse bootstrap(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        return new ClientPortalBootstrapResponse(
                clientPortalSessionService.meFromSession(session),
                clientPortalSessionService.caseDetailsFromSession(session),
                listVisibleDocuments(session),
                listVisibleUpdates(session),
                listStages(session),
                getVisiblePatrimony(session),
                findVisiblePatrimonyOriginalDocument(session));
    }

    @Transactional(readOnly = true)
    public ClientPortalPatrimonyOriginalDocumentResponse getPatrimonyOriginalDocumentDownloadLink(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        UUID caseId = session.getCaseFile().getId();

        PatrimonyStructure structure = patrimonyStructureRepository.findByCaseFile_Id(caseId)
                .orElseThrow(() -> new NotFoundException("Estrutura patrimonial nao encontrada"));

        if (structure.getStatus() != PatrimonyStatus.PUBLISHED) {
            throw new NotFoundException("Estrutura patrimonial nao publicada");
        }
        if (!structure.isOriginalDocumentVisibleToClient()) {
            throw new UnauthorizedException("Documento original indisponivel para o cliente");
        }
        if (structure.getOriginalDocumentStorageKey() == null || structure.getOriginalDocumentStorageKey().isBlank()) {
            throw new NotFoundException("Documento original nao anexado");
        }

        return new ClientPortalPatrimonyOriginalDocumentResponse(
                storageService.createDownloadUrl(structure.getOriginalDocumentStorageKey()),
                structure.getOriginalDocumentName(),
                structure.getOriginalDocumentMimeType(),
                structure.getOriginalDocumentSizeBytes());
    }

    private List<CaseUpdateResponse> listVisibleUpdates(ClientPortalSession session) {
        return caseUpdateRepository
                .findByCaseFile_IdAndVisibilityOrderByCreatedAtDesc(session.getCaseFile().getId(), Visibility.CLIENT_VISIBLE)
                .stream()
                .map(this::toUpdateResponse)
                .toList();
    }

    private List<DocumentResponse> listVisibleDocuments(ClientPortalSession session) {
        return documentRepository
                .findByCaseFile_IdAndVisibilityOrderByCreatedAtDesc(
                        session.getCaseFile().getId(),
                        Visibility.CLIENT_VISIBLE)
                .stream()
                .map(doc -> new DocumentResponse(
                        doc.getId(),
                        doc.getCaseFile().getId(),
                        doc.getVisibility(),
                        doc.getStatus(),
                        doc.getOriginalName(),
                        doc.getMimeType(),
                        doc.getSizeBytes(),
                        doc.getStorageKey(),
                        doc.getChecksum(),
                        doc.getUploadedBy().getId(),
                        doc.getUploadedBy().getName(),
                        doc.getCreatedAt()))
                .toList();
    }

    private List<ClientPortalStageResponse> listStages(ClientPortalSession session) {
        List<CaseStage> stages = caseStageRepository.findByCaseFile_IdOrderByPositionAsc(session.getCaseFile().getId());
        List<UUID> stageIds = stages.stream().map(CaseStage::getId).toList();
        Map<UUID, List<ClientPortalStageSubstepResponse>> substepsByStageId = stageIds.isEmpty()
                ? Map.of()
                : caseStageSubstepRepository.findByStage_IdInOrderByStage_IdAscPositionAsc(stageIds).stream()
                        .filter(CaseStageSubstep::isVisibleToClient)
                        .collect(Collectors.groupingBy(
                                substep -> substep.getStage().getId(),
                                Collectors.mapping(
                                        substep -> new ClientPortalStageSubstepResponse(
                                                substep.getId(),
                                                substep.getTitle(),
                                                substep.getDescription(),
                                                substep.getPosition(),
                                                substep.getStatus().name(),
                                                substep.getUpdatedAt()),
                                        Collectors.toList())));

        return stages.stream()
                .map(stage -> new ClientPortalStageResponse(
                        stage.getId(),
                        stage.getTitle(),
                        stage.getDescription(),
                        stage.getPosition(),
                        stage.getStatus().name(),
                        stage.getUpdatedAt(),
                        substepsByStageId.getOrDefault(stage.getId(), List.of())))
                .toList();
    }

    private ClientPortalPatrimonyResponse getVisiblePatrimony(ClientPortalSession session) {
        UUID caseId = session.getCaseFile().getId();
        PatrimonyStructure structure = patrimonyStructureRepository.findByCaseFile_Id(caseId)
                .orElse(null);
        if (structure == null || structure.getStatus() != PatrimonyStatus.PUBLISHED) {
            return null;
        }

        List<ClientPortalPatrimonyNodeResponse> nodes = patrimonyNodeRepository.findByStructure_IdOrderBySortOrderAsc(structure.getId())
                .stream()
                .filter(PatrimonyNode::isVisibleToClient)
                .map(node -> new ClientPortalPatrimonyNodeResponse(
                        node.getId(),
                        node.getParent() != null ? node.getParent().getId() : null,
                        node.getType().name(),
                        node.getLabel(),
                        node.getSubtitle(),
                        node.getDescription(),
                        node.getValue(),
                        node.getPercentage(),
                        node.getLocation(),
                        node.getSortOrder()))
                .toList();

        return new ClientPortalPatrimonyResponse(
                structure.getId(),
                structure.getTitle(),
                structure.getStatus().name(),
                nodes);
    }

    private ClientPortalPatrimonyOriginalDocumentResponse findVisiblePatrimonyOriginalDocument(ClientPortalSession session) {
        PatrimonyStructure structure = patrimonyStructureRepository.findByCaseFile_Id(session.getCaseFile().getId())
                .orElse(null);
        if (structure == null || structure.getStatus() != PatrimonyStatus.PUBLISHED) {
            return null;
        }
        if (!structure.isOriginalDocumentVisibleToClient()) {
            return null;
        }
        if (structure.getOriginalDocumentStorageKey() == null || structure.getOriginalDocumentStorageKey().isBlank()) {
            return null;
        }

        return new ClientPortalPatrimonyOriginalDocumentResponse(
                storageService.createDownloadUrl(structure.getOriginalDocumentStorageKey()),
                structure.getOriginalDocumentName(),
                structure.getOriginalDocumentMimeType(),
                structure.getOriginalDocumentSizeBytes());
    }

    private CaseUpdateResponse toUpdateResponse(CaseUpdate update) {
        return new CaseUpdateResponse(
                update.getId(),
                update.getCaseFile().getId(),
                update.getVisibility(),
                update.getType(),
                update.getContent(),
                update.getCreatedBy().getId(),
                update.getCreatedBy().getName(),
                update.getCreatedAt());
    }
}
