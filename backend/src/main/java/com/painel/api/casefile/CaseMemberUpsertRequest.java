package com.painel.api.casefile;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CaseMemberUpsertRequest(
        @NotNull UUID userId,
        @NotNull CaseMemberPermission permission
) {
}
