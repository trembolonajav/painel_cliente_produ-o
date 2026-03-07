package com.painel.api.updates;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFile;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseUpdateService {

    private final CaseUpdateRepository caseUpdateRepository;
    private final CaseFileRepository caseFileRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public CaseUpdateService(
            CaseUpdateRepository caseUpdateRepository,
            CaseFileRepository caseFileRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.caseUpdateRepository = caseUpdateRepository;
        this.caseFileRepository = caseFileRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CaseUpdateResponse> listForStaff(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        return caseUpdateRepository.findByCaseFile_IdOrderByCreatedAtDesc(caseId).stream().map(this::toResponse).toList();
    }

    @Transactional
    public CaseUpdateResponse create(UUID caseId, CaseUpdateRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = caseFileRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso nao encontrado"));

        CaseUpdate update = new CaseUpdate();
        update.setCaseFile(caseFile);
        update.setVisibility(request.visibility());
        update.setType(request.type().trim());
        update.setContent(request.content().trim());
        update.setCreatedBy(actor);

        CaseUpdate saved = caseUpdateRepository.save(update);
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_UPDATE",
                saved.getId(),
                "CREATE",
                Map.of("caseId", caseId.toString(), "visibility", saved.getVisibility().name(), "type", saved.getType()));
        return toResponse(saved);
    }

    private CaseUpdateResponse toResponse(CaseUpdate update) {
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
