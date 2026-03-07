package com.painel.api.document;

public record DocumentDeleteResponse(
        boolean deleted,
        boolean storageObjectDeleted,
        String message) {
}
