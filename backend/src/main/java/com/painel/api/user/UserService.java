package com.painel.api.user;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.common.NotFoundException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final OfficeUserRepository officeUserRepository;
    private final AuthorizationService authorizationService;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(
            OfficeUserRepository officeUserRepository,
            AuthorizationService authorizationService,
            PasswordEncoder passwordEncoder,
            AuditService auditService) {
        this.officeUserRepository = officeUserRepository;
        this.authorizationService = authorizationService;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list(OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN);
        return officeUserRepository.findAll().stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponse create(UserRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN);
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
        authorizationService.requireAnyRole(actor, OfficeRole.ADMIN);
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

    private void enforceAtLeastOneActiveAdmin(OfficeUser userBeingSaved) {
        if (userBeingSaved.getRole() == OfficeRole.ADMIN && userBeingSaved.isActive()) {
            return;
        }

        long activeAdmins = officeUserRepository.findAll().stream()
                .filter(OfficeUser::isActive)
                .filter(user -> user.getRole() == OfficeRole.ADMIN)
                .filter(user -> !user.getId().equals(userBeingSaved.getId()))
                .count();
        if (activeAdmins == 0) {
            throw new IllegalArgumentException("Deve existir ao menos um usuario ADMIN ativo");
        }
    }

    private UserResponse toResponse(OfficeUser user) {
        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                user.getLastLoginAt());
    }
}
