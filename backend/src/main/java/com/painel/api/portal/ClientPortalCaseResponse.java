package com.painel.api.portal;

import com.painel.api.casefile.CasePriority;
import com.painel.api.casefile.CaseStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ClientPortalCaseResponse(
        UUID caseId,
        String title,
        String caseNumber,
        String area,
        CaseStatus status,
        CasePriority priority,
        OffsetDateTime updatedAt,
        OffsetDateTime closedAt,
        UUID clientId,
        String clientName
) {
}
