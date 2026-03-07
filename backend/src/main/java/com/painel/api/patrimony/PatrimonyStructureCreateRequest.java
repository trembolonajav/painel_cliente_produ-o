package com.painel.api.patrimony;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PatrimonyStructureCreateRequest(
        @NotBlank @Size(max = 180) String title
) {
}
