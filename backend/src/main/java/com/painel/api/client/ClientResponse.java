package com.painel.api.client;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClientResponse(
        UUID id,
        String name,
        String cpfLast3,
        String email,
        String phone,
        long caseCount,
        String notes,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
