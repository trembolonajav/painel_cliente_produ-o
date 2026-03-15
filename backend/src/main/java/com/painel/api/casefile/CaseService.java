package com.painel.api.casefile;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.client.Client;
import com.painel.api.client.ClientRepository;
import com.painel.api.common.PagedResponse;
import com.painel.api.common.NotFoundException;
import com.painel.api.common.Visibility;
import com.painel.api.document.Document;
import com.painel.api.document.DocumentRepository;
import com.painel.api.document.DocumentStatus;
import com.painel.api.partner.Partner;
import com.painel.api.partner.PartnerRepository;
import com.painel.api.portal.CasePortalLink;
import com.painel.api.portal.CasePortalLinkRepository;
import com.painel.api.portal.PortalLinkStatus;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import com.painel.api.user.OfficeUserRepository;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import com.painel.api.workflow.CaseStage;
import com.painel.api.workflow.CaseStageRepository;
import com.painel.api.workflow.CaseStageStatus;
import com.painel.api.workflow.CaseStageSubstep;
import com.painel.api.workflow.CaseStageSubstepRepository;
import com.painel.api.workflow.CaseStageSubstepStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CaseService {

    private final CaseFileRepository caseFileRepository;
    private final CaseMemberRepository caseMemberRepository;
    private final CaseStageRepository caseStageRepository;
    private final CaseStageSubstepRepository caseStageSubstepRepository;
    private final DocumentRepository documentRepository;
    private final CasePortalLinkRepository casePortalLinkRepository;
    private final ClientRepository clientRepository;
    private final PartnerRepository partnerRepository;
    private final OfficeUserRepository officeUserRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public CaseService(
            CaseFileRepository caseFileRepository,
            CaseMemberRepository caseMemberRepository,
            CaseStageRepository caseStageRepository,
            CaseStageSubstepRepository caseStageSubstepRepository,
            DocumentRepository documentRepository,
            CasePortalLinkRepository casePortalLinkRepository,
            ClientRepository clientRepository,
            PartnerRepository partnerRepository,
            OfficeUserRepository officeUserRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.caseFileRepository = caseFileRepository;
        this.caseMemberRepository = caseMemberRepository;
        this.caseStageRepository = caseStageRepository;
        this.caseStageSubstepRepository = caseStageSubstepRepository;
        this.documentRepository = documentRepository;
        this.casePortalLinkRepository = casePortalLinkRepository;
        this.clientRepository = clientRepository;
        this.partnerRepository = partnerRepository;
        this.officeUserRepository = officeUserRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public PagedResponse<CaseResponse> list(String search, CaseStatus status, UUID clientId, int page, int size, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        String normalizedSearch = trimToNull(search);
        String searchPrefix = normalizedSearch != null ? normalizedSearch.toLowerCase() + "%" : null;
        boolean hasSearch = normalizedSearch != null;
        int normalizedPage = Math.max(page, 0);
        int normalizedSize = Math.max(1, Math.min(size, 100));
        PageRequest pageRequest = PageRequest.of(normalizedPage, normalizedSize);
        Page<CaseFile> cases;
        if (authorizationService.isAdmin(actor)) {
            cases = hasSearch
                    ? caseFileRepository.searchAllWithTerm(status, clientId, searchPrefix, pageRequest)
                    : caseFileRepository.searchAll(status, clientId, pageRequest);
        } else {
            cases = hasSearch
                    ? caseFileRepository.searchByMemberWithTerm(actor.getId(), status, clientId, searchPrefix, pageRequest)
                    : caseFileRepository.searchByMember(actor.getId(), status, clientId, pageRequest);
        }
        return new PagedResponse<>(
                cases.getContent().stream().map(this::toResponse).toList(),
                cases.getNumber(),
                cases.getSize(),
                cases.getTotalElements(),
                cases.getTotalPages());
    }

    @Transactional(readOnly = true)
    public List<DashboardCaseResponse> listDashboard(String search, CaseStatus status, UUID clientId, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        String normalizedSearch = trimToNull(search);
        String searchPrefix = normalizedSearch != null ? normalizedSearch.toLowerCase() + "%" : null;
        boolean hasSearch = normalizedSearch != null;
        List<CaseFile> cases;
        if (authorizationService.isAdmin(actor)) {
            cases = hasSearch
                    ? caseFileRepository.searchAllWithTermForDashboard(status, clientId, searchPrefix)
                    : caseFileRepository.searchAllForDashboard(status, clientId);
        } else {
            cases = hasSearch
                    ? caseFileRepository.searchByMemberWithTermForDashboard(actor.getId(), status, clientId, searchPrefix)
                    : caseFileRepository.searchByMemberForDashboard(actor.getId(), status, clientId);
        }
        if (cases.isEmpty()) {
            return List.of();
        }

        List<UUID> caseIds = cases.stream().map(CaseFile::getId).toList();
        List<CaseMember> members = caseMemberRepository.findByCaseFile_IdIn(caseIds);
        List<CaseStage> stages = caseStageRepository.findByCaseFile_IdInOrderByCaseFile_IdAscPositionAsc(caseIds);
        List<UUID> stageIds = stages.stream().map(CaseStage::getId).toList();
        List<CaseStageSubstep> substeps = stageIds.isEmpty()
                ? List.of()
                : caseStageSubstepRepository.findByStage_IdInOrderByStage_IdAscPositionAsc(stageIds);
        List<Document> pendingClientDocuments = documentRepository.findByCaseFile_IdInAndVisibilityAndStatus(
                caseIds,
                Visibility.CLIENT_VISIBLE,
                DocumentStatus.PENDING);
        List<CasePortalLink> activePortalLinks = casePortalLinkRepository.findByCaseFile_IdInAndStatus(
                caseIds,
                PortalLinkStatus.ACTIVE);

        Map<UUID, List<CaseMember>> membersByCase = new HashMap<>();
        for (CaseMember member : members) {
            membersByCase.computeIfAbsent(member.getCaseFile().getId(), ignored -> new ArrayList<>()).add(member);
        }

        Map<UUID, List<CaseStage>> stagesByCase = new HashMap<>();
        for (CaseStage stage : stages) {
            stagesByCase.computeIfAbsent(stage.getCaseFile().getId(), ignored -> new ArrayList<>()).add(stage);
        }

        Map<UUID, List<CaseStageSubstep>> substepsByStage = new HashMap<>();
        for (CaseStageSubstep substep : substeps) {
            substepsByStage.computeIfAbsent(substep.getStage().getId(), ignored -> new ArrayList<>()).add(substep);
        }

        Map<UUID, Integer> pendingClientByCase = new HashMap<>();
        for (Document document : pendingClientDocuments) {
            UUID currentCaseId = document.getCaseFile().getId();
            pendingClientByCase.merge(currentCaseId, 1, Integer::sum);
        }

        Map<UUID, CasePortalLink> activePortalByCase = new HashMap<>();
        for (CasePortalLink portalLink : activePortalLinks) {
            UUID currentCaseId = portalLink.getCaseFile().getId();
            CasePortalLink existing = activePortalByCase.get(currentCaseId);
            if (existing == null || portalLink.getCreatedAt().isAfter(existing.getCreatedAt())) {
                activePortalByCase.put(currentCaseId, portalLink);
            }
        }

        return cases.stream()
                .map(caseFile -> toDashboardResponse(
                        caseFile,
                        membersByCase.getOrDefault(caseFile.getId(), List.of()),
                        stagesByCase.getOrDefault(caseFile.getId(), List.of()),
                        substepsByStage,
                        pendingClientByCase.getOrDefault(caseFile.getId(), 0),
                        activePortalByCase.get(caseFile.getId())))
                .toList();
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
        Partner partner = resolvePartner(request.partnerId());

        CaseFile caseFile = new CaseFile();
        caseFile.setClient(client);
        caseFile.setPartner(partner);
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
                        "partnerId", saved.getPartner() != null ? saved.getPartner().getId().toString() : "",
                        "responsibleUserId", responsible.getId().toString()));
        return toResponse(saved);
    }

    @Transactional
    public CaseResponse update(UUID caseId, CaseRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = findCase(caseId);
        Client client = clientRepository.findById(request.clientId())
                .orElseThrow(() -> new NotFoundException("Cliente nao encontrado"));
        Partner partner = resolvePartner(request.partnerId());

        caseFile.setClient(client);
        caseFile.setPartner(partner);
        apply(caseFile, request);
        CaseFile saved = caseFileRepository.save(caseFile);
        if (request.responsibleUserId() != null) {
            OfficeUser responsible = resolveResponsibleUser(request.responsibleUserId(), actor);
            reassignCaseOwner(saved, responsible);
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

    @Transactional
    public CaseDeleteResponse delete(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = findCase(caseId);
        caseFileRepository.delete(caseFile);
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "CASE",
                caseId,
                "DELETE",
                Map.of("clientId", caseFile.getClient().getId().toString()));
        return new CaseDeleteResponse(
                true,
                "Registro removido com hard delete. Etapas, tarefas, documentos, atualizacoes e vinculos do portal foram removidos. Arquivos fisicos podem permanecer no storage.");
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

    private void reassignCaseOwner(CaseFile caseFile, OfficeUser newOwner) {
        caseMemberRepository.findByCaseFile_Id(caseFile.getId()).stream()
                .filter(member -> member.getPermission() == CaseMemberPermission.OWNER)
                .filter(member -> !member.getUser().getId().equals(newOwner.getId()))
                .forEach(member -> {
                    member.setPermission(CaseMemberPermission.EDITOR);
                    caseMemberRepository.save(member);
                });
        upsertMember(caseFile, newOwner, CaseMemberPermission.OWNER);
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
        caseFile.setCurrentStatus(trimToNull(request.currentStatus()));
        caseFile.setStatus(request.status());
        caseFile.setPriority(request.priority());
        if (request.status() == CaseStatus.CLOSED && caseFile.getClosedAt() == null) {
            caseFile.setClosedAt(OffsetDateTime.now());
        } else if (request.status() != CaseStatus.CLOSED) {
            caseFile.setClosedAt(null);
        }
    }

    private DashboardCaseResponse toDashboardResponse(
            CaseFile caseFile,
            List<CaseMember> members,
            List<CaseStage> stages,
            Map<UUID, List<CaseStageSubstep>> substepsByStage,
            int pendingClient,
            CasePortalLink activePortalLink) {
        CaseMember owner = members.stream()
                .filter(member -> member.getPermission() == CaseMemberPermission.OWNER)
                .findFirst()
                .orElse(null);
        String responsibleName = owner != null ? owner.getUser().getName() : "Nao definido";
        List<String> teamNames = members.stream()
                .filter(member -> member.getPermission() != CaseMemberPermission.OWNER)
                .map(member -> member.getUser().getName())
                .toList();

        int progress = calculateDashboardProgress(caseFile.getStatus(), stages, substepsByStage);

        return new DashboardCaseResponse(
                caseFile.getId(),
                caseFile.getClient().getId(),
                caseFile.getClient().getName(),
                caseFile.getPartner() != null ? caseFile.getPartner().getId() : null,
                caseFile.getPartner() != null ? caseFile.getPartner().getName() : null,
                caseFile.getTitle(),
                caseFile.getCaseNumber(),
                caseFile.getArea(),
                caseFile.getCurrentStatus(),
                caseFile.getStatus(),
                caseFile.getPriority(),
                responsibleName,
                teamNames,
                progress,
                pendingClient,
                activePortalLink != null,
                activePortalLink != null ? activePortalLink.getExpiresAt() : null,
                caseFile.getCreatedAt(),
                caseFile.getUpdatedAt(),
                caseFile.getClosedAt());
    }

    private int calculateDashboardProgress(
            CaseStatus fallbackStatus,
            List<CaseStage> stages,
            Map<UUID, List<CaseStageSubstep>> substepsByStage) {
        int totalUnits = 0;
        int completedUnits = 0;

        for (CaseStage stage : stages) {
            List<CaseStageSubstep> substeps = substepsByStage.getOrDefault(stage.getId(), List.of());
            if (substeps.isEmpty()) {
                totalUnits += 1;
                if (stage.getStatus() == CaseStageStatus.DONE) {
                    completedUnits += 1;
                }
                continue;
            }

            totalUnits += substeps.size();
            completedUnits += (int) substeps.stream()
                    .filter(substep -> substep.getStatus() == CaseStageSubstepStatus.DONE)
                    .count();
        }

        if (totalUnits == 0) {
            return progressForStatus(fallbackStatus);
        }
        return Math.round((completedUnits * 100.0f) / totalUnits);
    }

    private int progressForStatus(CaseStatus status) {
        return switch (status) {
            case CLOSED -> 100;
            case WAITING_CLIENT -> 60;
            case OPEN, IN_PROGRESS -> 0;
        };
    }

    private CaseResponse toResponse(CaseFile caseFile) {
        return new CaseResponse(
                caseFile.getId(),
                caseFile.getClient().getId(),
                caseFile.getClient().getName(),
                caseFile.getPartner() != null ? caseFile.getPartner().getId() : null,
                caseFile.getPartner() != null ? caseFile.getPartner().getName() : null,
                caseFile.getTitle(),
                caseFile.getCaseNumber(),
                caseFile.getArea(),
                caseFile.getCurrentStatus(),
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

    private Partner resolvePartner(UUID partnerId) {
        if (partnerId == null) {
            return null;
        }
        return partnerRepository.findById(partnerId)
                .orElseThrow(() -> new NotFoundException("Parceiro nao encontrado"));
    }
}
