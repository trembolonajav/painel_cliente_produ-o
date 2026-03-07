package com.painel.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.seed")
public record SeedProperties(
        String adminEmail,
        String adminPassword,
        String adminName
) {
}
