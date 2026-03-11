package com.painel.api.partner;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeRole;
import com.painel.api.user.OfficeUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PartnerService {
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final PartnerRepository partnerRepository;
    private final AuthorizationService authorizationService;
    private final AuditService auditService;

    public PartnerService(
            PartnerRepository partnerRepository,
            AuthorizationService authorizationService,
            AuditService auditService) {
        this.partnerRepository = partnerRepository;
        this.authorizationService = authorizationService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<PartnerResponse> list(OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        return partnerRepository.findAllByOrderByUpdatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public PartnerResponse getById(UUID id, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR, OfficeRole.ESTAGIARIO);
        return toResponse(findPartner(id));
    }

    @Transactional
    public PartnerResponse create(PartnerRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        String normalizedEmail = normalizeEmail(request.email());
        if (partnerRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException("Ja existe parceiro com este email.");
        }

        Partner partner = new Partner();
        apply(partner, request, normalizedEmail);
        Partner saved = partnerRepository.save(partner);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PARTNER", saved.getId(), "CREATE", Map.of("name", saved.getName(), "email", saved.getEmail()));
        return toResponse(saved);
    }

    @Transactional
    public PartnerResponse update(UUID id, PartnerRequest request, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        Partner partner = findPartner(id);
        String normalizedEmail = normalizeEmail(request.email());
        if (partnerRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, id)) {
            throw new IllegalArgumentException("Ja existe parceiro com este email.");
        }

        apply(partner, request, normalizedEmail);
        Partner saved = partnerRepository.save(partner);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PARTNER", saved.getId(), "UPDATE", Map.of("name", saved.getName(), "email", saved.getEmail()));
        return toResponse(saved);
    }

    @Transactional
    public PartnerDeleteResponse delete(UUID id, OfficeUser actor) {
        authorizationService.requireAnyRole(actor, OfficeRole.ADMINISTRADOR, OfficeRole.GESTOR);
        Partner partner = findPartner(id);
        partnerRepository.delete(partner);
        auditService.log(AuditActorType.OFFICE_USER, actor.getId(), "PARTNER", id, "DELETE", Map.of("email", partner.getEmail()));
        return new PartnerDeleteResponse(true, "Parceiro removido definitivamente.");
    }

    private Partner findPartner(UUID id) {
        return partnerRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Parceiro nao encontrado"));
    }

    private void apply(Partner partner, PartnerRequest request, String normalizedEmail) {
        String normalizedName = trimToNull(request.name());
        if (normalizedName == null) {
            throw new IllegalArgumentException("Nome e obrigatorio.");
        }

        partner.setName(normalizedName);
        partner.setEmail(normalizedEmail);
        partner.setPhone(normalizePhone(request.phone()));
    }

    private PartnerResponse toResponse(Partner partner) {
        return new PartnerResponse(
                partner.getId(),
                partner.getName(),
                partner.getEmail(),
                partner.getPhone(),
                partner.getCreatedAt(),
                partner.getUpdatedAt());
    }

    private String normalizeEmail(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new IllegalArgumentException("E-mail e obrigatorio.");
        }
        normalized = normalized.toLowerCase();
        if (!EMAIL_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("E-mail invalido.");
        }
        return normalized;
    }

    private String normalizePhone(String value) {
        String normalized = trimToNull(value);
        if (normalized == null) {
            throw new IllegalArgumentException("Telefone e obrigatorio.");
        }
        String digits = normalized.replaceAll("\\D", "");
        if (digits.length() != 10 && digits.length() != 11) {
            throw new IllegalArgumentException("Telefone deve conter 10 ou 11 digitos.");
        }
        return digits;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
