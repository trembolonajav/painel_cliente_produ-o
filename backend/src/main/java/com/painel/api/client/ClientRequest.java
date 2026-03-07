package com.painel.api.client;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ClientRequest(
        @NotBlank @Size(max = 150) String name,
        @Size(max = 255) String cpfEncrypted,
        @Pattern(regexp = "^\\d{3}$", message = "cpfLast3 deve ter 3 digitos") String cpfLast3,
        @Size(max = 255) String email,
        @Size(max = 30) String phone,
        String notes
) {
}
