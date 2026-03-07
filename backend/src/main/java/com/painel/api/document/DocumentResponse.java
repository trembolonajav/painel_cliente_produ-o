package com.painel.api.document;

import com.painel.api.common.Visibility;
import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        UUID caseId,
        Visibility visibility,
        DocumentStatus status,
        String originalName,
        String mimeType,
        long sizeBytes,
        String storageKey,
        String checksum,
        UUID uploadedBy,
        String uploadedByName,
        OffsetDateTime createdAt
) {
}
