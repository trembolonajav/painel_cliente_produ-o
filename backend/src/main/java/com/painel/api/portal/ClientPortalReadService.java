package com.painel.api.portal;

import com.painel.api.common.NotFoundException;
import com.painel.api.common.UnauthorizedException;
import com.painel.api.common.Visibility;
import com.painel.api.document.DocumentRepository;
import com.painel.api.document.DocumentResponse;
import com.painel.api.patrimony.PatrimonyNode;
import com.painel.api.patrimony.PatrimonyNodeRepository;
import com.painel.api.patrimony.PatrimonyStatus;
import com.painel.api.patrimony.PatrimonyStructure;
import com.painel.api.patrimony.PatrimonyStructureRepository;
import com.painel.api.storage.StorageService;
import com.painel.api.updates.CaseUpdateRepository;
import com.painel.api.updates.CaseUpdateResponse;
import com.painel.api.workflow.CaseStageRepository;
import com.painel.api.workflow.CaseStageSubstepRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
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
        return caseUpdateRepository
                .findByCaseFile_IdAndVisibilityOrderByCreatedAtDesc(session.getCaseFile().getId(), Visibility.CLIENT_VISIBLE)
                .stream()
                .map(update -> new CaseUpdateResponse(
                        update.getId(),
                        update.getCaseFile().getId(),
                        update.getVisibility(),
                        update.getType(),
                        update.getContent(),
                        update.getCreatedBy().getId(),
                        update.getCreatedBy().getName(),
                        update.getCreatedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listVisibleDocuments(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
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

    @Transactional(readOnly = true)
    public List<ClientPortalStageResponse> listStages(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        return caseStageRepository.findByCaseFile_IdOrderByPositionAsc(session.getCaseFile().getId()).stream()
                .map(stage -> new ClientPortalStageResponse(
                        stage.getId(),
                        stage.getTitle(),
                        stage.getDescription(),
                        stage.getPosition(),
                        stage.getStatus().name(),
                        stage.getUpdatedAt(),
                        caseStageSubstepRepository.findByStage_IdOrderByPositionAsc(stage.getId()).stream()
                                .filter(substep -> substep.isVisibleToClient())
                                .map(substep -> new ClientPortalStageSubstepResponse(
                                        substep.getId(),
                                        substep.getTitle(),
                                        substep.getDescription(),
                                        substep.getPosition(),
                                        substep.getStatus().name(),
                                        substep.getUpdatedAt()))
                                .toList()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ClientPortalPatrimonyResponse getVisiblePatrimony(HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
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
}
