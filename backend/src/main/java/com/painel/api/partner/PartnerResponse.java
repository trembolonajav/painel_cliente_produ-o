package com.painel.api.partner;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PartnerResponse(
        UUID id,
        String name,
        String email,
        String phone,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
