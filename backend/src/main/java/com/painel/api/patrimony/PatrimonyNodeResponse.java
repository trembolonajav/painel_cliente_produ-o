package com.painel.api.patrimony;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PatrimonyNodeResponse(
        UUID id,
        UUID structureId,
        PatrimonyNodeType type,
        String label,
        String subtitle,
        String description,
        String value,
        String percentage,
        String location,
        UUID parentId,
        int sortOrder,
        boolean isVisibleToClient,
        String metadataJson,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
