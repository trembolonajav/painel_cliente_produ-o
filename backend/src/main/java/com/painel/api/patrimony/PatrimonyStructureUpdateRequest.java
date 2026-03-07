package com.painel.api.patrimony;

import jakarta.validation.constraints.Size;

public record PatrimonyStructureUpdateRequest(
        @Size(max = 180) String title,
        PatrimonyStatus status,
        Integer version,
        String notesInternal,
        String notesClient,
        @Size(max = 255) String originalDocumentName,
        @Size(max = 120) String originalDocumentMimeType,
        Long originalDocumentSizeBytes,
        @Size(max = 512) String originalDocumentStorageKey,
        Boolean originalDocumentVisibleToClient
) {
}
