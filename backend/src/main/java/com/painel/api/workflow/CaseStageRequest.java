package com.painel.api.workflow;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CaseStageRequest(
        @NotBlank @Size(max = 180) String title,
        String description,
        @NotNull Integer position,
        @NotNull CaseStageStatus status
) {
}
