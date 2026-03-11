package com.painel.api.partner;

public record PartnerDeleteResponse(
        boolean deleted,
        String message
) {
}
