package com.painel.api.casefile;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.client.Client;
import com.painel.api.client.ClientRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import com.painel.api.user.OfficeUserRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseService {

    private final CaseFileRepository caseFileRepository;
    private final CaseMemberRepository caseMemberRepository;
    private final ClientRepository clientRepository;
    private final OfficeUserRepository officeUserRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public CaseService(
            CaseFileRepository caseFileRepository,
            CaseMemberRepository caseMemberRepository,
            ClientRepository clientRepository,
            OfficeUserRepository officeUserRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.caseFileRepository = caseFileRepository;
        this.caseMemberRepository = caseMemberRepository;
        this.clientRepository = clientRepository;
        this.officeUserRepository = officeUserRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<CaseResponse> list(String search, CaseStatus status, UUID clientId, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        String normalizedSearch = trimToNull(search);
        boolean hasSearch = normalizedSearch != null;
        List<CaseFile> cases;
        if (authorizationService.isAdmin(actor)) {
            cases = hasSearch
                    ? caseFileRepository.searchAllWithTerm(status, clientId, normalizedSearch)
                    : caseFileRepository.searchAll(status, clientId);
        } else {
            cases = hasSearch
                    ? caseFileRepository.searchByMemberWithTerm(actor.getId(), status, clientId, normalizedSearch)
                    : caseFileRepository.searchByMember(actor.getId(), status, clientId);
        }
        return cases.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CaseResponse getById(UUID caseId, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        authorizationService.requireCaseReadAccess(actor, caseId);
        return toResponse(findCase(caseId));
    }

    @Transactional
    public CaseResponse create(CaseRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        Client client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new NotFoundException("Cliente nao encontrado"));

        CaseFile caseFile = new CaseFile();
        caseFile.setClient(client);
        caseFile.setCreatedBy(actor);
        apply(caseFile, request);
        CaseFile saved = caseFileRepository.save(caseFile);

        OfficeUser responsible = resolveResponsibleUser(request.responsibleUserId(), actor);
        upsertMember(saved, responsible, CaseMemberPermission.OWNER);
        if (!responsible.getId().equals(actor.getId())) {
            upsertMember(saved, actor, CaseMemberPermission.EDITOR);
        }
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE",
                saved.getId(),
                "CREATE",
                Map.of(
                        "title", saved.getTitle(),
                        "clientId", saved.getClient().getId().toString(),
                        "responsibleUserId", responsible.getId().toString()));
        return toResponse(saved);
    }

    @Transactional
    public CaseResponse update(UUID caseId, CaseRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = findCase(caseId);
        Client client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new NotFoundException("Cliente nao encontrado"));

        caseFile.setClient(client);
        apply(caseFile, request);
        CaseFile saved = caseFileRepository.save(caseFile);
        if (request.responsibleUserId() != null) {
            OfficeUser responsible = resolveResponsibleUser(request.responsibleUserId(), actor);
            upsertMember(saved, responsible, CaseMemberPermission.OWNER);
            if (!responsible.getId().equals(actor.getId())) {
                OfficeUser managedActor = officeUserRepository.findById(actor.getId())
                        .orElseThrow(() -> new NotFoundException("Usuario ator nao encontrado"));
                upsertMember(saved, managedActor, CaseMemberPermission.EDITOR);
            }
        }
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE",
                saved.getId(),
                "UPDATE",
                Map.of("status", saved.getStatus().name(), "priority", saved.getPriority().name()));
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CaseMemberResponse> listMembers(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        findCase(caseId);
        return caseMemberRepository.findByCaseFile_Id(caseId).stream()
                .map(member -> new CaseMemberResponse(
                        member.getUser().getId(),
                        member.getUser().getName(),
                        member.getUser().getEmail(),
                        member.getPermission(),
                        member.getCreatedAt()))
                .toList();
    }

    @Transactional
    public CaseMemberResponse upsertMember(UUID caseId, CaseMemberUpsertRequest request, OfficeUser actor) {
        authorizationService.requireCaseOwnerOrAdmin(actor, caseId);
        CaseFile caseFile = findCase(caseId);
        OfficeUser user = officeUserRepository.findById(request.userId())
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        CaseMember saved = upsertMember(caseFile, user, request.permission());
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE_MEMBER",
                caseId,
                "UPSERT",
                Map.of("userId", user.getId().toString(), "permission", request.permission().name()));
        return new CaseMemberResponse(
                saved.getUser().getId(),
                saved.getUser().getName(),
                saved.getUser().getEmail(),
                saved.getPermission(),
                saved.getCreatedAt());
    }

    private OfficeUser resolveResponsibleUser(UUID responsibleUserId, OfficeUser fallbackActor) {
        if (responsibleUserId == null) {
            return fallbackActor;
        }
        return officeUserRepository.findById(responsibleUserId)
                .orElseThrow(() -> new NotFoundException("Usuario responsavel nao encontrado"));
    }

    private CaseMember upsertMember(CaseFile caseFile, OfficeUser user, CaseMemberPermission permission) {
        CaseMember member = caseMemberRepository.findByCaseFile_IdAndUser_Id(caseFile.getId(), user.getId())
                .orElseGet(CaseMember::new);
        member.setCaseFile(caseFile);
        member.setUser(user);
        member.setPermission(permission);
        return caseMemberRepository.save(member);
    }

    private CaseFile findCase(UUID caseId) {
        return caseFileRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso nao encontrado"));
    }

    private void apply(CaseFile caseFile, CaseRequest request) {
        caseFile.setTitle(request.title().trim());
        caseFile.setCaseNumber(trimToNull(request.caseNumber()));
        caseFile.setArea(trimToNull(request.area()));
        caseFile.setStatus(request.status());
        caseFile.setPriority(request.priority());
        if (request.status() == CaseStatus.CLOSED && caseFile.getClosedAt() == null) {
            caseFile.setClosedAt(OffsetDateTime.now());
        } else if (request.status() != CaseStatus.CLOSED) {
            caseFile.setClosedAt(null);
        }
    }

    private CaseResponse toResponse(CaseFile caseFile) {
        return new CaseResponse(
                caseFile.getId(),
                caseFile.getClient().getId(),
                caseFile.getClient().getName(),
                caseFile.getTitle(),
                caseFile.getCaseNumber(),
                caseFile.getArea(),
                caseFile.getStatus(),
                caseFile.getPriority(),
                caseFile.getCreatedBy().getId(),
                caseFile.getCreatedAt(),
                caseFile.getUpdatedAt(),
                caseFile.getClosedAt());
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
