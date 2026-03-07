package com.painel.api.document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record DocumentPresignRequest(
        @NotBlank @Size(max = 255) String originalName,
        @NotBlank @Size(max = 120) String mimeType,
        @NotNull @Positive Long sizeBytes
) {
}
