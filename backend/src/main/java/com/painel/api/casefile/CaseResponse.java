package com.painel.api.casefile;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CaseResponse(
        UUID id,
        UUID clientId,
        String clientName,
        String title,
        String caseNumber,
        String area,
        CaseStatus status,
        CasePriority priority,
        UUID createdBy,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime closedAt
) {
}
