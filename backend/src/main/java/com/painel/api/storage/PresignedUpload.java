package com.painel.api.storage;

import java.time.OffsetDateTime;

public record PresignedUpload(
        String uploadUrl,
        String storageKey,
        OffsetDateTime expiresAt,
        String method,
        String contentType
) {
}
