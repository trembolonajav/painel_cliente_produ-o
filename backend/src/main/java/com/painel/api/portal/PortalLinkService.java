package com.painel.api.portal;

import com.painel.api.auth.AuthorizationService;
import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseFile;
import com.painel.api.casefile.CaseFileRepository;
import com.painel.api.common.NotFoundException;
import com.painel.api.user.OfficeUser;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PortalLinkService {

    private final CasePortalLinkRepository casePortalLinkRepository;
    private final CaseFileRepository caseFileRepository;
    private final AuthorizationService authorizationService;
    private final PortalTokenService portalTokenService;
    private final PortalProperties portalProperties;
    private final AuditService auditService;

    public PortalLinkService(
            CasePortalLinkRepository casePortalLinkRepository,
            CaseFileRepository caseFileRepository,
            AuthorizationService authorizationService,
            PortalTokenService portalTokenService,
            PortalProperties portalProperties,
            AuditService auditService) {
        this.casePortalLinkRepository = casePortalLinkRepository;
        this.caseFileRepository = caseFileRepository;
        this.authorizationService = authorizationService;
        this.portalTokenService = portalTokenService;
        this.portalProperties = portalProperties;
        this.auditService = auditService;
    }

    @Transactional
    public PortalLinkResponse getStatus(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseReadAccess(actor, caseId);
        findCase(caseId);
        CasePortalLink latest = casePortalLinkRepository.findFirstByCaseFile_IdOrderByCreatedAtDesc(caseId)
                .map(this::expireIfNeeded)
                .orElse(null);
        if (latest == null) {
            return new PortalLinkResponse(null, caseId, null, null, null, null, null);
        }
        return toResponse(latest, null);
    }

    @Transactional
    public PortalLinkResponse activate(UUID caseId, PortalLinkActivateRequest request, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        CaseFile caseFile = findCase(caseId);

        revokeActiveLinks(caseId);

        String token = portalTokenService.generateToken();
        String tokenHash = portalTokenService.hash(token);
        int ttlMinutes = request != null && request.ttlMinutes() != null
                ? request.ttlMinutes()
                : portalProperties.defaultTtlMinutes();

        CasePortalLink link = new CasePortalLink();
        link.setCaseFile(caseFile);
        link.setClient(caseFile.getClient());
        link.setCreatedBy(actor);
        link.setTokenHash(tokenHash);
        link.setStatus(PortalLinkStatus.ACTIVE);
        link.setExpiresAt(OffsetDateTime.now().plusMinutes(ttlMinutes));

        CasePortalLink saved = casePortalLinkRepository.save(link);
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "PORTAL_LINK",
                saved.getId(),
                "ACTIVATE",
                Map.of("caseId", caseId.toString(), "expiresAt", saved.getExpiresAt().toString()));
        return toResponse(saved, buildPortalUrl(token));
    }

    @Transactional
    public PortalLinkResponse revoke(UUID caseId, OfficeUser actor) {
        authorizationService.requireCaseWriteAccess(actor, caseId);
        findCase(caseId);
        List<CasePortalLink> activeLinks = casePortalLinkRepository.findByCaseFile_IdAndStatus(caseId, PortalLinkStatus.ACTIVE);
        OffsetDateTime now = OffsetDateTime.now();
        for (CasePortalLink link : activeLinks) {
            link.setStatus(PortalLinkStatus.REVOKED);
            link.setRevokedAt(now);
        }
        casePortalLinkRepository.saveAllAndFlush(activeLinks);

        CasePortalLink latest = casePortalLinkRepository.findFirstByCaseFile_IdOrderByCreatedAtDesc(caseId)
                .map(this::expireIfNeeded)
                .orElse(null);
        if (latest == null) {
            return new PortalLinkResponse(null, caseId, null, null, null, null, null);
        }
        auditService.log(
                AuditActorType.OFFICE_USER,
                actor.getId(),
                "PORTAL_LINK",
                latest.getId(),
                "REVOKE",
                Map.of("caseId", caseId.toString()));
        return toResponse(latest, null);
    }

    private void revokeActiveLinks(UUID caseId) {
        List<CasePortalLink> activeLinks = casePortalLinkRepository.findByCaseFile_IdAndStatus(caseId, PortalLinkStatus.ACTIVE);
        OffsetDateTime now = OffsetDateTime.now();
        for (CasePortalLink link : activeLinks) {
            link.setStatus(PortalLinkStatus.REVOKED);
            link.setRevokedAt(now);
        }
        casePortalLinkRepository.saveAllAndFlush(activeLinks);
    }

    private CasePortalLink expireIfNeeded(CasePortalLink link) {
        if (link.getStatus() == PortalLinkStatus.ACTIVE && link.getExpiresAt().isBefore(OffsetDateTime.now())) {
            link.setStatus(PortalLinkStatus.EXPIRED);
            casePortalLinkRepository.save(link);
        }
        return link;
    }

    private CaseFile findCase(UUID caseId) {
        return caseFileRepository.findById(caseId)
                .orElseThrow(() -> new NotFoundException("Caso nao encontrado"));
    }

    private String buildPortalUrl(String token) {
        String base = trimTrailingSlash(portalProperties.frontendBaseUrl());
        String path = portalProperties.clientPath().startsWith("/")
                ? portalProperties.clientPath()
                : "/" + portalProperties.clientPath();
        return base + path + "?token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:5173";
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private PortalLinkResponse toResponse(CasePortalLink link, String url) {
        return new PortalLinkResponse(
                link.getId(),
                link.getCaseFile().getId(),
                link.getStatus(),
                link.getExpiresAt(),
                link.getRevokedAt(),
                link.getLastAccessAt(),
                url);
    }
}
