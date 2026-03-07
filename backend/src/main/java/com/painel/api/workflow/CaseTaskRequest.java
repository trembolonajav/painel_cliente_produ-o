package com.painel.api.workflow;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

public record CaseTaskRequest(
        UUID stageId,
        @NotBlank @Size(max = 220) String title,
        String description,
        LocalDate dueDate,
        @NotNull CaseTaskStatus status,
        UUID assignedTo
) {
}
