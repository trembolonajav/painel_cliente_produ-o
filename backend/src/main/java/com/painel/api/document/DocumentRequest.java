package com.painel.api.document;

import com.painel.api.common.Visibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record DocumentRequest(
        @NotNull Visibility visibility,
        @NotNull DocumentStatus status,
        @NotBlank @Size(max = 255) String originalName,
        @Size(max = 120) String mimeType,
        @NotNull @PositiveOrZero Long sizeBytes,
        @Size(max = 512) String storageKey,
        @Size(max = 128) String checksum
) {
}
