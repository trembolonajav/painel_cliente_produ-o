package com.painel.api.patrimony;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record PatrimonyNodeRequest(
        @NotNull PatrimonyNodeType type,
        @NotBlank @Size(max = 180) String label,
        @Size(max = 220) String subtitle,
        String description,
        @Size(max = 120) String value,
        @Size(max = 40) String percentage,
        @Size(max = 220) String location,
        UUID parentId,
        @NotNull Integer sortOrder,
        @NotNull Boolean isVisibleToClient,
        String metadataJson
) {
}
