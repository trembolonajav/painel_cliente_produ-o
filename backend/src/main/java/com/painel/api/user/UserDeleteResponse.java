package com.painel.api.user;

public record UserDeleteResponse(
        boolean deleted,
        String message) {
}
