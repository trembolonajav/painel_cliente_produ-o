package com.painel.api.document;

import java.time.OffsetDateTime;

public record DocumentDownloadLinkResponse(
        String url,
        OffsetDateTime expiresAt
) {
}
