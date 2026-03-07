package com.painel.api.patrimony;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PatrimonyStructureResponse(
        UUID id,
        UUID caseId,
        String title,
        PatrimonyStatus status,
        int version,
        String notesInternal,
        String notesClient,
        String originalDocumentName,
        String originalDocumentMimeType,
        Long originalDocumentSizeBytes,
        String originalDocumentStorageKey,
        boolean originalDocumentVisibleToClient,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
