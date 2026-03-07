package com.painel.api.patrimony;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PatrimonyOriginalDocPresignRequest(
        @NotBlank @Size(max = 255) String originalName,
        @NotBlank @Size(max = 120) String mimeType,
        @NotNull @Positive Long sizeBytes
) {
}
