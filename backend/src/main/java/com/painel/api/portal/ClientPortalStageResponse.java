package com.painel.api.portal;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ClientPortalStageResponse(
        UUID id,
        String title,
        String description,
        int position,
        String status,
        OffsetDateTime updatedAt,
        List<ClientPortalStageSubstepResponse> substeps
) {
}
