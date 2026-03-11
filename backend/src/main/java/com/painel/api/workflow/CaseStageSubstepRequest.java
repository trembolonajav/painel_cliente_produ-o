package com.painel.api.workflow;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CaseStageSubstepRequest(
        @NotBlank @Size(max = 180) String title,
        String description,
        @NotNull Integer position,
        @NotNull CaseStageSubstepStatus status,
        Boolean visibleToClient
) {
}
