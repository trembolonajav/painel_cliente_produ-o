package com.painel.api.document;

import java.time.OffsetDateTime;

public record DocumentPresignResponse(
        String uploadUrl,
        String storageKey,
        String method,
        String contentType,
        OffsetDateTime expiresAt
) {
}
