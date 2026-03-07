package com.painel.api.workflow;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CaseStageResponse(
        UUID id,
        UUID caseId,
        String title,
        String description,
        int position,
        CaseStageStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
