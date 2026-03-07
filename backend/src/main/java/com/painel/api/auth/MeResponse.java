package com.painel.api.auth;

import com.painel.api.user.OfficeRole;
import java.util.UUID;

public record MeResponse(
        UUID id,
        String name,
        String email,
        OfficeRole role
) {
}
