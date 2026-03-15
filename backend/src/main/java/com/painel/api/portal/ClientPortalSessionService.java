package com.painel.api.portal;

import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.casefile.CaseMemberPermission;
import com.painel.api.casefile.CaseMemberRepository;
import com.painel.api.common.UnauthorizedException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientPortalSessionService {

    public static final String CLIENT_PORTAL_COOKIE = "CLIENT_PORTAL_SESSION";
    public static final String CLIENT_PORTAL_HEADER = "X-Client-Session";
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int BLOCK_MINUTES = 10;

    private final CasePortalLinkRepository casePortalLinkRepository;
    private final ClientPortalSessionRepository clientPortalSessionRepository;
    private final CaseMemberRepository caseMemberRepository;
    private final PortalTokenService portalTokenService;
    private final PortalProperties portalProperties;
    private final AuditService auditService;

    public ClientPortalSessionService(
            CasePortalLinkRepository casePortalLinkRepository,
            ClientPortalSessionRepository clientPortalSessionRepository,
            CaseMemberRepository caseMemberRepository,
            PortalTokenService portalTokenService,
            PortalProperties portalProperties,
            AuditService auditService) {
        this.casePortalLinkRepository = casePortalLinkRepository;
        this.clientPortalSessionRepository = clientPortalSessionRepository;
        this.caseMemberRepository = caseMemberRepository;
        this.portalTokenService = portalTokenService;
        this.portalProperties = portalProperties;
        this.auditService = auditService;
    }

    @Transactional(noRollbackFor = UnauthorizedException.class)
    public ClientPortalSessionResponse createSession(
            ClientPortalSessionRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        String token = digitsOrText(request.token());
        String cpfLast3 = onlyDigits(request.cpfLast3());

        if (token == null || token.isBlank() || cpfLast3 == null || cpfLast3.length() != 3) {
            auditService.log(AuditActorType.CLIENT, null, "CLIENT_PORTAL_SESSION", null, "LOGIN_FAIL_INVALID_INPUT");
            throw new UnauthorizedException("Token ou CPF invalido");
        }

        String tokenHash = portalTokenService.hash(token);
        CasePortalLink link = casePortalLinkRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> {
                    auditService.log(AuditActorType.CLIENT, null, "PORTAL_LINK", null, "LOGIN_FAIL_INVALID_TOKEN");
                    return new UnauthorizedException("Link invalido");
                });

        if (link.getBlockedUntil() != null && link.getBlockedUntil().isAfter(OffsetDateTime.now())) {
            auditService.log(
                    AuditActorType.CLIENT,
                    link.getClient().getId(),
                    "PORTAL_LINK",
                    link.getId(),
                    "LOGIN_BLOCKED",
                    Map.of("blockedUntil", link.getBlockedUntil().toString()));
            throw new UnauthorizedException("Muitas tentativas. Aguarde alguns minutos.");
        }

        if (link.getStatus() == PortalLinkStatus.REVOKED) {
            auditService.log(AuditActorType.CLIENT, link.getClient().getId(), "PORTAL_LINK", link.getId(), "LOGIN_FAIL_REVOKED");
            throw new UnauthorizedException("Link revogado");
        }
        if (link.getExpiresAt().isBefore(OffsetDateTime.now())) {
            link.setStatus(PortalLinkStatus.EXPIRED);
            casePortalLinkRepository.save(link);
            auditService.log(AuditActorType.CLIENT, link.getClient().getId(), "PORTAL_LINK", link.getId(), "LOGIN_FAIL_EXPIRED");
            throw new UnauthorizedException("Link expirado");
        }
        if (link.getStatus() != PortalLinkStatus.ACTIVE) {
            auditService.log(AuditActorType.CLIENT, link.getClient().getId(), "PORTAL_LINK", link.getId(), "LOGIN_FAIL_INACTIVE");
            throw new UnauthorizedException("Link inativo");
        }

        String clientLast3 = onlyDigits(link.getClient().getCpfLast3());
        if (clientLast3 == null || !clientLast3.equals(cpfLast3)) {
            int failed = link.getFailedAttempts() + 1;
            link.setFailedAttempts(failed);
            if (failed >= MAX_FAILED_ATTEMPTS) {
                link.setBlockedUntil(OffsetDateTime.now().plusMinutes(BLOCK_MINUTES));
            }
            casePortalLinkRepository.save(link);
            auditService.log(
                    AuditActorType.CLIENT,
                    link.getClient().getId(),
                    "PORTAL_LINK",
                    link.getId(),
                    "LOGIN_FAIL_CPF",
                    Map.of("failedAttempts", failed));
            throw new UnauthorizedException("CPF invalido para este link");
        }

        String rawSessionToken = portalTokenService.generateToken();
        String sessionHash = portalTokenService.hash(rawSessionToken);

        ClientPortalSession session = new ClientPortalSession();
        session.setCaseFile(link.getCaseFile());
        session.setClient(link.getClient());
        session.setSessionHash(sessionHash);
        session.setExpiresAt(OffsetDateTime.now().plusMinutes(portalProperties.clientSessionMinutes()));
        session.setIp(trimToNull(httpRequest.getRemoteAddr()));
        session.setUserAgent(trimToNull(httpRequest.getHeader("User-Agent")));
        clientPortalSessionRepository.save(session);

        link.setFailedAttempts(0);
        link.setBlockedUntil(null);
        link.setLastAccessAt(OffsetDateTime.now());
        casePortalLinkRepository.save(link);

        setSessionCookie(httpResponse, rawSessionToken, portalProperties.clientSessionMinutes() * 60);
        auditService.log(
                AuditActorType.CLIENT,
                link.getClient().getId(),
                "CLIENT_PORTAL_SESSION",
                session.getId(),
                "LOGIN_SUCCESS",
                Map.of("caseId", link.getCaseFile().getId().toString()));
        return new ClientPortalSessionResponse(true, rawSessionToken, session.getExpiresAt());
    }

    @Transactional(readOnly = true)
    public ClientPortalMeResponse me(HttpServletRequest request) {
        ClientPortalSession session = resolveSessionOrThrow(request);
        return meFromSession(session);
    }

    @Transactional(readOnly = true)
    public ClientPortalCaseResponse caseDetails(HttpServletRequest request) {
        ClientPortalSession session = resolveSessionOrThrow(request);
        return caseDetailsFromSession(session);
    }

    @Transactional(readOnly = true)
    public ClientPortalMeResponse meFromSession(ClientPortalSession session) {
        return new ClientPortalMeResponse(
                session.getClient().getName(),
                session.getCaseFile().getId(),
                session.getCaseFile().getTitle(),
                session.getCaseFile().getStatus(),
                session.getCaseFile().getPriority());
    }

    @Transactional(readOnly = true)
    public ClientPortalCaseResponse caseDetailsFromSession(ClientPortalSession session) {
        var c = session.getCaseFile();
        var cl = session.getClient();
        var owner = caseMemberRepository.findByCaseFile_IdAndPermission(c.getId(), CaseMemberPermission.OWNER)
                .orElse(null);
        return new ClientPortalCaseResponse(
                c.getId(),
                c.getTitle(),
                c.getCaseNumber(),
                c.getArea(),
                c.getCurrentStatus(),
                c.getStatus(),
                c.getPriority(),
                c.getUpdatedAt(),
                c.getClosedAt(),
                cl.getId(),
                cl.getName(),
                owner != null ? owner.getUser().getName() : null,
                owner != null ? owner.getUser().getPhone() : null);
    }

    @Transactional
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        String token = resolveSessionToken(request);
        if (token != null) {
            String hash = portalTokenService.hash(token);
            clientPortalSessionRepository.findBySessionHash(hash).ifPresent(session -> {
                session.setRevokedAt(OffsetDateTime.now());
                clientPortalSessionRepository.save(session);
                auditService.log(
                        AuditActorType.CLIENT,
                        session.getClient().getId(),
                        "CLIENT_PORTAL_SESSION",
                        session.getId(),
                        "LOGOUT");
            });
        }
        clearSessionCookie(response);
    }

    private ClientPortalSession resolveSessionOrThrow(HttpServletRequest request) {
        String token = resolveSessionToken(request);
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Sessao do cliente ausente");
        }

        String hash = portalTokenService.hash(token);
        ClientPortalSession session = clientPortalSessionRepository.findBySessionHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Sessao do cliente invalida"));

        if (session.getRevokedAt() != null) {
            throw new UnauthorizedException("Sessao revogada");
        }
        if (session.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new UnauthorizedException("Sessao expirada");
        }
        return session;
    }

    @Transactional(readOnly = true)
    public ClientPortalSession resolveSession(HttpServletRequest request) {
        return resolveSessionOrThrow(request);
    }

    private String resolveSessionToken(HttpServletRequest request) {
        String headerToken = trimToNull(request.getHeader(CLIENT_PORTAL_HEADER));
        if (headerToken != null) {
            return headerToken;
        }
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (CLIENT_PORTAL_COOKIE.equals(cookie.getName())) {
                return trimToNull(cookie.getValue());
            }
        }
        return null;
    }

    private void setSessionCookie(HttpServletResponse response, String token, int maxAgeSeconds) {
        String cookie = CLIENT_PORTAL_COOKIE + "=" + token
                + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + maxAgeSeconds;
        response.addHeader("Set-Cookie", cookie);
    }

    private void clearSessionCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie", CLIENT_PORTAL_COOKIE + "=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    }

    private String onlyDigits(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("\\D", "");
        return digits.isBlank() ? null : digits;
    }

    private String digitsOrText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
