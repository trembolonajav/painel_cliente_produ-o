package com.painel.api.patrimony;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFile;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.document.DocumentPresignResponse;
import com.painel.api.storage.StorageService;
import com.painel.api.user.OfficeUser;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PatrimonyService {

    private final PatrimonyStructureRepository structureRepository;
    private final PatrimonyNodeRepository nodeRepository;
    private final CaseFileRepository caseFileRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;
    private final StorageService storageService;

    public PatrimonyService(
            PatrimonyStructureRepository structureRepository,
            PatrimonyNodeRepository nodeRepository,
            CaseFileRepository caseFileRepository,
            AuthorizationService authorizationService,
            AuditService auditService,
            StorageService storageService) {
        this.structureRepository = structureRepository;
        this.nodeRepository = nodeRepository;
        this.caseFileRepository = caseFileRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public PatrimonyStructureResponse getByCaseId(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        return structureRepository.findByCaseFile_Id(caseId).map(this::toStructureResponse).orElse(null);
    }

    @Transactional
    public PatrimonyStructureResponse create(UUID caseId, PatrimonyStructureCreateRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        if (structureRepository.findByCaseFile_Id(caseId).isPresent()) {
            throw new IllegalArgumentException("Ja existe estrutura patrimonial para este caso");
        }
        CaseFile caseFile = caseFileRepository.findById(caseId).orElseThrow(() -> new NotFoundException("Caso nao encontrado"));

        PatrimonyStructure structure = new PatrimonyStructure();
        structure.setCaseFile(caseFile);
        structure.setTitle(request.title().trim());
        structure.setStatus(PatrimonyStatus.DRAFT);
        structure.setVersion(1);
        structure.setOriginalDocumentVisibleToClient(false);
        PatrimonyStructure saved = structureRepository.save(structure);

        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PATRIMONY_STRUCTURE", saved.getId(), "CREATE");
        return toStructureResponse(saved);
    }

    @Transactional
    public PatrimonyStructureResponse update(UUID structureId, PatrimonyStructureUpdateRequest request, OfficeUser actor) {
        PatrimonyStructure structure = structureRepository.findById(structureId)
                .orElseThrow(() -> new NotFoundException("Estrutura patrimonial nao encontrada"));
        authorizationService.requireCaseWriteAccess(actor, structure.getCaseFile().getId());

        if (request.title() != null) structure.setTitle(request.title().trim());
        if (request.status() != null) structure.setStatus(request.status());
        if (request.version() != null) structure.setVersion(request.version());
        if (request.notesInternal() != null) structure.setNotesInternal(request.notesInternal());
        if (request.notesClient() != null) structure.setNotesClient(request.notesClient());
        if (request.originalDocumentName() != null) structure.setOriginalDocumentName(request.originalDocumentName());
        if (request.originalDocumentMimeType() != null) structure.setOriginalDocumentMimeType(request.originalDocumentMimeType());
        if (request.originalDocumentSizeBytes() != null) structure.setOriginalDocumentSizeBytes(request.originalDocumentSizeBytes());
        if (request.originalDocumentStorageKey() != null) structure.setOriginalDocumentStorageKey(request.originalDocumentStorageKey());
        if (request.originalDocumentVisibleToClient() != null) structure.setOriginalDocumentVisibleToClient(request.originalDocumentVisibleToClient());

        PatrimonyStructure saved = structureRepository.save(structure);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PATRIMONY_STRUCTURE", saved.getId(), "UPDATE");
        return toStructureResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<PatrimonyNodeResponse> listNodes(UUID structureId, OfficeUser actor) {
        PatrimonyStructure structure = structureRepository.findById(structureId)
                .orElseThrow(() -> new NotFoundException("Estrutura patrimonial nao encontrada"));
        authorizationService.requireCaseReadAccess(actor, structure.getCaseFile().getId());
        return nodeRepository.findByStructure_IdOrderBySortOrderAsc(structureId).stream()
                .map(this::toNodeResponse)
                .toList();
    }

    @Transactional
    public PatrimonyNodeResponse createNode(UUID structureId, PatrimonyNodeRequest request, OfficeUser actor) {
        PatrimonyStructure structure = structureRepository.findById(structureId)
                .orElseThrow(() -> new NotFoundException("Estrutura patrimonial nao encontrada"));
        authorizationService.requireCaseWriteAccess(actor, structure.getCaseFile().getId());

        PatrimonyNode node = new PatrimonyNode();
        node.setStructure(structure);
        applyNode(node, request);
        PatrimonyNode saved = nodeRepository.save(node);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PATRIMONY_NODE", saved.getId(), "CREATE");
        return toNodeResponse(saved);
    }

    @Transactional
    public PatrimonyNodeResponse updateNode(UUID nodeId, PatrimonyNodeRequest request, OfficeUser actor) {
        PatrimonyNode node = nodeRepository.findById(nodeId)
                .orElseThrow(() -> new NotFoundException("No patrimonial nao encontrado"));
        authorizationService.requireCaseWriteAccess(actor, node.getStructure().getCaseFile().getId());
        applyNode(node, request);
        PatrimonyNode saved = nodeRepository.save(node);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PATRIMONY_NODE", saved.getId(), "UPDATE");
        return toNodeResponse(saved);
    }

    @Transactional
    public void deleteNode(UUID nodeId, OfficeUser actor) {
        PatrimonyNode node = nodeRepository.findById(nodeId)
                .orElseThrow(() -> new NotFoundException("No patrimonial nao encontrado"));
        authorizationService.requireCaseWriteAccess(actor, node.getStructure().getCaseFile().getId());
        List<PatrimonyNode> all = nodeRepository.findByStructure_IdOrderBySortOrderAsc(node.getStructure().getId());
        Set<UUID> ids = new HashSet<>();
        collectIds(nodeId, all, ids);
        nodeRepository.deleteAll(all.stream().filter(item -> ids.contains(item.getId())).toList());
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PATRIMONY_NODE", nodeId, "DELETE");
    }

    @Transactional
    public DocumentPresignResponse presignOriginalDocument(UUID structureId, PatrimonyOriginalDocPresignRequest request, OfficeUser actor) {
        PatrimonyStructure structure = structureRepository.findById(structureId)
                .orElseThrow(() -> new NotFoundException("Estrutura patrimonial nao encontrada"));
        authorizationService.requireCaseWriteAccess(actor, structure.getCaseFile().getId());
        var upload = storageService.createUploadUrl(structure.getCaseFile().getId(), request.originalName(), request.mimeType());
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "PATRIMONY_STRUCTURE",
                structureId,
                "ORIGINAL_DOC_PRESIGN",
                Map.of("storageKey", upload.storageKey()));
        return new DocumentPresignResponse(upload.uploadUrl(), upload.storageKey(), upload.method(), upload.contentType(), upload.expiresAt());
    }

    @Transactional(readOnly = true)
    public PatrimonyDownloadLinkResponse getOriginalDocumentDownloadLink(UUID structureId, OfficeUser actor) {
        PatrimonyStructure structure = structureRepository.findById(structureId)
                .orElseThrow(() -> new NotFoundException("Estrutura patrimonial nao encontrada"));
        authorizationService.requireCaseReadAccess(actor, structure.getCaseFile().getId());
        if (structure.getOriginalDocumentStorageKey() == null || structure.getOriginalDocumentStorageKey().isBlank()) {
            throw new NotFoundException("Documento original nao anexado");
        }
        return new PatrimonyDownloadLinkResponse(storageService.createDownloadUrl(structure.getOriginalDocumentStorageKey()));
    }

    private void collectIds(UUID nodeId, List<PatrimonyNode> all, Set<UUID> ids) {
        ids.add(nodeId);
        all.stream()
                .filter(item -> item.getParent() != null && item.getParent().getId().equals(nodeId))
                .forEach(child -> collectIds(child.getId(), all, ids));
    }

    private void applyNode(PatrimonyNode node, PatrimonyNodeRequest request) {
        node.setType(request.type());
        node.setLabel(request.label().trim());
        node.setSubtitle(trimToNull(request.subtitle()));
        node.setDescription(trimToNull(request.description()));
        node.setValue(trimToNull(request.value()));
        node.setPercentage(trimToNull(request.percentage()));
        node.setLocation(trimToNull(request.location()));
        node.setSortOrder(request.sortOrder());
        node.setVisibleToClient(request.isVisibleToClient());
        node.setMetadataJson(trimToNull(request.metadataJson()));

        if (request.parentId() == null) {
            node.setParent(null);
        } else {
            PatrimonyNode parent = nodeRepository.findById(request.parentId())
                    .orElseThrow(() -> new NotFoundException("No pai nao encontrado"));
            if (!parent.getStructure().getId().equals(node.getStructure().getId())) {
                throw new IllegalArgumentException("No pai deve pertencer a mesma estrutura");
            }
            node.setParent(parent);
        }
    }

    private PatrimonyStructureResponse toStructureResponse(PatrimonyStructure structure) {
        return new PatrimonyStructureResponse(
                structure.getId(),
                structure.getCaseFile().getId(),
                structure.getTitle(),
                structure.getStatus(),
                structure.getVersion(),
                structure.getNotesInternal(),
                structure.getNotesClient(),
                structure.getOriginalDocumentName(),
                structure.getOriginalDocumentMimeType(),
                structure.getOriginalDocumentSizeBytes(),
                structure.getOriginalDocumentStorageKey(),
                structure.isOriginalDocumentVisibleToClient(),
                structure.getCreatedAt(),
                structure.getUpdatedAt());
    }

    private PatrimonyNodeResponse toNodeResponse(PatrimonyNode node) {
        return new PatrimonyNodeResponse(
                node.getId(),
                node.getStructure().getId(),
                node.getType(),
                node.getLabel(),
                node.getSubtitle(),
                node.getDescription(),
                node.getValue(),
                node.getPercentage(),
                node.getLocation(),
                node.getParent() == null ? null : node.getParent().getId(),
                node.getSortOrder(),
                node.isVisibleToClient(),
                node.getMetadataJson(),
                node.getCreatedAt(),
                node.getUpdatedAt());
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
