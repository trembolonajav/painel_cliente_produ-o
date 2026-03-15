package com.painel.api.casefile;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DashboardCaseResponse(
        UUID id,
        UUID clientId,
        String clientName,
        UUID partnerId,
        String partnerName,
        String title,
        String caseNumber,
        String area,
        String currentStatus,
        CaseStatus status,
        CasePriority priority,
        String responsibleName,
        List<String> teamNames,
        int progress,
        int pendingClient,
        boolean portalActive,
        OffsetDateTime portalExpiresAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime closedAt
) {
}
