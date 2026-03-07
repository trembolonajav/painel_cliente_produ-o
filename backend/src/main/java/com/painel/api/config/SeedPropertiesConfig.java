package com.painel.api.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@Profile("dev")
@EnableConfigurationProperties(SeedProperties.class)
public class SeedPropertiesConfig {
}
