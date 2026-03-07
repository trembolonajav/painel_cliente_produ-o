package com.painel.api.casefile;

public record CaseDeleteResponse(
        boolean deleted,
        String message) {
}
