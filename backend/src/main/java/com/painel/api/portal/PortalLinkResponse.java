package com.painel.api.portal;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PortalLinkResponse(
        UUID id,
        UUID caseId,
        PortalLinkStatus status,
        OffsetDateTime expiresAt,
        OffsetDateTime revokedAt,
        OffsetDateTime lastAccessAt,
        String url
) {
}
