package com.painel.api.workflow;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CaseTaskResponse(
        UUID id,
        UUID caseId,
        UUID stageId,
        String title,
        String description,
        LocalDate dueDate,
        CaseTaskStatus status,
        UUID assignedTo,
        String assignedToName,
        UUID createdBy,
        String createdByName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime completedAt
) {
}
