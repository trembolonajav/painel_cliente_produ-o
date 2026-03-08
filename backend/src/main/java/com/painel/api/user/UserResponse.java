package com.painel.api.user;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String name,
        String email,
        String phone,
        OfficeRole role,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime lastLoginAt
) {
}
