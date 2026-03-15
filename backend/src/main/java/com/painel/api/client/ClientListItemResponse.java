package com.painel.api.client;

import java.util.UUID;

public record ClientListItemResponse(
        UUID id,
        String name,
        String cpfLast3,
        String email,
        String phone,
        long caseCount
) {
}
