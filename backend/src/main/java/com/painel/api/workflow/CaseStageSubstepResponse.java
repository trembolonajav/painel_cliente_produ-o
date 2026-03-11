package com.painel.api.workflow;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CaseStageSubstepResponse(
        UUID id,
        UUID stageId,
        String title,
        String description,
        int position,
        CaseStageSubstepStatus status,
        boolean visibleToClient,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
