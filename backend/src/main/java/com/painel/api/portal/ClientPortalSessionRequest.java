package com.painel.api.portal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ClientPortalSessionRequest(
        @NotBlank String token,
        @NotBlank @Pattern(regexp = "^\\d{3}$", message = "cpfLast3 deve ter 3 digitos") String cpfLast3
) {
}
