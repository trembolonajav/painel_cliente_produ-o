package com.painel.api.auth;

import com.painel.api.user.OfficeRole;
import java.util.UUID;

public record AuthResponse(
        String accessToken,
        UUID userId,
        String name,
        String email,
        OfficeRole role
) {
}
