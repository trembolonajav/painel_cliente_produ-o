package com.painel.api.partner;

import java.util.UUID;

public record PartnerListItemResponse(
        UUID id,
        String name,
        String email,
        String phone
) {
}
