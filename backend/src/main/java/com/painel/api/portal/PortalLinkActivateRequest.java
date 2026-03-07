package com.painel.api.portal;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record PortalLinkActivateRequest(
        @Min(5) @Max(10080) Integer ttlMinutes
) {
}
