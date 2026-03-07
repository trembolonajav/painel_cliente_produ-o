package com.painel.api.portal;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.portal")
public record PortalProperties(
        String frontendBaseUrl,
        String clientPath,
        int defaultTtlMinutes,
        int clientSessionMinutes
) {
}
