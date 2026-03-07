package com.painel.api.document;

import com.painel.api.audit.AuditActorType;
import com.painel.api.audit.AuditService;
import com.painel.api.auth.AuthorizationService;
import com.painel.api.common.NotFoundException;
import com.painel.api.common.UnauthorizedException;
import com.painel.api.common.Visibility;
import com.painel.api.portal.ClientPortalSession;
import com.painel.api.portal.ClientPortalSessionService;
import com.painel.api.portal.PortalTokenService;
import com.painel.api.storage.StorageService;
import com.painel.api.user.OfficeUser;
import jakarta.servlet.http.HttpServletRequest;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DocumentDownloadService {

    private final DocumentRepository documentRepository;
    private final DocumentDownloadTokenRepository tokenRepository;
    private final AuthorizationService authorizationService;
    private final ClientPortalSessionService clientPortalSessionService;
    private final PortalTokenService portalTokenService;
    private final DocumentProperties documentProperties;
    private final AuditService auditService;
    private final StorageService storageService;

    public DocumentDownloadService(
            DocumentRepository documentRepository,
            DocumentDownloadTokenRepository tokenRepository,
            AuthorizationService authorizationService,
            ClientPortalSessionService clientPortalSessionService,
            PortalTokenService portalTokenService,
            DocumentProperties documentProperties,
            AuditService auditService,
            StorageService storageService) {
        this.documentRepository = documentRepository;
        this.tokenRepository = tokenRepository;
        this.authorizationService = authorizationService;
        this.clientPortalSessionService = clientPortalSessionService;
        this.portalTokenService = portalTokenService;
        this.documentProperties = documentProperties;
        this.auditService = auditService;
        this.storageService = storageService;
    }

    @Transactional
    public DocumentDownloadLinkResponse createStaffDownloadLink(UUID documentId, OfficeUser actor) {
        Document document = findDocument(documentId);
        authorizationService.requireCaseReadAccess(actor, document.getCaseFile().getId());
        if (document.getStatus() != DocumentStatus.AVAILABLE || document.getStorageKey() == null || document.getStorageKey().isBlank()) {
            throw new IllegalArgumentException("Documento pendente nao pode ser baixado.");
        }
        return createToken(document, AuditActorType.OFFICE_USER, actor.getId());
    }

    @Transactional
    public DocumentDownloadLinkResponse createClientDownloadLink(UUID documentId, HttpServletRequest request) {
        ClientPortalSession session = clientPortalSessionService.resolveSession(request);
        Document document = findDocument(documentId);

        if (!document.getCaseFile().getId().equals(session.getCaseFile().getId())) {
            throw new UnauthorizedException("Documento nao pertence ao caso da sessao");
        }
        if (document.getVisibility() != Visibility.CLIENT_VISIBLE) {
            throw new UnauthorizedException("Documento indisponivel para o cliente");
        }
        if (document.getStatus() != DocumentStatus.AVAILABLE || document.getStorageKey() == null || document.getStorageKey().isBlank()) {
            throw new UnauthorizedException("Documento pendente nao pode ser baixado");
        }
        return createToken(document, AuditActorType.CLIENT, session.getClient().getId());
    }

    @Transactional
    public DocumentDownloadResolveResponse resolve(String token) {
        if (token == null || token.isBlank()) {
            throw new UnauthorizedException("Token de download invalido");
        }

        String hash = portalTokenService.hash(token.trim());
        DocumentDownloadToken downloadToken = tokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Token de download invalido"));

        if (downloadToken.getUsedAt() != null) {
            throw new UnauthorizedException("Token de download ja utilizado");
        }
        if (downloadToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new UnauthorizedException("Token de download expirado");
        }

        Document document = findDocument(downloadToken.getDocumentId());
        downloadToken.setUsedAt(OffsetDateTime.now());
        tokenRepository.save(downloadToken);

        auditService.log(
                AuditActorType.valueOf(downloadToken.getActorType()),
                downloadToken.getActorId(),
                "DOCUMENT",
                document.getId(),
                "DOWNLOAD_RESOLVE",
                Map.of("storageKey", document.getStorageKey()));

        return new DocumentDownloadResolveResponse(
                document.getId(),
                document.getOriginalName(),
                document.getMimeType(),
                document.getSizeBytes(),
                document.getStorageKey(),
                storageService.createDownloadUrl(document.getStorageKey()),
                downloadToken.getCreatedAt());
    }

    private DocumentDownloadLinkResponse createToken(Document document, AuditActorType actorType, UUID actorId) {
        String rawToken = portalTokenService.generateToken();
        String hash = portalTokenService.hash(rawToken);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(documentProperties.downloadTokenMinutes());

        DocumentDownloadToken token = new DocumentDownloadToken();
        token.setDocumentId(document.getId());
        token.setTokenHash(hash);
        token.setExpiresAt(expiresAt);
        token.setActorType(actorType.name());
        token.setActorId(actorId);
        tokenRepository.save(token);

        auditService.log(actorType, actorId, "DOCUMENT", document.getId(), "DOWNLOAD_LINK_CREATE", Map.of("expiresAt", expiresAt.toString()));
        return new DocumentDownloadLinkResponse("/documents/download?token=" + rawToken, expiresAt);
    }

    private Document findDocument(UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Documento nao encontrado"));
    }
}
