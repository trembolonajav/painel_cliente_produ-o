package com.painel.api.user;

import java.util.UUID;

public record UserListItemResponse(
        UUID id,
        String name,
        String email,
        String phone,
        OfficeRole role,
        boolean active
) {
}
