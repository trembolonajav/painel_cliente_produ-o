package com.painel.api.casefile;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CaseMemberResponse(
        UUID userId,
        String userName,
        String userEmail,
        CaseMemberPermission permission,
        OffsetDateTime createdAt
) {
}
