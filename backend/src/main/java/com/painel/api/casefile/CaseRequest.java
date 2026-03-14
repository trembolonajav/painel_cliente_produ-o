package com.painel.api.casefile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CaseRequest(
        @NotNull UUID clientId,
        UUID partnerId,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 100) String caseNumber,
        @Size(max = 80) String area,
        @Size(max = 2000) String currentStatus,
        @NotNull CaseStatus status,
        @NotNull CasePriority priority,
        UUID responsibleUserId
) {
}
