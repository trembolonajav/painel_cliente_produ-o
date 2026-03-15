package com.painel.api.config;

import com.painel.api.portal.PortalProperties;
import com.painel.api.document.DocumentProperties;
import com.painel.api.storage.StorageProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
        SecurityProperties.class,
        CorsProperties.class,
        PortalProperties.class,
        DocumentProperties.class,
        StorageProperties.class,
        ObservabilityProperties.class
})
public class PropertiesConfig {
}
