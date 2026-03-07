package com.painel.api.document;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentDownloadResolveResponse(
        UUID documentId,
        String originalName,
        String mimeType,
        long sizeBytes,
        String storageKey,
        String downloadUrl,
        OffsetDateTime issuedAt
) {
}
