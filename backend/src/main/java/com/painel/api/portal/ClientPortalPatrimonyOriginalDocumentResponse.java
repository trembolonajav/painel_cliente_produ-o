package com.painel.api.portal;

public record ClientPortalPatrimonyOriginalDocumentResponse(
        String url,
        String name,
        String mimeType,
        Long sizeBytes
) {
}
