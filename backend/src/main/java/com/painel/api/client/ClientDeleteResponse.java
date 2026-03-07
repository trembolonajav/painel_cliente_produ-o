package com.painel.api.client;

public record ClientDeleteResponse(
        boolean deleted,
        int deletedCasesCount,
        String message) {
}
