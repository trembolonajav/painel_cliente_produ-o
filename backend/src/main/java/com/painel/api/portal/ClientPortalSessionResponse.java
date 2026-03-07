package com.painel.api.portal;

import java.time.OffsetDateTime;

public record ClientPortalSessionResponse(
        boolean ok,
        String sessionToken,
        OffsetDateTime expiresAt
) {
}
