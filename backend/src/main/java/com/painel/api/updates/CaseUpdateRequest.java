package com.painel.api.updates;

import com.painel.api.common.Visibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CaseUpdateRequest(
        @NotNull Visibility visibility,
        @NotBlank @Size(max = 40) String type,
        @NotBlank String content
) {
}
