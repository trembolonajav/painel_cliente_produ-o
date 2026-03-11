package com.painel.api.portal;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClientPortalStageSubstepResponse(
        UUID id,
        String title,
        String description,
        int position,
        String status,
        OffsetDateTime updatedAt
) {
}
