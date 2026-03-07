package com.painel.api.document;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFile;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.storage.StorageService;
import com.painel.api.user.OfficeUser;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final CaseFileRepository caseFileRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;
    private final StorageService storageService;

    public DocumentService(
            DocumentRepository documentRepository,
            CaseFileRepository caseFileRepository,
            AuthorizationService authorizationService,
            AuditService auditService,
            StorageService storageService) {
        this.documentRepository = documentRepository;
        this.caseFileRepository = caseFileRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
        this.storageService = storageService;
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> listForStaff(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        return documentRepository.findByCaseFile_IdOrderByCreatedAtDesc(caseId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public DocumentResponse create(UUID caseId, DocumentRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = caseFileRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso nao encontrado"));

        Document document = new Document();
        document.setCaseFile(caseFile);
        document.setUploadedBy(actor);
        document.setVisibility(request.visibility());
        document.setStatus(request.status());
        document.setOriginalName(request.originalName().trim());
        document.setMimeType(trimToNull(request.mimeType()));
        document.setSizeBytes(request.sizeBytes());
        document.setStorageKey(trimToNull(request.storageKey()));
        document.setChecksum(trimToNull(request.checksum()));

        if (request.status() == DocumentStatus.PENDING) {
            document.setMimeType(null);
            document.setSizeBytes(0L);
            document.setStorageKey(null);
        } else if (document.getStorageKey() == null) {
            throw new IllegalArgumentException("Documento disponivel requer storageKey.");
        }

        Document saved = documentRepository.save(document);
        Map<String, Object> details = new HashMap<>();
        details.put("caseId", caseId.toString());
        details.put("visibility", saved.getVisibility().name());
        details.put("status", saved.getStatus().name());
        if (saved.getStorageKey() != null) {
            details.put("storageKey", saved.getStorageKey());
        }
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "DOCUMENT",
                saved.getId(),
                "CREATE",
                details);
        return toResponse(saved);
    }

    @Transactional
    public DocumentPresignResponse presignUpload(UUID caseId, DocumentPresignRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        caseFileRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso nao encontrado"));

        var upload = storageService.createUploadUrl(caseId, request.originalName(), request.mimeType());
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "DOCUMENT",
                caseId,
                "UPLOAD_PRESIGN",
                Map.of("storageKey", upload.storageKey(), "contentType", request.mimeType()));

        return new DocumentPresignResponse(
                upload.uploadUrl(),
                upload.storageKey(),
                upload.method(),
                upload.contentType(),
                upload.expiresAt());
    }

    @Transactional
    public DocumentResponse confirm(UUID caseId, DocumentRequest request, OfficeUser actor) {
        return create(caseId, request, actor);
    }

    private DocumentResponse toResponse(Document document) {
        return new DocumentResponse(
                document.getId(),
                document.getCaseFile().getId(),
                document.getVisibility(),
                document.getStatus(),
                document.getOriginalName(),
                document.getMimeType(),
                document.getSizeBytes(),
                document.getStorageKey(),
                document.getChecksum(),
                document.getUploadedBy().getId(),
                document.getUploadedBy().getName(),
                document.getCreatedAt());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
