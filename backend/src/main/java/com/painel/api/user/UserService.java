package com.painel.api.user;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.document.DocumentRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.portal.CasePortalLinkRepository;
import com.painel.api.updates.CaseUpdateRepository;
import com.painel.api.workflow.CaseTaskRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final OfficeUserRepository officeUserRepository;
    private final CaseFileRepository caseFileRepository;
    private final CasePortalLinkRepository casePortalLinkRepository;
    private final CaseUpdateRepository caseUpdateRepository;
    private final DocumentRepository documentRepository;
    private final CaseTaskRepository caseTaskRepository;
    private final AuthorizationService authorizationService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(
            OfficeUserRepository officeUserRepository,
            CaseFileRepository caseFileRepository,
            CasePortalLinkRepository casePortalLinkRepository,
            CaseUpdateRepository caseUpdateRepository,
            DocumentRepository documentRepository,
            CaseTaskRepository caseTaskRepository,
            AuthorizationService authorizationService,
            PasswordEncoder passwordEncoder,
            AuditService auditService) {
        this.officeUserRepository = officeUserRepository;
        this.caseFileRepository = caseFileRepository;
        this.casePortalLinkRepository = casePortalLinkRepository;
        this.caseUpdateRepository = caseUpdateRepository;
        this.documentRepository = documentRepository;
        this.caseTaskRepository = caseTaskRepository;
        this.authorizationService = authorizationService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list(OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR);
        return officeUserRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse create(UserRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR);
        String normalizedEmail = request.email().trim().toLowerCase();
        if (officeUserRepository.existsByEmail(normalizedEmail)) {
            throw new IllegalArgumentException("Ja existe usuario com este email");
        }
        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Senha obrigatoria");
        }

        OfficeUser user = new OfficeUser();
        user.setName(request.name().trim());
        user.setEmail(normalizedEmail);
        user.setPhone(normalizePhone(request.phone()));
        user.setPasswordHash(passwordEncoder.encode(request.password().trim()));
        user.setRole(request.role());
        user.setActive(request.active());
        OfficeUser saved = officeUserRepository.save(user);

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "USER",
                saved.getId(),
                "CREATE",
                Map.of("email", saved.getEmail(), "role", saved.getRole().name()));
        return toResponse(saved);
    }

    @Transactional
    public UserResponse update(UUID id, UserRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR);
        OfficeUser user = officeUserRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        if (!user.getEmail().equalsIgnoreCase(request.email())) {
            String normalizedEmail = request.email().trim().toLowerCase();
            if (officeUserRepository.existsByEmail(normalizedEmail)) {
                throw new IllegalArgumentException("Ja existe usuario com este email");
            }
            user.setEmail(normalizedEmail);
        }

        user.setName(request.name().trim());
        user.setPhone(normalizePhone(request.phone()));
        user.setRole(request.role());
        user.setActive(request.active());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password().trim()));
        }

        enforceAtLeastOneActiveAdmin(user);
        OfficeUser saved = officeUserRepository.save(user);

        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "USER",
                saved.getId(),
                "UPDATE",
                Map.of("email", saved.getEmail(), "role", saved.getRole().name(), "active", Boolean.toString(saved.isActive())));
        return toResponse(saved);
    }

    @Transactional
    public UserDeleteResponse delete(UUID id, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR);
        OfficeUser user = officeUserRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        if (actor.getId().equals(id)) {
            throw new IllegalArgumentException("Autoexclusao nao permitida");
        }

        enforceAtLeastOneActiveAdminOnDelete(user);
        String blockingReason = findOperationalHistoryBlockingReason(id);
        if (blockingReason != null) {
            throw new IllegalArgumentException(blockingReason);
        }

        officeUserRepository.delete(user);
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "USER",
                id,
                "DELETE",
                Map.of("email", user.getEmail(), "role", user.getRole().name()));
        return new UserDeleteResponse(true, "Usuario removido definitivamente. O acesso foi revogado de forma permanente.");
    }

    private void enforceAtLeastOneActiveAdmin(OfficeUser userBeingSaved) {
        if (userBeingSaved.getRole() == OfficeRole.ADMINISTRADOR && userBeingSaved.isActive()) {
            return;
        }

        long activeAdmins = officeUserRepository.findAll().stream()
                .filter(OfficeUser::isActive)
                .filter(user -> user.getRole() == OfficeRole.ADMINISTRADOR)
                .filter(user -> !user.getId().equals(userBeingSaved.getId()))
                .count();
        if (activeAdmins == 0) {
            throw new IllegalArgumentException("Deve existir ao menos um usuario ADMINISTRADOR ativo");
        }
    }

    private void enforceAtLeastOneActiveAdminOnDelete(OfficeUser userBeingDeleted) {
        if (userBeingDeleted.getRole() != OfficeRole.ADMINISTRADOR || !userBeingDeleted.isActive()) {
            return;
        }
        long activeAdmins = officeUserRepository.findAll().stream()
                .filter(OfficeUser::isActive)
                .filter(user -> user.getRole() == OfficeRole.ADMINISTRADOR)
                .filter(user -> !user.getId().equals(userBeingDeleted.getId()))
                .count();
        if (activeAdmins == 0) {
            throw new IllegalArgumentException("Nao e permitido excluir o ultimo ADMINISTRADOR ativo");
        }
    }

    private String findOperationalHistoryBlockingReason(UUID userId) {
        long casesCreated = caseFileRepository.countByCreatedBy_Id(userId);
        if (casesCreated > 0) {
            return "Exclusao bloqueada: usuario possui historico operacional em casos criados.";
        }
        long portalLinksCreated = casePortalLinkRepository.countByCreatedBy_Id(userId);
        if (portalLinksCreated > 0) {
            return "Exclusao bloqueada: usuario possui historico operacional em links de portal.";
        }
        long updatesCreated = caseUpdateRepository.countByCreatedBy_Id(userId);
        if (updatesCreated > 0) {
            return "Exclusao bloqueada: usuario possui historico operacional em atualizacoes.";
        }
        long documentsUploaded = documentRepository.countByUploadedBy_Id(userId);
        if (documentsUploaded > 0) {
            return "Exclusao bloqueada: usuario possui historico operacional em documentos.";
        }
        long tasksCreated = caseTaskRepository.countByCreatedBy_Id(userId);
        if (tasksCreated > 0) {
            return "Exclusao bloqueada: usuario possui historico operacional em tarefas criadas.";
        }
        long tasksAssigned = caseTaskRepository.countByAssignedTo_Id(userId);
        if (tasksAssigned > 0) {
            return "Exclusao bloqueada: usuario possui historico operacional em tarefas atribuidas.";
        }
        return null;
    }

    private UserResponse toResponse(OfficeUser user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getLastLoginAt());
    }

    private String normalizePhone(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        String digits = trimmed.replaceAll("\\D", "");
        if (digits.length() != 10 && digits.length() != 11) {
            throw new IllegalArgumentException("Telefone deve conter 10 ou 11 digitos.");
        }
        return digits;
    }
}
